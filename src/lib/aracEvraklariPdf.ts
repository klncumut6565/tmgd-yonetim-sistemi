// src/lib/aracEvraklariPdf.ts
//
// "[PLAKA] PLAKALI ARAÇ EVRAKLARI" belgesinin PDF çıktısını üretir —
// kullanıcının paylaştığı örnek belge formatıyla (Doküman İçeriği: Ek-1..
// Ek-10) birebir aynı yapı: kapak sayfası (Ek listesi) + her ek kendi
// sayfasında.
//
// Ek-6 (Yazılı Talimat) ve Ek-8 (ADR Çantası İçeriği) TÜM araçlarda ortak,
// jenerik içeriktir (bkz. aracEvrakStatik.ts) — bu dosyaya veri olarak
// gönderilmez, doğrudan burada sabit şekilde eklenir.

import type { jsPDF as JsPDFType } from "jspdf";
import { LIBERATION_SANS_REGULAR_B64, LIBERATION_SANS_BOLD_B64 } from "./pdfFonts";
import {
  YAZILI_TALIMAT_BASLIK,
  YAZILI_TALIMAT_ALT_BASLIK,
  YAZILI_TALIMAT_GIRIS,
  YAZILI_TALIMAT_MADDELERI,
  YAZILI_TALIMAT_TABLO_GORSELLERI,
  ADR_CANTA_ICERIGI_GORSELI,
} from "./aracEvrakStatik";

const FONT = "LiberationSans";
const RENK_VURGU: [number, number, number] = [30, 64, 175];
const W = 210;
const H = 297;
const M = 15;

export type LogoData = { data: string; fmt: "PNG" | "JPEG"; enBoyOrani: number } | null;

/** Bir Ek'e ait, hazır (fetch edilmiş, gerekiyorsa PDF->görsel çevrilmiş)
 *  belge(ler) — dataUrls boşsa "belge yüklenmemiştir" sayfası basılır,
 *  birden fazla dosya varsa hepsi sırayla ayrı sayfa olarak eklenir. */
export type AracEvrakBelgesi = {
  ekNo: number;
  baslik: string;
  dataUrls: string[];
};

export type AracEvraklariPdfVerisi = {
  firmaAdi: string;
  plaka: string;
  hazirlayanAdi: string;
  bugun: string;
  logo?: LogoData;
  /** Ek-1, Ek-2 (firma ortak: TMFB, K1) ve Ek-3, Ek-4, Ek-5, Ek-7, Ek-9,
   *  Ek-10 (araca özel) — ekNo sırasına göre otomatik sıralanır. Ek-6 ve
   *  Ek-8 buraya DAHİL EDİLMEZ (jenerik, sabit içerik — bkz. dosya başı). */
  belgeler: AracEvrakBelgesi[];
};

function fontuKaydet(doc: JsPDFType) {
  doc.addFileToVFS("LiberationSans-Regular.ttf", LIBERATION_SANS_REGULAR_B64);
  doc.addFont("LiberationSans-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("LiberationSans-Bold.ttf", LIBERATION_SANS_BOLD_B64);
  doc.addFont("LiberationSans-Bold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");
}

function logoKutusuHesapla(enBoyOrani: number, kutuBoyut: number) {
  const oran = enBoyOrani > 0 ? enBoyOrani : 1;
  let w = kutuBoyut;
  let h = w / oran;
  if (h > kutuBoyut) {
    h = kutuBoyut;
    w = h * oran;
  }
  return { w, h };
}

function gorselEnBoyOraniOku(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
    img.onerror = () => resolve(1);
    img.src = dataUrl;
  });
}

/** Bir uzak yoldan (public/ altı) görseli fetch edip dataURL'e çevirir —
 *  statik Ek-6/Ek-8 varlıkları için. */
