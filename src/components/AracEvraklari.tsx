"use client";

// src/components/AracEvraklari.tsx
//
// ARAÇ EVRAKI OLUŞTUR — Araçlar menüsü altındaki alt sekme.
//
// Kullanıcının paylaştığı örnek belge ("[PLAKA] PLAKALI ARAÇ EVRAKLARI",
// Ek-1..Ek-10) formatında, her araç için TEK bir PDF'te birleştirilmiş
// araç evrakı üretir.
//
// İKİ FARKLI BELGE KATEGORİSİ:
//   - Firma ortak belgeleri (Ek-1 TMFB, Ek-2 K1): bir kez yüklenir, TÜM
//     araçlarda kullanılır (firms tablosunda saklanır).
//   - Araca özel belgeler (Ek-3 Taşıt Kartı, Ek-4 Araç Muayenesi, Ek-5 Araç
//     Ruhsatı, Ek-7 Sigorta-Kasko, Ek-9 SRC5 Belgesi, Ek-10 Taşıma
//     Evrakları): seçilen araca göre ayrı ayrı yüklenir.
//   - Ek-6 (Yazılı Talimat) ve Ek-8 (ADR Çantası İçeriği): TÜM araçlarda
//     ortak, jenerik ADR referans içeriği — hiç yükleme gerektirmez, PDF
//     üretiminde otomatik eklenir (bkz. aracEvrakStatik.ts).

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";
import { pdfIlkSayfayiGorselYap } from "@/lib/pdfSayfaGorseli";
import {
  aracEvraklariPdfOlustur,
  type AracEvrakBelgesi,
  type LogoData,
} from "@/lib/aracEvraklariPdf";

type Arac = { id: string; plate_number: string };

type FirmOrtakBelgeler = {
  tmfb_dosya_yolu: string | null;
  tmfb_dosya_adi: string | null;
  k1_dosya_yolu: string | null;
  k1_dosya_adi: string | null;
};

type AracEvrakKaydi = {
  id: string;
  vehicle_id: string;
  tasit_karti_yolu: string | null;
  tasit_karti_adi: string | null;
  arac_muayene_yolu: string | null;
  arac_muayene_adi: string | null;
  arac_ruhsat_yolu: string | null;
  arac_ruhsat_adi: string | null;
  sigorta_kasko_yolu: string | null;
  sigorta_kasko_adi: string | null;
  src5_belgesi_yolu: string | null;
  src5_belgesi_adi: string | null;
  tasima_evraklari_yolu: string | null;
  tasima_evraklari_adi: string | null;
};

