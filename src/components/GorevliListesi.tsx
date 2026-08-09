"use client";

// GÖREVLİ LİSTESİ (TMGDK-G1)
//
// Personeller menüsü altındaki alt sekme. Firmadaki kayıtlı personellerden
// (employees tablosu) seçim yapılarak "Tehlikeli Madde İş ve İşlemlerinde
// Görevli Personel Listesi" satırları oluşturulur. Her satır bir görev
// başlığına (Gönderen/Alıcı/Boşaltan/Paketleyen/Dolduran/Yükleyen veya
// serbest metin) karşılık gelir ve bir veya birden fazla personel atanabilir.
//
// Canlı önizleme + Excel/PDF export (bkz. gorevliListesiExcel.ts,
// gorevliListesiPdf.ts).

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
  "Diğer (serbest metin)",
];

const bosForm = {
  gorev_basligi: GOREV_BASLIKLARI[0],
  gorev_basligi_serbest: "",
  yapilacak_gorevler: "",
  bagli_oldugu_birim: "",
  doldurulacak_dokuman_no: "",
  egitim_tarihi: "",
  personel_ids: [] as string[],
};

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

export default function GorevliListesi({
  firmId,
  firmaAdi,
}: {
  firmId: string;
  firmaAdi: string;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [kayitlar, setKayitlar] = useState<GorevliKaydi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ ...bosForm });
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);
  const [formAcik, setFormAcik] = useState(false);

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
        setKayitlar((kayitRes.data as GorevliKaydi[]) || []);
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

  function formuSifirla() {
    setForm({ ...bosForm });
    setDuzenlenenId(null);
    setFormAcik(false);
  }

  function duzenlemeyeBasla(k: GorevliKaydi) {
    const serbest = !GOREV_BASLIKLARI.slice(0, 6).includes(k.gorev_basligi);
    setForm({
      gorev_basligi: serbest ? GOREV_BASLIKLARI[6] : k.gorev_basligi,
      gorev_basligi_serbest: serbest ? k.gorev_basligi : "",
      yapilacak_gorevler: k.yapilacak_gorevler || "",
      bagli_oldugu_birim: k.bagli_oldugu_birim || "",
      doldurulacak_dokuman_no: k.doldurulacak_dokuman_no || "",
      egitim_tarihi: k.egitim_tarihi || "",
      personel_ids: k.sorumlu_personel_ids || [],
    });
    setDuzenlenenId(k.id);
    setFormAcik(true);
  }

  async function kaydet() {
    setError("");
    setMesaj("");
    const gorevBasligi =
      form.gorev_basligi === "Diğer (serbest metin)"
        ? form.gorev_basligi_serbest.trim()
        : form.gorev_basligi;
    if (!gorevBasligi) {
      setError("Görev başlığı boş olamaz.");
      return;
    }
    setBusy(true);
    try {
      const govde = {
        firm_id: firmId,
        sira_no: duzenlenenId
          ? kayitlar.find((k) => k.id === duzenlenenId)?.sira_no ?? kayitlar.length + 1
          : kayitlar.length + 1,
        gorev_basligi: gorevBasligi,
        yapilacak_gorevler: form.yapilacak_gorevler.trim() || null,
        bagli_oldugu_birim: form.bagli_oldugu_birim.trim() || null,
        sorumlu_personel_ids: form.personel_ids,
        doldurulacak_dokuman_no: form.doldurulacak_dokuman_no.trim() || null,
        egitim_tarihi: form.egitim_tarihi || null,
      };

      if (duzenlenenId) {
        const { data, error: err } = await supabase
          .from("firm_gorevli_listesi")
          .update(govde)
          .eq("id", duzenlenenId)
          .select("*")
          .single();
        if (err) throw err;
        setKayitlar((prev) =>
          prev.map((k) => (k.id === duzenlenenId ? (data as GorevliKaydi) : k))
        );
        setMesaj("✓ Satır güncellendi.");
      } else {
        const { data, error: err } = await supabase
          .from("firm_gorevli_listesi")
          .insert(govde)
          .select("*")
          .single();
        if (err) throw err;
        setKayitlar((prev) => [...prev, data as GorevliKaydi]);
        setMesaj("✓ Satır eklendi.");
      }
      formuSifirla();
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  async function sil(id: string) {
    if (!confirm("Bu satırı silmek istediğinize emin misiniz?")) return;
    setBusy(true);
    setError("");
    try {
      const { error: err } = await supabase
        .from("firm_gorevli_listesi")
        .delete()
        .eq("id", id);
      if (err) throw err;
      setKayitlar((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    } finally {
      setBusy(false);
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

  function satirlariHazirla() {
    return kayitlar.map((k) => ({
      sira_no: k.sira_no,
      gorev_basligi: k.gorev_basligi,
      yapilacak_gorevler: k.yapilacak_gorevler || "",
      bagli_oldugu_birim: k.bagli_oldugu_birim || "",
      sorumluIsimler: isimleriGetir(k.sorumlu_personel_ids || []),
      doldurulacak_dokuman_no: k.doldurulacak_dokuman_no || "",
      egitim_tarihi: trTarih(k.egitim_tarihi),
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
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold">📋 Görevli Listesi</h2>
          <p className="text-sm text-gray-500">
            TMGDK-G1 — Tehlikeli madde iş ve işlemlerinde görevli personel listesi.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={excelIndir}
            disabled={busy || kayitlar.length === 0}
            className="px-3 py-1.5 rounded-lg text-sm border bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            📊 Excel İndir
          </button>
          <button
            onClick={pdfIndir}
            disabled={busy || kayitlar.length === 0}
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

      {/* Önizleme tablosu */}
      <div className="overflow-x-auto border rounded-lg mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left w-10">#</th>
              <th className="p-2 text-left">Görev Başlığı</th>
              <th className="p-2 text-left">Yapılacak Görevler</th>
              <th className="p-2 text-left">Bağlı Olduğu Birim</th>
              <th className="p-2 text-left">Sorumlu Kişi/ler</th>
              <th className="p-2 text-left">Döküman No</th>
              <th className="p-2 text-left">Eğitim Tarihi</th>
              <th className="p-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {kayitlar.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-400">
                  Henüz satır eklenmedi.
                </td>
              </tr>
            )}
            {kayitlar.map((k) => (
              <tr key={k.id} className="border-t">
                <td className="p-2">{k.sira_no}</td>
                <td className="p-2">{k.gorev_basligi}</td>
                <td className="p-2">{k.yapilacak_gorevler}</td>
                <td className="p-2">{k.bagli_oldugu_birim}</td>
                <td className="p-2">{isimleriGetir(k.sorumlu_personel_ids || [])}</td>
                <td className="p-2">{k.doldurulacak_dokuman_no}</td>
                <td className="p-2">{trTarih(k.egitim_tarihi)}</td>
                <td className="p-2 text-right whitespace-nowrap">
                  <button
                    onClick={() => duzenlemeyeBasla(k)}
                    className="text-blue-600 hover:underline text-xs mr-2"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => sil(k.id)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!formAcik && (
        <button
          onClick={() => setFormAcik(true)}
          className="px-3 py-1.5 rounded-lg text-sm border bg-blue-600 text-white hover:bg-blue-700"
        >
          + Yeni Satır Ekle
        </button>
      )}

      {formAcik && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tehlikeli Madde Görev Başlığı
              </label>
              <select
                value={form.gorev_basligi}
                onChange={(e) => setForm((f) => ({ ...f, gorev_basligi: e.target.value }))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              >
                {GOREV_BASLIKLARI.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {form.gorev_basligi === "Diğer (serbest metin)" && (
                <input
                  type="text"
                  value={form.gorev_basligi_serbest}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gorev_basligi_serbest: e.target.value }))
                  }
                  placeholder="Görev başlığını yazın"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm mt-2"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Bağlı Olduğu Birim
              </label>
              <input
                type="text"
                value={form.bagli_oldugu_birim}
                onChange={(e) => setForm((f) => ({ ...f, bagli_oldugu_birim: e.target.value }))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Yapılacak Görevler
            </label>
            <textarea
              value={form.yapilacak_gorevler}
              onChange={(e) => setForm((f) => ({ ...f, yapilacak_gorevler: e.target.value }))}
              rows={3}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sorumlu Kişi/ler ({employees.length} kayıtlı personel)
            </label>
            <div className="border rounded-lg p-2 max-h-48 overflow-y-auto bg-white">
              {employees.length === 0 && (
                <p className="text-xs text-gray-400">
                  Bu firmada kayıtlı personel yok. Önce Personel Listesi&apos;nden ekleyin.
                </p>
              )}
              {employees.map((e) => (
                <label key={e.id} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.personel_ids.includes(e.id)}
                    onChange={(ev) => {
                      setForm((f) => ({
                        ...f,
                        personel_ids: ev.target.checked
                          ? [...f.personel_ids, e.id]
                          : f.personel_ids.filter((id) => id !== e.id),
                      }));
                    }}
                  />
                  {e.first_name} {e.last_name}
                  {e.status === "inactive" && (
                    <span className="text-xs text-gray-400">(pasif)</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Doldurulacak Döküman No
              </label>
              <input
                type="text"
                value={form.doldurulacak_dokuman_no}
                onChange={(e) =>
                  setForm((f) => ({ ...f, doldurulacak_dokuman_no: e.target.value }))
                }
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Eğitim Tarihi
              </label>
              <input
                type="date"
                value={form.egitim_tarihi}
                onChange={(e) => setForm((f) => ({ ...f, egitim_tarihi: e.target.value }))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={kaydet}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {duzenlenenId ? "Güncelle" : "Ekle"}
            </button>
            <button
              onClick={formuSifirla}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-sm border bg-white hover:bg-gray-50"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
