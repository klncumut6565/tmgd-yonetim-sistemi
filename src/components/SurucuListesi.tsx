"use client";

// SÜRÜCÜ LİSTESİ (TMGDK-L3)
//
// Sürücüler menüsü altındaki alt sekme. "drivers" tablosundaki genel
// sürücü/araç kaydından (ehliyet, telefon vb.) BAĞIMSIZ, kendi başına bir
// kontrol/takip listesidir — tıpkı Görevli Listesi'nin (TMGDK-G1) "Personel
// Listesi"nden (employees) bağımsız olması gibi aynı desen.
//
// Excel çıktısındaki tabloyla BİREBİR aynı görünüm: sütun başlıkları ve
// hemen altlarında (aynı hücrede) o sütuna ait giriş kontrolü yer alır.
//
// Satır davranışı (Görevli Listesi ile aynı — Google E-Tablolar mantığı):
//   - Var olan satırlar hücre bazında düzenlenir; bir alan blur olduğunda
//     (veya select değiştiğinde) otomatik kaydedilir.
//   - Tablonun en altında her zaman BOŞ bir satır durur; Adı Soyadı
//     doldurulup o satırdan çıkıldığında satır veritabanına eklenir ve
//     altına yeni bir boş satır eklenir.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";
import { surucuListesiExcelOlustur } from "@/lib/surucuListesiExcel";
import { surucuListesiPdfOlustur, type LogoData, type SurucuBelgeEki } from "@/lib/surucuListesiPdf";
import { pdfIlkSayfayiGorselYap } from "@/lib/pdfSayfaGorseli";

type SurucuKaydi = {
  id: string;
  firm_id: string;
  sira_no: number;
  ad_soyad: string;
  tc_kimlik_no: string | null;
  src5_sertifikasi: string | null;
  ise_giris_tarihi: string | null;
  isten_cikis_tarihi: string | null;
  sertifika_gecerlilik_tarihi: string | null;
  src5_dosya_yolu: string | null;
  src5_dosya_adi: string | null;
  ehliyet_dosya_yolu: string | null;
  ehliyet_dosya_adi: string | null;
};

const SRC5_SECENEKLERI = ["Var", "Yok"];

type SatirState = {
  key: string; // React key — db id veya "yeni-N"
  id: string | null; // veritabanı id'si; null ise henüz kaydedilmedi
  ad_soyad: string;
  tc_kimlik_no: string;
  src5_sertifikasi: string;
  ise_giris_tarihi: string;
  isten_cikis_tarihi: string;
  sertifika_gecerlilik_tarihi: string;
  src5_dosya_yolu: string | null;
  src5_dosya_adi: string | null;
  ehliyet_dosya_yolu: string | null;
  ehliyet_dosya_adi: string | null;
  kaydediliyor: boolean;
};

let yeniSayac = 0;
function bosSatir(): SatirState {
  yeniSayac += 1;
  return {
    key: `yeni-${yeniSayac}`,
    id: null,
    ad_soyad: "",
    tc_kimlik_no: "",
    src5_sertifikasi: SRC5_SECENEKLERI[0],
    ise_giris_tarihi: "",
    isten_cikis_tarihi: "",
    sertifika_gecerlilik_tarihi: "",
    src5_dosya_yolu: null,
    src5_dosya_adi: null,
    ehliyet_dosya_yolu: null,
    ehliyet_dosya_adi: null,
    kaydediliyor: false,
  };
}

