"use client";

// src/app/reports/atik-firmalari/page.tsx
//
// ATIK FİRMALARI — VERGİ NO + TMFB KÜTÜPHANESİ
//
// Atık bertaraf/geri kazanım firmalarına ait vergi numaraları ve Tehlikeli
// Madde Faaliyet Belgelerinin (TMFB) tek yerde toplandığı, Mevzuat
// kütüphanesiyle AYNI desende çalışan bir alt sayfa (Raporlar altında).
//
// Sıralama: firma adına göre alfabetik (Türkçe locale).
// Yetki: yalnızca super_admin, admin, tmgd görüntüler/yükler/siler.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";

type AtikFirmasi = {
  id: string;
  firma_adi: string;
  vergi_no: string | null;
  tmfb_numarasi: string | null;
  tmfb_gecerlilik_tarihi: string | null;
  aciklama: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

const ERISEBILEN_ROLLER = ["super_admin", "admin", "tmgd"];

function boyutYaz(b: number | null): string {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function tarihYaz(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export default function AtikFirmalariPage() {
  const { profile, isSuperAdmin, loading: userLoading } = useUser();
  const yetkili = isSuperAdmin || ERISEBILEN_ROLLER.includes(profile?.role || "");
  // Yükleme/silme de aynı üç rolle sınırlı (görüntüleme ile aynı yetki seti).
  const canWrite = yetkili;

  const [kayitlar, setKayitlar] = useState<AtikFirmasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [arama, setArama] = useState("");

  // Yükleme formu
  const [formAcik, setFormAcik] = useState(false);
  const [firmaAdi, setFirmaAdi] = useState("");
  const [vergiNo, setVergiNo] = useState("");
  const [tmfbNo, setTmfbNo] = useState("");
  const [tmfbGecerlilik, setTmfbGecerlilik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [dosya, setDosya] = useState<File | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const dosyaRef = useRef<HTMLInputElement>(null);

  // Firma bilgi paneli — firma adına tıklanınca açılır (TMFB belgesini
  // AÇMAZ; belge yalnızca kendi ayrı bağlantısına tıklanınca açılır).
  const [detay, setDetay] = useState<AtikFirmasi | null>(null);

  const yukle = useCallback(async () => {
    setLoading(true);
    // Sıralama: firma adına göre alfabetik. Supabase .order() Türkçe
    // karakter sıralamasında (ç, ğ, ı, ö, ş, ü) veritabanı collation'ına
    // bağlı kalabileceğinden, tarayıcı tarafında .localeCompare('tr-TR')
    // ile ayrıca (ve kesin olarak) yeniden sıralanıyor — bkz. aşağıdaki
    // useMemo (gosterilen).
    const { data, error: err } = await supabase
      .from("atik_firmalari")
      .select("*")
      .order("firma_adi", { ascending: true });

    if (err) {
      setError(
        /does not exist|not find the table/i.test(err.message)
          ? "Atık/Taşımacı Firmaları tablosu bulunamadı — veritabanı güncellemesi (046_atik_firmalari_tmfb.sql) çalıştırılmalı."
          : "Yüklenemedi: " + hataCevir(err)
      );
      setKayitlar([]);
    } else {
      setError("");
      setKayitlar((data as AtikFirmasi[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (yetkili) yukle();
    else setLoading(false);
  }, [yukle, yetkili]);

  /** Dosyayı yeni sekmede tam ekran açar (imzalı URL ile). */
  async function belgeAc(k: AtikFirmasi) {
    const pencere = window.open("", "_blank");
    const { data, error: err } = await supabase.storage
      .from("atik-firmalari-tmfb")
      .createSignedUrl(k.file_path, 3600);

    if (err || !data?.signedUrl) {
      pencere?.close();
      setError("Belge açılamadı: " + (err?.message ?? "imzalı bağlantı üretilemedi"));
      return;
    }
    if (pencere) pencere.location.href = data.signedUrl;
    else window.open(data.signedUrl, "_blank");
  }

  async function kaydet() {
    if (!firmaAdi.trim()) { setMesaj("Firma adı zorunlu."); return; }
    if (!dosya) { setMesaj("TMFB dosyası seç."); return; }
    if (dosya.size > 25 * 1024 * 1024) { setMesaj("Dosya 25 MB'tan büyük olamaz."); return; }

    setYukleniyor(true);
    setMesaj("");

    const uzanti = dosya.name.split(".").pop() || "pdf";
    const yol = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${uzanti}`;

    const { error: upErr } = await supabase.storage
      .from("atik-firmalari-tmfb")
      .upload(yol, dosya, { contentType: dosya.type || undefined });

    if (upErr) {
      setYukleniyor(false);
      setMesaj("Dosya yüklenemedi: " + upErr.message);
      return;
    }

    const { error: insErr } = await supabase.from("atik_firmalari").insert({
      firma_adi: firmaAdi.trim(),
      vergi_no: vergiNo.trim() || null,
      tmfb_numarasi: tmfbNo.trim() || null,
      tmfb_gecerlilik_tarihi: tmfbGecerlilik || null,
      aciklama: aciklama.trim() || null,
      file_path: yol,
      file_name: dosya.name,
      file_size: dosya.size,
      mime_type: dosya.type || null,
      yukleyen: profile?.id ?? null,
    });

    setYukleniyor(false);

    if (insErr) {
      // Kayıt başarısızsa yüklenen dosyayı geri al — yetim dosya kalmasın
      await supabase.storage.from("atik-firmalari-tmfb").remove([yol]);
      setMesaj("Kaydedilemedi: " + hataCevir(insErr));
      return;
    }

    setMesaj("✓ Atık/Taşımacı firması eklendi.");
    setFirmaAdi(""); setVergiNo(""); setTmfbNo(""); setTmfbGecerlilik(""); setAciklama(""); setDosya(null);
    if (dosyaRef.current) dosyaRef.current.value = "";
    setFormAcik(false);
    yukle();
  }

  async function sil(k: AtikFirmasi) {
    const ok = window.confirm(`"${k.firma_adi}" kaydını silmek istediğine emin misin?`);
    if (!ok) return;

    const { error: delErr } = await supabase.from("atik_firmalari").delete().eq("id", k.id);
    if (delErr) { setError("Silinemedi: " + hataCevir(delErr)); return; }
    await supabase.storage.from("atik-firmalari-tmfb").remove([k.file_path]);
    yukle();
  }

  // Filtreleme + kesin alfabetik sıralama (Türkçe locale)
  const gosterilen = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    return kayitlar
      .filter((k) => {
        if (!q) return true;
        return (
          k.firma_adi.toLocaleLowerCase("tr-TR").includes(q) ||
          (k.vergi_no || "").toLocaleLowerCase("tr-TR").includes(q) ||
          (k.aciklama || "").toLocaleLowerCase("tr-TR").includes(q)
        );
      })
      .sort((a, b) => a.firma_adi.localeCompare(b.firma_adi, "tr-TR"));
  }, [kayitlar, arama]);

  if (userLoading) {
    return <div className="p-8 text-gray-500">Yükleniyor...</div>;
  }

  if (!yetkili) {
    return (
      <div className="p-8">
        <Link href="/reports" className="text-sm text-blue-600 hover:underline">← Raporlar</Link>
        <div className="border rounded-xl p-8 text-center text-gray-400 mt-4">
          Bu sayfayı görüntüleme yetkiniz yok. (Yalnızca yönetici ve TMGD rolleri erişebilir.)
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex gap-2 mb-4">
        <Link
          href="/reports"
          className="px-3 py-1.5 rounded-lg text-sm border bg-white hover:bg-gray-50"
        >
          📊 Raporlar
        </Link>
        <span className="px-3 py-1.5 rounded-lg text-sm border bg-blue-600 text-white border-blue-600">
          🗑️ Atık/Taşımacı Firmaları
        </span>
      </div>

      <div className="flex items-center justify-between mb-2 mt-2">
        <div>
          <h1 className="text-3xl font-bold">Atık/Taşımacı Firmaları</h1>
          <p className="text-sm text-gray-500 mt-1">
            Vergi numaraları ve Tehlikeli Madde Faaliyet Belgeleri (TMFB) — firma adına göre alfabetik.
          </p>
        </div>
        {!formAcik && (
          <button
            onClick={() => { setFormAcik(true); setMesaj(""); }}
            className="px-4 py-2 bg-black text-white rounded text-sm whitespace-nowrap"
          >
            + Atık/Taşımacı Firması Ekle
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm bg-amber-50 border border-amber-200 rounded p-3 my-3">{error}</p>
      )}

      {/* Yükleme formu */}
      {formAcik && (
        <div className="border rounded-xl p-4 my-4 bg-gray-50">
          <h2 className="font-semibold text-sm mb-3">Yeni Atık/Taşımacı Firması</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-600">Firma Adı *</span>
              <input
                className="border p-2 w-full rounded mt-1 text-sm"
                placeholder="örn. ABC Atık Bertaraf A.Ş."
                value={firmaAdi}
                onChange={(e) => setFirmaAdi(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Vergi Numarası</span>
              <input
                className="border p-2 w-full rounded mt-1 text-sm"
                placeholder="Vergi kimlik numarası"
                value={vergiNo}
                onChange={(e) => setVergiNo(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">TMFB Numarası</span>
              <input
                className="border p-2 w-full rounded mt-1 text-sm"
                placeholder="Belge numarası"
                value={tmfbNo}
                onChange={(e) => setTmfbNo(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">TMFB Geçerlilik Tarihi</span>
              <input
                type="date"
                className="border p-2 w-full rounded mt-1 text-sm"
                value={tmfbGecerlilik}
                onChange={(e) => setTmfbGecerlilik(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">TMFB Dosyası * (en fazla 25 MB)</span>
              <input
                ref={dosyaRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="border p-2 w-full rounded mt-1 text-sm bg-white"
                onChange={(e) => setDosya(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs text-gray-600">Açıklama</span>
              <textarea
                rows={2}
                className="border p-2 w-full rounded mt-1 text-sm"
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
              />
            </label>
          </div>

          {mesaj && <p className="text-sm mt-3 text-gray-700">{mesaj}</p>}

          <div className="flex gap-2 mt-3">
            <button
              onClick={kaydet}
              disabled={yukleniyor}
              className="px-4 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
            >
              {yukleniyor ? "Yükleniyor..." : "Kaydet"}
            </button>
            <button
              onClick={() => { setFormAcik(false); setMesaj(""); }}
              className="px-4 py-2 border rounded text-sm"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* Arama */}
      <div className="flex flex-wrap gap-2 my-4">
        <input
          className="border p-2 rounded text-sm flex-1 min-w-[200px]"
          placeholder="🔍 Firma adı, vergi no veya açıklamada ara..."
          value={arama}
          onChange={(e) => setArama(e.target.value)}
        />
      </div>

      {loading && <p className="text-gray-500">Yükleniyor...</p>}

      {!loading && gosterilen.length === 0 && !error && (
        <div className="border rounded-xl p-8 text-center text-gray-400">
          {kayitlar.length === 0
            ? "Henüz atık/taşımacı firması eklenmemiş."
            : "Aramanla eşleşen kayıt yok."}
        </div>
      )}

      {/* Alfabetik liste */}
      {gosterilen.length > 0 && (
        <div className="border rounded-xl divide-y overflow-hidden">
          {gosterilen.map((k) => (
            <div key={k.id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setDetay(k)}
                  className="text-sm font-medium text-gray-900 hover:underline text-left"
                  title="Firma bilgilerini göster"
                >
                  {k.firma_adi}
                </button>
                <p className="text-xs text-gray-500 mt-0.5">
                  {k.vergi_no ? `VN: ${k.vergi_no} · ` : ""}
                  <button
                    onClick={() => belgeAc(k)}
                    className="text-blue-600 hover:underline"
                    title="TMFB'yi yeni sekmede aç"
                  >
                    📄 {k.file_name}
                  </button>
                  {boyutYaz(k.file_size) && ` · ${boyutYaz(k.file_size)}`}
                </p>
                {k.aciklama && (
                  <p className="text-xs text-gray-400 mt-0.5">{k.aciklama}</p>
                )}
              </div>
              {canWrite && (
                <button
                  onClick={() => sil(k)}
                  className="text-xs px-2 py-1 border rounded text-red-600 hover:bg-red-50 shrink-0"
                >
                  Sil
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Firma bilgi paneli — firma adına tıklanınca açılır */}
      {detay && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setDetay(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">Firma Bilgileri</h2>
              <button onClick={() => setDetay(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">İşletme Unvanı</dt>
                <dd className="font-medium">{detay.firma_adi}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Vergi Numarası</dt>
                <dd>{detay.vergi_no || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">TMFB Numarası</dt>
                <dd>{detay.tmfb_numarasi || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">TMFB Geçerlilik Tarihi</dt>
                <dd>{tarihYaz(detay.tmfb_gecerlilik_tarihi)}</dd>
              </div>
              {detay.aciklama && (
                <div>
                  <dt className="text-xs text-gray-500">Açıklama</dt>
                  <dd>{detay.aciklama}</dd>
                </div>
              )}
            </dl>
            <button
              onClick={() => belgeAc(detay)}
              className="mt-5 w-full px-4 py-2 bg-black text-white rounded text-sm"
            >
              📄 TMFB Belgesini Aç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
