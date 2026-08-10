// src/lib/surucuListesiPdf.ts
//
// "ARAÇ SÜRÜCÜ LİSTESİ / TAŞIMADA GÖREV ALAN SÜRÜCÜLERE İLİŞKİN BİLGİLER"
// (Doküman No: TMGDK-L3) belgesinin PDF çıktısını üretir. gorevliListesiPdf.ts
// ile AYNI desen: kapak sayfası + başlık kutusu + jspdf-autotable tablo.

import type { jsPDF as JsPDFType } from "jspdf";
import { LIBERATION_SANS_REGULAR_B64, LIBERATION_SANS_BOLD_B64 } from "./pdfFonts";

const FONT = "LiberationSans";
const RENK_VURGU: [number, number, number] = [30, 64, 175];
const W = 210;
const H = 297;
const M = 15;

export type SurucuListesiPdfSatiri = {
  sira_no: number;
  ad_soyad: string;
  tc_kimlik_no: string;
  src5_sertifikasi: string;
  ise_giris_tarihi: string;
  isten_cikis_tarihi: string;
  sertifika_gecerlilik_tarihi: string;
};

export type LogoData = { data: string; fmt: "PNG" | "JPEG"; enBoyOrani: number } | null;

/** Bir sürücüye ait yüklenmiş SRC5 veya Ehliyet dosyasının, ana PDF'e ek
 *  sayfa olarak eklenecek hazır (fetch edilmiş, gerekiyorsa PDF->görsel
 *  çevrilmiş) hâli. */
export type SurucuBelgeEki = {
  adSoyad: string;
  tur: "SRC5 Sertifikası" | "Ehliyet";
  dataUrl: string; // JPEG/PNG dataURL
};

export type SurucuListesiPdfVerisi = {
  firmaAdi: string;
  hazirlayanAdi: string;
  bugun: string;
  satirlar: SurucuListesiPdfSatiri[];
  logo?: LogoData;
  ekler?: SurucuBelgeEki[];
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

/** Bir dataURL'in gerçek piksel en/boy oranını okur (tarayıcının Image
 *  nesnesi üzerinden) — ek belge sayfasında görsel taşmadan (contain)
 *  sığdırılabilsin diye. */
function gorselEnBoyOraniOku(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
    img.onerror = () => resolve(1);
    img.src = dataUrl;
  });
}

/** Bir sürücü belgesi ekini (SRC5/Ehliyet) ayrı bir sayfa olarak ekler.
 *  Görsel, içerik kutusuna ORANI KORUNARAK ve TAŞMADAN (contain) sığdırılır
 *  — bkz. belge posteri mekanizmasındaki AYNI dul/taşma düzeltmesi. */
async function belgeEkiSayfasiEkle(doc: JsPDFType, ek: SurucuBelgeEki) {
  doc.addPage();
  fontuKaydet(doc);

  doc.setFontSize(12);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text(`EK — ${ek.adSoyad} — ${ek.tur}`, W / 2, 18, { align: "center" });
  doc.setDrawColor(200, 200, 200);
  doc.line(M, 22, W - M, 22);

  const kutuUst = 28;
  const kutuG = W - 2 * M;
  const kutuY = H - kutuUst - 15;

  const oran = await gorselEnBoyOraniOku(ek.dataUrl);
  let cizimG = kutuG;
  let cizimY = kutuG / oran;
  if (cizimY > kutuY) {
    cizimY = kutuY;
    cizimG = kutuY * oran;
  }
  const x = M + (kutuG - cizimG) / 2;
  const y = kutuUst + (kutuY - cizimY) / 2;
  try {
    doc.addImage(ek.dataUrl, "JPEG", x, y, cizimG, cizimY);
  } catch {
    doc.setFontSize(9);
    doc.setFont(FONT, "normal");
    doc.setTextColor(150, 0, 0);
    doc.text("Belge görüntülenemedi.", W / 2, kutuUst + 10, { align: "center" });
  }
}

