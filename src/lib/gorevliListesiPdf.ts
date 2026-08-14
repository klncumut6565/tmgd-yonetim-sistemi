// src/lib/gorevliListesiPdf.ts
//
// TMGDK-G1 "Tehlikeli Madde İş ve İşlemlerinde Görevli Personel Listesi"
// belgesinin PDF çıktısını üretir. İki sayfadan oluşur:
//   1) Kapak sayfası (DİKEY) — kullanıcının paylaştığı örnek kapak sayfası
//      (TM_Görevli_Listesi_Kapak_Sayfası_Örnek_.docx) ile aynı yapıda:
//      firma logosu + adı, "Formu Düzenleyen Kişi / Düzenleyen Kişinin
//      Bağlı Olduğu TMGDK / Dokümanın Genelge Kapsamında Karşılığı /
//      Güncelleme Nedeni" doküman kontrol tablosu, Hazırlayan(TMGD)/
//      Sorumlu Kişi imza alanı, SİAM TMGDK kurumsal logosu + karekod
//      (diğer tüm belgelerin kapağıyla AYNI — bkz. kapakVarliklari.ts).
//   2) Başlık kutusu + tablo (YATAY) — sütunların (özellikle Yapılacak
//      Görevler ve Doldurulacak Döküman No) uzun metinlerini rahat
//      sığdırmak için sayfa yatay (landscape) olarak üretilir.
//
// Türkçe karakter desteği için LiberationSans gömülü fontu kullanılır.

import type { jsPDF as JsPDFType } from "jspdf";
import {
  LIBERATION_SANS_REGULAR_B64,
  LIBERATION_SANS_BOLD_B64,
} from "./pdfFonts";
import { SIAM_LOGO_B64, SIAM_LOGO_EN_BOY, SIAM_QR_B64 } from "./kapakVarliklari";

const FONT = "LiberationSans";
const RENK_VURGU: [number, number, number] = [30, 64, 175];
const M = 15;

// Sayfa ölçüleri sayfaya göre değişir (kapak dikey, tablo sayfası yatay) —
// bu yüzden sabit değil, module-level "let" ve bir yardımcı fonksiyonla
// ayarlanır (BelgeOlusturForm.tsx'teki AYNI teknik).
let W = 210;
let H = 297;
function sayfaYonunuAyarla(yatay: boolean) {
  W = yatay ? 297 : 210;
  H = yatay ? 210 : 297;
}

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

/**
 * Kapak sayfasının kenarına ince bir çerçeve çizer — kullanıcının
 * paylaştığı örnek kapak sayfasıyla (ARITEKS_Görevli_Listesi_Hk.pdf)
 * aynı görünüm: sayfa kenarından ~6mm içeride, tüm sayfayı çevreleyen
 * tek çizgili siyah çerçeve.
 */
function kapakCercevesiCiz(doc: JsPDFType) {
  const kenar = 6;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(kenar, kenar, W - 2 * kenar, H - 2 * kenar);
  doc.setLineWidth(0.2); // sonraki çizimler için varsayılana döndür
}

