// src/lib/surucuListesiPdf.ts
//
// "ARAÇ SÜRÜCÜ LİSTESİ / TAŞIMADA GÖREV ALAN SÜRÜCÜLERE İLİŞKİN BİLGİLER"
// (Doküman No: TMGDK-L3) belgesinin PDF çıktısını üretir.
//
// Sayfa 2 (tablo sayfası) düzeni, kullanıcının paylaştığı örnek Excel'le
// (SRC5_Kayıtları.xlsx) BİREBİR aynı şema: sol üstte firma logosu, ortada
// başlık + alt açıklama, sağda 4 satırlık belge kontrol paneli (Doküman No /
// Yayın Tarihi / Revizyon Tarihi / Sayfa No), altta HAZIRLAYAN / KONTROL
// EDEN / ONAYLAYAN üç sütunlu imza bloğu (BelgeOlusturForm.tsx'teki AYNI
// sabit desen — "KONTROL EDEN" her zaman TMGD Koordinatörü'dür).

import type { jsPDF as JsPDFType } from "jspdf";
import { LIBERATION_SANS_REGULAR_B64, LIBERATION_SANS_BOLD_B64 } from "./pdfFonts";
import { SIAM_LOGO_B64, SIAM_LOGO_EN_BOY, SIAM_QR_B64 } from "./kapakVarliklari";

const FONT = "LiberationSans";
const RENK_VURGU: [number, number, number] = [30, 64, 175];
const M = 15;

// Sayfa ölçüleri sayfaya göre değişir (kapak + ek sayfaları DİKEY, tablo
// sayfası YATAY).
let W = 210;
let H = 297;
function sayfaYonunuAyarla(yatay: boolean) {
  W = yatay ? 297 : 210;
  H = yatay ? 210 : 297;
}

