"use client";

// src/lib/dosyaSikistir.ts
//
// Storage'a yüklemeden ÖNCE dosyayı tarayıcıda küçültür (Supabase depolama
// kotası için). Kurallar — veri/okunabilirlik kaybı olmasın diye TEMKİNLİ:
//
//  • JPEG  → uzun kenar 2400 px'e indirilir, kalite 0.82. Format DEĞİŞMEZ.
//  • PNG   → sadece 2400 px'ten büyükse küçültülür, PNG kalır (şeffaflık korunur).
//  • PDF   → e-imzalı (/ByteRange, /Sig) veya şifreli PDF'lere DOKUNULMAZ.
//            - Taranmış PDF (metin katmanı yok): sayfalar ~150 DPI JPEG olarak
//              yeniden oluşturulur (kaşe/imza renkli kalır, okunaklı).
//            - Metin içeren PDF: içerik değiştirilmez, sadece pdf-lib ile
//              nesne akışlarıyla yeniden kaydedilir (vektör/metin korunur).
//  • Diğer türler (Word, Excel, CSV) olduğu gibi yüklenir.
//
// Sonuç orijinalden en az %10 küçük değilse ORİJİNAL dosya döner.
// Herhangi bir hata olursa ORİJİNAL dosya döner — yükleme asla engellenmez.

const MIN_BOYUT = 300 * 1024; // 300 KB altı dosyalar ile uğraşma
const KAZANC_ESIGI = 0.9; // yeni boyut ≤ eski × 0.9 ise kullan
const GORSEL_MAKS_KENAR = 2400;
const PDF_HEDEF_KENAR = 1754; // A4 uzun kenar @150 DPI
const PDF_JPEG_KALITE = 0.75;
const PDF_MAKS_SAYFA = 80; // çok uzun taramalarda tarayıcıyı kilitlememek için

export type SikistirmaSonucu = { dosya: File; eskiBoyut: number; yeniBoyut: number };

function yeniDosya(blob: Blob, orijinal: File): File {
  return new File([blob], orijinal.name, { type: orijinal.type, lastModified: Date.now() });
}

function canvasBlob(canvas: HTMLCanvasElement, tip: string, kalite?: number): Promise<Blob | null> {
  return new Promise((res) => canvas.toBlob(res, tip, kalite));
}

async function gorselSikistir(dosya: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(dosya);
  const uzun = Math.max(bitmap.width, bitmap.height);
  const png = dosya.type === "image/png";
  if (png && uzun <= GORSEL_MAKS_KENAR) return null;
  const oran = Math.min(1, GORSEL_MAKS_KENAR / uzun);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * oran);
  canvas.height = Math.round(bitmap.height * oran);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvasBlob(canvas, png ? "image/png" : "image/jpeg", png ? undefined : 0.82);
}

function eImzaliMi(bytes: Uint8Array): boolean {
  // Ham PDF içinde imza sözlüğü işaretlerini ara (latin1 olarak).
  const metin = new TextDecoder("latin1").decode(bytes);
  return metin.includes("/ByteRange") || /\/Type\s*\/Sig\b/.test(metin) || metin.includes("/Encrypt");
}

async function pdfSikistir(dosya: File): Promise<Blob | null> {
  const buf = await dosya.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (eImzaliMi(bytes)) return null;

  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.js",
    import.meta.url
  ).toString();

  const belge = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
  const sayfaSayisi = belge.numPages;

  // Metin katmanı var mı? (ilk 3 sayfaya bak)
  let metinUzunlugu = 0;
  for (let i = 1; i <= Math.min(3, sayfaSayisi); i++) {
    const s = await belge.getPage(i);
    const tc = await s.getTextContent();
    metinUzunlugu += tc.items.map((it) => ("str" in it ? it.str : "")).join("").trim().length;
  }

  const { PDFDocument } = await import("pdf-lib");

  if (metinUzunlugu > 50 || sayfaSayisi > PDF_MAKS_SAYFA) {
    // Metinli PDF: içeriğe dokunmadan yeniden kaydet.
    await belge.destroy();
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    const out = await doc.save({ useObjectStreams: true });
    return new Blob([out as BlobPart], { type: "application/pdf" });
  }

  // Taranmış PDF: sayfaları JPEG olarak yeniden oluştur.
  const yeni = await PDFDocument.create();
  for (let i = 1; i <= sayfaSayisi; i++) {
    const sayfa = await belge.getPage(i);
    const v1 = sayfa.getViewport({ scale: 1 });
    const olcek = PDF_HEDEF_KENAR / Math.max(v1.width, v1.height);
    const vp = sayfa.getViewport({ scale: olcek });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await sayfa.render({ canvasContext: ctx, viewport: vp }).promise;
    const jpeg = await canvasBlob(canvas, "image/jpeg", PDF_JPEG_KALITE);
    if (!jpeg) return null;
    const img = await yeni.embedJpg(await jpeg.arrayBuffer());
    const p = yeni.addPage([v1.width, v1.height]);
    p.drawImage(img, { x: 0, y: 0, width: v1.width, height: v1.height });
    canvas.width = canvas.height = 0; // belleği bırak
    sayfa.cleanup();
  }
  await belge.destroy();
  const out = await yeni.save({ useObjectStreams: true });
  return new Blob([out as BlobPart], { type: "application/pdf" });
}

/** Dosyayı mümkünse küçültür; olmazsa orijinali döner. Asla hata fırlatmaz. */
export async function dosyaSikistirDetay(dosya: File): Promise<SikistirmaSonucu> {
  const eskiBoyut = dosya.size;
  const sonuc = (d: File) => ({ dosya: d, eskiBoyut, yeniBoyut: d.size });
  if (typeof window === "undefined" || eskiBoyut < MIN_BOYUT) return sonuc(dosya);

  try {
    const tip = dosya.type || "";
    const ad = dosya.name.toLowerCase();
    let blob: Blob | null = null;

    if (tip === "application/pdf" || ad.endsWith(".pdf")) blob = await pdfSikistir(dosya);
    else if (tip === "image/jpeg" || tip === "image/png") blob = await gorselSikistir(dosya);

    if (blob && blob.size > 0 && blob.size <= eskiBoyut * KAZANC_ESIGI) {
      return sonuc(yeniDosya(blob, dosya));
    }
  } catch (e) {
    console.warn("[dosyaSikistir] sıkıştırılamadı, orijinal yükleniyor:", e);
  }
  return sonuc(dosya);
}

export async function dosyaSikistir(dosya: File): Promise<File> {
  return (await dosyaSikistirDetay(dosya)).dosya;
}
