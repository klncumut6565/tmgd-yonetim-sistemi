// src/lib/guvenlikPlaniIncelemePdf.ts
//
// GÜVENLİK PLANI İNCELEME RAPORU — PDF üretici
//
// Görsel format, BelgeOlusturForm.tsx'teki EK-3 kapak/başlık şablonuyla
// BİREBİR AYNI: dış çerçeve, 3 bölmeli üst başlık kutusu (logo | doküman
// türü+adı | doküman no/tarihler/sayfa no), kapak sayfasında büyük firma
// unvanı + madde işaretli konu, her sayfada HAZIRLAYAN/KONTROL EDEN/
// ONAYLAYAN imza tablosu, kapakta sağ altta TMGDK karekod+logo.
//
// Madde inceleme tablosu ve özet kutuları bu sayfa 2018lerine göre içerik
// sayfalarına yerleştirilir.
//
// Sınır miktarları kullanıcıdan İSTENMİYOR — ADR Tablo 1.10.3.1.2 eşikleri
// motor tarafından (adrSecurityPlan.ts) biliniyor ve rapora otomatik yansır.

import type { ItemScopeResult, ScopeSummary } from "./adrSecurityPlan";
import type { LogoData } from "./aracEvraklariPdf";
import {
  LIBERATION_SANS_REGULAR_B64,
  LIBERATION_SANS_BOLD_B64,
} from "./pdfFonts";
import { SIAM_LOGO_B64, SIAM_LOGO_EN_BOY, SIAM_QR_B64 } from "./kapakVarliklari";

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
  circle: (x: number, y: number, r: number, style?: string) => void;
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

// ── Sayfa ölçüleri — BelgeOlusturForm.tsx ile BİREBİR AYNI sabitler ──────
const FONT = "LiberationSans";
const RENK_VURGU: [number, number, number] = [30, 64, 175]; // kurumsal mavi
const W = 210;
const H = 297;
const CERCEVE_KENAR = 8.5;
const CERCEVE_ALT = H - 9.5;
const M = 12.4; // içerik kenar boşluğu = başlık kutusu sol kenarı
const ALT_TABLO_UST = 244;
const ALT_TABLO_YUKSEKLIK = 35.5;

// Bu raporun kendi doküman kodu — TMGDK'nin diğer belgeleriyle aynı
// numaralandırma standardına uyar (TMGDK-<kod> formatı).
const RAPOR_KODU = "GP1";
const RAPOR_ADI = "Güvenlik Planı İnceleme Raporu";

export type GuvenlikPlaniRaporVerisi = {
  firmaAdi: string;
  tarih: string; // gg.aa.yyyy
  gecerlilikSuresi?: string; // örn. "2 Yıl"
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

/** Her sayfaya dış çerçeveyi çizer — BelgeOlusturForm.tsx → cerceveCiz(). */
function cerceveCiz(doc: JsPDFType) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.7);
  doc.rect(CERCEVE_KENAR, CERCEVE_KENAR, W - 2 * CERCEVE_KENAR, CERCEVE_ALT - CERCEVE_KENAR);
  doc.setLineWidth(0.3);
}

/** Logoyu verilen dikdörtgen alana oranını bozmadan sığdırır ve ortalar —
 *  BelgeOlusturForm.tsx → logoAlanaSigdir() ile birebir aynı. */
function logoAlanaSigdir(
  enBoyOrani: number,
  alanX: number,
  alanY: number,
  alanGenislik: number,
  alanYukseklik: number
) {
  const oran = enBoyOrani > 0 ? enBoyOrani : 1;
  let h = alanYukseklik;
  let w = h * oran;
  if (w > alanGenislik) {
    w = alanGenislik;
    h = w / oran;
  }
  return { x: alanX + (alanGenislik - w) / 2, y: alanY + (alanYukseklik - h) / 2, w, h };
}

/** 3 bölmeli üst başlık kutusu — BelgeOlusturForm.tsx → baslikTablosuCiz()
 *  ile BİREBİR AYNI: sol logo/firma adı, orta "RAPOR" + belge adı,
 *  sağ doküman no / tarihler / sayfa no. */
