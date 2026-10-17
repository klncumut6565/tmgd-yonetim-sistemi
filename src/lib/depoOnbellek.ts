// Supabase Storage veri çıkışı (egress) tasarrufu.
//
// 1) FİRMA LOGOLARI: Listelerde 40×40 px gösterilen logolar için orijinal dosya (ortalama 200 KB,
//    en büyüğü 2 MB) yerine ~256 px'lik küçük kopya ("<yol>.thumb.webp") kullanılır. Küçük kopya
//    yoksa orijinal gösterilir ve yazma yetkisi olan kullanıcının tarayıcısı küçük kopyayı BİR KEZ
//    üretip yükler. Logo yolları zaman damgalı ve değişmez olduğu için küçük kopya hiç bayatlamaz.
//    İmzalı bağlantılar 6 saat localStorage'da saklanır → aynı adres tekrar kullanılır, tarayıcı
//    önbelleğinden gelir (her sayfa açılışında yeniden indirilmez).
// 2) PDF ÜRETİMİ: Logo ve belge ekleri sayfa oturumu boyunca bellekte tutulur → önizleme ve indirme
//    aynı dosyayı ikinci kez indirmez.
import { supabase } from "@/lib/supabase/client";

const LOGO_BUCKET = "firm-files";
const URL_TTL_SN = 6 * 3600; // imzalı bağlantı ömrü
const YENILE_PAYI_MS = 15 * 60_000; // süresine 15 dk kalan bağlantı yenilenir
const DEPO_ANAHTARI = "tmgd-logo-url-v1";
const THUMB_PX = 256;

export const logoKucukYolu = (yol: string) => `${yol}.thumb.webp`;

type Kayit = { url: string; bitis: number };
const bellek = new Map<string, Kayit>();
const denenenler = new Set<string>(); // bu oturumda küçük kopya üretimi denenenler

function depodanOku(): Record<string, Kayit> {
  try {
    return JSON.parse(localStorage.getItem(DEPO_ANAHTARI) || "{}") as Record<string, Kayit>;
  } catch {
    return {};
  }
}
function depoyaYaz(ek: Record<string, Kayit>) {
  try {
    const simdi = Date.now();
    const tum = { ...depodanOku(), ...ek };
    for (const [k, v] of Object.entries(tum)) if (v.bitis < simdi) delete tum[k];
    localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(tum));
  } catch {
    /* depolama kapalıysa yalnızca bellek kullanılır */
  }
}
function gecerli(yol: string): string | null {
  const k = bellek.get(yol) ?? depodanOku()[yol];
  if (k && k.bitis - Date.now() > YENILE_PAYI_MS) {
    bellek.set(yol, k);
    return k.url;
  }
  return null;
}

/** Bir dosyadan (Blob/File) küçük logo kopyası üretir ve "<yol>.thumb.webp" olarak yükler. */
export async function logoKucukKopyaYukle(yol: string, kaynak: Blob): Promise<boolean> {
  try {
    const bmp = await createImageBitmap(kaynak);
    const olcek = Math.min(1, THUMB_PX / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * olcek));
    const h = Math.max(1, Math.round(bmp.height * olcek));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob =
      (await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.85))) ??
      (await new Promise<Blob | null>((r) => c.toBlob(r, "image/png")));
    if (!blob) return false;
    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(logoKucukYolu(yol), blob, { upsert: false, contentType: blob.type, cacheControl: "31536000" });
    return !error;
  } catch {
    return false;
  }
}

/** Küçük kopyası olmayan logolar için arka planda (sırayla) küçük kopya üretir. */
async function eksikKucukleriUret(liste: { yol: string; url: string }[]) {
  for (const { yol, url } of liste) {
    if (denenenler.has(yol)) continue;
    denenenler.add(yol);
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      await logoKucukKopyaYukle(yol, await res.blob());
    } catch {
      /* yetki yoksa ya da ağ hatasında sessizce geç */
    }
  }
}

