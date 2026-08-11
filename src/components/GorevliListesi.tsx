"use client";

// GÖREVLİ LİSTESİ (TMGDK-G1)
//
// Personeller menüsü altındaki alt sekme. Excel/PDF çıktısındaki tabloyla
// BİREBİR aynı görünüm: sütun başlıkları ve hemen altlarında (aynı hücrede)
// o sütuna ait giriş kontrolü yer alır — ayrı bir "yeni satır ekle" formu
// YOK, her şey doğrudan tablonun içinde.
//
// Sütun kontrolleri:
//   - Görev Başlığı         : ÇOKLU seçenekli (Gönderen/Alıcı/.../Diğer
//                             serbest metin) — birden fazla görev birlikte
//                             işaretlenebilir (örn. Gönderen + Paketleyen +
//                             Yükleyen), seçilenler hücrede alt alta durur.
//   - Yapılacak Görevler    : ÇOKLU seçenekli (örnek TMFB belgesindeki
//                             standart görev tanımları + Diğer serbest metin)
//   - Bağlı Olduğu Birim    : serbest metin (çok satırlı, otomatik büyür)
//   - Sorumlu Kişi/ler      : SERBEST METİN (elle yazılır, seçenek YOK)
//   - Doldurulacak Döküman No: ÇOKLU seçenekli (örnek belgedeki standart
//                             döküman tanımları + Diğer serbest metin)
//   - Eğitim Tarihi         : tarih seçici
//
// Çoklu seçimler veritabanında TEK bir metin alanında, seçilen her değer
// kendi satırında olacak şekilde ("\n" ile ayrılmış) saklanır — bu, PDF/
// Excel çıktısının zaten desteklediği çok satırlı hücre biçimiyle birebir
// uyumludur (autoTable ve ExcelJS wrapText, \n'i otomatik yeni satıra çevirir).
//
// Satır davranışı (Google E-Tablolar mantığı):
//   - Var olan satırlar hücre bazında düzenlenir; bir alan blur olduğunda
//     (veya select değiştiğinde) otomatik kaydedilir.
//   - Tablonun en altında her zaman BOŞ bir satır durur; Görev Başlığı
//     doldurulup o satırdan çıkıldığında satır veritabanına eklenir ve
//     altına yeni bir boş satır eklenir.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";
import { gorevliListesiExcelOlustur } from "@/lib/gorevliListesiExcel";
import { gorevliListesiPdfOlustur, type LogoData } from "@/lib/gorevliListesiPdf";

type GorevliKaydi = {
  id: string;
  firm_id: string;
  sira_no: number;
  gorev_basligi: string;
  yapilacak_gorevler: string | null;
  bagli_oldugu_birim: string | null;
  sorumlu_kisiler: string | null;
  doldurulacak_dokuman_no: string | null;
  egitim_tarihi: string | null;
};

const GOREV_BASLIKLARI = [
  "Gönderen",
  "Alıcı",
  "Boşaltan",
  "Paketleyen",
  "Dolduran",
  "Yükleyen",
];
const DIGER = "Diğer (serbest metin)";
const GOREV_SECENEKLERI = [...GOREV_BASLIKLARI, DIGER];

// Örnek TMFB Faaliyetleri Görevli Listesi belgesinden alınan standart görev
// tanımları (bkz. kullanıcının paylaştığı Ariteks örneği).
const YAPILACAK_GOREVLER_SECENEKLERI = [
  "Talimatlara uyulması\nTaşıma Evrakları Formunun Doldurulması\nAraç Kontrol Formlarının Doldurulması\nTaşıma Kontrol Listesinin Doldurulması",
  "Talimatlara uyulması\nAraç Kontrol Formlarının Doldurulması",
  "Talimatlara uyulması\nPaketleyen Kontrol Formlarının Doldurulması",
  "Yapılan İş ve İşlemlerin Kontrolü",
  "Tehlikeli Madde Miktarlarının Tedariği",
];
const YAPILACAK_GOREVLER_SECIMLERI = [...YAPILACAK_GOREVLER_SECENEKLERI, DIGER];