function baslikKutusuCiz(
  doc: JsPDFType,
  veri: GuvenlikPlaniRaporVerisi,
  sayfaEtiketi: string
) {
  const yukseklik = 26;
  const solKenar = CERCEVE_KENAR;
  const kutuGenislik = W - 2 * CERCEVE_KENAR;
  const ustY = CERCEVE_KENAR;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(solKenar, ustY, kutuGenislik, yukseklik);
  doc.line(solKenar + 38, ustY, solKenar + 38, ustY + yukseklik);
  doc.line(W - solKenar - 45, ustY, W - solKenar - 45, ustY + yukseklik);

  const ortaAyirici = ustY + yukseklik / 2;
  doc.line(solKenar + 38, ortaAyirici, W - solKenar - 45, ortaAyirici);

  const sagSatirY = yukseklik / 4;
  for (let i = 1; i < 4; i++) {
    doc.line(W - solKenar - 45, ustY + sagSatirY * i, W - solKenar, ustY + sagSatirY * i);
  }

  // Sol: firma logosu
  if (veri.logo) {
    try {
      const kenar = 2.5;
      const alanG = 38 - 2 * kenar;
      const alanY = Math.min(yukseklik - 2 * kenar, 22);
      const box = logoAlanaSigdir(veri.logo.enBoyOrani, solKenar + kenar, ustY + kenar, alanG, alanY);
      doc.addImage(veri.logo.data, veri.logo.fmt, box.x, box.y, box.w, box.h);
    } catch {
      /* yoksay */
    }
  } else {
    doc.setFontSize(7);
    doc.setFont(FONT, "bold");
    const firmLines = doc.splitTextToSize(veri.firmaAdi, 34);
    doc.text(firmLines, solKenar + 2, ustY + yukseklik / 2 - (firmLines.length - 1) * 2);
  }

  // Orta: doküman türü + belge adı
  const ortaX = solKenar + 38 + (kutuGenislik - 38 - 45) / 2;
  doc.setFontSize(12);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("RAPOR", ortaX, ustY + yukseklik / 4 + 2, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9.5);
  doc.setFont(FONT, "bold");
  doc.text(RAPOR_ADI, ortaX, ortaAyirici + yukseklik / 4 + 1.5, { align: "center", maxWidth: kutuGenislik - 38 - 45 - 6 });

  // Sağ: doküman no / tarihler / sayfa no
  doc.setFontSize(7);
  doc.setFont(FONT, "normal");
  const sagX = W - solKenar - 43;
  const sagMetinY = (i: number) => ustY + sagSatirY * i + sagSatirY / 2 + 1.2;
  doc.text(`Doküman No: TMGDK-${RAPOR_KODU}`, sagX, sagMetinY(0));
  doc.text(`Yayın Tarihi: ${veri.tarih}`, sagX, sagMetinY(1));
  doc.text(`Revizyon Tarihi: ${veri.tarih}`, sagX, sagMetinY(2));
  doc.text(`Sayfa No: ${sayfaEtiketi}`, sagX, sagMetinY(3));
}

/** HAZIRLAYAN / KONTROL EDEN / ONAYLAYAN imza tablosu — BelgeOlusturForm.tsx
 *  → altTabloCiz() ile BİREBİR AYNI (isim varsa isim+unvan, yoksa sadece
 *  rol adı; KONTROL EDEN her zaman sabit TMGD Koordinatörü). */
function imzaTablosuCiz(
  doc: JsPDFType,
  veri: GuvenlikPlaniRaporVerisi,
  ustY: number = ALT_TABLO_UST,
  yukseklik: number = ALT_TABLO_YUKSEKLIK
) {
  const kolonGenislik = (W - 2 * M) / 3;
  const isimler = [veri.hazirlayanAdi?.trim() || "", "YAKUP ATAŞ", veri.onaylayanAdi?.trim() || ""];
  const basliklar = ["HAZIRLAYAN", "KONTROL EDEN", "ONAYLAYAN"];
  const altBasliklar = [
    "Tehlikeli Madde Güvenlik Danışmanı",
    "Tehlikeli Madde Güvenlik Danışmanı Koordinatörü",
    "Sorumlu Kişi",
  ];
  const isimliUnvanlar = [altBasliklar[0], altBasliklar[1], "Tesis Sorumlusu"];

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, ustY, W - 2 * M, yukseklik);
  doc.line(M + kolonGenislik, ustY, M + kolonGenislik, ustY + yukseklik);
  doc.line(M + kolonGenislik * 2, ustY, M + kolonGenislik * 2, ustY + yukseklik);

  basliklar.forEach((b, i) => {
    const x = M + kolonGenislik * i + kolonGenislik / 2;
    const isim = isimler[i];

    doc.setFontSize(7.5);
    doc.setFont(FONT, "bold");
    doc.text(b, x, ustY + 5, { align: "center" });

    if (isim) {
      doc.setFontSize(7.5);
      doc.setFont(FONT, "bold");
      doc.text(isim.toLocaleUpperCase("tr-TR"), x, ustY + 10.5, {
        align: "center",
        maxWidth: kolonGenislik - 4,
      });
      doc.setFontSize(6);
      doc.setFont(FONT, "normal");
      doc.text(isimliUnvanlar[i], x, ustY + 14.3, { align: "center", maxWidth: kolonGenislik - 4 });
    } else {
      doc.setFontSize(6.5);
      doc.setFont(FONT, "normal");
      doc.text(altBasliklar[i], x, ustY + 10.5, { align: "center", maxWidth: kolonGenislik - 4 });
    }
  });
}