function kapakSayfasiCiz(doc: JsPDFType, veri: SurucuListesiPdfVerisi) {
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, W, 4, "F");

  if (veri.logo) {
    try {
      const box = logoKutusuHesapla(veri.logo.enBoyOrani, 26);
      doc.addImage(veri.logo.data, veri.logo.fmt, M, 16, box.w, box.h);
    } catch {
      /* logo eklenemezse kapak yine üretilsin */
    }
  }

  doc.setFontSize(18);
  doc.setFont(FONT, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(veri.firmaAdi, W / 2, 70, { align: "center", maxWidth: W - 2 * M });

  doc.setFontSize(9.5);
  doc.setFont(FONT, "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("Doküman No: TMGDK-L3", W / 2, 79, { align: "center" });

  doc.setDrawColor(200, 200, 200);
  doc.line(W / 2 - 40, 86, W / 2 + 40, 86);

  doc.setFontSize(15);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("ARAÇ SÜRÜCÜ LİSTESİ", W / 2, 100, { align: "center" });

  doc.setFontSize(10);
  doc.setFont(FONT, "normal");
  doc.setTextColor(70, 70, 70);
  doc.text("Taşımada Görev Alan Sürücülere İlişkin Bilgiler", W / 2, 108, {
    align: "center",
    maxWidth: W - 2 * M,
  });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9.5);
  doc.setFont(FONT, "bold");
  doc.text("Formu Düzenleyen Kişi", W / 2, 140, { align: "center" });
  doc.setFont(FONT, "normal");
  doc.text(veri.hazirlayanAdi || "—", W / 2, 146, { align: "center" });

  doc.setFont(FONT, "bold");
  doc.text("Düzenleme Tarihi", W / 2, 156, { align: "center" });
  doc.setFont(FONT, "normal");
  doc.text(veri.bugun, W / 2, 162, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(
    `${veri.firmaAdi} · TMGDK-L3 · TMGD Yönetim Sistemi tarafından ${veri.bugun} tarihinde oluşturuldu`,
    W / 2,
    285,
    { align: "center" }
  );
}

function baslikKutusuCiz(doc: JsPDFType, veri: SurucuListesiPdfVerisi) {
  const yukseklik = 16;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, 10, W - 2 * M, yukseklik);
  doc.line(M + 90, 10, M + 90, 10 + yukseklik);

  doc.setFontSize(11);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("ARAÇ SÜRÜCÜ LİSTESİ", M + 4, 10 + yukseklik / 2 + 1.5);

  doc.setFontSize(8);
  doc.setFont(FONT, "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Doküman No: TMGDK-L3", M + 94, 10 + yukseklik / 2 - 2.5);
  doc.text(`Düzenleme Tarihi: ${veri.bugun}`, M + 94, 10 + yukseklik / 2 + 4.5);
}

export async function surucuListesiPdfOlustur(veri: SurucuListesiPdfVerisi): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as unknown as JsPDFType;
  fontuKaydet(doc);

  kapakSayfasiCiz(doc, veri);

  doc.addPage();
  fontuKaydet(doc);
  baslikKutusuCiz(doc, veri);

  autoTable(doc, {
    startY: 30,
    margin: { left: M, right: M },
    styles: { font: FONT, fontSize: 8.5, cellPadding: 2, valign: "middle" },
    headStyles: {
      font: FONT,
      fontStyle: "bold",
      fillColor: RENK_VURGU,
      textColor: [255, 255, 255],
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: 42 },
      2: { cellWidth: 30 },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 26, halign: "center" },
      5: { cellWidth: 26, halign: "center" },
      6: { cellWidth: 30, halign: "center" },
    },
    head: [
      ["Sıra No", "Adı Soyadı", "T.C. Kimlik No", "SRC5 Sertifikası (Var/Yok)", "İşe Giriş Tarihi", "İşten Çıkış Tarihi", "Sertifika Geçerlilik Tarihi"],
    ],
    body: veri.satirlar.map((s) => [
      String(s.sira_no), s.ad_soyad, s.tc_kimlik_no, s.src5_sertifikasi,
      s.ise_giris_tarihi, s.isten_cikis_tarihi, s.sertifika_gecerlilik_tarihi,
    ]),
    didDrawPage: () => {
      baslikKutusuCiz(doc, veri);
    },
  });

  const sonY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  const imzaY = sonY > H - 30 ? H - 28 : sonY;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont(FONT, "bold");
  doc.text("Hazırlayan (TMGD):", M, imzaY);
  doc.setFont(FONT, "normal");
  doc.text(veri.hazirlayanAdi || "—", M + 38, imzaY);

  // SRC5/Ehliyet ekleri — tabloya ait sayfalardan SONRA, sürücü sırasına göre.
  for (const ek of veri.ekler ?? []) {
    await belgeEkiSayfasiEkle(doc, ek);
  }

  return doc.output("blob");
}