const DOKUMAN_NO_SECENEKLERI = [
  "ADR Bölüm 5.4.1'e göre düzenlenen taşıma evrakları",
  "ADR Sözleşmesi ve Tehlikeli Maddelerin Karayolu Yönetmeliği Kapsamında Hazırlanan Kontrol Formu doldurulması ve talimatlara uyulması",
];
const DOKUMAN_NO_SECIMLERI = [...DOKUMAN_NO_SECENEKLERI, DIGER];

type SatirState = {
  key: string; // React key — db id veya "yeni-N"
  id: string | null; // veritabanı id'si; null ise henüz kaydedilmedi
  gorevSecimler: string[];
  gorevSerbest: string;
  yapilacakSecimler: string[];
  yapilacakSerbest: string;
  bagli_oldugu_birim: string;
  sorumlu_kisiler: string;
  dokumanSecimler: string[];
  dokumanSerbest: string;
  egitim_tarihi: string;
  kaydediliyor: boolean;
};

let yeniSayac = 0;
function bosSatir(): SatirState {
  yeniSayac += 1;
  return {
    key: `yeni-${yeniSayac}`,
    id: null,
    gorevSecimler: [],
    gorevSerbest: "",
    yapilacakSecimler: [],
    yapilacakSerbest: "",
    bagli_oldugu_birim: "",
    sorumlu_kisiler: "",
    dokumanSecimler: [],
    dokumanSerbest: "",
    egitim_tarihi: "",
    kaydediliyor: false,
  };
}

/** Kaydedilmiş (tek metin, "\n" ile ayrılmış) bir değeri, hangi bilinen
 *  seçeneklerin işaretli olduğuna ve varsa serbest metin kısmına ayırır.
 *  Bilinen seçenekler (Yapılacak Görevler gibi) kendi İÇİNDE de "\n"
 *  barındırabildiği için basit split değil, alt-metin arama kullanılır. */
function cokluSecimVeSerbestCoz(
  deger: string | null,
  secenekler: string[]
): { secimler: string[]; serbest: string } {
  const v = (deger || "").trim();
  if (!v) return { secimler: [], serbest: "" };

  let kalan = v;
  const bulunanlar: string[] = [];
  // En uzun/spesifik seçenekten başlayarak ara — kısa bir seçenek, uzun
  // birinin alt dizesi olabileceğinden yanlış eşleşmeyi önler.
  const uzunluguGoreSirali = [...secenekler].sort((a, b) => b.length - a.length);
  for (const secenek of uzunluguGoreSirali) {
    if (kalan.includes(secenek)) {
      bulunanlar.push(secenek);
      kalan = kalan.replace(secenek, "\u0000").trim();
    }
  }
  kalan = kalan.replace(/\u0000/g, "").replace(/^\n+|\n+$/g, "").trim();

  // Kullanıcıya tutarlı görünmesi için orijinal seçenek sırasına göre diz.
  const secimler = secenekler.filter((s) => bulunanlar.includes(s));
  const serbest = kalan;
  if (serbest) secimler.push(DIGER);
  return { secimler, serbest };
}

function kayittanSatir(k: GorevliKaydi): SatirState {
  const gorev = cokluSecimVeSerbestCoz(k.gorev_basligi, GOREV_BASLIKLARI);
  const yapilacak = cokluSecimVeSerbestCoz(k.yapilacak_gorevler, YAPILACAK_GOREVLER_SECENEKLERI);
  const dokuman = cokluSecimVeSerbestCoz(k.doldurulacak_dokuman_no, DOKUMAN_NO_SECENEKLERI);
  return {
    key: k.id,
    id: k.id,
    gorevSecimler: gorev.secimler,
    gorevSerbest: gorev.serbest,
    yapilacakSecimler: yapilacak.secimler,
    yapilacakSerbest: yapilacak.serbest,
    bagli_oldugu_birim: k.bagli_oldugu_birim || "",
    sorumlu_kisiler: k.sorumlu_kisiler || "",
    dokumanSecimler: dokuman.secimler,
    dokumanSerbest: dokuman.serbest,
    egitim_tarihi: k.egitim_tarihi || "",
    kaydediliyor: false,
  };
}