async function statikGorselGetir(yol: string): Promise<string | null> {
  try {
    const res = await fetch(yol);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function kapakSayfasiCiz(doc: JsPDFType, veri: AracEvraklariPdfVerisi, ekBasliklari: string[]) {
  doc.setFillColor(...RENK_VURGU);
  doc.rect(0, 0, W, 4, "F");

  doc.setDrawColor(150, 180, 230);
  doc.setLineWidth(0.4);
  doc.rect(W - M - 45, 10, 45, 12);
  doc.setFontSize(7.5);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("Güncelleme Tarihi:", W - M - 22.5, 15, { align: "center" });
  doc.text(veri.bugun, W - M - 22.5, 19.5, { align: "center" });

  if (veri.logo) {
    try {
      const box = logoKutusuHesapla(veri.logo.enBoyOrani, 22);
      doc.addImage(veri.logo.data, veri.logo.fmt, M, 10, box.w, box.h);
    } catch {
      /* logo eklenemezse kapak yine üretilsin */
    }
  }

  doc.setFillColor(...RENK_VURGU);
  doc.roundedRect(M, 45, W - 2 * M, 16, 2, 2, "F");
  doc.setFontSize(14);
  doc.setFont(FONT, "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`${veri.plaka} PLAKALI ARAÇ EVRAKLARI`, W / 2, 55, { align: "center" });

  doc.setFontSize(11);
  doc.setFont(FONT, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(veri.firmaAdi, W / 2, 75, { align: "center", maxWidth: W - 2 * M });

  let y = 95;
  doc.setFontSize(10.5);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("Doküman İçeriği:", M, y);
  y += 8;

  doc.setFontSize(9.5);
  doc.setFont(FONT, "normal");
  doc.setTextColor(0, 0, 0);
  ekBasliklari.forEach((baslik, i) => {
    doc.text(`Ek-${i + 1} – ${baslik}`, M + 2, y);
    y += 6.5;
  });


}

/** Bir Ek sayfasını (başlık) çizer, altına içerik eklenecek boşluk bırakır. */
function ekSayfaBasligiCiz(doc: JsPDFType, ekNo: number, baslik: string) {
  doc.addPage();
  fontuKaydet(doc);

  doc.setFontSize(12);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text(`EK-${ekNo}  ${baslik}`, W / 2, 18, { align: "center" });
  doc.setDrawColor(200, 200, 200);
  doc.line(M, 22, W - M, 22);

  return { kutuUst: 28 };
}

async function gorselliEkSayfasiEkle(doc: JsPDFType, ekNo: number, baslik: string, dataUrl: string) {
  const { kutuUst } = ekSayfaBasligiCiz(doc, ekNo, baslik);
  const kutuG = W - 2 * M;
  const kutuY = H - kutuUst - 15;

  const oran = await gorselEnBoyOraniOku(dataUrl);
  let cizimG = kutuG;
  let cizimY = kutuG / oran;
  if (cizimY > kutuY) {
    cizimY = kutuY;
    cizimG = kutuY * oran;
  }
  const x = M + (kutuG - cizimG) / 2;
  const y = kutuUst + (kutuY - cizimY) / 2;
  try {
    doc.addImage(dataUrl, "JPEG", x, y, cizimG, cizimY);
  } catch {
    doc.setFontSize(9);
    doc.setFont(FONT, "normal");
    doc.setTextColor(150, 0, 0);
    doc.text("Belge görüntülenemedi.", W / 2, kutuUst + 10, { align: "center" });
  }
}

function bosEkSayfasiEkle(doc: JsPDFType, ekNo: number, baslik: string) {
  ekSayfaBasligiCiz(doc, ekNo, baslik);
  doc.setFontSize(10);
  doc.setFont(FONT, "normal");
  doc.setTextColor(160, 160, 160);
  doc.text("Bu belge henüz sisteme yüklenmemiştir.", W / 2, 60, { align: "center" });
}

/** Ek-6 Yazılı Talimat: metin sayfası (gerçek yazı, görsel değil) + 3
 *  tablo görseli. */
async function yaziliTalimatEkleriEkle(doc: JsPDFType, ekNo: number) {
  doc.addPage();
  fontuKaydet(doc);

  doc.setFontSize(12);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text(`EK-${ekNo}  YAZILI TALİMAT`, W / 2, 18, { align: "center" });
  doc.setDrawColor(200, 200, 200);
  doc.line(M, 22, W - M, 22);

  doc.setFontSize(12);
  doc.setFont(FONT, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(YAZILI_TALIMAT_BASLIK, W / 2, 32, { align: "center" });

  doc.setFontSize(9.5);
  doc.setFont(FONT, "bold");
  doc.text(YAZILI_TALIMAT_ALT_BASLIK, W / 2, 40, { align: "center" });

  let y = 50;
  const genislik = W - 2 * M;
  doc.setFontSize(9);
  doc.setFont(FONT, "normal");
  const girisSatirlari = doc.splitTextToSize(YAZILI_TALIMAT_GIRIS, genislik);
  doc.text(girisSatirlari, M, y);
  y += girisSatirlari.length * 4.4 + 4;

  for (const madde of YAZILI_TALIMAT_MADDELERI) {
    const satirlar = doc.splitTextToSize(madde, genislik - 6);
    if (y + satirlar.length * 4.4 > H - 20) {
      doc.addPage();
      fontuKaydet(doc);
      y = 20;
    }
    doc.text("–", M, y);
    doc.text(satirlar, M + 5, y);
    y += satirlar.length * 4.4 + 3;
  }

  for (const gorselYolu of YAZILI_TALIMAT_TABLO_GORSELLERI) {
    const dataUrl = await statikGorselGetir(gorselYolu);
    if (dataUrl) await gorselliEkSayfasiEkle(doc, ekNo, "YAZILI TALİMAT (devam)", dataUrl);
  }
}

export async function aracEvraklariPdfOlustur(veri: AracEvraklariPdfVerisi): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as unknown as JsPDFType;
  fontuKaydet(doc);

  // Ek sırası sabit: 1-2 firma ortak, 3-5 araca özel, 6 yazılı talimat
  // (jenerik), 7 araca özel, 8 ADR çanta (jenerik), 9-10 araca özel.
  const ekBasliklari = veri.belgeler
    .slice()
    .sort((a, b) => a.ekNo - b.ekNo)
    .reduce<string[]>((acc, b) => {
      acc[b.ekNo - 1] = b.baslik;
      return acc;
    }, []);
  ekBasliklari[5] = "Yazılı Talimat";
  ekBasliklari[7] = "ADR Çantası İçeriği";

  kapakSayfasiCiz(doc, veri, ekBasliklari);

  for (const belge of veri.belgeler.filter((b) => b.ekNo < 6).sort((a, b) => a.ekNo - b.ekNo)) {
    if (belge.dataUrls.length > 0) {
      for (const dataUrl of belge.dataUrls) await gorselliEkSayfasiEkle(doc, belge.ekNo, belge.baslik, dataUrl);
    } else {
      bosEkSayfasiEkle(doc, belge.ekNo, belge.baslik);
    }
  }

  await yaziliTalimatEkleriEkle(doc, 6);

  const ek7 = veri.belgeler.find((b) => b.ekNo === 7);
  if (ek7) {
    if (ek7.dataUrls.length > 0) {
      for (const dataUrl of ek7.dataUrls) await gorselliEkSayfasiEkle(doc, 7, ek7.baslik, dataUrl);
    } else {
      bosEkSayfasiEkle(doc, 7, ek7.baslik);
    }
  }

  const adrCantaGorsel = await statikGorselGetir(ADR_CANTA_ICERIGI_GORSELI);
  if (adrCantaGorsel) await gorselliEkSayfasiEkle(doc, 8, "ADR ÇANTASI İÇERİĞİ", adrCantaGorsel);

  for (const belge of veri.belgeler.filter((b) => b.ekNo > 8).sort((a, b) => a.ekNo - b.ekNo)) {
    if (belge.dataUrls.length > 0) {
      for (const dataUrl of belge.dataUrls) await gorselliEkSayfasiEkle(doc, belge.ekNo, belge.baslik, dataUrl);
    } else {
      bosEkSayfasiEkle(doc, belge.ekNo, belge.baslik);
    }
  }

  return doc.output("blob");
}
