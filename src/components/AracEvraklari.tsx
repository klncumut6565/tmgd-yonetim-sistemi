"use client";

// src/components/AracEvraklari.tsx
//
// ARAÇ EVRAKI OLUŞTUR — Araçlar menüsü altındaki alt sekme.
//
// Kullanıcının paylaştığı örnek belge ("[PLAKA] PLAKALI ARAÇ EVRAKLARI",
// Ek-1..Ek-10) formatında, her araç için TEK bir PDF'te birleştirilmiş
// araç evrakı üretir.
//
// ÇOKLU DOSYA DESTEĞİ (migration 050): her belge türü (Ek-1 TMFB, Ek-2 K1,
// Ek-3..Ek-10 araca özel) BİRDEN FAZLA dosya kabul eder — firm_arac_evrak_
// dosyalari çocuk tablosunda satır başına bir dosya olarak saklanır. PDF
// üretiminde bir türe ait TÜM dosyalar sırayla ayrı sayfa olarak eklenir.
//
// İKİ FARKLI BELGE KATEGORİSİ:
//   - Firma ortak belgeleri (Ek-1 TMFB, Ek-2 K1): vehicle_id NULL, TÜM
//     araçlarda kullanılır.
//   - Araca özel belgeler (Ek-3 Taşıt Kartı, Ek-4 Araç Muayenesi, Ek-5 Araç
//     Ruhsatı, Ek-7 Sigorta-Kasko, Ek-9 SRC5 Belgesi, Ek-10 Taşıma
//     Evrakları): seçilen araca göre ayrı ayrı yüklenir.
//   - Ek-6 (Yazılı Talimat) ve Ek-8 (ADR Çantası İçeriği): TÜM araçlarda
//     ortak, jenerik ADR referans içeriği — hiç yükleme gerektirmez, PDF
//     üretiminde otomatik eklenir (bkz. aracEvrakStatik.ts).

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/supabase/authFetch";
import { hataCevir } from "@/lib/hataCevir";
import { pdfIlkSayfayiGorselYap } from "@/lib/pdfSayfaGorseli";
import {
  aracEvraklariPdfOlustur,
  type AracEvrakBelgesi,
  type LogoData,
} from "@/lib/aracEvraklariPdf";

type Arac = { id: string; plate_number: string };

type BelgeDosyasi = {
  id: string;
  file_path: string;
  file_name: string;
};

const ORTAK_BELGE_TURLERI = [
  { anahtar: "tmfb", ekNo: 1, baslik: "Tehlikeli Madde Faaliyet Belgesi (TMFB)" },
  { anahtar: "k1", ekNo: 2, baslik: "K1 Taşıma Yetki Belgesi" },
] as const;
type OrtakBelgeTuru = (typeof ORTAK_BELGE_TURLERI)[number]["anahtar"];

const ARAC_BELGE_SLOTLARI = [
  { anahtar: "tasit_karti", ekNo: 3, baslik: "Taşıt Kartı" },
  { anahtar: "arac_muayene", ekNo: 4, baslik: "Araç Muayenesi" },
  { anahtar: "arac_ruhsat", ekNo: 5, baslik: "Araç Ruhsatı" },
  { anahtar: "sigorta_kasko", ekNo: 7, baslik: "Araç Sigorta -KASKO-Tehlikeli Madde Mali Sorumluluk Sigortası(TMMS)" },
  { anahtar: "src5_belgesi", ekNo: 9, baslik: "SRC5 Belgeli Şoför Sertifikası" },
  { anahtar: "tasima_evraklari", ekNo: 10, baslik: "Karayolu İle Atık Taşıma Aracı Uygunluk Belgesi" },
] as const;
type AracBelgeAnahtari = (typeof ARAC_BELGE_SLOTLARI)[number]["anahtar"];