const ARAC_BELGE_SLOTLARI = [
  { anahtar: "tasit_karti", ekNo: 3, baslik: "Taşıt Kartı" },
  { anahtar: "arac_muayene", ekNo: 4, baslik: "Araç Muayenesi" },
  { anahtar: "arac_ruhsat", ekNo: 5, baslik: "Araç Ruhsatı" },
  { anahtar: "sigorta_kasko", ekNo: 7, baslik: "Araç Sigorta-Kasko" },
  { anahtar: "src5_belgesi", ekNo: 9, baslik: "SRC5 Belgeli Şoför Sertifikası" },
  { anahtar: "tasima_evraklari", ekNo: 10, baslik: "Taşıma Evrakları" },
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
}: {
  firmId: string;
  firmaAdi: string;
}) {
  const [araclar, setAraclar] = useState<Arac[]>([]);
  const [secilenAracId, setSecilenAracId] = useState<string>("");
  const [ortakBelgeler, setOrtakBelgeler] = useState<FirmOrtakBelgeler>({
    tmfb_dosya_yolu: null,
    tmfb_dosya_adi: null,
    k1_dosya_yolu: null,
    k1_dosya_adi: null,
  });
  const [aracEvrak, setAracEvrak] = useState<AracEvrakKaydi | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hazirlayanAdi, setHazirlayanAdi] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    let iptal = false;
    async function yukle() {
      setLoading(true);
      setError("");
      try {
        const [aracRes, firmRes, tmgdRes] = await Promise.all([
          supabase.from("vehicles").select("id, plate_number").eq("firm_id", firmId).order("plate_number"),
          supabase
            .from("firms")
            .select("logo_url, tmfb_dosya_yolu, tmfb_dosya_adi, k1_dosya_yolu, k1_dosya_adi")
            .eq("id", firmId)
            .single(),
          supabase.rpc("get_firm_tmgd_name", { p_firm_id: firmId }),
        ]);
        if (iptal) return;
        if (aracRes.error) throw aracRes.error;
        const liste = (aracRes.data as Arac[]) || [];
        setAraclar(liste);
        if (liste.length > 0) setSecilenAracId(liste[0].id);

        const firmVeri = firmRes.data as
          | (FirmOrtakBelgeler & { logo_url: string | null })
          | null;
        setLogoUrl(firmVeri?.logo_url ?? null);
        setOrtakBelgeler({
          tmfb_dosya_yolu: firmVeri?.tmfb_dosya_yolu ?? null,
          tmfb_dosya_adi: firmVeri?.tmfb_dosya_adi ?? null,
          k1_dosya_yolu: firmVeri?.k1_dosya_yolu ?? null,
          k1_dosya_adi: firmVeri?.k1_dosya_adi ?? null,
        });
        setHazirlayanAdi((tmgdRes.data as string) || "");
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

  // Seçilen araç değiştiğinde o araca ait evrak kaydını getir.
  useEffect(() => {
    if (!secilenAracId) {
      setAracEvrak(null);
      return;
    }
    let iptal = false;
    async function yukle() {
      const { data } = await supabase
        .from("firm_arac_evraklari")
        .select("*")
        .eq("vehicle_id", secilenAracId)
        .maybeSingle();
      if (!iptal) setAracEvrak((data as AracEvrakKaydi) || null);
    }
    yukle();
    return () => {
      iptal = true;
    };
  }, [secilenAracId]);

  async function ortakBelgeYukle(tur: "tmfb" | "k1", file: File) {
    setBusy(true);
    setError("");
    try {
      const uzanti = file.name.includes(".") ? file.name.split(".").pop() : "";
      const yol = `${firmId}/firma-ortak-belgeler/${tur}_${Date.now()}${uzanti ? "." + uzanti : ""}`;
      const { error: upErr } = await supabase.storage.from("firm-files").upload(yol, file, { upsert: false });
      if (upErr) throw upErr;

      const guncelleme =
        tur === "tmfb"
          ? { tmfb_dosya_yolu: yol, tmfb_dosya_adi: file.name }
          : { k1_dosya_yolu: yol, k1_dosya_adi: file.name };
      const { error: dbErr } = await supabase.from("firms").update(guncelleme).eq("id", firmId);
      if (dbErr) {
        await supabase.storage.from("firm-files").remove([yol]);
        throw dbErr;
      }
      setOrtakBelgeler((prev) => ({ ...prev, ...guncelleme }));
      setMesaj(`✓ ${tur === "tmfb" ? "TMFB" : "K1 Belgesi"} yüklendi.`);
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  async function ortakBelgeSil(tur: "tmfb" | "k1") {
    const yol = tur === "tmfb" ? ortakBelgeler.tmfb_dosya_yolu : ortakBelgeler.k1_dosya_yolu;
    if (!yol) return;
    if (!confirm(`${tur === "tmfb" ? "TMFB" : "K1 Belgesi"} silinsin mi? (Tüm araçları etkiler)`)) return;
    setError("");
    try {
      const guncelleme =
        tur === "tmfb"
          ? { tmfb_dosya_yolu: null, tmfb_dosya_adi: null }
          : { k1_dosya_yolu: null, k1_dosya_adi: null };
      const { error: dbErr } = await supabase.from("firms").update(guncelleme).eq("id", firmId);
      if (dbErr) throw dbErr;
      await supabase.storage.from("firm-files").remove([yol]);
      setOrtakBelgeler((prev) => ({ ...prev, ...guncelleme }));
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    }
  }

  async function aracBelgeYukle(anahtar: AracBelgeAnahtari, file: File) {
    if (!secilenAracId) return;
    setBusy(true);
    setError("");
    try {
      const uzanti = file.name.includes(".") ? file.name.split(".").pop() : "";
      const yol = `${firmId}/firm_arac_evraklari/${secilenAracId}/${anahtar}_${Date.now()}${uzanti ? "." + uzanti : ""}`;
      const { error: upErr } = await supabase.storage.from("firm-files").upload(yol, file, { upsert: false });
      if (upErr) throw upErr;

      const govde = { [`${anahtar}_yolu`]: yol, [`${anahtar}_adi`]: file.name };
      let kayit: AracEvrakKaydi;
      if (aracEvrak) {
        const { data, error: dbErr } = await supabase
          .from("firm_arac_evraklari")
          .update(govde)
          .eq("id", aracEvrak.id)
          .select("*")
          .single();
        if (dbErr) throw dbErr;
        kayit = data as AracEvrakKaydi;
      } else {
        const { data, error: dbErr } = await supabase
          .from("firm_arac_evraklari")
          .insert({ firm_id: firmId, vehicle_id: secilenAracId, ...govde })
          .select("*")
          .single();
        if (dbErr) throw dbErr;
        kayit = data as AracEvrakKaydi;
      }
      setAracEvrak(kayit);
      setMesaj("✓ Belge yüklendi.");
    } catch (e) {
      setError(hataCevir(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  async function aracBelgeSil(anahtar: AracBelgeAnahtari) {
    if (!aracEvrak) return;
    const yol = aracEvrak[`${anahtar}_yolu` as keyof AracEvrakKaydi] as string | null;
    if (!yol) return;
    if (!confirm("Bu belgeyi silmek istediğinize emin misiniz?")) return;
    setError("");
    try {
      const govde = { [`${anahtar}_yolu`]: null, [`${anahtar}_adi`]: null };
      const { error: dbErr } = await supabase
        .from("firm_arac_evraklari")
        .update(govde)
        .eq("id", aracEvrak.id);
      if (dbErr) throw dbErr;
      await supabase.storage.from("firm-files").remove([yol]);
      setAracEvrak((prev) => (prev ? { ...prev, ...govde } : prev));
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

      belgeler.push({
        ekNo: 1,
        baslik: "Tehlikeli Madde Faaliyet Belgesi",
        dataUrl: ortakBelgeler.tmfb_dosya_yolu ? await belgeDataUrlHazirla(ortakBelgeler.tmfb_dosya_yolu) : null,
      });
      belgeler.push({
        ekNo: 2,
        baslik: "K1 Taşıma Yetki Belgesi",
        dataUrl: ortakBelgeler.k1_dosya_yolu ? await belgeDataUrlHazirla(ortakBelgeler.k1_dosya_yolu) : null,
      });

      for (const slot of ARAC_BELGE_SLOTLARI) {
        const yol = aracEvrak?.[`${slot.anahtar}_yolu` as keyof AracEvrakKaydi] as string | null | undefined;
        belgeler.push({
          ekNo: slot.ekNo,
          baslik: slot.baslik,
          dataUrl: yol ? await belgeDataUrlHazirla(yol) : null,
        });
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

  function BelgeSatiri({
    baslik,
    yol,
    ad,
    onYukle,
    onSil,
  }: {
    baslik: string;
    yol: string | null;
    ad: string | null;
    onYukle: (file: File) => void;
    onSil: () => void;
  }) {
    return (
      <div className="flex items-center justify-between py-2 px-3 border rounded-lg bg-white">
        <span className="text-sm font-medium">{baslik}</span>
        {yol ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => belgeGoruntule(yol)}
              className="text-blue-600 hover:underline truncate max-w-[160px]"
              title={ad || "Belgeyi görüntüle"}
            >
              📎 {ad || "Belge"}
            </button>
            <button type="button" onClick={onSil} className="text-red-500 hover:text-red-700" title="Kaldır">
              ✕
            </button>
          </div>
        ) : (
          <label className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline cursor-pointer">
            📎 Yükle
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onYukle(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-3">
        <h2 className="text-lg font-bold">📁 Araç Evrakı Oluştur</h2>
        <p className="text-sm text-gray-500">
          Her araç için Ek-1..Ek-10 sıralı, tek bir PDF halinde birleştirilmiş araç evrakı üretir.
        </p>
      </div>

      {error && <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
      {mesaj && <div className="mb-3 p-2 rounded-lg bg-green-50 text-green-700 text-sm">{mesaj}</div>}

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Firma Ortak Belgeleri (tüm araçlarda kullanılır)
        </h3>
        <div className="space-y-2">
          <BelgeSatiri
            baslik="Ek-1 — Tehlikeli Madde Faaliyet Belgesi (TMFB)"
            yol={ortakBelgeler.tmfb_dosya_yolu}
            ad={ortakBelgeler.tmfb_dosya_adi}
            onYukle={(f) => ortakBelgeYukle("tmfb", f)}
            onSil={() => ortakBelgeSil("tmfb")}
          />
          <BelgeSatiri
            baslik="Ek-2 — K1 Taşıma Yetki Belgesi"
            yol={ortakBelgeler.k1_dosya_yolu}
            ad={ortakBelgeler.k1_dosya_adi}
            onYukle={(f) => ortakBelgeYukle("k1", f)}
            onSil={() => ortakBelgeSil("k1")}
          />
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
                yol={(aracEvrak?.[`${slot.anahtar}_yolu` as keyof AracEvrakKaydi] as string | null) ?? null}
                ad={(aracEvrak?.[`${slot.anahtar}_adi` as keyof AracEvrakKaydi] as string | null) ?? null}
                onYukle={(f) => aracBelgeYukle(slot.anahtar, f)}
                onSil={() => aracBelgeSil(slot.anahtar)}
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