export type SurucuListesiPdfSatiri = {
  sira_no: number;
  ad_soyad: string;
  tc_kimlik_no: string;
  src5_sertifikasi: string;
  ise_giris_tarihi: string;
  sertifika_numarasi: string;
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
  /** Onaylayan (tesis sorumlusu) — firms.approver_name. Boşsa ONAYLAYAN
   *  kutusunda yalnızca "Tesis Sorumlusu" yer tutucusu görünür. */
  onaylayanAdi: string;
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

/**
 * Kapak sayfasının kenarına ince bir çerçeve çizer — Görevli Listesi
 * (gorevliListesiPdf.ts) ile AYNI teknik.
 */
function kapakCercevesiCiz(doc: JsPDFType) {
  const kenar = 6;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(kenar, kenar, W - 2 * kenar, H - 2 * kenar);
  doc.setLineWidth(0.2); // sonraki çizimler için varsayılana döndür
}

/** Bir sürücü belgesi ekini (SRC5/Ehliyet) ayrı bir sayfa olarak ekler.
 *  Görsel, içerik kutusuna ORANI KORUNARAK ve TAŞMADAN (contain) sığdırılır
 *  — bkz. belge posteri mekanizmasındaki AYNI dul/taşma düzeltmesi. */
async function belgeEkiSayfasiEkle(doc: JsPDFType, ek: SurucuBelgeEki) {
  // Bu sayfa, kendinden önceki tablo sayfası YATAY olsa bile her zaman
  // DİKEY açılır.
  sayfaYonunuAyarla(false);
  doc.addPage("a4", "portrait");
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
  kapakCercevesiCiz(doc);

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

  // Hazırlayan (TMGD) / Sorumlu Kişi — Görevli Listesi kapak sayfasıyla
  // (gorevliListesiPdf.ts) AYNI iki sütunlu imza alanı. "Sorumlu Kişi",
  // onaylayanAdi (firms.approver_name / tesis sorumlusu) ile doldurulur.
  const imzaY = 140;
  doc.setFontSize(9.5);
  doc.setFont(FONT, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Hazırlayan (TMGD)", W / 2 - 42, imzaY, { align: "center" });
  doc.text("Sorumlu Kişi", W / 2 + 42, imzaY, { align: "center" });
  doc.setFont(FONT, "normal");
  doc.text(veri.hazirlayanAdi || "—", W / 2 - 42, imzaY + 6, { align: "center" });
  doc.text(veri.onaylayanAdi || "—", W / 2 + 42, imzaY + 6, { align: "center" });

  doc.setFontSize(9.5);
  doc.setFont(FONT, "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("Doküman No: TMGDK-L3", W / 2, H - 34, { align: "center" });
  doc.text(`Düzenleme Tarihi: ${veri.bugun}`, W / 2, H - 28, { align: "center" });

  // Sağ alt köşe: SİAM TMGDK kurumsal logosu + karekod — diğer TÜM
  // belgelerin kapağıyla (Görevli Listesi, Belge Oluştur) AYNI yerleşim.
  const qrBoyut = 22;
  const qrX = W - M - qrBoyut;
  const qrY = H - qrBoyut - 12;
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

/**
 * Tablo sayfasının üst başlık kutusu — kullanıcının paylaştığı örnek
 * Excel'le (SRC5_Kayıtları.xlsx) AYNI şema:
 *   Sol üst köşe        : firma logosu
 *   Orta                : "ARAÇ SÜRÜCÜ LİSTESİ" başlığı + alt açıklama
 *   Sağ                 : 4 satırlık bilgi paneli — Doküman No / Yayın
 *                         Tarihi / Revizyon Tarihi / Sayfa No
 * BASLIK_KUTUSU_YUKSEKLIK dışarıya açılır ki autoTable'ın startY/margin.top
 * değerleri bununla tutarlı kalsın.
 */
const BASLIK_KUTUSU_YUKSEKLIK = 24;
const BILGI_PANELI_GENISLIK = 55;

function baslikKutusuCiz(doc: JsPDFType, veri: SurucuListesiPdfVerisi, sayfaNo = 1) {
  const kutuTop = 10;
  const kutuGenislik = W - 2 * M;
  const baslikGenislik = kutuGenislik - BILGI_PANELI_GENISLIK;
  const satirYuksekligi = BASLIK_KUTUSU_YUKSEKLIK / 4;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, kutuTop, kutuGenislik, BASLIK_KUTUSU_YUKSEKLIK);
  doc.line(M + baslikGenislik, kutuTop, M + baslikGenislik, kutuTop + BASLIK_KUTUSU_YUKSEKLIK);
  for (let i = 1; i < 4; i++) {
    const y = kutuTop + i * satirYuksekligi;
    doc.line(M + baslikGenislik, y, M + kutuGenislik, y);
  }

  // Sol üst köşe — firma logosu.
  if (veri.logo) {
    try {
      const box = logoKutusuHesapla(veri.logo.enBoyOrani, BASLIK_KUTUSU_YUKSEKLIK - 4);
      doc.addImage(veri.logo.data, veri.logo.fmt, M + 2, kutuTop + 2, box.w, box.h);
    } catch {
      /* logo eklenemezse başlık kutusu yine çizilsin */
    }
  }

  // Orta: başlık + alt açıklama (ortalanmış — sol üstteki küçük logoyla
  // çakışmaz, bkz. gorevliListesiPdf.ts'teki AYNI gerekçe)
  doc.setFontSize(12);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("ARAÇ SÜRÜCÜ LİSTESİ", M + baslikGenislik / 2, kutuTop + 9, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont(FONT, "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(
    "TAŞIMADA GÖREV ALAN SÜRÜCÜLERE İLİŞKİN BİLGİLER",
    M + baslikGenislik / 2,
    kutuTop + 16,
    { align: "center" }
  );

  // Sağ taraf: bilgi paneli
  doc.setFontSize(7.5);
  doc.setFont(FONT, "normal");
  doc.setTextColor(0, 0, 0);
  const bilgiX = M + baslikGenislik + 3;
  const bilgiSatirlari = [
    `Doküman No: TMGDK-L3`,
    `Yayın Tarihi: ${veri.bugun}`,
    `Revizyon Tarihi: ${veri.bugun}`,
    `Sayfa No: ${sayfaNo}`,
  ];
  bilgiSatirlari.forEach((metin, i) => {
    doc.text(metin, bilgiX, kutuTop + satirYuksekligi * i + satirYuksekligi / 2 + 1.5);
  });
}

/**
 * Tablodan sonraki HAZIRLAYAN / KONTROL EDEN / ONAYLAYAN üç sütunlu imza
 * bloğu — BelgeOlusturForm.tsx'teki (belgeAltTablosuCiz) AYNI sabit desen:
 * "KONTROL EDEN" her zaman ve her firma için sabit TMGD Koordinatörü'dür.
 */
function imzaBlokuCiz(doc: JsPDFType, veri: SurucuListesiPdfVerisi, y: number) {
  const yukseklik = 18;
  const kolonGenislik = (W - 2 * M) / 3;

  const isimler = [veri.hazirlayanAdi.trim(), "YAKUP ATAŞ", veri.onaylayanAdi.trim()];
  const basliklar = ["HAZIRLAYAN", "KONTROL EDEN", "ONAYLAYAN"];
  const altBasliklar = [
    "Tehlikeli Madde Güvenlik Danışmanı",
    "Tehlikeli Madde Güvenlik Danışmanı Koordinatörü",
    "Sorumlu Kişi",
  ];
  const isimliUnvanlar = [altBasliklar[0], altBasliklar[1], "Tesis Sorumlusu"];

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, y, W - 2 * M, yukseklik);
  doc.line(M + kolonGenislik, y, M + kolonGenislik, y + yukseklik);
  doc.line(M + kolonGenislik * 2, y, M + kolonGenislik * 2, y + yukseklik);

  basliklar.forEach((b, i) => {
    const x = M + kolonGenislik * i + kolonGenislik / 2;
    const isim = isimler[i];

    doc.setFontSize(7.5);
    doc.setFont(FONT, "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(b, x, y + 5, { align: "center" });

    if (isim) {
      doc.setFontSize(7.5);
      doc.setFont(FONT, "bold");
      doc.text(isim.toLocaleUpperCase("tr-TR"), x, y + 10.5, { align: "center", maxWidth: kolonGenislik - 4 });
      doc.setFontSize(6);
      doc.setFont(FONT, "normal");
      doc.text(isimliUnvanlar[i], x, y + 14.3, { align: "center", maxWidth: kolonGenislik - 4 });
    } else {
      doc.setFontSize(6.5);
      doc.setFont(FONT, "normal");
      doc.text(altBasliklar[i], x, y + 10.5, { align: "center", maxWidth: kolonGenislik - 4 });
    }
  });
}

export async function surucuListesiPdfOlustur(veri: SurucuListesiPdfVerisi): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as unknown as JsPDFType;
  fontuKaydet(doc);

  // Sayfa 1 — kapak (DİKEY, çerçeveli)
  sayfaYonunuAyarla(false);
  kapakSayfasiCiz(doc, veri);

  // Sayfa 2 — başlık kutusu + tablo (YATAY)
  sayfaYonunuAyarla(true);
  doc.addPage("a4", "landscape");
  fontuKaydet(doc);
  baslikKutusuCiz(doc, veri, 1);

  autoTable(doc, {
    startY: 38,
    // margin.top ÖNEMLİ: autoTable devam sayfası eklediğinde bu üst
    // boşluğu her yeni sayfada da ayırır — yoksa devam sayfalarında
    // tablo başlığı baslikKutusuCiz() kutusuyla çakışır.
    margin: { top: 38, left: M, right: M },
    styles: { font: FONT, fontSize: 8, cellPadding: 2, valign: "middle" },
    headStyles: {
      font: FONT,
      fontStyle: "bold",
      fillColor: RENK_VURGU,
      textColor: [255, 255, 255],
      halign: "center",
    },
    // Sütun genişlikleri, kullanıcının paylaştığı örnek Excel'deki
    // (SRC5_Kayıtları.xlsx) sütun genişlik ORANLARI korunarak yatay
    // kullanılabilir genişliğe (267mm) ölçeklendi.
    columnStyles: {
      0: { cellWidth: 15.1, halign: "center" }, // Sıra No
      1: { cellWidth: 37.9 }, // Adı Soyadı
      2: { cellWidth: 40.3, halign: "center" }, // T.C. Kimlik No
      3: { cellWidth: 39.4, halign: "center" }, // SRC5 Sertifikası
      4: { cellWidth: 25.4, halign: "center" }, // İşe Giriş Tarihi
      5: { cellWidth: 43.9, halign: "center" }, // Sertifika Numarası
      6: { cellWidth: 27.4, halign: "center" }, // İşe Çıkış Tarihi
      7: { cellWidth: 37.5, halign: "center" }, // Sertifika Geçerlilik Tarihi
    },
    head: [
      [
        "Sıra No",
        "Adı Soyadı",
        "T.C. Kimlik No",
        "SRC5 Sertifikası (Var/Yok)",
        "İşe Giriş Tarihi",
        "Sertifika Numarası",
        "İşe Çıkış Tarihi",
        "Sertifika Geçerlilik Tarihi",
      ],
    ],
    body: veri.satirlar.map((s) => [
      String(s.sira_no), s.ad_soyad, s.tc_kimlik_no, s.src5_sertifikasi,
      s.ise_giris_tarihi, s.sertifika_numarasi, s.isten_cikis_tarihi, s.sertifika_gecerlilik_tarihi,
    ]),
    didDrawPage: (data) => {
      baslikKutusuCiz(doc, veri, data.pageNumber);
    },
  });

  const sonY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const imzaY = sonY > H - 24 ? H - 22 : sonY;
  imzaBlokuCiz(doc, veri, imzaY);

  // SRC5/Ehliyet ekleri — tabloya ait sayfalardan SONRA, sürücü sırasına göre.
  for (const ek of veri.ekler ?? []) {
    await belgeEkiSayfasiEkle(doc, ek);
  }

  return doc.output("blob");
}
