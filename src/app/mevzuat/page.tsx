"use client";

// src/app/mevzuat/page.tsx
//
// MEVZUAT KÜTÜPHANESİ
//
// ADR/TMGD mevzuatı (kanun, yönetmelik, tebliğ, genelge, talimat) tek yerde
// toplanır ve NORMLAR HİYERARŞİSİNE göre sıralanır: üst normdan alt norma,
// aynı seviyede yayım tarihine göre yeniden eskiye.
//
// Yetki: herkes görüntüler/açar, yalnızca admin ve super_admin yükler/siler.
// Dosyalar özel (public olmayan) bir bucket'ta tutulur; açılırken imzalı URL
// üretilir, böylece giriş yapmamış kimse erişemez.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";
import { pdfMetniCikar } from "@/lib/pdfMetin";

type Mevzuat = {
  id: string;
  baslik: string;
  tur: string;
  hiyerarsi: number;
  sayi_no: string | null;
  yayim_tarihi: string | null;
  aciklama: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  metin_durumu: string | null;
  sayfa_sayisi: number | null;
  created_at: string;
};

/**
 * Normlar hiyerarşisi — küçük değer üst normdur.
 * Tür seçildiğinde sıra otomatik atanır.
 */
const TURLER: { key: string; label: string; hiyerarsi: number; renk: string }[] = [
  { key: "kanun", label: "Kanun", hiyerarsi: 1, renk: "bg-red-100 text-red-800" },
  { key: "yonetmelik", label: "Yönetmelik", hiyerarsi: 2, renk: "bg-orange-100 text-orange-800" },
  { key: "teblig", label: "Tebliğ", hiyerarsi: 3, renk: "bg-amber-100 text-amber-800" },
  { key: "genelge", label: "Genelge", hiyerarsi: 4, renk: "bg-blue-100 text-blue-800" },
  { key: "talimat", label: "Talimat / Kılavuz", hiyerarsi: 5, renk: "bg-emerald-100 text-emerald-800" },
  { key: "diger", label: "Diğer", hiyerarsi: 9, renk: "bg-gray-100 text-gray-700" },
];

const TUR_BILGI = Object.fromEntries(TURLER.map((t) => [t.key, t]));

