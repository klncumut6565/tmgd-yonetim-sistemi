"use client";

// GÖREVLİ LİSTESİ (TMGDK-G1)
//
// Personeller menüsü altındaki alt sekme. Excel/PDF çıktısındaki tabloyla
// BİREBİR aynı görünüm: sütun başlıkları (Sıra No / Görev Başlığı / ...) ve
// hemen altlarında (aynı hücrede) o sütuna ait giriş kontrolü (select /
// input / textarea / tarih / çoklu personel listesi) yer alır — ayrı bir
// "yeni satır ekle" formu YOK, her şey doğrudan tablonun içinde.
//
// Satır davranışı (Google E-Tablolar mantığı):
//   - Var olan satırlar hücre bazında düzenlenir; bir alan blur olduğunda
//     (veya select değiştiğinde) otomatik kaydedilir.
//   - Tablonun en altında her zaman BOŞ bir satır durur; Görev Başlığı
//     doldurulup o satırdan çıkıldığında satır veritabanına eklenir ve
//     altına yeni bir boş satır eklenir.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";
import { gorevliListesiExcelOlustur } from "@/lib/gorevliListesiExcel";
import { gorevliListesiPdfOlustur, type LogoData } from "@/lib/gorevliListesiPdf";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  status: string | null;
};

type GorevliKaydi = {
  id: string;
  firm_id: string;
  sira_no: number;
  gorev_basligi: string;
  yapilacak_gorevler: string | null;
  bagli_oldugu_birim: string | null;
  sorumlu_personel_ids: string[];
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

type SatirState = {
  key: string; // React key — db id veya "yeni-N"
  id: string | null; // veritabanı id'si; null ise henüz kaydedilmedi
  gorevSecim: string;
  gorevSerbest: string;
  yapilacak_gorevler: string;
  bagli_oldugu_birim: string;
  personel_ids: string[];
  doldurulacak_dokuman_no: string;
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
    yapilacak_gorevler: "",
    bagli_oldugu_birim: "",
    personel_ids: [],
    doldurulacak_dokuman_no: "",
    egitim_tarihi: "",
    kaydediliyor: false,
  };
}

function kayittanSatir(k: GorevliKaydi): SatirState {
  const serbest = !GOREV_BASLIKLARI.includes(k.gorev_basligi);
  return {
    key: k.id,
    id: k.id,
    gorevSecim: serbest ? DIGER : k.gorev_basligi,
    gorevSerbest: serbest ? k.gorev_basligi : "",
    yapilacak_gorevler: k.yapilacak_gorevler || "",
    bagli_oldugu_birim: k.bagli_oldugu_birim || "",
    personel_ids: k.sorumlu_personel_ids || [],
    doldurulacak_dokuman_no: k.doldurulacak_dokuman_no || "",
    egitim_tarihi: k.egitim_tarihi || "",
    kaydediliyor: false,
  };
}

function etkinGorevBasligi(s: SatirState): string {
  return (s.gorevSecim === DIGER ? s.gorevSerbest : s.gorevSecim).trim();
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
  const [employees, setEmployees] = useState<Employee[]>([]);
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
        const [empRes, kayitRes, firmRes] = await Promise.all([
          supabase
            .from("employees")
            .select("id, first_name, last_name, status")
            .eq("firm_id", firmId)
            .order("first_name"),
          supabase
            .from("firm_gorevli_listesi")
            .select("*")
            .eq("firm_id", firmId)
            .order("sira_no"),
          supabase.from("firms").select("logo_url").eq("id", firmId).single(),
        ]);
        if (iptal) return;
        if (empRes.error) throw empRes.error;
        if (kayitRes.error) throw kayitRes.error;
        setEmployees((empRes.data as Employee[]) || []);
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

  const personelAdi = useMemo(() => {
    const harita = new Map<string, string>();
    employees.forEach((e) => harita.set(e.id, `${e.first_name} ${e.last_name}`));
    return harita;
  }, [employees]);

  function isimleriGetir(ids: string[]): string {
    return ids
      .map((id) => personelAdi.get(id))
      .filter((v): v is string => Boolean(v))
      .join(", ");
  }

  function updateRow(key: string, patch: Partial<SatirState>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function kaydet(satir: SatirState, siraNo: number) {
    const gorevBasligi = etkinGorevBasligi(satir);
    if (!gorevBasligi) return; // henüz yeterli veri yok, kaydetme

    setRows((prev) => prev.map((r) => (r.key === satir.key ? { ...r, kaydediliyor: true } : r)));
    setError("");
    try {
      const govde = {
        firm_id: firmId,
        sira_no: siraNo,
        gorev_basligi: gorevBasligi,
        yapilacak_gorevler: satir.yapilacak_gorevler.trim() || null,
        bagli_oldugu_birim: satir.bagli_oldugu_birim.trim() || null,
        sorumlu_personel_ids: satir.personel_ids,
        doldurulacak_dokuman_no: satir.doldurulacak_dokuman_no.trim() || null,
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
      gorev_basligi: etkinGorevBasligi(r),
      yapilacak_gorevler: r.yapilacak_gorevler,
      bagli_oldugu_birim: r.bagli_oldugu_birim,
      sorumluIsimler: isimleriGetir(r.personel_ids),
      doldurulacak_dokuman_no: r.doldurulacak_dokuman_no,
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
              <th className="p-2 border text-left w-48">Sorumlu Kişi/ler</th>
              <th className="p-2 border text-left w-40">Doldurulacak Döküman No</th>
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

                  <td className="p-1.5 border align-top">
                    <textarea
                      value={row.yapilacak_gorevler}
                      onChange={(e) =>
                        updateRow(row.key, { yapilacak_gorevler: e.target.value })
                      }
                      onBlur={() => kaydet(row, idx + 1)}
                      rows={2}
                      className={HUCRE_INPUT}
                    />
                  </td>

                  <td className="p-1.5 border align-top">
                    <input
                      type="text"
                      value={row.bagli_oldugu_birim}
                      onChange={(e) =>
                        updateRow(row.key, { bagli_oldugu_birim: e.target.value })
                      }
                      onBlur={() => kaydet(row, idx + 1)}
                      className={HUCRE_INPUT}
                    />
                  </td>

                  {/* Sorumlu Kişi/ler: seçenekler doğrudan hücrenin altında görünür liste */}
                  <td className="p-1.5 border align-top">
                    <select
                      multiple
                      size={Math.min(4, Math.max(2, employees.length || 2))}
                      value={row.personel_ids}
                      onChange={(e) => {
                        const secililer = Array.from(e.target.selectedOptions).map(
                          (o) => o.value
                        );
                        updateRow(row.key, { personel_ids: secililer });
                      }}
                      onBlur={() => kaydet(row, idx + 1)}
                      className={HUCRE_INPUT}
                    >
                      {employees.length === 0 && (
                        <option disabled value="">
                          Kayıtlı personel yok
                        </option>
                      )}
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.first_name} {e.last_name}
                          {e.status === "inactive" ? " (pasif)" : ""}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-1.5 border align-top">
                    <input
                      type="text"
                      value={row.doldurulacak_dokuman_no}
                      onChange={(e) =>
                        updateRow(row.key, { doldurulacak_dokuman_no: e.target.value })
                      }
                      onBlur={() => kaydet(row, idx + 1)}
                      className={HUCRE_INPUT}
                    />
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