/** Seçilen değerleri (orijinal seçenek sırasına göre) + varsa serbest metni
 *  tek bir "\n" ayraçlı metne birleştirir — PDF/Excel bunu otomatik alt alta
 *  gösterir. */
function etkinCokluMetin(secimler: string[], serbest: string, secenekler: string[]): string {
  const sirali = secenekler.filter((s) => secimler.includes(s));
  const parcalar = [...sirali];
  if (secimler.includes(DIGER) && serbest.trim()) parcalar.push(serbest.trim());
  return parcalar.join("\n");
}

function ensureTrailingBlank(rows: SatirState[]): SatirState[] {
  if (rows.length === 0 || rows[rows.length - 1].id !== null) {
    return [...rows, bosSatir()];
  }
  return rows;
}

function trTarih(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function bugununTarihi(): string {
  return trTarih(new Date().toISOString());
}

// Hücre yüksekliği (kullanıcı talebiyle) ÖNCEKİNİN 2 KATINA çıkarıldı:
// dikey padding py-1 -> py-2 ve tüm hücrelerin p-1.5 -> p-3 olması bunu
// hem select/textarea kontrollerinde hem de hücre çerçevesinde sağlar.
const HUCRE_INPUT =
  "w-full border rounded px-1.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400";
const HUCRE_TD = "p-3 border align-top";

export default function GorevliListesi({
  firmId,
  firmaAdi,
}: {
  firmId: string;
  firmaAdi: string;
}) {
  const [rows, setRows] = useState<SatirState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [busy, setBusy] = useState(false);

  const [hazirlayanAdi, setHazirlayanAdi] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    async function yukle() {
      setLoading(true);
      setError("");
      try {
        const [kayitRes, firmRes] = await Promise.all([
          supabase
            .from("firm_gorevli_listesi")
            .select("*")
            .eq("firm_id", firmId)
            .order("sira_no"),
          supabase.from("firms").select("logo_url").eq("id", firmId).single(),
        ]);
        if (iptal) return;
        if (kayitRes.error) throw kayitRes.error;
        const yuklenen = ((kayitRes.data as GorevliKaydi[]) || []).map(kayittanSatir);
        setRows(ensureTrailingBlank(yuklenen));
        setLogoUrl((firmRes.data as { logo_url: string | null } | null)?.logo_url ?? null);

        const { data: tmgdAdi } = await supabase.rpc("get_firm_tmgd_name", {
          p_firm_id: firmId,
        });
        if (!iptal) setHazirlayanAdi((tmgdAdi as string) || "");
      } catch (e) {
        if (!iptal) setError(hataCevir(e as { message?: string }));
      } finally {
        if (!iptal) setLoading(false);
      }
    }
    yukle();
    return () => {
      iptal = true;
    };
  }, [firmId]);

  function updateRow(key: string, patch: Partial<SatirState>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function kaydet(satir: SatirState, siraNo: number) {
    const gorevBasligi = etkinCokluMetin(satir.gorevSecimler, satir.gorevSerbest, GOREV_BASLIKLARI);
    if (!gorevBasligi) return; // henüz yeterli veri yok, kaydetme

    setRows((prev) => prev.map((r) => (r.key === satir.key ? { ...r, kaydediliyor: true } : r)));
    setError("");
    try {
      const govde = {
        firm_id: firmId,
        sira_no: siraNo,
        gorev_basligi: gorevBasligi,
        yapilacak_gorevler:
          etkinCokluMetin(satir.yapilacakSecimler, satir.yapilacakSerbest, YAPILACAK_GOREVLER_SECENEKLERI) ||
          null,
        bagli_oldugu_birim: satir.bagli_oldugu_birim.trim() || null,
        sorumlu_kisiler: satir.sorumlu_kisiler.trim() || null,
        doldurulacak_dokuman_no:
          etkinCokluMetin(satir.dokumanSecimler, satir.dokumanSerbest, DOKUMAN_NO_SECENEKLERI) || null,
        egitim_tarihi: satir.egitim_tarihi || null,
      };

      if (satir.id) {
        const { error: err } = await supabase
          .from("firm_gorevli_listesi")
          .update(govde)
          .eq("id", satir.id);
        if (err) throw err;
        setRows((prev) =>
          prev.map((r) => (r.key === satir.key ? { ...r, kaydediliyor: false } : r))
        );
      } else {
        const { data, error: err } = await supabase
          .from("firm_gorevli_listesi")
          .insert(govde)
          .select("id")
          .single();
        if (err) throw err;
        const yeniId = (data as { id: string }).id;
        setRows((prev) => {
          const guncellenmis = prev.map((r) =>
            r.key === satir.key ? { ...r, id: yeniId, kaydediliyor: false } : r
          );
          return ensureTrailingBlank(guncellenmis);
        });
      }
      setMesaj("");
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
      setRows((prev) =>
        prev.map((r) => (r.key === satir.key ? { ...r, kaydediliyor: false } : r))
      );
    }
  }

  async function sil(satir: SatirState) {
    if (!satir.id) return;
    if (!confirm("Bu satırı silmek istediğinize emin misiniz?")) return;
    setRows((prev) =>
      prev.map((r) => (r.key === satir.key ? { ...r, kaydediliyor: true } : r))
    );
    setError("");
    try {
      const { error: err } = await supabase
        .from("firm_gorevli_listesi")
        .delete()
        .eq("id", satir.id);
      if (err) throw err;
      setRows((prev) => ensureTrailingBlank(prev.filter((r) => r.key !== satir.key)));
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
      setRows((prev) =>
        prev.map((r) => (r.key === satir.key ? { ...r, kaydediliyor: false } : r))
      );
    }
  }

  async function logoDataUrl(): Promise<LogoData> {
    if (!logoUrl) return null;
    try {
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

  const kayitliSatirlar = rows.filter((r) => r.id !== null);

  function satirlariHazirla() {
    return kayitliSatirlar.map((r, idx) => ({
      sira_no: idx + 1,
      gorev_basligi: etkinCokluMetin(r.gorevSecimler, r.gorevSerbest, GOREV_BASLIKLARI),
      yapilacak_gorevler: etkinCokluMetin(
        r.yapilacakSecimler,
        r.yapilacakSerbest,
        YAPILACAK_GOREVLER_SECENEKLERI
      ),
      bagli_oldugu_birim: r.bagli_oldugu_birim,
      sorumluIsimler: r.sorumlu_kisiler,
      doldurulacak_dokuman_no: etkinCokluMetin(r.dokumanSecimler, r.dokumanSerbest, DOKUMAN_NO_SECENEKLERI),
      egitim_tarihi: trTarih(r.egitim_tarihi),
    }));
  }

  async function excelIndir() {
    setBusy(true);
    setError("");
    try {
      const buf = await gorevliListesiExcelOlustur({
        firmaAdi,
        hazirlayanAdi,
        bugun: bugununTarihi(),
        satirlar: satirlariHazirla(),
      });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const temizAd = firmaAdi.replace(/[^\w\sğüşıöçĞÜŞİÖÇ-]/g, "").trim().replace(/\s+/g, "_");
      a.download = `Gorevli_Listesi_${temizAd}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMesaj("✓ Excel indirildi.");
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  async function pdfIndir() {
    setBusy(true);
    setError("");
    try {
      const logo = await logoDataUrl();
      const blob = await gorevliListesiPdfOlustur({
        firmaAdi,
        hazirlayanAdi,
        bugun: bugununTarihi(),
        satirlar: satirlariHazirla(),
        logo,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const temizAd = firmaAdi.replace(/[^\w\sğüşıöçĞÜŞİÖÇ-]/g, "").trim().replace(/\s+/g, "_");
      a.download = `Gorevli_Listesi_${temizAd}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMesaj("✓ PDF indirildi.");
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold">📋 Görevli Listesi</h2>
          <p className="text-sm text-gray-500">
            TMGDK-G1 — birden fazla seçeneği aynı anda işaretleyebilirsiniz; seçilenler hücrede alt alta görünür.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={excelIndir}
            disabled={busy || kayitliSatirlar.length === 0}
            className="px-3 py-1.5 rounded-lg text-sm border bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            📊 Excel İndir
          </button>
          <button
            onClick={pdfIndir}
            disabled={busy || kayitliSatirlar.length === 0}
            className="px-3 py-1.5 rounded-lg text-sm border bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            📄 PDF İndir
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}
      {mesaj && (
        <div className="mb-3 p-2 rounded-lg bg-green-50 text-green-700 text-sm">{mesaj}</div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-blue-50">
              <th className="p-2 border text-left w-10">Sıra No</th>
              <th className="p-2 border text-left w-40">
                Tehlikeli Madde
                <br />
                Görev Başlığı
              </th>
              <th className="p-2 border text-left w-56">Yapılacak Görevler</th>
              <th className="p-2 border text-left w-36">Bağlı Olduğu Birim</th>
              <th className="p-2 border text-left w-40">Sorumlu Kişi/ler</th>
              <th className="p-2 border text-left w-56">Doldurulacak Döküman No</th>
              <th className="p-2 border text-left w-32">Eğitim Tarihi</th>
              <th className="p-2 border w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const yeniMi = row.id === null;
              return (
                <tr key={row.key} className={yeniMi ? "bg-gray-50/60" : "bg-white"}>
                  <td className={HUCRE_TD + " text-center text-gray-500"}>
                    {yeniMi ? "—" : idx + 1}
                  </td>

                  {/* Görev Başlığı: ÇOKLU seçim (checkbox listesi hemen hücrede),
                      altında "Diğer" işaretliyse serbest metin. */}
                  <td className={HUCRE_TD}>
                    <select
                      multiple
                      size={Math.min(7, GOREV_SECENEKLERI.length)}
                      value={row.gorevSecimler}
                      onChange={(e) => {
                        const secililer = Array.from(e.target.selectedOptions).map((o) => o.value);
                        updateRow(row.key, { gorevSecimler: secililer });
                      }}
                      onBlur={() => kaydet(row, idx + 1)}
                      className={HUCRE_INPUT}
                    >
                      {GOREV_SECENEKLERI.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {row.gorevSecimler.includes(DIGER) && (
                      <input
                        type="text"
                        value={row.gorevSerbest}
                        onChange={(e) => updateRow(row.key, { gorevSerbest: e.target.value })}
                        onBlur={() => kaydet(row, idx + 1)}
                        placeholder="Görev başlığı yazın"
                        className={HUCRE_INPUT + " mt-1"}
                      />
                    )}
                  </td>

                  {/* Yapılacak Görevler: ÇOKLU seçim, altında "Diğer" işaretliyse serbest metin. */}
                  <td className={HUCRE_TD}>
                    <select
                      multiple
                      size={Math.min(6, YAPILACAK_GOREVLER_SECIMLERI.length)}
                      value={row.yapilacakSecimler}
                      onChange={(e) => {
                        const secililer = Array.from(e.target.selectedOptions).map((o) => o.value);
                        updateRow(row.key, { yapilacakSecimler: secililer });
                      }}
                      onBlur={() => kaydet(row, idx + 1)}
                      className={HUCRE_INPUT}
                    >
                      {YAPILACAK_GOREVLER_SECIMLERI.map((g) => (
                        <option key={g} value={g}>
                          {g.length > 40
                            ? g.slice(0, 40).replace(/\n/g, " ") + "…"
                            : g.replace(/\n/g, " ")}
                        </option>
                      ))}
                    </select>
                    {row.yapilacakSecimler.includes(DIGER) && (
                      <textarea
                        value={row.yapilacakSerbest}
                        onChange={(e) =>
                          updateRow(row.key, { yapilacakSerbest: e.target.value })
                        }
                        onBlur={() => kaydet(row, idx + 1)}
                        placeholder="Görev tanımı yazın"
                        rows={2}
                        className={HUCRE_INPUT + " mt-1"}
                      />
                    )}
                  </td>

                  <td className={HUCRE_TD}>
                    <textarea
                      value={row.bagli_oldugu_birim}
                      onChange={(e) =>
                        updateRow(row.key, { bagli_oldugu_birim: e.target.value })
                      }
                      onBlur={() => kaydet(row, idx + 1)}
                      rows={Math.max(2, row.bagli_oldugu_birim.split("\n").length)}
                      placeholder="Birden fazlaysa her satıra bir tane yazın"
                      className={HUCRE_INPUT + " resize-none leading-4"}
                    />
                  </td>

                  {/* Sorumlu Kişi/ler: SERBEST METİN — seçenek yok, elle yazılır.
                      Birden fazla isim, her biri kendi satırında (Enter ile) girilir;
                      textarea satır sayısı içeriğe göre büyür ki tüm isimler her zaman
                      görünür kalsın (kırpılmasın/kaydırma gerekmesin). */}
                  <td className={HUCRE_TD}>
                    <textarea
                      value={row.sorumlu_kisiler}
                      onChange={(e) =>
                        updateRow(row.key, { sorumlu_kisiler: e.target.value })
                      }
                      onBlur={() => kaydet(row, idx + 1)}
                      rows={Math.max(2, row.sorumlu_kisiler.split("\n").length)}
                      placeholder="Ad Soyad (birden fazlaysa her satıra bir isim yazın)"
                      className={HUCRE_INPUT + " resize-none leading-4"}
                    />
                  </td>

                  {/* Doldurulacak Döküman No: ÇOKLU seçim, altında "Diğer" işaretliyse serbest metin. */}
                  <td className={HUCRE_TD}>
                    <select
                      multiple
                      size={Math.min(3, DOKUMAN_NO_SECIMLERI.length)}
                      value={row.dokumanSecimler}
                      onChange={(e) => {
                        const secililer = Array.from(e.target.selectedOptions).map((o) => o.value);
                        updateRow(row.key, { dokumanSecimler: secililer });
                      }}
                      onBlur={() => kaydet(row, idx + 1)}
                      className={HUCRE_INPUT}
                    >
                      {DOKUMAN_NO_SECIMLERI.map((g) => (
                        <option key={g} value={g}>
                          {g.length > 40 ? g.slice(0, 40) + "…" : g}
                        </option>
                      ))}
                    </select>
                    {row.dokumanSecimler.includes(DIGER) && (
                      <textarea
                        value={row.dokumanSerbest}
                        onChange={(e) =>
                          updateRow(row.key, { dokumanSerbest: e.target.value })
                        }
                        onBlur={() => kaydet(row, idx + 1)}
                        placeholder="Döküman no / tanımı yazın"
                        rows={2}
                        className={HUCRE_INPUT + " mt-1"}
                      />
                    )}
                  </td>

                  <td className={HUCRE_TD}>
                    <input
                      type="date"
                      value={row.egitim_tarihi}
                      onChange={(e) => updateRow(row.key, { egitim_tarihi: e.target.value })}
                      onBlur={() => kaydet(row, idx + 1)}
                      className={HUCRE_INPUT}
                    />
                  </td>

                  <td className={HUCRE_TD + " text-center"}>
                    {row.kaydediliyor && (
                      <span className="text-gray-400" title="Kaydediliyor…">
                        ⏳
                      </span>
                    )}
                    {!row.kaydediliyor && row.id && (
                      <button
                        onClick={() => sil(row)}
                        title="Satırı sil"
                        className="text-red-600 hover:underline"
                      >
                        🗑
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Yukarıda Belirtilen Formda kişi/kişiler değişmesi halinde en geç 7 gün içerisinde
        yazılı olarak Tehlikeli Madde Güvenlik Danışmanına haber verilmesi gerekmektedir.
      </p>
    </div>
  );
}