function kayittanSatir(k: SurucuKaydi): SatirState {
  return {
    key: k.id,
    id: k.id,
    ad_soyad: k.ad_soyad || "",
    tc_kimlik_no: k.tc_kimlik_no || "",
    src5_sertifikasi: k.src5_sertifikasi || SRC5_SECENEKLERI[0],
    ise_giris_tarihi: k.ise_giris_tarihi || "",
    isten_cikis_tarihi: k.isten_cikis_tarihi || "",
    sertifika_gecerlilik_tarihi: k.sertifika_gecerlilik_tarihi || "",
    src5_dosya_yolu: k.src5_dosya_yolu || null,
    src5_dosya_adi: k.src5_dosya_adi || null,
    ehliyet_dosya_yolu: k.ehliyet_dosya_yolu || null,
    ehliyet_dosya_adi: k.ehliyet_dosya_adi || null,
    kaydediliyor: false,
  };
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

export default function SurucuListesi({
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
            .from("firm_surucu_listesi")
            .select("*")
            .eq("firm_id", firmId)
            .order("sira_no"),
          supabase.from("firms").select("logo_url").eq("id", firmId).single(),
        ]);
        if (iptal) return;
        if (kayitRes.error) throw kayitRes.error;
        const yuklenen = ((kayitRes.data as SurucuKaydi[]) || []).map(kayittanSatir);
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
    const adSoyad = satir.ad_soyad.trim();
    if (!adSoyad) return; // henüz yeterli veri yok, kaydetme

    setRows((prev) => prev.map((r) => (r.key === satir.key ? { ...r, kaydediliyor: true } : r)));
    setError("");
    try {
      const govde = {
        firm_id: firmId,
        sira_no: siraNo,
        ad_soyad: adSoyad,
        tc_kimlik_no: satir.tc_kimlik_no.trim() || null,
        src5_sertifikasi: satir.src5_sertifikasi || null,
        ise_giris_tarihi: satir.ise_giris_tarihi || null,
        isten_cikis_tarihi: satir.isten_cikis_tarihi || null,
        sertifika_gecerlilik_tarihi: satir.sertifika_gecerlilik_tarihi || null,
      };

      if (satir.id) {
        const { error: err } = await supabase
          .from("firm_surucu_listesi")
          .update(govde)
          .eq("id", satir.id);
        if (err) throw err;
        setRows((prev) =>
          prev.map((r) => (r.key === satir.key ? { ...r, kaydediliyor: false } : r))
        );
      } else {
        const { data, error: err } = await supabase
          .from("firm_surucu_listesi")
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
        .from("firm_surucu_listesi")
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

  // --- SRC5 / Ehliyet dosya yükleme, görüntüleme, silme ---------------------
  // "firm-files" bucket'ı — FirmScopedCrud'daki dosyaEki ile AYNI bucket,
  // ayrı bir alt yol altında (firmId/firm_surucu_listesi/rowId/...).

  const BELGE_ALANLARI = {
    src5: { yol: "src5_dosya_yolu", ad: "src5_dosya_adi", etiket: "SRC5 Sertifikası" },
    ehliyet: { yol: "ehliyet_dosya_yolu", ad: "ehliyet_dosya_adi", etiket: "Ehliyet" },
  } as const;
  type BelgeTuru = keyof typeof BELGE_ALANLARI;

  async function belgeYukle(satir: SatirState, tur: BelgeTuru, file: File) {
    if (!satir.id) {
      setError("Dosya yüklemeden önce satırı kaydetmek için önce Adı Soyadı girin.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.key === satir.key ? { ...r, kaydediliyor: true } : r)));
    setError("");
    try {
      const uzanti = file.name.includes(".") ? file.name.split(".").pop() : "";
      const guvenliAd = `${tur}_${Date.now()}${uzanti ? "." + uzanti : ""}`;
      const yol = `${firmId}/firm_surucu_listesi/${satir.id}/${guvenliAd}`;

      const { error: upErr } = await supabase.storage
        .from("firm-files")
        .upload(yol, file, { upsert: false });
      if (upErr) throw upErr;

      const alan = BELGE_ALANLARI[tur];
      const { error: dbErr } = await supabase
        .from("firm_surucu_listesi")
        .update({ [alan.yol]: yol, [alan.ad]: file.name })
        .eq("id", satir.id);
      if (dbErr) {
        await supabase.storage.from("firm-files").remove([yol]);
        throw dbErr;
      }

      setRows((prev) =>
        prev.map((r) =>
          r.key === satir.key
            ? { ...r, [alan.yol]: yol, [alan.ad]: file.name, kaydediliyor: false }
            : r
        )
      );
      setMesaj(`✓ ${alan.etiket} yüklendi.`);
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
      setRows((prev) =>
        prev.map((r) => (r.key === satir.key ? { ...r, kaydediliyor: false } : r))
      );
    }
  }

  async function belgeSil(satir: SatirState, tur: BelgeTuru) {
    const alan = BELGE_ALANLARI[tur];
    const yol = satir[alan.yol as "src5_dosya_yolu" | "ehliyet_dosya_yolu"];
    if (!satir.id || !yol) return;
    if (!confirm(`${alan.etiket} dosyasını silmek istediğinize emin misiniz?`)) return;
    setError("");
    try {
      const { error: dbErr } = await supabase
        .from("firm_surucu_listesi")
        .update({ [alan.yol]: null, [alan.ad]: null })
        .eq("id", satir.id);
      if (dbErr) throw dbErr;
      await supabase.storage.from("firm-files").remove([yol]);
      setRows((prev) =>
        prev.map((r) => (r.key === satir.key ? { ...r, [alan.yol]: null, [alan.ad]: null } : r))
      );
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    }
  }

  async function belgeGoruntule(yol: string) {
    const { data } = await supabase.storage.from("firm-files").createSignedUrl(yol, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
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
      ad_soyad: r.ad_soyad,
      tc_kimlik_no: r.tc_kimlik_no,
      src5_sertifikasi: r.src5_sertifikasi,
      ise_giris_tarihi: trTarih(r.ise_giris_tarihi),
      isten_cikis_tarihi: trTarih(r.isten_cikis_tarihi),
      sertifika_gecerlilik_tarihi: trTarih(r.sertifika_gecerlilik_tarihi),
    }));
  }

  async function excelIndir() {
    setBusy(true);
    setError("");
    try {
      const buf = await surucuListesiExcelOlustur({
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
      a.download = `Surucu_Listesi_${temizAd}.xlsx`;
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

  /** Bir dosyayı (image veya PDF) fetch edip SurucuBelgeEki için hazır bir
   *  JPEG dataURL'e çevirir. PDF ise ilk sayfası rastere edilir. */
  async function belgeEkiHazirla(
    yol: string,
    adSoyad: string,
    tur: SurucuBelgeEki["tur"]
  ): Promise<SurucuBelgeEki | null> {
    try {
      const { data: signed } = await supabase.storage.from("firm-files").createSignedUrl(yol, 600);
      if (!signed?.signedUrl) return null;
      const res = await fetch(signed.signedUrl);
      const blob = await res.blob();

      let dataUrl: string;
      if (blob.type === "application/pdf" || yol.toLowerCase().endsWith(".pdf")) {
        dataUrl = await pdfIlkSayfayiGorselYap(await blob.arrayBuffer());
      } else {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
      }
      return { adSoyad, tur, dataUrl };
    } catch {
      return null; // bir ek hazırlanamazsa PDF yine de eksiksiz üretilir
    }
  }

  async function pdfIndir() {
    setBusy(true);
    setError("");
    try {
      const logo = await logoDataUrl();

      const ekIstekleri: Promise<SurucuBelgeEki | null>[] = [];
      for (const r of kayitliSatirlar) {
        if (r.src5_dosya_yolu) {
          ekIstekleri.push(belgeEkiHazirla(r.src5_dosya_yolu, r.ad_soyad, "SRC5 Sertifikası"));
        }
        if (r.ehliyet_dosya_yolu) {
          ekIstekleri.push(belgeEkiHazirla(r.ehliyet_dosya_yolu, r.ad_soyad, "Ehliyet"));
        }
      }
      const ekler = (await Promise.all(ekIstekleri)).filter((e): e is SurucuBelgeEki => e !== null);

      const blob = await surucuListesiPdfOlustur({
        firmaAdi,
        hazirlayanAdi,
        bugun: bugununTarihi(),
        satirlar: satirlariHazirla(),
        logo,
        ekler,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const temizAd = firmaAdi.replace(/[^\w\sğüşıöçĞÜŞİÖÇ-]/g, "").trim().replace(/\s+/g, "_");
      a.download = `Surucu_Listesi_${temizAd}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMesaj(
        ekler.length > 0
          ? `✓ PDF indirildi (${ekler.length} belge eki dahil).`
          : "✓ PDF indirildi."
      );
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
          <h2 className="text-lg font-bold">🚚 Sürücü Listesi</h2>
          <p className="text-sm text-gray-500">
            TMGDK-L3 — hücrelere doğrudan yazın; Adı Soyadı doldurulup satırdan
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
              <th className="p-2 border text-left w-44">Adı Soyadı</th>
              <th className="p-2 border text-left w-32">T.C. Kimlik No</th>
              <th className="p-2 border text-left w-36">SRC5 Sertifikası</th>
              <th className="p-2 border text-left w-32">İşe Giriş Tarihi</th>
              <th className="p-2 border text-left w-32">İşten Çıkış Tarihi</th>
              <th className="p-2 border text-left w-36">Sertifika Geçerlilik Tarihi</th>
              <th className="p-2 border text-left w-32">SRC5 Belgesi</th>
              <th className="p-2 border text-left w-32">Ehliyet</th>
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

                  <td className="p-1.5 border align-top">
                    <input
                      type="text"
                      value={row.ad_soyad}
                      onChange={(e) => updateRow(row.key, { ad_soyad: e.target.value })}
                      onBlur={() => kaydet(row, idx + 1)}
                      placeholder="Ad Soyad"
                      className={HUCRE_INPUT}
                    />
                  </td>

                  <td className="p-1.5 border align-top">
                    <input
                      type="text"
                      value={row.tc_kimlik_no}
                      onChange={(e) => updateRow(row.key, { tc_kimlik_no: e.target.value })}
                      onBlur={() => kaydet(row, idx + 1)}
                      maxLength={11}
                      placeholder="11 haneli T.C. No"
                      className={HUCRE_INPUT}
                    />
                  </td>

                  {/* SRC5 Sertifikası: seçenek doğrudan hücrede (Var/Yok) */}
                  <td className="p-1.5 border align-top">
                    <select
                      value={row.src5_sertifikasi}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateRow(row.key, { src5_sertifikasi: val });
                        kaydet({ ...row, src5_sertifikasi: val }, idx + 1);
                      }}
                      className={HUCRE_INPUT}
                    >
                      {SRC5_SECENEKLERI.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-1.5 border align-top">
                    <input
                      type="date"
                      value={row.ise_giris_tarihi}
                      onChange={(e) => updateRow(row.key, { ise_giris_tarihi: e.target.value })}
                      onBlur={() => kaydet(row, idx + 1)}
                      className={HUCRE_INPUT}
                    />
                  </td>

                  <td className="p-1.5 border align-top">
                    <input
                      type="date"
                      value={row.isten_cikis_tarihi}
                      onChange={(e) => updateRow(row.key, { isten_cikis_tarihi: e.target.value })}
                      onBlur={() => kaydet(row, idx + 1)}
                      className={HUCRE_INPUT}
                    />
                  </td>

                  <td className="p-1.5 border align-top">
                    <input
                      type="date"
                      value={row.sertifika_gecerlilik_tarihi}
                      onChange={(e) =>
                        updateRow(row.key, { sertifika_gecerlilik_tarihi: e.target.value })
                      }
                      onBlur={() => kaydet(row, idx + 1)}
                      className={HUCRE_INPUT}
                    />
                  </td>

                  {/* SRC5 Belgesi ve Ehliyet: dosya yükleme/görüntüleme/silme.
                      Satır henüz kaydedilmemişse (id yok) yükleme yapılamaz —
                      önce Adı Soyadı girilip satırın kaydedilmesi gerekir. */}
                  {(["src5", "ehliyet"] as const).map((tur) => {
                    const yol = tur === "src5" ? row.src5_dosya_yolu : row.ehliyet_dosya_yolu;
                    const ad = tur === "src5" ? row.src5_dosya_adi : row.ehliyet_dosya_adi;
                    return (
                      <td key={tur} className="p-1.5 border align-top">
                        {yol ? (
                          <div className="flex items-center gap-1 text-xs">
                            <button
                              type="button"
                              onClick={() => belgeGoruntule(yol)}
                              title={ad || "Belgeyi görüntüle"}
                              className="text-blue-600 hover:underline truncate max-w-[80px]"
                            >
                              📎 {ad || "Belge"}
                            </button>
                            <button
                              type="button"
                              onClick={() => belgeSil(row, tur)}
                              title="Belgeyi kaldır"
                              className="text-red-500 hover:text-red-700 shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label
                            className={
                              "inline-flex items-center gap-1 text-xs cursor-pointer " +
                              (row.id ? "text-blue-600 hover:underline" : "text-gray-300 cursor-not-allowed")
                            }
                            title={row.id ? "Dosya yükle" : "Önce Adı Soyadı girip satırı kaydedin"}
                          >
                            📎 Yükle
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              disabled={!row.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) belgeYukle(row, tur, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </td>
                    );
                  })}

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
    </div>
  );
}
