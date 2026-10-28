// KAŞE SEÇİCİ (hafif)
//
// Hangi TMGD'nin kayıtlı kaşesi olduğunu, ağır base64 görselleri
// (kaseler.ts, ~600 KB) YÜKLEMEDEN söyler. Ekranda "kaşe var mı / imzalı
// sürümü var mı" bilgisini göstermek için bu dosya kullanılır; görselin
// kendisi yalnızca PDF üretilirken kaseler.ts'ten dinamik olarak yüklenir.

export type HazirlayanKaseKodu =
  | "UMUT_KILINC"
  | "MASALLAH_TEKINOK"
  | "MASALLAH_TEKINOK_IMZALI"
  | "AYLIN_ZUMBUL_UCAR";

export function hazirlayanKaseKodu(
  ad: string,
  imzali = false
): HazirlayanKaseKodu | undefined {
  // Ad, Türkçe karakterler ASCII karşılıklarına indirgenerek karşılaştırılır:
  // aynı kişi kayıtlarda "Maşallah TEKİNOK" / "MASALLAH TEKINOK" gibi farklı
  // yazılmış olabilir; bu normalize etme sayesinde ikisi de eşleşir.
  const sade = ad
    .toLocaleUpperCase("tr")
    .replace(/[ÇĞİIÖŞÜ]/g, (c) => ({ Ç: "C", Ğ: "G", İ: "I", I: "I", Ö: "O", Ş: "S", Ü: "U" })[c] ?? c)
    .replace(/[^A-Z]/g, "");

  if (sade.includes("UMUTKILIN")) return "UMUT_KILINC";
  if (sade.includes("TEKINOK")) {
    return imzali ? "MASALLAH_TEKINOK_IMZALI" : "MASALLAH_TEKINOK";
  }
  // "Zümbül" soyadı kaşe görselinde "Zünbül" gibi de okunabiliyordu (kalın
  // baskı fontunda M/N karışabiliyor); veritabanındaki gerçek yazımdan
  // bağımsız çalışsın diye ikisi de kontrol ediliyor.
  if (sade.includes("ZUMBULUCAR") || sade.includes("ZUNBULUCAR")) {
    return "AYLIN_ZUMBUL_UCAR";
  }
  return undefined;
}