async function kapakSayfasiCiz(
  doc: JsPDFType,
  veri: GorevliListesiPdfVerisi,
  autoTable: (doc: JsPDFType, opts: Record<string, unknown>) => void
) {
  sayfaYonunuAyarla(false);

  kapakCercevesiCiz(doc);

  doc.setFillColor(...RENK_VURGU);
  doc.rect(0, 0, W, 4, "F");

  if (veri.logo) {
    try {
      const box = logoKutusuHesapla(veri.logo.enBoyOrani, 24);
      doc.addImage(veri.logo.data, veri.logo.fmt, M, 14, box.w, box.h);
    } catch {
      /* logo eklenemezse kapak yine üretilsin */
    }
  }

  doc.setFontSize(15);
  doc.setFont(FONT, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(veri.firmaAdi, W / 2, 58, { align: "center", maxWidth: W - 2 * M });

  // Doküman kontrol tablosu — örnek kapak sayfasıyla (TM_Görevli_Listesi_
  // Kapak_Sayfası_Örnek_.docx) birebir aynı 4 satır.
  autoTable(doc, {
    startY: 75,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { font: FONT, fontSize: 9, cellPadding: 3, valign: "middle", lineColor: [80, 80, 80] },
    columnStyles: {
      0: { cellWidth: 62, fontStyle: "bold" },
      1: { cellWidth: W - 2 * M - 62 },
    },
    body: [
      ["Formu Düzenleyen Kişi", veri.hazirlayanAdi || "—"],
      ["Düzenleyen Kişinin Bağlı Olduğu TMGDK", "SİAM TMGDK"],
      [
        "Dokümanın Genelge Kapsamında Karşılığı",
        "Tehlikeli Maddeler İle İlgili İş Ve İşlemlerde Görev Alan Tüm Personele Ait Bilgilerin Yer Aldığı Liste",
      ],
      [
        "Güncelleme Nedeni",
        "03.09.2024 tarih ve 2148063 sayılı Tehlikeli Madde Taşımacılığına İlişkin İşletme Denetimleri Genelgesi kapsamında",
      ],
    ],
  });

  const kontrolTablosuAlti =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Hazırlayan (TMGD) / Sorumlu Kişi — örnekteki gibi iki sütunlu imza alanı.
  const imzaY = Math.min(kontrolTablosuAlti + 55, H - 60);
  doc.setFontSize(9.5);
  doc.setFont(FONT, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Hazırlayan (TMGD)", W / 2 - 42, imzaY, { align: "center" });
  doc.text("Sorumlu Kişi", W / 2 + 42, imzaY, { align: "center" });
  doc.setFont(FONT, "normal");
  doc.text(veri.hazirlayanAdi || "—", W / 2 - 42, imzaY + 6, { align: "center" });
  // NOT: "Sorumlu Kişi" altına daha önce boş bir imza çizgisi çiziliyordu
  // — kullanıcı talebiyle kaldırıldı, örnek kapak sayfasında böyle bir
  // çizgi yok.

  doc.setFontSize(9.5);
  doc.setFont(FONT, "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("Doküman No: TMGDK-G1", W / 2, H - 34, { align: "center" });
  doc.text(`Düzenleme Tarihi: ${veri.bugun}`, W / 2, H - 28, { align: "center" });

  // Sağ alt köşe: SİAM TMGDK kurumsal logosu + karekod — diğer TÜM
  // belgelerin kapağıyla AYNI yerleşim (bkz. BelgeOlusturForm.tsx).
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
 * belgeyle (ARITEKS_Görevli_Listesi_Hk.pdf, sayfa 2) AYNI şema:
 *   Sol taraf (geniş)  : "GÖREVLİ LİSTESİ" başlığı + alt açıklama metni
 *   Sağ taraf (dar)    : 4 satırlık bilgi paneli — Doküman No / Yayın
 *                         Tarihi / Revizyon Tarihi / Sayı No
 * Toplam kutu yüksekliği BASLIK_KUTUSU_YUKSEKLIK sabitiyle dışarıya
 * açılır ki autoTable'ın startY/margin.top değerleri bununla tutarlı
 * kalsın (aksi halde devam sayfalarında tablo başlığı bu kutuyla çakışır).
 */
const BASLIK_KUTUSU_YUKSEKLIK = 24;
const BILGI_PANELI_GENISLIK = 55;

function baslikKutusuCiz(doc: JsPDFType, veri: GorevliListesiPdfVerisi) {
  const kutuTop = 10;
  const kutuGenislik = W - 2 * M;
  const baslikGenislik = kutuGenislik - BILGI_PANELI_GENISLIK;
  const satirYuksekligi = BASLIK_KUTUSU_YUKSEKLIK / 4;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, kutuTop, kutuGenislik, BASLIK_KUTUSU_YUKSEKLIK);
  // Sol (başlık) / sağ (bilgi paneli) ayırıcı dikey çizgi
  doc.line(M + baslikGenislik, kutuTop, M + baslikGenislik, kutuTop + BASLIK_KUTUSU_YUKSEKLIK);
  // Bilgi panelindeki 4 satırı ayıran yatay çizgiler
  for (let i = 1; i < 4; i++) {
    const y = kutuTop + i * satirYuksekligi;
    doc.line(M + baslikGenislik, y, M + kutuGenislik, y);
  }

  // Sol taraf: başlık + alt açıklama
  doc.setFontSize(12);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("GÖREVLİ LİSTESİ", M + baslikGenislik / 2, kutuTop + 9, { align: "center" });

  doc.setFontSize(6.5);
  doc.setFont(FONT, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(
    [
      "TEHLİKELİ MADDELER İLE İLGİLİ İŞ VE İŞLEMLERDE GÖREV ALAN TÜM",
      "PERSONELE AİT BİLGİLERİN YER ALDIĞI LİSTE",
    ],
    M + baslikGenislik / 2,
    kutuTop + 15,
    { align: "center" }
  );

  // Sağ taraf: bilgi paneli
  doc.setFontSize(7.5);
  doc.setFont(FONT, "normal");
  doc.setTextColor(0, 0, 0);
  const bilgiX = M + baslikGenislik + 3;
  const bilgiSatirlari = [
    `Doküman No: TMGDK-G1`,
    `Yayın Tarihi: ${veri.bugun}`,
    `Revizyon Tarihi: ${veri.bugun}`,
    `Sayı No: 1/1`,
  ];
  bilgiSatirlari.forEach((metin, i) => {
    doc.text(metin, bilgiX, kutuTop + satirYuksekligi * i + satirYuksekligi / 2 + 1.5);
  });
}

export async function gorevliListesiPdfOlustur(
  veri: GorevliListesiPdfVerisi
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as unknown as JsPDFType;
  fontuKaydet(doc);

  // Sayfa 1 — kapak (dikey)
  await kapakSayfasiCiz(doc, veri, autoTable);

  // Sayfa 2 — başlık kutusu + tablo (YATAY — uzun metinli sütunlar rahat sığsın diye)
  sayfaYonunuAyarla(true);
  doc.addPage("a4", "landscape");
  fontuKaydet(doc);
  baslikKutusuCiz(doc, veri);

  autoTable(doc, {
    startY: 38,
    // margin.top ÖNEMLİ: autoTable kendi içinde devam sayfası eklediğinde
    // (tablo bir sayfaya sığmayınca) her yeni sayfada bu üst boşluğu
    // ayırır — yoksa devam sayfalarında tablo başlık satırı, üstteki
    // baslikKutusuCiz() kutusuyla ÇAKIŞIR (didDrawPage o kutuyu tablo
    // ÇİZİLDİKTEN SONRA çiziyor, üst üste biner). 38 = kutuTop(10) +
    // BASLIK_KUTUSU_YUKSEKLIK(24) + 4mm boşluk.
    margin: { top: 38, left: M, right: M },
    styles: { font: FONT, fontSize: 8.5, cellPadding: 2.5, valign: "middle" },
    headStyles: {
      font: FONT,
      fontStyle: "bold",
      fillColor: RENK_VURGU,
      textColor: [255, 255, 255],
      halign: "center",
    },
    // Sütun genişlikleri, kullanıcının paylaştığı örnek Excel'deki
    // (TMFB_Faaliyetleri_Görevli_Listesi.xlsx) sütun genişlik ORANLARI
    // korunarak sayfa kullanılabilir genişliğine (267mm) ölçeklendi.
    columnStyles: {
      0: { cellWidth: 15.2, halign: "center" },
      1: { cellWidth: 53.9 },
      2: { cellWidth: 44.2 },
      3: { cellWidth: 36.3 },
      4: { cellWidth: 29.0 },
      5: { cellWidth: 51.0 },
      6: { cellWidth: 37.4, halign: "center" },
    },
    head: [
      [
        "Sıra No",
        "Tehlikeli Madde Görev Başlığı",
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
    // Not: jsPDF-autotable, tablo bir sayfaya sığmayınca kendi içinde
    // doc.addPage() çağırır; bu çağrı EK argüman almadığı için mevcut
    // sayfa biçimini (yatay) korur — ayrıca yön ayarlamaya gerek yok.
    didDrawPage: () => {
      baslikKutusuCiz(doc, veri);
    },
  });

  const sonY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;

  doc.setFontSize(7.5);
  doc.setFont(FONT, "normal"); // "italic" stili gömülü değil (Türkçe karakterler bozulur), normal kullanılır
  const dipnotMetni =
    "Yukarıda Belirtilen Formda kişi/kişiler değişmesi halinde en geç 7 gün içerisinde yazılı olarak Tehlikeli Madde Güvenlik Danışmanına Haber verilmesi gerekmektedir.";
  const dipnotSatirlari = doc.splitTextToSize(dipnotMetni, W - 2 * M);
  const dipnotYukseklik = dipnotSatirlari.length * 3.6;
  const gerekliYukseklik = dipnotYukseklik + 8 + 8; // dipnot + boşluk + imza satırı

  // ÖNEMLİ: Tablo sayfa sonuna çok yakın bittiyse (dipnot+imza için yer
  // kalmadıysa), dipnotu tabloya sığdırmaya ZORLAMAK yerine (bu, metni
  // tablonun son satırlarıyla ÇAKIŞTIRIRDI) yeni bir sayfa açılır.
  // doc.addPage() argümansız çağrıldığında mevcut sayfa biçimini (yatay)
  // korur.
  let dipnotY: number;
  if (sonY + gerekliYukseklik > H - 10) {
    doc.addPage();
    fontuKaydet(doc);
    baslikKutusuCiz(doc, veri);
    doc.setFontSize(7.5);
    doc.setFont(FONT, "normal");
    dipnotY = 38;
  } else {
    dipnotY = sonY;
  }

  doc.setTextColor(90, 90, 90);
  doc.text(dipnotSatirlari, M, dipnotY);

  const imzaY = dipnotY + dipnotYukseklik + 8;
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
