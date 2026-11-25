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

  // ~110 DPI civarı: kimlik belgesi metni okunaklı kalır, dosya boyutu makul.
  const viewport = sayfa.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas bağlamı oluşturulamadı.");

  await sayfa.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * Yüklenen bir PDF'in TÜM SAYFALARINI sırayla rastere edip JPEG dataURL
 * listesi olarak döner. Araç Evrakı'ndaki MSDS/SDS Raporu eki için: MSDS'ler
 * çok sayfalıdır (genellikle 8-20 sayfa) ve hepsinin çıktıya girmesi gerekir.
 * Sayfalar tek tek işlenir, her sayfadan sonra canvas serbest bırakılır
 * (uzun belgelerde bellek şişmesin diye).
 */
export async function pdfTumSayfalariGorselYap(pdfBuffer: ArrayBuffer): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.js",
    import.meta.url
  ).toString();

  const belge = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const sonuc: string[] = [];
  for (let n = 1; n <= belge.numPages; n++) {
    const sayfa = await belge.getPage(n);
    // pdfIlkSayfayiGorselYap ile aynı çözünürlük (~110 DPI): MSDS'lerin küçük
    // puntolu tabloları okunaklı kalır.
    const viewport = sayfa.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas bağlamı oluşturulamadı.");
    // Şeffaf zeminli PDF'ler JPEG'de siyah çıkmasın
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await sayfa.render({ canvasContext: context, viewport }).promise;
    sonuc.push(canvas.toDataURL("image/jpeg", 0.85));
    sayfa.cleanup();
    canvas.width = 0;
    canvas.height = 0;
  }
  await belge.destroy();
  return sonuc;
}