/**
 * Firma logolarının gösterim adresleri (küçük kopya varsa o, yoksa orijinal).
 * Tek istekte toplu imzalama + 6 saatlik yerel önbellek.
 * Dönüş: { [logo_url]: gösterilecek adres }
 */
export async function firmaLogoAdresleri(yollar: string[]): Promise<Record<string, string>> {
  const sonuc: Record<string, string> = {};
  const eksik: string[] = [];
  for (const y of new Set(yollar.filter(Boolean))) {
    const u = gecerli(y);
    if (u) sonuc[y] = u;
    else eksik.push(y);
  }
  if (!eksik.length) return sonuc;

  const bitis = Date.now() + URL_TTL_SN * 1000;
  const yeni: Record<string, Kayit> = {};
  const depo = supabase.storage.from(LOGO_BUCKET);

  // 1) Küçük kopyalar (tek istek)
  const { data: kucukler } = await depo.createSignedUrls(eksik.map(logoKucukYolu), URL_TTL_SN);
  const kucukYok: string[] = [];
  eksik.forEach((y, i) => {
    const s = kucukler?.[i];
    if (s && !s.error && s.signedUrl) yeni[y] = { url: s.signedUrl, bitis };
    else kucukYok.push(y);
  });

  // 2) Küçük kopyası olmayanlar için orijinal (tek istek) + arka planda küçük kopya üretimi
  if (kucukYok.length) {
    const { data: orijinaller } = await depo.createSignedUrls(kucukYok, URL_TTL_SN);
    const uretilecek: { yol: string; url: string }[] = [];
    kucukYok.forEach((y, i) => {
      const s = orijinaller?.[i];
      if (s && !s.error && s.signedUrl) {
        // Orijinal kısa süre saklanır: küçük kopya üretilince bir sonraki açılışta o kullanılsın
        yeni[y] = { url: s.signedUrl, bitis: Date.now() + 20 * 60_000 };
        uretilecek.push({ yol: y, url: s.signedUrl });
      }
    });
    if (uretilecek.length) setTimeout(() => void eksikKucukleriUret(uretilecek), 1500);
  }

  for (const [y, k] of Object.entries(yeni)) {
    bellek.set(y, k);
    sonuc[y] = k.url;
  }
  depoyaYaz(yeni);
  return sonuc;
}

/** Tek logo için gösterim adresi (küçük kopya öncelikli). */
export async function firmaLogoAdresi(yol: string | null | undefined): Promise<string | null> {
  if (!yol) return null;
  return (await firmaLogoAdresleri([yol]))[yol] ?? null;
}

// ---------------------------------------------------------------- PDF için dosya önbelleği
const dosyaBellegi = new Map<string, Promise<Blob | null>>();
const AZAMI_DOSYA = 60;

/**
 * Depodaki bir dosyayı (logo, belge eki) indirir; aynı oturumda tekrar istenirse bellekten verir.
 * PDF önizleme + indirme gibi art arda işlemlerde dosya bir kez indirilir.
 */
export function depoDosyasiGetir(bucket: string, yol: string): Promise<Blob | null> {
  const anahtar = `${bucket}/${yol}`;
  const var_ = dosyaBellegi.get(anahtar);
  if (var_) return var_;
  const p = (async () => {
    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(yol, 600);
    if (!signed?.signedUrl) return null;
    const res = await fetch(signed.signedUrl);
    if (!res.ok) return null;
    return await res.blob();
  })().catch(() => null);
  // Başarısız indirme önbellekte kalmasın
  void p.then((b) => {
    if (!b) dosyaBellegi.delete(anahtar);
  });
  dosyaBellegi.set(anahtar, p);
  if (dosyaBellegi.size > AZAMI_DOSYA) {
    const ilk = dosyaBellegi.keys().next().value;
    if (ilk) dosyaBellegi.delete(ilk);
  }
  return p;
}