function boyutYaz(b: number | null): string {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function tarihYaz(t: string | null): string {
  if (!t) return "";
  const d = new Date(t);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("tr-TR");
}

export default function MevzuatPage() {
  const { profile, isSuperAdmin } = useUser();
  const yonetici = isSuperAdmin || profile?.role === "admin";

  const [kayitlar, setKayitlar] = useState<Mevzuat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [arama, setArama] = useState("");
  const [turFiltre, setTurFiltre] = useState("");

  // Yükleme formu
  const [formAcik, setFormAcik] = useState(false);
  const [baslik, setBaslik] = useState("");
  const [tur, setTur] = useState("yonetmelik");
  const [sayiNo, setSayiNo] = useState("");
  const [yayimTarihi, setYayimTarihi] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [dosya, setDosya] = useState<File | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [metinIlerleme, setMetinIlerleme] = useState("");
  const dosyaRef = useRef<HTMLInputElement>(null);

  const yukle = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("mevzuat")
      .select("*")
      .order("hiyerarsi", { ascending: true })
      .order("yayim_tarihi", { ascending: false, nullsFirst: false });

    if (err) {
      setError(
        /does not exist|not find the table/i.test(err.message)
          ? "Mevzuat tablosu bulunamadı — veritabanı güncellemesi (037_mevzuat.sql) çalıştırılmalı."
          : "Yüklenemedi: " + hataCevir(err)
      );
      setKayitlar([]);
    } else {
      setError("");
      setKayitlar((data as Mevzuat[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  /** Dosyayı yeni sekmede tam ekran açar (imzalı URL ile). */
  async function belgeAc(m: Mevzuat) {
    // Pencereyi ÖNCE aç: imzalı URL beklenirken açılırsa tarayıcı
    // açılır pencere engelleyicisi devreye girebilir.
    const pencere = window.open("", "_blank");
    const { data, error: err } = await supabase.storage
      .from("mevzuat")
      .createSignedUrl(m.file_path, 3600);

    if (err || !data?.signedUrl) {
      pencere?.close();
      setError("Belge açılamadı: " + (err?.message ?? "imzalı bağlantı üretilemedi"));
      return;
    }
    if (pencere) pencere.location.href = data.signedUrl;
    else window.open(data.signedUrl, "_blank");
  }

  async function kaydet() {
    if (!baslik.trim()) { setMesaj("Başlık zorunlu."); return; }
    if (!dosya) { setMesaj("Dosya seç."); return; }
    if (dosya.size > 25 * 1024 * 1024) { setMesaj("Dosya 25 MB'tan büyük olamaz."); return; }

    setYukleniyor(true);
    setMesaj("");

    const uzanti = dosya.name.split(".").pop() || "pdf";
    const yol = `${tur}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${uzanti}`;

    const { error: upErr } = await supabase.storage
      .from("mevzuat")
      .upload(yol, dosya, { contentType: dosya.type || undefined });

    if (upErr) {
      setYukleniyor(false);
      setMesaj("Dosya yüklenemedi: " + upErr.message);
      return;
    }

    const { data: yeniKayit, error: insErr } = await supabase.from("mevzuat").insert({
      baslik: baslik.trim(),
      tur,
      hiyerarsi: TUR_BILGI[tur]?.hiyerarsi ?? 99,
      sayi_no: sayiNo.trim() || null,
      yayim_tarihi: yayimTarihi || null,
      aciklama: aciklama.trim() || null,
      file_path: yol,
      file_name: dosya.name,
      file_size: dosya.size,
      mime_type: dosya.type || null,
      yukleyen: profile?.id ?? null,
    }).select("id").single();

    setYukleniyor(false);

    if (insErr) {
      // Kayıt başarısızsa yüklenen dosyayı geri al — yetim dosya kalmasın
      await supabase.storage.from("mevzuat").remove([yol]);
      setMesaj("Kaydedilemedi: " + hataCevir(insErr));
      return;
    }

    const yeniId = (yeniKayit as { id: string } | null)?.id;
    if (!yeniId) {
      setMesaj("Kayıt oluşturuldu ancak kimliği alınamadı; metin çıkarma atlandı.");
      yukle();
      return;
    }

    // ---- METİN ÇIKARMA ----
    // Asistanın bu belgeden cevap verebilmesi için metin sayfa sayfa
    // çıkarılıp kaydedilir. Tarayıcıda yapılıyor: dosya zaten burada,
    // sunucuya ikinci kez göndermeye ve zaman aşımı riskine gerek yok.
    if ((dosya.type || "").includes("pdf")) {
      try {
        setMetinIlerleme("Metin çıkarılıyor...");
        const { sayfalar, toplamSayfa } = await pdfMetniCikar(dosya, (islenen, toplam) => {
          setMetinIlerleme(`Metin çıkarılıyor... ${islenen}/${toplam} sayfa`);
        });

        if (sayfalar.length > 0) {
          // Büyük belgelerde tek seferde binlerce satır göndermemek için
          // parçalar hâlinde yaz
          const PARCA = 50;
          for (let i = 0; i < sayfalar.length; i += PARCA) {
            const dilim = sayfalar.slice(i, i + PARCA).map((sf) => ({
              mevzuat_id: yeniId,
              sayfa_no: sf.sayfa_no,
              icerik: sf.icerik,
            }));
            await supabase.from("mevzuat_metin").insert(dilim);
          }
          await supabase
            .from("mevzuat")
            .update({ metin_durumu: "tamam", sayfa_sayisi: toplamSayfa })
            .eq("id", yeniId);
          setMesaj(`✓ Mevzuat eklendi. ${sayfalar.length} sayfa metin işlendi — asistan bu belgeden cevap verebilir.`);
        } else {
          // Taranmış (görüntü) PDF'lerde metin katmanı yoktur
          await supabase
            .from("mevzuat")
            .update({ metin_durumu: "desteklenmiyor", sayfa_sayisi: toplamSayfa })
            .eq("id", yeniId);
          setMesaj("✓ Mevzuat eklendi. Ancak metin çıkarılamadı (taranmış görüntü olabilir) — asistan bu belgeyi okuyamaz.");
        }
      } catch {
        await supabase.from("mevzuat").update({ metin_durumu: "hata" }).eq("id", yeniId);
        setMesaj("✓ Mevzuat eklendi, ancak metin çıkarılamadı — belge yine de indirilebilir.");
      } finally {
        setMetinIlerleme("");
      }
    } else {
      await supabase.from("mevzuat").update({ metin_durumu: "desteklenmiyor" }).eq("id", yeniId);
      setMesaj("✓ Mevzuat eklendi. (Metin araması yalnızca PDF için çalışır.)");
    }

    setBaslik(""); setSayiNo(""); setYayimTarihi(""); setAciklama(""); setDosya(null);
    if (dosyaRef.current) dosyaRef.current.value = "";
    setFormAcik(false);
    yukle();
  }

  async function sil(m: Mevzuat) {
    const ok = window.confirm(`"${m.baslik}" kaydını silmek istediğine emin misin?`);
    if (!ok) return;

    const { error: delErr } = await supabase.from("mevzuat").delete().eq("id", m.id);
    if (delErr) { setError("Silinemedi: " + hataCevir(delErr)); return; }
    await supabase.storage.from("mevzuat").remove([m.file_path]);
    yukle();
  }

  // Filtreleme — sıralama sunucudan hiyerarşiye göre geliyor, burada bozulmuyor
  const gosterilen = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    return kayitlar.filter((m) => {
      if (turFiltre && m.tur !== turFiltre) return false;
      if (!q) return true;
      return (
        m.baslik.toLocaleLowerCase("tr-TR").includes(q) ||
        (m.sayi_no || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (m.aciklama || "").toLocaleLowerCase("tr-TR").includes(q)
      );
    });
  }, [kayitlar, arama, turFiltre]);

  // Türe göre grupla (sıra korunur)
  const gruplar = useMemo(() => {
    const m = new Map<string, Mevzuat[]>();
    gosterilen.forEach((k) => {
      if (!m.has(k.tur)) m.set(k.tur, []);
      m.get(k.tur)!.push(k);
    });
    return Array.from(m.entries());
  }, [gosterilen]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold">Mevzuat</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kanun, yönetmelik, tebliğ, genelge ve talimatlar — normlar hiyerarşisine göre sıralı.
          </p>
        </div>
        {yonetici && !formAcik && (
          <button
            onClick={() => { setFormAcik(true); setMesaj(""); }}
            className="px-4 py-2 bg-black text-white rounded text-sm whitespace-nowrap"
          >
            + Mevzuat Yükle
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm bg-amber-50 border border-amber-200 rounded p-3 my-3">{error}</p>
      )}

      {/* Yükleme formu */}
      {yonetici && formAcik && (
        <div className="border rounded-xl p-4 my-4 bg-gray-50">
          <h2 className="font-semibold text-sm mb-3">Yeni Mevzuat</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block md:col-span-2">
              <span className="text-xs text-gray-600">Başlık *</span>
              <input
                className="border p-2 w-full rounded mt-1 text-sm"
                placeholder="örn. Tehlikeli Maddelerin Karayoluyla Taşınması Hakkında Yönetmelik"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Tür *</span>
              <select
                className="border p-2 w-full rounded mt-1 text-sm"
                value={tur}
                onChange={(e) => setTur(e.target.value)}
              >
                {TURLER.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Sayı / No</span>
              <input
                className="border p-2 w-full rounded mt-1 text-sm"
                placeholder="Resmî Gazete sayısı veya genelge no"
                value={sayiNo}
                onChange={(e) => setSayiNo(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Yayım Tarihi</span>
              <input
                type="date"
                className="border p-2 w-full rounded mt-1 text-sm"
                value={yayimTarihi}
                onChange={(e) => setYayimTarihi(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Dosya * (en fazla 25 MB)</span>
              <input
                ref={dosyaRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
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

          {metinIlerleme && (
            <p className="text-sm mt-3 text-blue-700">{metinIlerleme}</p>
          )}
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

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 my-4">
        <input
          className="border p-2 rounded text-sm flex-1 min-w-[200px]"
          placeholder="🔍 Başlık, sayı veya açıklamada ara..."
          value={arama}
          onChange={(e) => setArama(e.target.value)}
        />
        <select
          className="border p-2 rounded text-sm"
          value={turFiltre}
          onChange={(e) => setTurFiltre(e.target.value)}
        >
          <option value="">Tüm türler</option>
          {TURLER.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-500">Yükleniyor...</p>}

      {!loading && gosterilen.length === 0 && !error && (
        <div className="border rounded-xl p-8 text-center text-gray-400">
          {kayitlar.length === 0
            ? "Henüz mevzuat yüklenmemiş."
            : "Aramanla eşleşen kayıt yok."}
        </div>
      )}

      {/* Hiyerarşik liste */}
      <div className="space-y-5">
        {gruplar.map(([turKey, liste]) => {
          const bilgi = TUR_BILGI[turKey] ?? TUR_BILGI["diger"];
          return (
            <div key={turKey}>
              <div className="flex items-center gap-2 mb-2">
                <span className={"text-xs font-semibold px-2 py-1 rounded " + bilgi.renk}>
                  {bilgi.label}
                </span>
                <span className="text-xs text-gray-400">{liste.length} belge</span>
              </div>
              <div className="border rounded-xl divide-y overflow-hidden">
                {liste.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                    <button
                      onClick={() => belgeAc(m)}
                      className="flex-1 text-left"
                      title="Yeni sekmede aç"
                    >
                      <p className="text-sm font-medium text-blue-700 hover:underline">
                        {m.baslik}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[
                          m.sayi_no,
                          tarihYaz(m.yayim_tarihi),
                          m.file_name,
                          boyutYaz(m.file_size),
                          m.metin_durumu === "tamam" && m.sayfa_sayisi
                            ? `🔍 ${m.sayfa_sayisi} sayfa aranabilir`
                            : m.metin_durumu === "desteklenmiyor"
                              ? "⚠ metin yok (asistan okuyamaz)"
                              : m.metin_durumu === "hata"
                                ? "⚠ metin çıkarılamadı"
                                : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {m.aciklama && (
                        <p className="text-xs text-gray-400 mt-0.5">{m.aciklama}</p>
                      )}
                    </button>
                    {yonetici && (
                      <button
                        onClick={() => sil(m)}
                        className="text-xs px-2 py-1 border rounded text-red-600 hover:bg-red-50 shrink-0"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
