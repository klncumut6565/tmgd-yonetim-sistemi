"use client";

// src/lib/pdfMetin.ts
//
// PDF'ten sayfa bazlı metin çıkarma.
//
// Tarayıcıda çalışır — dosya zaten kullanıcının makinesinde olduğu için
// sunucuya ikinci kez göndermeye gerek yok, sunucu zaman aşımı riski de
// doğmaz (büyük yönetmelikler 200+ sayfa olabiliyor).
//
// Sayfa bazlı tutuluyor: asistan cevabının altında "Kaynak: X Yönetmeliği,
// sayfa 12" gösterebilmek için.
//
// SÜRÜM NOTU: pdfjs-dist 4.x üst düzey (top-level) await kullanıyor ve
// webpack bunun için "çalışma zamanı hatası verebilir" uyarısı üretiyordu.
// Bu yüzden 3.x sürümünde kalındı — aynı API, uyarısız derleme.
// Ayrıca DİNAMİK import ediliyor: yalnızca mevzuat yüklenirken devreye
// giriyor, ana paket boyutunu şişirmiyor.

export type SayfaMetni = { sayfa_no: number; icerik: string };

/**
 * PDF dosyasından sayfa sayfa metin çıkarır.
 *
 * @param dosya    Kullanıcının yüklediği PDF
 * @param ilerleme Opsiyonel: işlenen sayfa sayısını bildirir
 * @returns Boş olmayan sayfaların metinleri
 */
export async function pdfMetniCikar(
  dosya: File,
  ilerleme?: (islenen: number, toplam: number) => void
): Promise<{ sayfalar: SayfaMetni[]; toplamSayfa: number }> {
  const pdfjsLib = await import("pdfjs-dist");

  // Worker dosyası paketin kendi içinden alınıyor (CDN'e bağımlı olmamak
  // için — kısıtlı ağlarda da çalışsın).
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.js",
    import.meta.url
  ).toString();

  const buffer = await dosya.arrayBuffer();
  const belge = await pdfjsLib.getDocument({ data: buffer }).promise;

  const sayfalar: SayfaMetni[] = [];
  const toplam = belge.numPages;

  for (let i = 1; i <= toplam; i++) {
    const sayfa = await belge.getPage(i);
    const icerikNesnesi = await sayfa.getTextContent();

    const metin = icerikNesnesi.items
      // pdf.js metin parçalarını ayrı ayrı döndürür; "str" alanı olanları al
      .map((p) => ("str" in p ? p.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // Boş sayfaları (kapak, ayraç, taranmış görsel) atla — arama
    // sonuçlarını kirletmesinler
    if (metin.length >= 40) {
      sayfalar.push({ sayfa_no: i, icerik: metin });
    }

    ilerleme?.(i, toplam);
  }

  return { sayfalar, toplamSayfa: toplam };
}
