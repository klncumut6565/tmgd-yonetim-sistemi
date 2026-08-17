"use client";

// GÖREVLİ LİSTESİ (TMGDK-G1)
//
// Personeller menüsü altındaki alt sekme. Excel/PDF çıktısındaki tabloyla
// BİREBİR aynı görünüm: sütun başlıkları ve hemen altlarında (aynı hücrede)
// o sütuna ait giriş kontrolü yer alır — ayrı bir "yeni satır ekle" formu
// YOK, her şey doğrudan tablonun içinde.
//
// Sütun kontrolleri:
//   - Görev Başlığı         : seçenekli (Gönderen/Alıcı/.../Diğer serbest metin)
//   - Yapılacak Görevler    : seçenekli (örnek TMFB belgesindeki standart
//                             görev tanımları + Diğer serbest metin)
//   - Bağlı Olduğu Birim    : serbest metin
//   - Sorumlu Kişi/ler      : SERBEST METİN (elle yazılır, seçenek YOK —
//                             kullanıcı talebi üzerine employees listesi
//                             kaldırıldı)
//   - Doldurulacak Döküman No: seçenekli (örnek belgedeki standart
//                             döküman tanımları + Diğer serbest metin)
//   - Eğitim Tarihi         : tarih seçici
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
  gorevSecim: string;
  gorevSerbest: string;
  yapilacakSecim: string;
  yapilacakSerbest: string;
  bagli_oldugu_birim: string;
  sorumlu_kisiler: string;
  dokumanSecim: string;
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
    gorevSecim: GOREV_BASLIKLARI[0],
    gorevSerbest: "",
    yapilacakSecim: YAPILACAK_GOREVLER_SECENEKLERI[0],
    yapilacakSerbest: "",
    bagli_oldugu_birim: "",
    sorumlu_kisiler: "",
    dokumanSecim: DOKUMAN_NO_SECENEKLERI[0],
    dokumanSerbest: "",
    egitim_tarihi: "",
    kaydediliyor: false,
  };
}

/** Bir değer listede birebir varsa o seçeneği, yoksa "Diğer" + serbest metni döndürür. */
function secimVeSerbestCoz(
  deger: string | null,
  secenekler: string[]
): { secim: string; serbest: string } {
  const v = deger || "";
  if (v && secenekler.includes(v)) return { secim: v, serbest: "" };
  if (!v) return { secim: secenekler[0], serbest: "" };
  return { secim: DIGER, serbest: v };
}

function kayittanSatir(k: GorevliKaydi): SatirState {
  const gorev = secimVeSerbestCoz(k.gorev_basligi, GOREV_BASLIKLARI);
  const yapilacak = secimVeSerbestCoz(k.yapilacak_gorevler, YAPILACAK_GOREVLER_SECENEKLERI);
  const dokuman = secimVeSerbestCoz(k.doldurulacak_dokuman_no, DOKUMAN_NO_SECENEKLERI);
  return {
    key: k.id,
    id: k.id,
    gorevSecim: gorev.secim,
    gorevSerbest: gorev.serbest,
    yapilacakSecim: yapilacak.secim,
    yapilacakSerbest: yapilacak.serbest,
    bagli_oldugu_birim: k.bagli_oldugu_birim || "",
    sorumlu_kisiler: k.sorumlu_kisiler || "",
    dokumanSecim: dokuman.secim,
    dokumanSerbest: dokuman.serbest,
    egitim_tarihi: k.egitim_tarihi || "",
    kaydediliyor: false,
  };
}

