"use client";

// src/lib/pdfSayfaGorseli.ts
//
// Yüklenen bir PDF'in İLK SAYFASINI rastere edip JPEG dataURL olarak döner.
// Kullanım amacı: Sürücü Listesi'ne eklenen SRC5/Ehliyet dosyası PDF ise,
// bunu Sürücü Listesi'nin ana PDF çıktısına EK SAYFA olarak gömebilmek için
// (jsPDF başka bir PDF'in sayfalarını doğrudan birleştiremez, ama görsel
// olarak gömebilir — SRC5/ehliyet gibi tek sayfalık kimlik belgeleri için
// bu yeterli ve pdf-lib gibi ek bir bağımlılık gerektirmeyen basit çözüm).
//
// pdfMetin.ts ile AYNI pdfjs-dist kurulum deseni (3.x sürümü, dinamik
// import, paket-içi worker — CDN'e bağımlı olmasın diye).

export async function pdfIlkSayfayiGorselYap(pdfBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.js",
    import.meta.url
  ).toString();

  const belge = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const sayfa = await belge.getPage(1);

  // ~150 DPI civarı: kimlik belgesi metni okunaklı kalır, dosya boyutu makul.
  const viewport = sayfa.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas bağlamı oluşturulamadı.");

  await sayfa.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.92);
}
