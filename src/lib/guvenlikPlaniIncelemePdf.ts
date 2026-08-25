// src/lib/guvenlikPlaniIncelemePdf.ts
//
// GÜVENLİK PLANI İNCELEME RAPORU — PDF üretici
//
// Örnek yapı (kullanıcının paylaştığı ASUTEK/METKA raporu referans alınarak):
//   1) Kapak metni: genel açıklama + firma bilgisi + tarih/geçerlilik/imza alanı
//   2) Madde inceleme tablosu: UN No / Ürün Adı / Sınıflandırma Kodu / Sınıf / PG / Sonuç
//   3) Özet: kaç madde değerlendirildi, kaçı kapsamda, kaçı kapsam dışı, kaçı belirsiz
//   4) Kapanış: genel sonuç cümlesi + imza bloğu
//
// Sınır miktarları örnekteki gibi kullanıcıdan İSTENMİYOR — ADR Tablo 1.10.3.1.2
// eşikleri motor tarafından (adrSecurityPlan.ts) biliniyor ve rapora otomatik
// yansıtılıyor.

import type { ItemScopeResult, ScopeSummary } from "./adrSecurityPlan";
import type { LogoData } from "./aracEvraklariPdf";
import {
  LIBERATION_SANS_REGULAR_B64,
  LIBERATION_SANS_BOLD_B64,
} from "./pdfFonts";