function etkinMetin(secim: string, serbest: string): string {
  return (secim === DIGER ? serbest : secim).trim();
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

const HUCRE_INPUT =
  "w-full border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400";

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
  const [onaylayanAdi, setOnaylayanAdi] = useState("");
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
          supabase.from("firms").select("logo_url, approver_name").eq("id", firmId).single(),
        ]);
        if (iptal) return;
        if (kayitRes.error) throw kayitRes.error;
        const yuklenen = ((kayitRes.data as GorevliKaydi[]) || []).map(kayittanSatir);
        setRows(ensureTrailingBlank(yuklenen));
        const firmVeri = firmRes.data as { logo_url: string | null; approver_name: string | null } | null;
        setLogoUrl(firmVeri?.logo_url ?? null);
        setOnaylayanAdi(firmVeri?.approver_name ?? "");

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
    const gorevBasligi = etkinMetin(satir.gorevSecim, satir.gorevSerbest);
    if (!gorevBasligi) return; // henüz yeterli veri yok, kaydetme

    setRows((prev) => prev.map((r) => (r.key === satir.key ? { ...r, kaydediliyor: true } : r)));
    setError("");
    try {
      const govde = {
        firm_id: firmId,
        sira_no: siraNo,
        gorev_basligi: gorevBasligi,
        yapilacak_gorevler: etkinMetin(satir.yapilacakSecim, satir.yapilacakSerbest) || null,
        bagli_oldugu_birim: satir.bagli_oldugu_birim.trim() || null,
        sorumlu_kisiler: satir.sorumlu_kisiler.trim() || null,
        doldurulacak_dokuman_no: etkinMetin(satir.dokumanSecim, satir.dokumanSerbest) || null,
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
      gorev_basligi: etkinMetin(r.gorevSecim, r.gorevSerbest),
      yapilacak_gorevler: etkinMetin(r.yapilacakSecim, r.yapilacakSerbest),
      bagli_oldugu_birim: r.bagli_oldugu_birim,
      sorumluIsimler: r.sorumlu_kisiler,
      doldurulacak_dokuman_no: etkinMetin(r.dokumanSecim, r.dokumanSerbest),
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
        onaylayanAdi,
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
            TMGDK-G1 — hücrelere doğrudan yazın; Görev Başlığı doldurulup satırdan
            çıkıldığında otomatik kaydedilir.
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
                  <td className="p-1.5 border text-center align-top text-gray-500">
                    {yeniMi ? "—" : idx + 1}
                  </td>

                  {/* Görev Başlığı: seçenek doğrudan hücrede, altında serbest metin */}
                  <td className="p-1.5 border align-top">
                    <select
                      value={row.gorevSecim}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateRow(row.key, { gorevSecim: val });
                        if (val !== DIGER) {
                          kaydet({ ...row, gorevSecim: val }, idx + 1);
                        }
                      }}
                      className={HUCRE_INPUT}
                    >
                      {GOREV_SECENEKLERI.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {row.gorevSecim === DIGER && (
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

                  {/* Yapılacak Görevler: seçenek doğrudan hücrede, altında serbest metin */}
                  <td className="p-1.5 border align-top">
                    <select
                      value={row.yapilacakSecim}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateRow(row.key, { yapilacakSecim: val });
                        if (val !== DIGER) {
                          kaydet({ ...row, yapilacakSecim: val }, idx + 1);
                        }
                      }}
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
                    {row.yapilacakSecim === DIGER && (
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

                  <td className="p-1.5 border align-top">
                    <textarea
                      value={row.bagli_oldugu_birim}
                      onChange={(e) =>
                        updateRow(row.key, { bagli_oldugu_birim: e.target.value })
                      }
                      onBlur={() => kaydet(row, idx + 1)}
                      rows={Math.max(1, row.bagli_oldugu_birim.split("\n").length)}
                      placeholder="Birden fazlaysa her satıra bir tane yazın"
                      className={HUCRE_INPUT + " resize-none leading-4"}
                    />
                  </td>

                  {/* Sorumlu Kişi/ler: SERBEST METİN — seçenek yok, elle yazılır.
                      Birden fazla isim, her biri kendi satırında (Enter ile) girilir;
                      textarea satır sayısı içeriğe göre büyür ki tüm isimler her zaman
                      görünür kalsın (kırpılmasın/kaydırma gerekmesin). */}
                  <td className="p-1.5 border align-top">
                    <textarea
                      value={row.sorumlu_kisiler}
                      onChange={(e) =>
                        updateRow(row.key, { sorumlu_kisiler: e.target.value })
                      }
                      onBlur={() => kaydet(row, idx + 1)}
                      rows={Math.max(1, row.sorumlu_kisiler.split("\n").length)}
                      placeholder="Ad Soyad (birden fazlaysa her satıra bir isim yazın)"
                      className={HUCRE_INPUT + " resize-none leading-4"}
                    />
                  </td>

                  {/* Doldurulacak Döküman No: seçenek doğrudan hücrede, altında serbest metin */}
                  <td className="p-1.5 border align-top">
                    <select
                      value={row.dokumanSecim}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateRow(row.key, { dokumanSecim: val });
                        if (val !== DIGER) {
                          kaydet({ ...row, dokumanSecim: val }, idx + 1);
                        }
                      }}
                      className={HUCRE_INPUT}
                    >
                      {DOKUMAN_NO_SECIMLERI.map((g) => (
                        <option key={g} value={g}>
                          {g.length > 40 ? g.slice(0, 40) + "…" : g}
                        </option>
                      ))}
                    </select>
                    {row.dokumanSecim === DIGER && (
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

                  <td className="p-1.5 border align-top">
                    <input
                      type="date"
                      value={row.egitim_tarihi}
                      onChange={(e) => updateRow(row.key, { egitim_tarihi: e.target.value })}
                      onBlur={() => kaydet(row, idx + 1)}
                      className={HUCRE_INPUT}
                    />
                  </td>

                  <td className="p-1.5 border text-center align-top">
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
