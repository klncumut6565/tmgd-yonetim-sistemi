"use client";

// src/lib/depo.ts — "firm-files" dosyaları için TEK giriş noktası (tarayıcı).
//
// Dosyalar Cloudflare R2'ye taşınıyor. Bu modül, supabase.storage.from("firm-files")
// çağrılarının yerine geçer ve dönüş biçimi onlarla aynıdır ({ data, error }),
// böylece bileşenlerde minimum değişiklik gerekir. Asıl iş /api/depo'da yapılır:
//   • okuma: R2'de varsa R2'den, yoksa Supabase'den (taşıma sırasında kesinti yok)
//   • yazma: R2'ye (R2 tanımlı değilse Supabase'e)
//   • silme: her iki depodan

import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/supabase/authFetch";

const BUCKET = "firm-files";
type Hata = { message: string } | null;

async function api(govde: Record<string, unknown>) {
  const r = await authFetch("/api/depo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Depo hatası (${r.status})`);
  return j;
}

export async function depoYukle(
  yol: string,
  dosya: Blob,
  secenek: { upsert?: boolean; contentType?: string } = {}
): Promise<{ error: Hata }> {
  try {
    const j = await api({ islem: "yaz", yol, upsert: !!secenek.upsert });
    if (j.supabase) {
      const { error } = await supabase.storage.from(BUCKET).upload(yol, dosya, secenek);
      return { error: error ? { message: error.message } : null };
    }
    const tip = secenek.contentType || dosya.type || "application/octet-stream";
    const r = await fetch(j.url, { method: "PUT", body: dosya, headers: { "Content-Type": tip } });
    if (!r.ok) return { error: { message: `Dosya yüklenemedi (R2 ${r.status})` } };
    return { error: null };
  } catch (e) {
    return { error: { message: (e as Error).message } };
  }
}

export async function depoImzaliUrller(yollar: string[], saniye = 600): Promise<(string | null)[]> {
  if (!yollar.length) return [];
  try {
    const sonuc: (string | null)[] = [];
    for (let i = 0; i < yollar.length; i += 200) {
      const j = await api({ islem: "oku", yollar: yollar.slice(i, i + 200), sure: saniye });
      sonuc.push(...(j.adresler as (string | null)[]));
    }
    return sonuc;
  } catch {
    return yollar.map(() => null);
  }
}

export async function depoImzaliUrl(
  yol: string,
  saniye = 600
): Promise<{ data: { signedUrl: string } | null; error: Hata }> {
  const [u] = await depoImzaliUrller([yol], saniye);
  return u ? { data: { signedUrl: u }, error: null } : { data: null, error: { message: "Dosyaya erişilemedi." } };
}

export async function depoSil(yollar: string[]): Promise<{ error: Hata }> {
  try {
    await api({ islem: "sil", yollar });
    return { error: null };
  } catch (e) {
    return { error: { message: (e as Error).message } };
  }
}
