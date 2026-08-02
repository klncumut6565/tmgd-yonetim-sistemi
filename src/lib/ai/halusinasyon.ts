// src/lib/ai/halusinasyon.ts
//
// WHISPER HALÜSİNASYON FİLTRESİ (ortak modül)
//
// Whisper modelleri sessizlik veya anlaşılmayan ses aldığında, eğitim
// verisindeki YouTube altyazılarından öğrendikleri kalıpları UYDURUR:
// "İzlediğiniz için teşekkür ederim", "Altyazı M.K.", "Abone olmayı
// unutmayın" gibi. Kullanıcı bunları söylemez.
//
// Bu modül hem sunucuda (transkripsiyon sonrası) hem istemcide (Web Speech
// API yedek yolu) kullanılır — tek bir yerden yönetilsin diye ayrıldı.
// Daha önce filtre yalnızca sunucudaydı ve yedek yol filtresizdi.

/**
 * Türkçe metni sadeleştirir.
 *
 * KRİTİK: Büyük "İ" (U+0130) JavaScript'te toLowerCase() ile "i" + ayrı
 * bir birleşen nokta (U+0307) karakterine dönüşür; bu normal "i" ile
 * EŞLEŞMEZ. Bu yüzden /izlediğiniz/i gibi bir regex "İzlediğiniz..."
 * metnini yakalayamaz.
 */
export function trNormalize(metin: string): string {
  return metin
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/\u0307/g, "") // artık birleşen nokta kalmışsa temizle
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[.,!?;:]/g, " ") // noktalama eşleşmeyi bozmasın
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Bilinen halüsinasyon kalıpları.
 * Kalıplar SADELEŞTİRİLMİŞ metne göre yazılmıştır (aksansız, küçük harf).
 */
const KALIPLAR: RegExp[] = [
  // YouTube kapanış kalıpları (en sık görülenler)
  /izlediginiz icin tesekkur/,
  /izledigin icin tesekkur/,
  /izlediginiz icin sagol/,
  /izleyip destek/,
  /videoyu izle/,
  /bir sonraki (video|bolum)/,
  /kanalima abone/,
  /abone olmayi unutmayin/,
  /abone ol(un)?( ve)? bildirim/,
  /begenmeyi unutmayin/,
  /gorusmek uzere/,
  /kanalimiza abone/,

  // Altyazı imzaları
  /^altyazi/,
  /altyazi\s*[:]?\s*m\s*k/,
  /altyazi (ve )?ceviri/,

  // İngilizce karşılıkları
  /thanks? for watching/,
  /please subscribe/,
  /subtitles? by/,
  /see you (in the )?next/,
  /don'?t forget to subscribe/,

  // Tek başına anlamsız kısa çıktılar
  /^(tesekkurler|tesekkur ederim|sagolun|thank you|thanks|bye|hosca kalin)$/,
  /^(altyazi|subtitle)s?$/,
];

/**
 * Metin bir Whisper halüsinasyonu mu?
 *
 * @param metin Transkripsiyon çıktısı
 */
export function halusinasyonMu(metin: string): boolean {
  const ham = (metin ?? "").trim();
  if (!ham) return true;
  if (ham.length < 3) return true; // çok kısa çıktılar genelde gürültü

  const sade = trNormalize(ham);
  if (!sade) return true;

  return KALIPLAR.some((k) => k.test(sade));
}
