// src/lib/gorevliListesiPdf.ts
//
// TMGDK-G1 "Tehlikeli Madde İş ve İşlemlerinde Görevli Personel Listesi"
// belgesinin PDF çıktısını üretir. İki sayfadan oluşur:
//   1) Kapak sayfası — BelgeOlusturForm.tsx'teki kapak stiline benzer
//      (firma adı, belge başlığı, hazırlayan bilgisi).
//   2) Başlık kutusu (Doküman No / Düzenleme Tarihi) + jspdf-autotable ile
//      çizilen tablo + dipnot + imza satırı.
//
// Türkçe karakter desteği için LiberationSans gömülü fontu kullanılır
// (bkz. pdfFonts.ts / BelgeOlusturForm.tsx — aynı kalıcı ders burada da
// geçerli: jsPDF varsayılan "helvetica" fontu ş/ğ/ı/ö/ü/ç karakterlerini
// desteklemez).

import type { jsPDF as JsPDFType } from "jspdf";
import {
  LIBERATION_SANS_REGULAR_B64,
  LIBERATION_SANS_BOLD_B64,
} from "./pdfFonts";

const FONT = "LiberationSans";
const RENK_VURGU: [number, number, number] = [30, 64, 175];
const W = 210;
const H = 297;
const M = 15;

export type GorevliListesiPdfSatiri = {
  sira_no: number;
  gorev_basligi: string;
  yapilacak_gorevler: string;
  bagli_oldugu_birim: string;
  sorumluIsimler: string;
  doldurulacak_dokuman_no: string;
  egitim_tarihi: string;
};

export type LogoData = {
  data: string;
  fmt: "PNG" | "JPEG";
  enBoyOrani: number;
} | null;

export type GorevliListesiPdfVerisi = {
  firmaAdi: string;
  hazirlayanAdi: string;
  bugun: string; // gg.aa.yyyy
  satirlar: GorevliListesiPdfSatiri[];
  logo?: LogoData;
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

function kapakSayfasiCiz(
  doc: JsPDFType,
  veri: GorevliListesiPdfVerisi
) {
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
  doc.text("Doküman No: TMGDK-G1", W / 2, 79, { align: "center" });

  doc.setDrawColor(200, 200, 200);
  doc.line(W / 2 - 40, 86, W / 2 + 40, 86);

  doc.setFontSize(15);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("GÖREVLİ LİSTESİ", W / 2, 100, { align: "center" });

  doc.setFontSize(10);
  doc.setFont(FONT, "normal");
  doc.setTextColor(70, 70, 70);
  doc.text(
    "Tehlikeli Madde İş ve İşlemlerinde Görevli Personel Listesi",
    W / 2,
    108,
    { align: "center", maxWidth: W - 2 * M }
  );

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
    `${veri.firmaAdi} · TMGDK-G1 · TMGD Yönetim Sistemi tarafından ${veri.bugun} tarihinde oluşturuldu`,
    W / 2,
    285,
    { align: "center" }
  );
}

function baslikKutusuCiz(doc: JsPDFType, veri: GorevliListesiPdfVerisi) {
  const yukseklik = 16;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, 10, W - 2 * M, yukseklik);
  doc.line(M + 90, 10, M + 90, 10 + yukseklik);

  doc.setFontSize(11);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("GÖREVLİ LİSTESİ", M + 4, 10 + yukseklik / 2 + 1.5);

  doc.setFontSize(8);
  doc.setFont(FONT, "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(`Doküman No: TMGDK-G1`, M + 94, 10 + yukseklik / 2 - 2.5);
  doc.text(`Düzenleme Tarihi: ${veri.bugun}`, M + 94, 10 + yukseklik / 2 + 4.5);
}

export async function gorevliListesiPdfOlustur(
  veri: GorevliListesiPdfVerisi
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as unknown as JsPDFType;
  fontuKaydet(doc);

  // Sayfa 1 — kapak
  kapakSayfasiCiz(doc, veri);

  // Sayfa 2 — başlık kutusu + tablo
  doc.addPage();
  fontuKaydet(doc);
  baslikKutusuCiz(doc, veri);

  autoTable(doc, {
    startY: 30,
    margin: { left: M, right: M },
    styles: { font: FONT, fontSize: 8, cellPadding: 2, valign: "middle" },
    headStyles: {
      font: FONT,
      fontStyle: "bold",
      fillColor: RENK_VURGU,
      textColor: [255, 255, 255],
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 26 },
      2: { cellWidth: 48 },
      3: { cellWidth: 26 },
      4: { cellWidth: 36 },
      5: { cellWidth: 28 },
      6: { cellWidth: 20, halign: "center" },
    },
    head: [
      [
        "Sıra No",
        "Görev Başlığı",
        "Yapılacak Görevler",
        "Bağlı Olduğu Birim",
        "Sorumlu Kişi/ler",
        "Doldurulacak Döküman No",
        "Eğitim Tarihi",
      ],
    ],
    body: veri.satirlar.map((s) => [
      String(s.sira_no),
      s.gorev_basligi,
      s.yapilacak_gorevler,
      s.bagli_oldugu_birim,
      s.sorumluIsimler,
      s.doldurulacak_dokuman_no,
      s.egitim_tarihi,
    ]),
    didDrawPage: () => {
      // Yeni otomatik sayfa eklenirse başlık kutusunu tekrar çiz.
      baslikKutusuCiz(doc, veri);
    },
  });

  const sonY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;
  const dipnotY = sonY > H - 40 ? H - 38 : sonY;

  doc.setFontSize(7.5);
  doc.setFont(FONT, "italic");
  doc.setTextColor(90, 90, 90);
  const dipnotMetni =
    "Yukarıda Belirtilen Formda kişi/kişiler değişmesi halinde en geç 7 gün içerisinde yazılı olarak Tehlikeli Madde Güvenlik Danışmanına Haber verilmesi gerekmektedir.";
  const dipnotSatirlari = doc.splitTextToSize(dipnotMetni, W - 2 * M);
  doc.text(dipnotSatirlari, M, dipnotY);

  const imzaY = dipnotY + dipnotSatirlari.length * 3.6 + 10;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont(FONT, "bold");
  doc.text("TMGD:", M, imzaY);
  doc.setFont(FONT, "normal");
  doc.text(veri.hazirlayanAdi || "—", M + 16, imzaY);

  doc.setFont(FONT, "bold");
  doc.text("Sorumlu Kişi:", W - M - 45, imzaY);

  return doc.output("blob");
}
