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

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";
import {
  scanInventoryScope,
  type SecurityPlanItem,
  type ScopeSummary,
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
  const [summary, setSummary] = useState<ScopeSummary | null>(null);
  const [pdfUretiliyor, setPdfUretiliyor] = useState(false);

  const ETIKET = "block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1";

  async function l1DenTara() {
    setTaraniyor(true);
    setMesaj("");
    setSummary(null);
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
      const miktarKol = kolBul("miktar", "yıllık", "yillik", "quantity", "amount");
      const ambalajKol = kolBul("ambalaj", "packag");

      const ham: { un: string; miktar: string; ambalaj: string }[] = [];
      for (let i = basIdx + 1; i < grid.length; i++) {
        const row = grid[i] || [];
        const unHam = String(row[unKol] ?? "").replace(/\D/g, "");
        if (!unHam || unHam.length < 4) continue;
        const un = unHam.slice(0, 4);
        ham.push({
          un,
          miktar: miktarKol >= 0 ? String(row[miktarKol] ?? "").trim() : "",
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
      const items: SecurityPlanItem[] = ham
        .map((h) => {
          const t = tabloAMap.get(h.un);
          if (!t) return null;
          const miktarSayi = parseFloat(h.miktar.replace(",", "."));
          return {
            un_number: t.un_number,
            proper_shipping_name: t.proper_shipping_name,
            adr_class: t.class,
            classification_code: t.classification_code,
            packing_group: t.packing_group,
            packaging_type: h.ambalaj || null,
            quantity: Number.isFinite(miktarSayi) ? miktarSayi : NaN,
            unit: "",
          } satisfies SecurityPlanItem;
        })
        .filter((x): x is SecurityPlanItem => x !== null);

      if (items.length === 0) {
        setMesaj("Dosyadaki UN numaraları Tablo A'da bulunamadı — eşleştirme yapılamadı.");
        return;
      }

      setSummary(scanInventoryScope(items));
      setMesaj(`✓ ${items.length} kimyasal tarandı (dosya: ${dosya.file_name}).`);
    } catch (e) {
      setMesaj("Tarama sırasında hata: " + hataCevir(e));
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

  async function raporIndir() {
    if (!summary) return;
    setPdfUretiliyor(true);
    try {
      const logo = await logoDataUrl();
      const bugun = new Date().toLocaleDateString("tr-TR");
      const veri: GuvenlikPlaniRaporVerisi = {
        firmaAdi,
        tarih: bugun,
        gecerlilikSuresi: "2 Yıl",
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
              ⚠ {summary.undetermined} kimyasalın yıllık miktar bilgisi L1 dosyasında bulunmadığından
              kapsam durumu kesinleştirilemedi — firma kayıtlarındaki fiili miktarla karşılaştırılmalı.
            </p>
          )}

          <div className="flex justify-end">
            <button
              onClick={raporIndir}
              disabled={pdfUretiliyor}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
            >
              {pdfUretiliyor ? "Hazırlanıyor..." : "⬇ Güvenlik Planı İnceleme Raporu (PDF)"}
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-medium text-gray-600">UN No</th>
                  <th className="text-left p-2 font-medium text-gray-600">Ürün Adı</th>
                  <th className="text-center p-2 font-medium text-gray-600">Sınıf</th>
                  <th className="text-center p-2 font-medium text-gray-600">PG</th>
                  <th className="text-center p-2 font-medium text-gray-600">Mod</th>
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
                    <td className="p-2 font-medium">UN {r.un_number}</td>
                    <td className="p-2 text-gray-600 max-w-[200px] truncate">{r.proper_shipping_name}</td>
                    <td className="p-2 text-center">{r.adr_class || "—"}</td>
                    <td className="p-2 text-center">{r.packing_group || "—"}</td>
                    <td className="p-2 text-center">{r.mode}</td>
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
                    <td className="p-2 text-gray-500 max-w-[260px]">{r.conclusion}</td>
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
