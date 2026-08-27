"use client";

// src/components/EmniyetKapsamTaramasi.tsx
//
// EMNİYET PLANI KAPSAM TARAMASI — ADR Bilgi Motoru alt başlığı
//
// Firmanın Belge Takip → L1 (ADR Envanter Listesi) kaydına yüklenmiş Excel
// dosyasını okur, UN numarası olan HER satırı ADR Tablo 1.10.3.1.2'ye göre
// TEK TEK değerlendirir (adrSecurityPlan.ts → scanInventoryScope) ve
// sonucu "GÜVENLİK PLANI İNCELEME RAPORU" formatında (kullanıcının
// paylaştığı örnek belgeye benzer) tabloda gösterir + PDF üretir.
//
// Not: TasimaEvraki.tsx'teki checkSecurityPlan() bir SEVKİYATIN toplu
// (ADR 1.10.4 + 1.1.3.6) değerlendirmesini yapar. Burada ise firmanın
// envanterindeki HER madde, miktarından bağımsız olarak Tablo 1.10.3.1.2
// kapsamına girip girmediği açısından AYRI AYRI değerlendirilir.

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  evaluateItemScope,
  type SecurityPlanItem,
  type ScopeSummary,
  type ItemScopeResult,
} from "@/lib/adrSecurityPlan";
import {
  guvenlikPlaniIncelemeRaporuUret,
  type GuvenlikPlaniRaporVerisi,
} from "@/lib/guvenlikPlaniIncelemePdf";
import type { LogoData } from "@/lib/aracEvraklariPdf";

type UnRow = {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  class: string | null;
  classification_code: string | null;
  packing_group: string | null;
};

type Props = {
  firmId: string;
  firmaAdi: string;
};