function bugununTarihi(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export default function AracEvraklari({
  firmId,
  firmaAdi,
  preselectVehicleId,
}: {
  firmId: string;
  firmaAdi: string;
  /** Mobilden Tara dönüşünde önceden seçili gösterilecek araç ID'si. */
  preselectVehicleId?: string;
}) {
  const [araclar, setAraclar] = useState<Arac[]>([]);
  const [secilenAracId, setSecilenAracId] = useState<string>("");
  // Firma ortak belgeler: anahtar -> dosya listesi (birden fazla olabilir)
  const [ortakDosyalar, setOrtakDosyalar] = useState<Record<OrtakBelgeTuru, BelgeDosyasi[]>>({
    tmfb: [],
    k1: [],
  });
  // Araca özel belgeler: anahtar -> dosya listesi (seçili araca ait)
  const [aracDosyalar, setAracDosyalar] = useState<Record<AracBelgeAnahtari, BelgeDosyasi[]>>({
    tasit_karti: [],
    arac_muayene: [],
    arac_ruhsat: [],
    sigorta_kasko: [],
    src5_belgesi: [],
    tasima_evraklari: [],
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hazirlayanAdi, setHazirlayanAdi] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mesaj, setMesaj] = useState("");

  const ortakDosyalariYukle = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("firm_arac_evrak_dosyalari")
      .select("id, belge_turu, file_path, file_name")
      .eq("firm_id", firmId)
      .is("vehicle_id", null)
      .order("created_at");
    if (err) return;
    const gruplu: Record<OrtakBelgeTuru, BelgeDosyasi[]> = { tmfb: [], k1: [] };
    for (const row of (data as { id: string; belge_turu: string; file_path: string; file_name: string }[]) || []) {
      if (row.belge_turu === "tmfb" || row.belge_turu === "k1") {
        gruplu[row.belge_turu].push({ id: row.id, file_path: row.file_path, file_name: row.file_name });
      }
    }
    setOrtakDosyalar(gruplu);
  }, [firmId]);

  const aracDosyalariYukle = useCallback(async (vehicleId: string) => {
    const { data, error: err } = await supabase
      .from("firm_arac_evrak_dosyalari")
      .select("id, belge_turu, file_path, file_name")
      .eq("vehicle_id", vehicleId)
      .order("created_at");
    if (err) return;
    const gruplu: Record<AracBelgeAnahtari, BelgeDosyasi[]> = {
      tasit_karti: [], arac_muayene: [], arac_ruhsat: [],
      sigorta_kasko: [], src5_belgesi: [], tasima_evraklari: [],
    };
    for (const row of (data as { id: string; belge_turu: string; file_path: string; file_name: string }[]) || []) {
      if (row.belge_turu in gruplu) {
        gruplu[row.belge_turu as AracBelgeAnahtari].push({ id: row.id, file_path: row.file_path, file_name: row.file_name });
      }
    }
    setAracDosyalar(gruplu);
  }, []);

  useEffect(() => {
    let iptal = false;
    async function yukle() {
      setLoading(true);
      setError("");
      try {
        const [aracRes, firmRes, tmgdRes] = await Promise.all([
          supabase.from("vehicles").select("id, plate_number").eq("firm_id", firmId).order("plate_number"),
          supabase.from("firms").select("logo_url").eq("id", firmId).single(),
          supabase.rpc("get_firm_tmgd_name", { p_firm_id: firmId }),
        ]);
        if (iptal) return;
        if (aracRes.error) throw aracRes.error;
        const liste = (aracRes.data as Arac[]) || [];
        setAraclar(liste);
        if (preselectVehicleId && liste.some((a) => a.id === preselectVehicleId)) {
          setSecilenAracId(preselectVehicleId);
        } else if (liste.length > 0) {
          setSecilenAracId(liste[0].id);
        }

        setLogoUrl((firmRes.data as { logo_url: string | null } | null)?.logo_url ?? null);
        setHazirlayanAdi((tmgdRes.data as string) || "");
        await ortakDosyalariYukle();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmId]);

  // Seçilen araç değiştiğinde o araca ait dosyaları getir.
  useEffect(() => {
    if (!secilenAracId) {
      setAracDosyalar({
        tasit_karti: [], arac_muayene: [], arac_ruhsat: [],
        sigorta_kasko: [], src5_belgesi: [], tasima_evraklari: [],
      });
      return;
    }
    aracDosyalariYukle(secilenAracId);
  }, [secilenAracId, aracDosyalariYukle]);

  /** Firma ortak belgesi (TMFB/K1) yükler — mevcut dosyaların yanına EKLER,
   *  üzerine yazmaz (birden fazla dosya biriktirilebilir). */
  async function ortakBelgeYukle(tur: OrtakBelgeTuru, files: FileList) {
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const uzanti = file.name.includes(".") ? file.name.split(".").pop() : "";
        const yol = `${firmId}/firma-ortak-belgeler/${tur}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${uzanti ? "." + uzanti : ""}`;
        const { error: upErr } = await supabase.storage.from("firm-files").upload(yol, file, { upsert: false });
        if (upErr) throw upErr;

        const { error: dbErr } = await supabase.from("firm_arac_evrak_dosyalari").insert({
          firm_id: firmId,
          vehicle_id: null,
          belge_turu: tur,
          file_path: yol,
          file_name: file.name,
        });
        if (dbErr) {
          await supabase.storage.from("firm-files").remove([yol]);
          throw dbErr;
        }
      }
      await ortakDosyalariYukle();
      setMesaj(`✓ ${files.length > 1 ? `${files.length} dosya` : "Dosya"} yüklendi.`);
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  async function ortakBelgeSil(tur: OrtakBelgeTuru, dosya: BelgeDosyasi) {
    if (!confirm(`"${dosya.file_name}" silinsin mi? (Tüm araçları etkiler)`)) return;
    setError("");
    try {
      const { error: dbErr } = await supabase.from("firm_arac_evrak_dosyalari").delete().eq("id", dosya.id);
      if (dbErr) throw dbErr;
      await supabase.storage.from("firm-files").remove([dosya.file_path]);
      setOrtakDosyalar((prev) => ({ ...prev, [tur]: prev[tur].filter((d) => d.id !== dosya.id) }));
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    }
  }

  /** Araca özel belge yükler — mevcut dosyaların yanına EKLER. */
  async function aracBelgeYukle(anahtar: AracBelgeAnahtari, files: FileList) {
    if (!secilenAracId) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const uzanti = file.name.includes(".") ? file.name.split(".").pop() : "";
        const yol = `${firmId}/firm_arac_evraklari/${secilenAracId}/${anahtar}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${uzanti ? "." + uzanti : ""}`;
        const { error: upErr } = await supabase.storage.from("firm-files").upload(yol, file, { upsert: false });
        if (upErr) throw upErr;

        const { error: dbErr } = await supabase.from("firm_arac_evrak_dosyalari").insert({
          firm_id: firmId,
          vehicle_id: secilenAracId,
          belge_turu: anahtar,
          file_path: yol,
          file_name: file.name,
        });
        if (dbErr) {
          await supabase.storage.from("firm-files").remove([yol]);
          throw dbErr;
        }
      }
      await aracDosyalariYukle(secilenAracId);
      setMesaj(`✓ ${files.length > 1 ? `${files.length} dosya` : "Dosya"} yüklendi.`);
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  async function aracBelgeSil(anahtar: AracBelgeAnahtari, dosya: BelgeDosyasi) {
    if (!confirm(`"${dosya.file_name}" silinsin mi?`)) return;
    setError("");
    try {
      const { error: dbErr } = await supabase.from("firm_arac_evrak_dosyalari").delete().eq("id", dosya.id);
      if (dbErr) throw dbErr;
      await supabase.storage.from("firm-files").remove([dosya.file_path]);
      setAracDosyalar((prev) => ({ ...prev, [anahtar]: prev[anahtar].filter((d) => d.id !== dosya.id) }));
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    }
  }

  /**
   * Ortam değişkeni NEXT_PUBLIC_TARAYICI_URL ayarlıysa mobil tarama
   * butonu gösterilir — Belge Takip'teki "📷 Mobilden Tara" ile aynı
   * mantık (bkz. firms/[id]/page.tsx).
   */
  const tarayiciYapilandirilmis = !!process.env.NEXT_PUBLIC_TARAYICI_URL;

  /**
   * Ortak firma belgesi (TMFB/K1) veya araca özel belge (Ek-3..Ek-10) için
   * mobil tarama oturumu başlatır. Pencere ÖNCE (senkron) açılır — aradaki
   * authFetch beklemesi yüzünden sonradan window.open çağırmak mobil
   * Safari'de açılır pencere engelleyiciye takılabiliyordu.
   */
  async function mobildenTara(
    hedefTipi: "arac_ortak" | "arac_ozel",
    hedefVeri: Record<string, unknown>
  ) {
    const pencere = window.open("", "_blank");
    if (!pencere) {
      setError("Yeni sekme açılamadı — tarayıcının açılır pencere engelleyicisini kontrol et.");
      return;
    }

    try {
      const res = await authFetch("/api/belge-tarama/baslat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmId, hedefTipi, hedefVeri }),
      });
      const json = await res.json();

      if (!res.ok || !json.url) {
        pencere.close();
        setError(json.error ?? "Tarama başlatılamadı.");
        return;
      }

      pencere.location.href = json.url;
    } catch (e) {
      pencere.close();
      setError("Tarama başlatılamadı: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function belgeGoruntule(yol: string) {
    const { data } = await supabase.storage.from("firm-files").createSignedUrl(yol, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function logoDataUrl(): Promise<LogoData> {
    if (!logoUrl) return null;
    try {
      const { data: signed } = await supabase.storage.from("firm-files").createSignedUrl(logoUrl, 600);
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

  /** Bir depo yolundaki dosyayı (görsel veya PDF) fetch edip PDF'e
   *  gömülebilecek hazır bir JPEG dataURL'e çevirir. */
  async function belgeDataUrlHazirla(yol: string): Promise<string | null> {
    try {
      const { data: signed } = await supabase.storage.from("firm-files").createSignedUrl(yol, 600);
      if (!signed?.signedUrl) return null;
      const res = await fetch(signed.signedUrl);
      const blob = await res.blob();
      if (blob.type === "application/pdf" || yol.toLowerCase().endsWith(".pdf")) {
        return await pdfIlkSayfayiGorselYap(await blob.arrayBuffer());
      }
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async function pdfOlustur() {
    const secilenArac = araclar.find((a) => a.id === secilenAracId);
    if (!secilenArac) {
      setError("Önce bir araç seçin.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const logo = await logoDataUrl();

      const belgeler: AracEvrakBelgesi[] = [];

      for (const ortak of ORTAK_BELGE_TURLERI) {
        const dosyalar = ortakDosyalar[ortak.anahtar];
        const dataUrls: string[] = [];
        for (const d of dosyalar) {
          const url = await belgeDataUrlHazirla(d.file_path);
          if (url) dataUrls.push(url);
        }
        belgeler.push({ ekNo: ortak.ekNo, baslik: ortak.baslik, dataUrls });
      }

      for (const slot of ARAC_BELGE_SLOTLARI) {
        const dosyalar = aracDosyalar[slot.anahtar];
        const dataUrls: string[] = [];
        for (const d of dosyalar) {
          const url = await belgeDataUrlHazirla(d.file_path);
          if (url) dataUrls.push(url);
        }
        belgeler.push({ ekNo: slot.ekNo, baslik: slot.baslik, dataUrls });
      }

      const blob = await aracEvraklariPdfOlustur({
        firmaAdi,
        plaka: secilenArac.plate_number,
        hazirlayanAdi,
        bugun: bugununTarihi(),
        logo,
        belgeler,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${secilenArac.plate_number.replace(/\s+/g, "")}_Arac_Evraklari.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMesaj("✓ Araç evrakı PDF'i indirildi.");
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Yükleniyor…</div>;
  }

  /** Bir belge türü için dosya listesini + "birden fazla dosya" yükleme
   *  alanını gösteren satır. Zaten yüklenmiş dosyalar üstte listelenir,
   *  ALTINDA her zaman "📎 Dosya Ekle" alanı durur (multiple attribute
   *  ile tek seferde birden fazla dosya seçilebilir; ayrıca istenildiği
   *  kadar tekrar tekrar dosya eklenebilir — üzerine yazma yok). */
  function BelgeSatiri({
    baslik,
    dosyalar,
    onYukle,
    onSil,
    onMobilTara,
  }: {
    baslik: string;
    dosyalar: BelgeDosyasi[];
    onYukle: (files: FileList) => void;
    onSil: (dosya: BelgeDosyasi) => void;
    /** Verilirse ve tarayici_ios yapılandırılmışsa "📷 Mobilden Tara" butonu gösterilir. */
    onMobilTara?: () => void;
  }) {
    return (
      <div className="py-2 px-3 border rounded-lg bg-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{baslik}</span>
          <div className="flex items-center gap-2 text-xs shrink-0">
            <label className="inline-flex items-center gap-1 text-blue-600 hover:underline cursor-pointer">
              📎 {dosyalar.length > 0 ? "Dosya Ekle" : "Yükle"}
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) onYukle(files);
                  e.target.value = "";
                }}
              />
            </label>
            {onMobilTara && tarayiciYapilandirilmis && (
              <button
                type="button"
                onClick={onMobilTara}
                title="Telefon kamerasıyla tara — belge otomatik PDF olarak buraya eklenir"
                className="text-gray-500 hover:underline"
              >
                📷 Mobilden Tara
              </button>
            )}
          </div>
        </div>

        {dosyalar.length > 0 && (
          <div className="mt-2 space-y-1">
            {dosyalar.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                <button
                  type="button"
                  onClick={() => belgeGoruntule(d.file_path)}
                  className="text-blue-600 hover:underline truncate max-w-[220px] text-left"
                  title={d.file_name}
                >
                  📄 {d.file_name}
                </button>
                <button
                  type="button"
                  onClick={() => onSil(d)}
                  className="text-red-500 hover:text-red-700 ml-2 shrink-0"
                  title="Kaldır"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-3">
        <h2 className="text-lg font-bold">📁 Araç Evrakı Oluştur</h2>
        <p className="text-sm text-gray-500">
          Her araç için Ek-1..Ek-10 sıralı, tek bir PDF halinde birleştirilmiş araç evrakı üretir. Her belge türüne birden fazla dosya eklenebilir.
        </p>
      </div>

      {error && <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
      {mesaj && <div className="mb-3 p-2 rounded-lg bg-green-50 text-green-700 text-sm">{mesaj}</div>}

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Firma Ortak Belgeleri (tüm araçlarda kullanılır)
        </h3>
        <div className="space-y-2">
          {ORTAK_BELGE_TURLERI.map((ortak) => (
            <BelgeSatiri
              key={ortak.anahtar}
              baslik={`Ek-${ortak.ekNo} — ${ortak.baslik}`}
              dosyalar={ortakDosyalar[ortak.anahtar]}
              onYukle={(files) => ortakBelgeYukle(ortak.anahtar, files)}
              onSil={(dosya) => ortakBelgeSil(ortak.anahtar, dosya)}
              onMobilTara={() => mobildenTara("arac_ortak", { tur: ortak.anahtar })}
            />
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Araç Seçimi</h3>
        {araclar.length === 0 ? (
          <p className="text-xs text-gray-400">
            Bu firmada kayıtlı araç yok. Önce Araçlar listesinden ekleyin.
          </p>
        ) : (
          <select
            value={secilenAracId}
            onChange={(e) => setSecilenAracId(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-sm w-full max-w-xs"
          >
            {araclar.map((a) => (
              <option key={a.id} value={a.id}>
                {a.plate_number}
              </option>
            ))}
          </select>
        )}
      </div>

      {secilenAracId && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {araclar.find((a) => a.id === secilenAracId)?.plate_number} — Araca Özel Belgeler
          </h3>
          <div className="space-y-2">
            {ARAC_BELGE_SLOTLARI.map((slot) => (
              <BelgeSatiri
                key={slot.anahtar}
                baslik={`Ek-${slot.ekNo} — ${slot.baslik}`}
                dosyalar={aracDosyalar[slot.anahtar]}
                onYukle={(files) => aracBelgeYukle(slot.anahtar, files)}
                onSil={(dosya) => aracBelgeSil(slot.anahtar, dosya)}
                onMobilTara={() => mobildenTara("arac_ozel", { vehicleId: secilenAracId, anahtar: slot.anahtar })}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Ek-6 (Yazılı Talimat) ve Ek-8 (ADR Çantası İçeriği) tüm araçlarda ortaktır, otomatik eklenir — yükleme gerekmez.
          </p>
        </div>
      )}

      <button
        onClick={pdfOlustur}
        disabled={busy || !secilenAracId}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Hazırlanıyor…" : "📄 Araç Evrakı PDF'i Oluştur ve İndir"}
      </button>
    </div>
  );
}