type JsPDFType = {
  addFileToVFS: (fileName: string, data: string) => void;
  addFont: (fileName: string, name: string, style: string) => void;
  setFont: (name: string, style?: string) => void;
  setFontSize: (n: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setFillColor: (r: number, g?: number, b?: number) => void;
  setLineWidth: (n: number) => void;
  text: (
    text: string | string[],
    x: number,
    y: number,
    opts?: Record<string, unknown>
  ) => void;
  splitTextToSize: (text: string, w: number) => string[];
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  addImage: (
    data: string,
    fmt: string,
    x: number,
    y: number,
    w: number,
    h: number
  ) => void;
  addPage: () => void;
  save: (fileName: string) => void;
  output: (type: string) => Blob;
  internal: { pageSize: { getHeight: () => number; getWidth: () => number } };
};

const FONT = "LiberationSans";
const NAVY: [number, number, number] = [30, 58, 138];
const M = 15;
const W = 210;
const H = 297;

export type GuvenlikPlaniRaporVerisi = {
  firmaAdi: string;
  tarih: string; // gg.aa.yyyy
  gecerlilikSuresi?: string; // örn. "2 Yıl"
  hazirlayanUnvan?: string; // örn. "Tehlikeli Madde Güvenlik Danışmanı"
  hazirlayanAdi?: string;
  onaylayanAdi?: string;
  summary: ScopeSummary;
  logo?: LogoData;
};

async function newDoc(): Promise<JsPDFType> {
  const { default: jsPDF } = (await import("jspdf")) as unknown as {
    default: new (o?: object) => JsPDFType;
  };
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.addFileToVFS("LiberationSans-Regular.ttf", LIBERATION_SANS_REGULAR_B64);
  doc.addFont("LiberationSans-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("LiberationSans-Bold.ttf", LIBERATION_SANS_BOLD_B64);
  doc.addFont("LiberationSans-Bold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");
  return doc;
}

function logoCiz(doc: JsPDFType, logo: LogoData | undefined, x: number, y: number) {
  if (!logo) return 0;
  try {
    const logoW = 22;
    const oran = logo.enBoyOrani > 0 ? logo.enBoyOrani : 1;
    const logoH = logoW / oran;
    doc.addImage(logo.data, logo.fmt, x, y, logoW, logoH);
    return logoH;
  } catch {
    return 0;
  }
}

function baslikSeridi(doc: JsPDFType, veri: GuvenlikPlaniRaporVerisi, y: number): number {
  logoCiz(doc, veri.logo, M, y);
  doc.setFontSize(14);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...NAVY);
  doc.text("GÜVENLİK PLANI İNCELEME RAPORU", W / 2, y + 8, { align: "center" });
  doc.setFontSize(8.5);
  doc.setFont(FONT, "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("ADR 1.10.3.2 kapsamında hazırlanmıştır", W / 2, y + 13, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont(FONT, "bold");
  doc.text(`Tarih: ${veri.tarih}`, W - M, y + 4, { align: "right" });
  if (veri.gecerlilikSuresi) {
    doc.setFont(FONT, "normal");
    doc.text(`Geçerlilik Süresi: ${veri.gecerlilikSuresi}`, W - M, y + 9, { align: "right" });
  }
  return y + 22;
}

const SONUC_RENK: Record<ItemScopeResult["status"], [number, number, number]> = {
  in_scope: [185, 28, 28],
  out_of_scope: [22, 128, 61],
  undetermined: [161, 98, 7],
};

const SONUC_ETIKET: Record<ItemScopeResult["status"], string> = {
  in_scope: "KAPSAMDA",
  out_of_scope: "KAPSAM DIŞI",
  undetermined: "BELİRSİZ",
};

/** Madde inceleme tablosunu (çok sayfalı olabilir) çizer. */
function tabloCiz(doc: JsPDFType, sonuclar: ItemScopeResult[], yBaslangic: number): void {
  const kolonlar = [
    { b: "No", w: 7 },
    { b: "UN No", w: 14 },
    { b: "Uygun Sevkiyat Adı", w: 33 },
    { b: "Ticari Ad", w: 26 },
    { b: "Sınıf", w: 12 },
    { b: "PG", w: 9 },
    { b: "Mod", w: 14 },
    { b: "Sonuç", w: 22 },
    { b: "Gerekçe", w: 43 },
  ];
  const tabloW = kolonlar.reduce((a, k) => a + k.w, 0);
  let y = yBaslangic;

  const baslikCiz = () => {
    doc.setFillColor(...NAVY);
    doc.rect(M, y, tabloW, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.2);
    doc.setFont(FONT, "bold");
    let x = M;
    for (const k of kolonlar) {
      doc.text(k.b, x + 1.5, y + 4);
      x += k.w;
    }
    doc.setTextColor(0, 0, 0);
    y += 6;
  };

  baslikCiz();

  sonuclar.forEach((s, i) => {
    const gerekceSatirlari = doc.splitTextToSize(s.conclusion, kolonlar[8].w - 3);
    const adSatirlari = doc.splitTextToSize(s.proper_shipping_name, kolonlar[2].w - 3);
    const ticariAdSatirlari = doc.splitTextToSize(s.trade_name || "—", kolonlar[3].w - 3);
    const maxSatir = Math.max(gerekceSatirlari.length, adSatirlari.length, ticariAdSatirlari.length, 1);
    const satirH = Math.max(6, maxSatir * 3.2 + 2);

    if (y + satirH > H - 25) {
      doc.addPage();
      y = M;
      baslikCiz();
    }

    if (i % 2 === 1) {
      doc.setFillColor(245, 247, 250);
      doc.rect(M, y, tabloW, satirH, "F");
    }

    doc.setFontSize(7);
    doc.setFont(FONT, "normal");
    doc.setTextColor(0, 0, 0);
    let x = M;
    doc.text(String(i + 1), x + 1.5, y + 3.6);
    x += kolonlar[0].w;
    doc.text(`UN ${s.un_number}`, x + 1.5, y + 3.6);
    x += kolonlar[1].w;
    doc.text(adSatirlari, x + 1.5, y + 3.6);
    x += kolonlar[2].w;
    doc.text(ticariAdSatirlari, x + 1.5, y + 3.6);
    x += kolonlar[3].w;
    doc.text(s.adr_class || "—", x + 1.5, y + 3.6);
    x += kolonlar[4].w;
    doc.text(s.packing_group || "—", x + 1.5, y + 3.6);
    x += kolonlar[5].w;
    doc.text(s.mode, x + 1.5, y + 3.6);
    x += kolonlar[6].w;
    doc.setFont(FONT, "bold");
    doc.setTextColor(...SONUC_RENK[s.status]);
    doc.text(SONUC_ETIKET[s.status], x + 1.5, y + 3.6);
    doc.setTextColor(0, 0, 0);
    doc.setFont(FONT, "normal");
    x += kolonlar[7].w;
    doc.text(gerekceSatirlari, x + 1.5, y + 3.6);

    doc.setDrawColor(225, 228, 232);
    doc.setLineWidth(0.2);
    doc.line(M, y + satirH, M + tabloW, y + satirH);

    y += satirH;
  });
}

/** Özet sayaç kutusunu çizer (kaç madde değerlendirildi / kapsamda / kapsam dışı). */
function ozetKutusuCiz(doc: JsPDFType, summary: ScopeSummary, y: number): number {
  const kutuW = (W - 2 * M - 9) / 3;
  const veriler: { etiket: string; deger: number; renk: [number, number, number] }[] = [
    { etiket: "Değerlendirilen Kimyasal", deger: summary.total, renk: NAVY },
    { etiket: "Kapsamda", deger: summary.inScope, renk: [185, 28, 28] },
    { etiket: "Kapsam Dışı", deger: summary.outOfScope, renk: [22, 128, 61] },
  ];
  doc.setFontSize(9);
  veriler.forEach((v, i) => {
    const x = M + i * (kutuW + 4.5);
    doc.setDrawColor(210, 214, 220);
    doc.setLineWidth(0.3);
    doc.rect(x, y, kutuW, 20);
    doc.setFont(FONT, "bold");
    doc.setTextColor(...v.renk);
    doc.setFontSize(16);
    doc.text(String(v.deger), x + kutuW / 2, y + 11, { align: "center" });
    doc.setFontSize(7.5);
    doc.setFont(FONT, "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(v.etiket, x + kutuW / 2, y + 16.5, { align: "center" });
  });
  doc.setTextColor(0, 0, 0);
  if (summary.undetermined > 0) {
    doc.setFontSize(8);
    doc.setFont(FONT, "normal");
    doc.setTextColor(161, 98, 7);
    doc.text(
      `⚠ ${summary.undetermined} kimyasalın yıllık miktar bilgisi envanterde bulunmadığından kapsam durumu kesinleştirilemedi.`,
      M,
      y + 26
    );
    doc.setTextColor(0, 0, 0);
    return y + 32;
  }
  return y + 26;
}

/** Kapanış sayfası: genel sonuç cümlesi + imza bloğu. */
function kapanisSayfasiCiz(doc: JsPDFType, veri: GuvenlikPlaniRaporVerisi): void {
  doc.addPage();
  let y = baslikSeridi(doc, veri, 14);
  y += 6;

  const gerekli = veri.summary.inScope > 0;

  doc.setFontSize(10);
  doc.setFont(FONT, "normal");
  const aciklama = doc.splitTextToSize(
    "Ciddi sonuçlara neden olabilecek tehlikeli malların taşınmasına dahil olan işletmenin, " +
      "herhangi bir acil durum oluştuğunda hızlı ve düzenli müdahale edebilmesi ve ortaya çıkabilecek " +
      "zararları en aza indirebilmesi amacıyla, ADR Tablo 1.10.3.1.2 referans alınarak firma " +
      "envanterindeki tehlikeli maddelerin güvenlik planı kapsam değerlendirmesi gerçekleştirilmiştir.",
    W - 2 * M
  );
  doc.text(aciklama, M, y);
  y += aciklama.length * 5 + 8;

  doc.setFontSize(11);
  doc.setFont(FONT, "bold");
  if (gerekli) {
    doc.setTextColor(185, 28, 28);
    const metin = doc.splitTextToSize(
      `Bu husapta yukarıda incelemeleri yapılmış olan ADR'ye tabi kimyasallardan ${veri.summary.inScope} ` +
        `tanesi ADR Tablo 1.10.3.1.2 kapsamında tespit edilmiştir. Bu maddeler için GÜVENLİK PLANI HAZIRLANMASI GEREKMEKTEDİR.`,
      W - 2 * M
    );
    doc.text(metin, M, y);
    y += metin.length * 5.5;
  } else {
    doc.setTextColor(22, 128, 61);
    const metin = doc.splitTextToSize(
      "Bu hususta yukarıda incelemeleri yapılmış olan ADR'ye tabi kimyasallar için GÜVENLİK PLANI " +
        "HAZIRLANMASINA GEREK YOKTUR.",
      W - 2 * M
    );
    doc.text(metin, M, y);
    y += metin.length * 5.5;
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT, "normal");
  y += 20;

  const kutuW = (W - 2 * M - 10) / 2;
  const kutuH = 32;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(M, y, kutuW, kutuH);
  doc.rect(M + kutuW + 10, y, kutuW, kutuH);

  doc.setFontSize(8.5);
  doc.setFont(FONT, "bold");
  doc.text("HAZIRLAYAN", M + kutuW / 2, y + 6, { align: "center" });
  doc.text("ONAYLAYAN", M + kutuW + 10 + kutuW / 2, y + 6, { align: "center" });
  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  doc.text(
    veri.hazirlayanUnvan || "Tehlikeli Madde Güvenlik Danışmanı",
    M + kutuW / 2,
    y + 11,
    { align: "center" }
  );
  if (veri.hazirlayanAdi) {
    doc.setFont(FONT, "bold");
    doc.text(veri.hazirlayanAdi, M + kutuW / 2, y + kutuH - 5, { align: "center" });
  }
  if (veri.onaylayanAdi) {
    doc.setFont(FONT, "bold");
    doc.text(veri.onaylayanAdi, M + kutuW + 10 + kutuW / 2, y + kutuH - 5, { align: "center" });
  }

  doc.setFontSize(7);
  doc.setFont(FONT, "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Bu rapor, ADR Tablo 1.10.3.1.2 referans alınarak ${veri.tarih} tarihinde üretilmiştir.`,
    W / 2,
    H - 12,
    { align: "center" }
  );
  doc.setTextColor(0, 0, 0);
}

export async function guvenlikPlaniIncelemeRaporuUret(
  veri: GuvenlikPlaniRaporVerisi
): Promise<JsPDFType> {
  const doc = await newDoc();

  let y = baslikSeridi(doc, veri, 14);
  doc.setFontSize(9);
  doc.setFont(FONT, "bold");
  doc.text(veri.firmaAdi, M, y);
  y += 6;

  y = ozetKutusuCiz(doc, veri.summary, y);
  y += 4;

  doc.setFontSize(8.5);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...NAVY);
  doc.text("MADDE İNCELEME TABLOSU", M, y);
  doc.setTextColor(0, 0, 0);
  y += 4;

  tabloCiz(doc, veri.summary.results, y);

  kapanisSayfasiCiz(doc, veri);

  return doc;
}