export default function EmniyetKapsamTaramasi({ firmId, firmaAdi }: Props) {
  const [taraniyor, setTaraniyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [pdfUretiliyor, setPdfUretiliyor] = useState(false);

  // Taranan ham kalemler (orijinal L1 sırasıyla) + ilk taramada belirlenen
  // gösterim sırası (kapsamda > belirsiz > kapsam dışı) sabit tutulur —
  // kullanıcı bir satıra manuel miktar girdiğinde tablo yeniden
  // sıralanıp satırlar yer değiştirmesin (input odağı kaybolmasın) diye.
  const [items, setItems] = useState<SecurityPlanItem[] | null>(null);
  const [siraIndeksleri, setSiraIndeksleri] = useState<number[] | null>(null);
  // Kullanıcının "Miktar" hücresine elle girdiği değerler — items
  // dizisindeki orijinal index'e göre anahtarlanır. Doluysa o satır bu
  // miktara göre; boşsa mevcut (eşik gösteren) mantığa göre değerlendirilir.
  const [manuelMiktarlar, setManuelMiktarlar] = useState<Record<number, string>>({});

  const STATUS_SIRA: Record<ItemScopeResult["status"], number> = {
    in_scope: 0,
    undetermined: 1,
    out_of_scope: 2,
  };

  // Her render'da: manuel girilen miktarlar varsa o satırlar için quantity
  // override edilip evaluateItemScope() yeniden çağrılır; sıra sabit kalır.
  const results = useMemo<ItemScopeResult[] | null>(() => {
    if (!items || !siraIndeksleri) return null;
    return siraIndeksleri.map((idx) => {
      const orijinal = items[idx];
      const manuelStr = manuelMiktarlar[idx];
      let it = orijinal;
      if (manuelStr && manuelStr.trim() !== "") {
        const sayi = parseFloat(manuelStr.trim().replace(",", "."));
        if (Number.isFinite(sayi) && sayi > 0) {
          it = { ...orijinal, quantity: sayi };
        }
      }
      return evaluateItemScope(it);
    });
  }, [items, siraIndeksleri, manuelMiktarlar]);

  const summary = useMemo<ScopeSummary | null>(() => {
    if (!results) return null;
    return {
      total: results.length,
      inScope: results.filter((r) => r.status === "in_scope").length,
      outOfScope: results.filter((r) => r.status === "out_of_scope").length,
      undetermined: results.filter((r) => r.status === "undetermined").length,
      results,
    };
  }, [results]);

  const ETIKET = "block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1";

  async function l1DenTara() {
    setTaraniyor(true);
    setMesaj("");
    setItems(null);
    setSiraIndeksleri(null);
    setManuelMiktarlar({});
    try {
      // 1) L1'e yüklenmiş en güncel dosyayı bul
      const { data: dosyalar, error: dErr } = await supabase
        .from("firm_belge_dosyalari")
        .select("file_path, file_name, uploaded_at")
        .eq("firm_id", firmId)
        .eq("code", "L1")
        .order("uploaded_at", { ascending: false })
        .limit(1);
      if (dErr || !dosyalar || dosyalar.length === 0) {
        setMesaj(
          "Belge Takip'te L1 (ADR Envanter Listesi) maddesine yüklenmiş dosya bulunamadı. Önce dosyayı oraya yükle."
        );
        return;
      }
      const dosya = dosyalar[0];
      const u = dosya.file_name.toLowerCase();
      if (!/\.(xlsx|xls|csv)$/.test(u)) {
        setMesaj(
          `L1'deki son dosya "${dosya.file_name}" — Excel değil. Tarama için L1'e .xlsx/.xls/.csv formatında liste yükle.`
        );
        return;
      }

      // 2) İndir
      const { data: url } = await supabase.storage
        .from("firm-files")
        .createSignedUrl(dosya.file_path, 300);
      if (!url?.signedUrl) {
        setMesaj("Dosya indirilemedi.");
        return;
      }
      const buf = await (await fetch(url.signedUrl)).arrayBuffer();

      // 3) Ayrıştır — KimyasalEnvanter.tsx'teki l1DosyasindanOku ile
      // aynı sezgisel başlık/kolon bulma mantığı.
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
      });

      const norm = (v: unknown) =>
        String(v ?? "").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();

      let basIdx = -1;
      let unKol = -1;
      for (let i = 0; i < Math.min(grid.length, 15); i++) {
        for (let j = 0; j < (grid[i] || []).length; j++) {
          const h = norm(grid[i][j]);
          if (h === "un" || h === "un no" || h === "un numarası" || h === "un number" || h.startsWith("un ")) {
            basIdx = i;
            unKol = j;
            break;
          }
        }
        if (basIdx >= 0) break;
      }
      if (basIdx < 0) {
        setMesaj(`"${dosya.file_name}" içinde UN kolonu bulunamadı.`);
        return;
      }
      const basliklar = (grid[basIdx] || []).map(norm);
      const kolBul = (...adaylar: string[]) =>
        basliklar.findIndex((h) => adaylar.some((a) => h.includes(a)));
      const adKol = kolBul("ürün", "urun", "madde adı", "kimyasal", "ticari", "product", "ad");
      // NOT: L1 envanter dosyalarında sevkiyat/taşıma başına miktar bilgisi
      // TUTULMUYOR — bu, kullanıcı tarafından teyit edildi. ADR Tablo
      // 1.10.3.1.2 eşikleri YILLIK TOPLAMA değil, TEK SEVKİYATTA taşınan
      // miktara göredir. "Kapasite", "Tonaj" gibi geniş terimlerle bir
      // miktar kolonu aramak, aslında ambalaj hacmi/adet gibi alakasız
      // bir sütunu yanlışlıkla miktar sanıp hatalı KAPSAMDA/KAPSAM DIŞI
      // kesin sonuçlar üretme riski taşıyordu (ör. UN 1203 için "1 litre"
      // okunup yanlışça KAPSAM DIŞI denmesi). Bu yüzden miktar hiç
      // okunmuyor — quantity her zaman bilinmiyor kabul edilir,
      // evaluateItemScope() de bu durumda kesin sonuç yerine ilgili
      // taşıma modu için geçerli sınır miktarını (sevkiyat başına eşiği)
      // açık şekilde bildiriyor.
      // L1'in taşıma modu kolonu genelde "AMBALAJLI/ TANK/ DÖKME" gibi 3
      // seçeneği başlıkta birden listeler. (Not: "Ambalaj Tipi" — varil/
      // IBC/bidon gibi paket türü kavramı — Taşıma Evrakı modülüne özeldir
      // ve L1 kimyasal envanterinde yer almaz; bu iki kavram karışmaz.)
      // Önce bu 3-seçenekli başlığı, sonra "taşıma modu/şekli/türü/tipi"
      // gibi alternatif adları, en son da düz "ambalaj"/"packag" kolonunu
      // ararız.
      const ucSecenekliKol = basliklar.findIndex(
        (h) => h.includes("ambalajlı") && h.includes("tank") && h.includes("dökme")
      );
      const tasimaModuKol =
        ucSecenekliKol >= 0
          ? ucSecenekliKol
          : kolBul(
              "taşıma modu", "tasima modu", "taşıma şekli", "tasima sekli",
              "taşıma türü", "tasima turu", "taşıma tipi", "tasima tipi"
            );
      const ambalajKol = tasimaModuKol >= 0 ? tasimaModuKol : kolBul("ambalaj", "packag");

      const ham: { un: string; ad: string; miktar: string; ambalaj: string }[] = [];
      for (let i = basIdx + 1; i < grid.length; i++) {
        const row = grid[i] || [];
        const unHam = String(row[unKol] ?? "").replace(/\D/g, "");
        if (!unHam || unHam.length < 4) continue;
        const un = unHam.slice(0, 4);
        ham.push({
          un,
          ad: adKol >= 0 ? String(row[adKol] ?? "").trim() : "",
          miktar: "", // bilinçli olarak okunmuyor — yukarıdaki nota bakın
          ambalaj: ambalajKol >= 0 ? String(row[ambalajKol] ?? "").trim() : "",
        });
      }
      if (ham.length === 0) {
        setMesaj("Dosyada UN numaralı satır bulunamadı.");
        return;
      }

      // 4) Tablo A eşleştirmesi (sınıf/PG/sınıflandırma kodu için)
      const benzersizUn = Array.from(new Set(ham.map((h) => h.un)));
      const { data: tabloA } = await supabase
        .from("adr_un_numbers")
        .select("*")
        .in("un_number", benzersizUn);
      const tabloAMap = new Map<string, UnRow>();
      ((tabloA as UnRow[]) || []).forEach((r) => {
        if (!tabloAMap.has(r.un_number)) tabloAMap.set(r.un_number, r);
      });

      // 5) SecurityPlanItem listesine dönüştür
      const eslesenler: (SecurityPlanItem | null)[] = ham.map((h): SecurityPlanItem | null => {
        const t = tabloAMap.get(h.un);
        if (!t) return null;
        const miktarSayi = parseFloat(h.miktar.replace(",", "."));
        return {
          un_number: t.un_number,
          proper_shipping_name: t.proper_shipping_name,
          trade_name: h.ad || null,
          adr_class: t.class,
          classification_code: t.classification_code,
          packing_group: t.packing_group,
          packaging_type: h.ambalaj || null,
          quantity: Number.isFinite(miktarSayi) ? miktarSayi : NaN,
          unit: "",
        };
      });
      const items: SecurityPlanItem[] = eslesenler.filter(
        (x): x is SecurityPlanItem => x !== null
      );

      if (items.length === 0) {
        setMesaj("Dosyadaki UN numaraları Tablo A'da bulunamadı — eşleştirme yapılamadı.");
        return;
      }

      // İlk gösterim sırası (kapsamda > belirsiz > kapsam dışı) burada
      // bir kez hesaplanıp sabitlenir — sonraki manuel miktar girişleri
      // bu sırayı değiştirmez (bkz. results useMemo).
      const ilkDegerlendirme = items.map((it, idx) => ({ idx, r: evaluateItemScope(it) }));
      ilkDegerlendirme.sort((a, b) => STATUS_SIRA[a.r.status] - STATUS_SIRA[b.r.status]);
      setItems(items);
      setSiraIndeksleri(ilkDegerlendirme.map((x) => x.idx));
      setMesaj(`✓ ${items.length} kimyasal tarandı (dosya: ${dosya.file_name}).`);
    } catch (e) {
      setMesaj("Tarama sırasında hata: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTaraniyor(false);
    }
  }

  async function logoDataUrl(): Promise<LogoData> {
    try {
      const { data: frm } = await supabase
        .from("firms")
        .select("logo_url")
        .eq("id", firmId)
        .single();
      const logoUrl = (frm as { logo_url: string | null } | null)?.logo_url ?? null;
      if (!logoUrl) return null;
      const { data: signed } = await supabase.storage
        .from("firm-files")
        .createSignedUrl(logoUrl, 600);
      if (!signed?.signedUrl) return null;
      const res = await fetch(signed.signedUrl);
      const blob = await res.blob();
      const fmt: "PNG" | "JPEG" = blob.type.includes("png") ? "PNG" : "JPEG";
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const enBoyOrani = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.width / img.height || 1);
        img.onerror = () => resolve(1);
        img.src = dataUrl;
      });
      return { data: dataUrl, fmt, enBoyOrani };
    } catch {
      return null;
    }
  }

  /** HAZIRLAYAN (firmaya atanmış TMGD) ve ONAYLAYAN (firmanın kayıtlı
   *  onaylayan kişisi) isimlerini, BelgeOlusturForm.tsx'teki AYNI
   *  kaynaklardan çeker — get_firm_tmgd_name RPC + firms.approver_name. */
  async function imzaIsimleriGetir(): Promise<{ hazirlayanAdi: string; onaylayanAdi: string }> {
    const [tmgdSonuc, firmaSonuc] = await Promise.all([
      supabase.rpc("get_firm_tmgd_name", { p_firm_id: firmId }),
      supabase.from("firms").select("approver_name").eq("id", firmId).single(),
    ]);
    const hazirlayanAdi = (tmgdSonuc.data as string | null) || "";
    const onaylayanAdi =
      (firmaSonuc.data as { approver_name: string | null } | null)?.approver_name || "";
    return { hazirlayanAdi, onaylayanAdi };
  }

  async function raporOnizle() {
    if (!summary) return;
    const pencere = window.open("", "_blank");
    if (!pencere) {
      setMesaj("Yeni sekme açılamadı — tarayıcının açılır pencere engelleyicisini kontrol et.");
      return;
    }
    setPdfUretiliyor(true);
    try {
      const logo = await logoDataUrl();
      const { hazirlayanAdi, onaylayanAdi } = await imzaIsimleriGetir();
      const bugun = new Date().toLocaleDateString("tr-TR");
      const veri: GuvenlikPlaniRaporVerisi = {
        firmaAdi,
        tarih: bugun,
        gecerlilikSuresi: "2 Yıl",
        hazirlayanAdi,
        onaylayanAdi,
        summary,
        logo: logo ?? undefined,
      };
      const doc = await guvenlikPlaniIncelemeRaporuUret(veri);
      const blobUrl = URL.createObjectURL(doc.output("blob"));
      pencere.location.href = blobUrl;
    } catch (e) {
      pencere.close();
      setMesaj("Önizleme oluşturulamadı: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setPdfUretiliyor(false);
    }
  }

  async function raporIndir() {
    if (!summary) return;
    setPdfUretiliyor(true);
    try {
      const logo = await logoDataUrl();
      const { hazirlayanAdi, onaylayanAdi } = await imzaIsimleriGetir();
      const bugun = new Date().toLocaleDateString("tr-TR");
      const veri: GuvenlikPlaniRaporVerisi = {
        firmaAdi,
        tarih: bugun,
        gecerlilikSuresi: "2 Yıl",
        hazirlayanAdi,
        onaylayanAdi,
        summary,
        logo: logo ?? undefined,
      };
      const doc = await guvenlikPlaniIncelemeRaporuUret(veri);
      doc.save(`guvenlik_plani_inceleme_${bugun.replace(/\./g, "-")}.pdf`);
    } finally {
      setPdfUretiliyor(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="border border-gray-200 rounded-xl bg-white p-5">
        <h3 className="font-semibold text-sm mb-1">Emniyet Planı Kapsam Taraması</h3>
        <p className="text-xs text-gray-400 mb-3">
          Belge Takip → L1 (ADR Envanter Listesi) kaydına yüklü dosyadaki her UN numaralı
          maddeyi ADR Tablo 1.10.3.1.2&apos;ye göre tek tek değerlendirir.
        </p>
        <button
          onClick={l1DenTara}
          disabled={taraniyor}
          className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
        >
          {taraniyor ? "Taranıyor..." : "L1'den Tara"}
        </button>
        {mesaj && <p className="text-xs text-gray-500 mt-2">{mesaj}</p>}
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-gray-200 rounded-xl bg-white p-4 text-center">
              <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
              <div className={ETIKET + " mt-1"}>Değerlendirilen</div>
            </div>
            <div className="border border-red-200 rounded-xl bg-red-50 p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{summary.inScope}</div>
              <div className={ETIKET + " mt-1"}>Kapsamda</div>
            </div>
            <div className="border border-green-200 rounded-xl bg-green-50 p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{summary.outOfScope}</div>
              <div className={ETIKET + " mt-1"}>Kapsam Dışı</div>
            </div>
          </div>
          {summary.undetermined > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ {summary.undetermined} kimyasalın sevkiyat başına miktar bilgisi L1 dosyasında bulunmadığından
              kapsam durumu kesinleştirilemedi — o taşımadaki fiili miktarla karşılaştırılmalı.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={raporOnizle}
              disabled={pdfUretiliyor}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              👁️ Önizle
            </button>
            <button
              onClick={raporIndir}
              disabled={pdfUretiliyor}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
            >
              {pdfUretiliyor ? "Hazırlanıyor..." : "⬇ Güvenlik Planı İnceleme Raporu (PDF)"}
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <p className="text-[11px] text-gray-400 px-3 pt-2">
              Miktar hücresine sevkiyat başına değer girersen o satır bu miktara göre kesin
              sonuçla yeniden değerlendirilir; boş bırakırsan mevcut eşik bilgisi geçerli kalır.
            </p>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-center p-2 font-medium text-gray-600 w-8">No</th>
                  <th className="text-left p-2 font-medium text-gray-600">UN No</th>
                  <th className="text-left p-2 font-medium text-gray-600">Uygun Sevkiyat Adı</th>
                  <th className="text-left p-2 font-medium text-gray-600">Ticari Ad</th>
                  <th className="text-center p-2 font-medium text-gray-600">Sınıf</th>
                  <th className="text-center p-2 font-medium text-gray-600">PG</th>
                  <th className="text-center p-2 font-medium text-gray-600">Mod</th>
                  <th className="text-center p-2 font-medium text-gray-600">Miktar</th>
                  <th className="text-center p-2 font-medium text-gray-600">Sonuç</th>
                  <th className="text-left p-2 font-medium text-gray-600">Gerekçe</th>
                </tr>
              </thead>
              <tbody>
                {summary.results.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-t ${
                      r.status === "in_scope"
                        ? "bg-red-50"
                        : r.status === "undetermined"
                        ? "bg-amber-50"
                        : ""
                    }`}
                  >
                    <td className="p-2 text-center text-gray-400">{i + 1}</td>
                    <td className="p-2 font-medium">UN {r.un_number}</td>
                    <td className="p-2 text-gray-600 max-w-[180px] truncate">{r.proper_shipping_name}</td>
                    <td className="p-2 text-gray-600 max-w-[140px] truncate">{r.trade_name || "—"}</td>
                    <td className="p-2 text-center">{r.adr_class || "—"}</td>
                    <td className="p-2 text-center">{r.packing_group || "—"}</td>
                    <td className="p-2 text-center">{r.mode}</td>
                    <td className="p-2 text-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="—"
                        className="w-16 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:border-blue-400 focus:outline-none"
                        value={
                          siraIndeksleri
                            ? manuelMiktarlar[siraIndeksleri[i]] ?? ""
                            : ""
                        }
                        onChange={(e) => {
                          if (!siraIndeksleri) return;
                          const orijinalIdx = siraIndeksleri[i];
                          const deger = e.target.value;
                          setManuelMiktarlar((prev) => ({ ...prev, [orijinalIdx]: deger }));
                        }}
                      />
                      {r.thresholdUnit && (
                        <span className="text-[10px] text-gray-400 ml-1">{r.thresholdUnit}</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          r.status === "in_scope"
                            ? "bg-red-100 text-red-700"
                            : r.status === "undetermined"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {r.status === "in_scope" ? "KAPSAMDA" : r.status === "undetermined" ? "BELİRSİZ" : "KAPSAM DIŞI"}
                      </span>
                    </td>
                    <td className="p-2 text-gray-500 max-w-[240px]">{r.conclusion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