/** Kapak sayfası — BelgeOlusturForm.tsx → kapakSayfasiCiz() ile aynı
 *  yerleşim: firma unvanı büyük, madde işaretli konu, imza tablosu
 *  (kapağa özel konum/yükseklik), sağ altta TMGDK karekod + logo. */
function kapakSayfasiCiz(doc: JsPDFType, veri: GuvenlikPlaniRaporVerisi) {
  cerceveCiz(doc);
  baslikKutusuCiz(doc, veri, "Kapak Sayfası");

  const genislik = W - 2 * M;
  const ortaX = W / 2;

  doc.setFontSize(15);
  doc.setFont(FONT, "bold");
  const unvanSatirlari = doc.splitTextToSize(veri.firmaAdi.toLocaleUpperCase("tr-TR"), genislik - 20);
  let y = 105;
  unvanSatirlari.forEach((satir: string) => {
    doc.text(satir, ortaX, y, { align: "center" });
    y += 8;
  });

  y += 8;
  doc.setFontSize(10.5);
  doc.setFont(FONT, "bold");
  const konu = `${RAPOR_ADI} (${RAPOR_KODU})`;
  const konuSatirlari = doc.splitTextToSize(konu, genislik - 24);
  doc.circle(M + 8, y - 1.4, 0.9, "F");
  konuSatirlari.forEach((satir: string) => {
    doc.text(satir, M + 13, y);
    y += 5.4;
  });

  imzaTablosuCiz(doc, veri, 218, 42.7);

  // Sağ alt köşe: TMGDK kurumsal logosu + karekod
  const qrBoyut = 22;
  const qrX = W - CERCEVE_KENAR - 12 - qrBoyut;
  const qrY = 263;
  try {
    doc.addImage(SIAM_QR_B64, "PNG", qrX, qrY, qrBoyut, qrBoyut);
  } catch {
    /* karekod eklenemezse belge yine üretilsin */
  }
  const logoYukseklik = 11;
  const logoGenislik = logoYukseklik * SIAM_LOGO_EN_BOY;
  try {
    doc.addImage(
      SIAM_LOGO_B64,
      "JPEG",
      qrX - logoGenislik - 4,
      qrY + (qrBoyut - logoYukseklik) / 2,
      logoGenislik,
      logoYukseklik
    );
  } catch {
    /* logo eklenemezse belge yine üretilsin */
  }
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

/** Özet sayaç kutusunu çizer. */
function ozetKutusuCiz(doc: JsPDFType, summary: ScopeSummary, y: number): number {
  const genislik = W - 2 * M;
  const kutuW = (genislik - 9) / 3;
  const veriler: { etiket: string; deger: number; renk: [number, number, number] }[] = [
    { etiket: "Değerlendirilen Kimyasal", deger: summary.total, renk: RENK_VURGU },
    { etiket: "Kapsamda", deger: summary.inScope, renk: [185, 28, 28] },
    { etiket: "Kapsam Dışı", deger: summary.outOfScope, renk: [22, 128, 61] },
  ];
  doc.setFontSize(9);
  veriler.forEach((v, i) => {
    const x = M + i * (kutuW + 4.5);
    doc.setDrawColor(210, 214, 220);
    doc.setLineWidth(0.3);
    doc.rect(x, y, kutuW, 18);
    doc.setFont(FONT, "bold");
    doc.setTextColor(...v.renk);
    doc.setFontSize(15);
    doc.text(String(v.deger), x + kutuW / 2, y + 10, { align: "center" });
    doc.setFontSize(7);
    doc.setFont(FONT, "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(v.etiket, x + kutuW / 2, y + 15, { align: "center" });
  });
  doc.setTextColor(0, 0, 0);
  if (summary.undetermined > 0) {
    doc.setFontSize(7.5);
    doc.setFont(FONT, "normal");
    doc.setTextColor(161, 98, 7);
    doc.text(
      `⚠ ${summary.undetermined} kimyasalın yıllık miktar bilgisi envanterde bulunmadığından kapsam durumu kesinleştirilemedi.`,
      M,
      y + 23
    );
    doc.setTextColor(0, 0, 0);
    return y + 29;
  }
  return y + 23;
}

/** Madde inceleme tablosunu, içerik alanı sınırları içinde çizer; alan
 *  dolarsa yeni sayfa açar (çerçeve + başlık kutusu + imza tablosuyla). */
function tabloCiz(
  doc: JsPDFType,
  veri: GuvenlikPlaniRaporVerisi,
  yBaslangic: number,
  baslangicSayfaNo: number
): number {
  const sonuclar = veri.summary.results;
  // Gerekçe metni satırlardaki en uzun içerik olduğundan, satır yüksekliğini
  // (dolayısıyla toplam sayfa sayısını) belirleyen asıl etken bu sütun.
  // Toplam genişlik (W-2M ≈ 185mm) tam kullanılacak şekilde Gerekçe'ye
  // ağırlık verilip diğer sütunlar sıkıştırıldı.
  const kolonlar = [
    { b: "No", w: 6 },
    { b: "UN No", w: 13 },
    { b: "Uygun Sevkiyat Adı", w: 30 },
    { b: "Ticari Ad", w: 22 },
    { b: "Sınıf", w: 10 },
    { b: "PG", w: 7 },
    { b: "Mod", w: 11 },
    { b: "Sonuç", w: 18 },
    { b: "Gerekçe", w: 68 },
  ];
  const tabloW = kolonlar.reduce((a, k) => a + k.w, 0);
  let y = yBaslangic;
  let sayfaNo = baslangicSayfaNo;

  const baslikCiz = () => {
    doc.setFillColor(...RENK_VURGU);
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

  const yeniSayfaAc = () => {
    doc.addPage();
    sayfaNo += 1;
    cerceveCiz(doc);
    baslikKutusuCiz(doc, veri, `Sayfa ${sayfaNo}`);
    imzaTablosuCiz(doc, veri);
    y = CERCEVE_KENAR + 26 + 8;
    baslikCiz();
  };

  baslikCiz();

  sonuclar.forEach((s, i) => {
    const gerekceSatirlari = doc.splitTextToSize(s.conclusion, kolonlar[8].w - 3);
    const adSatirlari = doc.splitTextToSize(s.proper_shipping_name, kolonlar[2].w - 3);
    const ticariAdSatirlari = doc.splitTextToSize(s.trade_name || "—", kolonlar[3].w - 3);
    const maxSatir = Math.max(gerekceSatirlari.length, adSatirlari.length, ticariAdSatirlari.length, 1);
    const satirH = Math.max(6, maxSatir * 3.2 + 2);

    if (y + satirH > ALT_TABLO_UST - 4) {
      yeniSayfaAc();
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

  return sayfaNo;
}

/** Kapanış sayfası: genel sonuç cümlesi (imza tablosu her sayfada zaten
 *  gösterildiği için burada tekrar edilir — BelgeOlusturForm'daki içerik
 *  sayfalarının tümünde imza tablosunun tutarlı biçimde yer alması ile
 *  aynı mantık). */
function kapanisSayfasiCiz(doc: JsPDFType, veri: GuvenlikPlaniRaporVerisi, sayfaNo: number): void {
  doc.addPage();
  cerceveCiz(doc);
  baslikKutusuCiz(doc, veri, `Sayfa ${sayfaNo}`);
  imzaTablosuCiz(doc, veri);

  let y = CERCEVE_KENAR + 26 + 10;
  const genislik = W - 2 * M;

  const gerekli = veri.summary.inScope > 0;

  doc.setFontSize(10);
  doc.setFont(FONT, "normal");
  doc.setTextColor(0, 0, 0);
  const aciklama = doc.splitTextToSize(
    "Ciddi sonuçlara neden olabilecek tehlikeli malların taşınmasına dahil olan işletmenin, " +
      "herhangi bir acil durum oluştuğunda hızlı ve düzenli müdahale edebilmesi ve ortaya çıkabilecek " +
      "zararları en aza indirebilmesi amacıyla, ADR Tablo 1.10.3.1.2 referans alınarak firma " +
      "envanterindeki tehlikeli maddelerin güvenlik planı kapsam değerlendirmesi gerçekleştirilmiştir.",
    genislik
  );
  doc.text(aciklama, M, y);
  y += aciklama.length * 5 + 8;

  doc.setFontSize(11);
  doc.setFont(FONT, "bold");
  if (gerekli) {
    doc.setTextColor(185, 28, 28);
    const metin = doc.splitTextToSize(
      `Bu hususta yukarıda incelemeleri yapılmış olan ADR'ye tabi kimyasallardan ${veri.summary.inScope} ` +
        `tanesi ADR Tablo 1.10.3.1.2 kapsamında tespit edilmiştir. Bu maddeler için GÜVENLİK PLANI HAZIRLANMASI GEREKMEKTEDİR.`,
      genislik
    );
    doc.text(metin, M, y);
    y += metin.length * 5.5;
  } else {
    doc.setTextColor(22, 128, 61);
    const metin = doc.splitTextToSize(
      "Bu hususta yukarıda incelemeleri yapılmış olan ADR'ye tabi kimyasallar için GÜVENLİK PLANI " +
        "HAZIRLANMASINA GEREK YOKTUR.",
      genislik
    );
    doc.text(metin, M, y);
    y += metin.length * 5.5;
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT, "normal");

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Bu rapor, ADR Tablo 1.10.3.1.2 referans alınarak ${veri.tarih} tarihinde üretilmiştir.`,
    W / 2,
    ALT_TABLO_UST - 4,
    { align: "center" }
  );
  doc.setTextColor(0, 0, 0);
}

/** ADR Tablo 1.10.3.1.2'deki eşik satırları — sadece bu sayfada referans
 *  olarak basılır (motorun kendi eşik mantığı adrSecurityPlan.ts'te). */
const ADR_TABLO_1_10_3_SATIRLARI: {
  sinif: string;
  altGrup: string;
  madde: string;
  tank: string;
  dokme: string;
  ambalaj: string;
}[] = [
  { sinif: "1", altGrup: "1.1", madde: "Patlayıcılar", tank: "a", dokme: "a", ambalaj: "0" },
  { sinif: "1", altGrup: "1.2", madde: "Patlayıcılar", tank: "a", dokme: "a", ambalaj: "0" },
  { sinif: "1", altGrup: "1.3", madde: "Uyumluluk grubu C patlayıcılar", tank: "a", dokme: "a", ambalaj: "0" },
  {
    sinif: "1",
    altGrup: "1.4",
    madde:
      "Patlayıcılar, UN No. 0104, 0237, 0255, 0267, 0289, 0361, 0365, 0366, 0440, 0441, 0455, 0456, 0500, 0512 ve 0513",
    tank: "a",
    dokme: "a",
    ambalaj: "0",
  },
  { sinif: "1", altGrup: "1.5", madde: "Patlayıcılar", tank: "0", dokme: "a", ambalaj: "0" },
  { sinif: "1", altGrup: "1.6", madde: "Patlayıcılar", tank: "a", dokme: "a", ambalaj: "0" },
  {
    sinif: "2",
    altGrup: "",
    madde: "Alevlenebilir, zehirli olmayan gazlar (Yalnızca F veya FC harflerini içeren sınıflandırma kodları)",
    tank: "3000",
    dokme: "a",
    ambalaj: "b",
  },
  {
    sinif: "2",
    altGrup: "",
    madde: "Zehirli gazlar (T, TF, TC, TO, TFC veya TOC harflerini içeren sınıflandırma kodları) aerosoller hariç",
    tank: "0",
    dokme: "a",
    ambalaj: "0",
  },
  { sinif: "3", altGrup: "", madde: "Paketleme grubu I ve II'deki alevlenebilir sıvılar", tank: "3000", dokme: "a", ambalaj: "b" },
  { sinif: "3", altGrup: "", madde: "Duyarlılığı azaltılmış patlayıcılar", tank: "0", dokme: "a", ambalaj: "0" },
  { sinif: "4.1", altGrup: "", madde: "Duyarlılığı azaltılmış patlayıcılar", tank: "a", dokme: "a", ambalaj: "0" },
  { sinif: "4.2", altGrup: "", madde: "Paketleme grubu I'deki maddeler", tank: "3000", dokme: "a", ambalaj: "b" },
  { sinif: "4.3", altGrup: "", madde: "Paketleme grubu I'deki maddeler", tank: "3000", dokme: "a", ambalaj: "b" },
  { sinif: "5.1", altGrup: "", madde: "Paketleme grubu I'deki yükseltgen sıvılar", tank: "3000", dokme: "a", ambalaj: "b" },
  {
    sinif: "5.1",
    altGrup: "",
    madde:
      "Perkloratlar, amonyum nitrat, amonyum nitrat gübreler ve amonyum nitrat emülsiyonlar veya süspansiyonlar veya jeller",
    tank: "3000",
    dokme: "3000",
    ambalaj: "b",
  },
  { sinif: "6.1", altGrup: "", madde: "Paketleme grubu I'deki zehirli maddeler", tank: "0", dokme: "a", ambalaj: "0" },
  {
    sinif: "6.2",
    altGrup: "",
    madde:
      "Bulaşıcı madde Kategori A (UN No. 2814 ve 2900 hayvansal malzemeler hariç) ve Tıbbi atık Kategori A'daki (UN No. 3549)",
    tank: "a",
    dokme: "0",
    ambalaj: "0",
  },
  { sinif: "8", altGrup: "", madde: "Paketleme grubu I'deki aşındırıcı maddeler", tank: "3000", dokme: "a", ambalaj: "b" },
];

/** Kapak sonrası 2. sayfa: ADR Bölüm 1.10.3 (Ciddi sonuçlara neden
 *  olabilecek tehlikeli mallara ilişkin hükümler) özeti + Tablo
 *  1.10.3.1.2'nin tam metni — kullanıcının paylaştığı ADR 2025 Cilt I
 *  referans alınarak. */
function emniyetHukumleriSayfasiCiz(doc: JsPDFType, veri: GuvenlikPlaniRaporVerisi): void {
  doc.addPage();
  cerceveCiz(doc);
  baslikKutusuCiz(doc, veri, "Sayfa 2");
  imzaTablosuCiz(doc, veri);

  const genislik = W - 2 * M;
  let y = CERCEVE_KENAR + 26 + 8;

  doc.setFontSize(10.5);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("ADR BÖLÜM 1.10.3 — CİDDİ SONUÇLARA NEDEN OLABİLECEK", M, y);
  y += 4.3;
  doc.text("TEHLİKELİ MALLARA İLİŞKİN HÜKÜMLER", M, y);
  doc.setTextColor(0, 0, 0);
  y += 6;

  doc.setFontSize(7.8);
  doc.setFont(FONT, "normal");
  const paragraf = doc.splitTextToSize(
    "1.10.3.1.1 Ciddi sonuçlara neden olabilecek tehlikeli mallar, bir terör olayında kötü amaçlı kullanılma " +
      "potansiyeline sahip ve kitlesel ölümler, kitlesel yaralanmalar veya özellikle Sınıf 7 için kitlesel " +
      "sosyoekonomik yıkımlar gibi ciddi sonuçlar doğurabilecek tehlikeli mallardır.\n" +
      "1.10.3.1.2 Sınıf 7 haricindeki sınıflarda yer alan ciddi sonuçlar doğurabilecek tehlikeli malların listesi, " +
      "aşağıdaki Tablo 1.10.3.1.2'de listelenen ve burada belirtilen miktarlardan daha fazla taşınan tehlikeli " +
      "mallardır.",
    genislik
  );
  doc.text(paragraf, M, y);
  y += paragraf.length * 3.6 + 5;

  doc.setFontSize(9);
  doc.setFont(FONT, "bold");
  doc.text("Tablo 1.10.3.1.2: Ciddi sonuçlara neden olabilecek tehlikeli malların listesi", M, y);
  y += 5;

  const kolonlar = [
    { b: "Sınıf", w: 13 },
    { b: "Alt Grup", w: 15 },
    { b: "Madde veya Nesne", w: 100 },
    { b: "Tank (L)", w: 19 },
    { b: "Dökme (kg)", w: 19 },
    { b: "Ambalaj (kg)", w: 19.2 },
  ];
  const tabloW = kolonlar.reduce((a, k) => a + k.w, 0);

  doc.setFillColor(...RENK_VURGU);
  doc.rect(M, y, tabloW, 6.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.2);
  doc.setFont(FONT, "bold");
  let x = M;
  for (const k of kolonlar) {
    doc.text(k.b, x + 1.5, y + 4.3, { maxWidth: k.w - 2 });
    x += k.w;
  }
  doc.setTextColor(0, 0, 0);
  y += 6.5;

  ADR_TABLO_1_10_3_SATIRLARI.forEach((satir, i) => {
    doc.setFontSize(6.8);
    doc.setFont(FONT, "normal");
    const maddeSatirlari = doc.splitTextToSize(satir.madde, kolonlar[2].w - 3);
    const satirH = Math.max(4.6, maddeSatirlari.length * 2.9 + 1.8);

    if (i % 2 === 1) {
      doc.setFillColor(245, 247, 250);
      doc.rect(M, y, tabloW, satirH, "F");
    }

    x = M;
    doc.text(satir.sinif, x + 1.5, y + 3.2);
    x += kolonlar[0].w;
    doc.text(satir.altGrup || "—", x + 1.5, y + 3.2);
    x += kolonlar[1].w;
    doc.text(maddeSatirlari, x + 1.5, y + 3.2);
    x += kolonlar[2].w;
    doc.text(satir.tank, x + kolonlar[3].w / 2, y + 3.2, { align: "center" });
    x += kolonlar[3].w;
    doc.text(satir.dokme, x + kolonlar[4].w / 2, y + 3.2, { align: "center" });
    x += kolonlar[4].w;
    doc.text(satir.ambalaj, x + kolonlar[5].w / 2, y + 3.2, { align: "center" });

    doc.setDrawColor(225, 228, 232);
    doc.setLineWidth(0.15);
    doc.line(M, y + satirH, M + tabloW, y + satirH);

    y += satirH;
  });

  y += 3;
  doc.setFontSize(6.6);
  doc.setFont(FONT, "normal");
  doc.setTextColor(90, 90, 90);
  const dipnotlar = [
    "a: İlgili değil.",
    "b: Miktar ne olursa olsun, 1.10.3 hükümleri uygulanmaz.",
    "c: Bu sütunda belirtilen bir değer, Bölüm 3.2, Tablo A, Sütun (10) veya (12) uyarınca, tanklarda taşıma için " +
      "izin verilmişse geçerlidir. Bu sütundaki talimat, tanklarda taşınmasına izin verilmeyen maddeler ile ilgili değildir.",
    "d: Bu sütunda belirtilen bir değer, Bölüm 3.2, Tablo A, Sütun (10) veya (17) uyarınca, dökme yük taşıma için " +
      "izin verilmişse geçerlidir. Bu sütundaki talimat, dökme yük taşınmasına izin verilmeyen maddeler ile ilgili değildir.",
  ];
  dipnotlar.forEach((d) => {
    const satirlar = doc.splitTextToSize(d, genislik);
    doc.text(satirlar, M, y);
    y += satirlar.length * 3.2;
  });
  doc.setTextColor(0, 0, 0);
}

export async function guvenlikPlaniIncelemeRaporuUret(
  veri: GuvenlikPlaniRaporVerisi
): Promise<JsPDFType> {
  const doc = await newDoc();

  // 1) Kapak sayfası
  kapakSayfasiCiz(doc, veri);

  // 2) ADR Bölüm 1.10.3 hükümleri + Tablo 1.10.3.1.2 referans sayfası
  emniyetHukumleriSayfasiCiz(doc, veri);

  // 3) İçerik: özet kutuları + madde inceleme tablosu
  doc.addPage();
  cerceveCiz(doc);
  baslikKutusuCiz(doc, veri, "Sayfa 3");
  imzaTablosuCiz(doc, veri);

  let y = CERCEVE_KENAR + 26 + 8;
  y = ozetKutusuCiz(doc, veri.summary, y);
  y += 4;

  doc.setFontSize(8.5);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("MADDE İNCELEME TABLOSU", M, y);
  doc.setTextColor(0, 0, 0);
  y += 4;

  const sonSayfaNo = tabloCiz(doc, veri, y, 3);

  // 4) Kapanış: genel sonuç cümlesi
  kapanisSayfasiCiz(doc, veri, sonSayfaNo + 1);

  return doc;
}
