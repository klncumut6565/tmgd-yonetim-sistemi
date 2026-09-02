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
  /** Onaylayan (tesis sorumlusu) — firms.approver_name. */
  onaylayanAdi: string;
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

/**
 * Belge Oluştur kapak sayfasındaki üst başlık kutusuyla (BelgeOlusturForm.
 * tsx → baslikTablosuCiz) AYNI 3 sütunlu şema: sol logo / orta başlık+alt
 * başlık / sağ Doküman No-Yayın Tarihi-Revizyon Tarihi-Sayfa No paneli.
 * Yükseklik, alt başlık kaç satıra sarıyorsa ona göre dinamik büyür.
 */
function kapakBaslikYuksekligiHesapla(
  doc: JsPDFType,
  altBaslik: string,
  ortaGenislik: number
): { yukseklik: number; lines: string[] } {
  doc.setFontSize(6.5);
  doc.setFont(FONT, "bold");
  const lines: string[] = doc.splitTextToSize(altBaslik, ortaGenislik);
  const taban = 26;
  const altBlok = 9 + lines.length * 3.6 + 4;
  return { yukseklik: Math.max(taban, altBlok), lines };
}

function kapakBaslikTablosuCiz(
  doc: JsPDFType,
  veri: GorevliListesiPdfVerisi,
  baslik: string,
  altBaslikLines: string[],
  dokumanNo: string,
  yukseklik: number
) {
  const solKenar = 6; // kapakCercevesiCiz çerçevesiyle bitişik
  const kutuGenislik = W - 2 * solKenar;
  const ustY = solKenar;
  const solGenislik = 38;
  const sagGenislik = 45;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(solKenar, ustY, kutuGenislik, yukseklik);
  doc.line(solKenar + solGenislik, ustY, solKenar + solGenislik, ustY + yukseklik);
  doc.line(W - solKenar - sagGenislik, ustY, W - solKenar - sagGenislik, ustY + yukseklik);

  const ortaAyirici = ustY + yukseklik / 2;
  doc.line(solKenar + solGenislik, ortaAyirici, W - solKenar - sagGenislik, ortaAyirici);

  const sagSatirY = yukseklik / 4;
  for (let i = 1; i < 4; i++) {
    doc.line(W - solKenar - sagGenislik, ustY + sagSatirY * i, W - solKenar, ustY + sagSatirY * i);
  }

  // Sol: firma logosu — kenar boşluğu daraltılıp üst sınır (tavan)
  // yükseltilerek logo görsel olarak daha büyük görünür şekilde çizilir.
  if (veri.logo) {
    try {
      const kenar = 1.2;
      const alanG = solGenislik - 2 * kenar;
      const alanY = Math.min(yukseklik - 2 * kenar, 27);
      const box = logoKutusuHesapla(veri.logo.enBoyOrani, Math.min(alanG, alanY));
      doc.addImage(
        veri.logo.data,
        veri.logo.fmt,
        solKenar + kenar + (alanG - box.w) / 2,
        ustY + kenar + (alanY - box.h) / 2,
        box.w,
        box.h
      );
    } catch {
      /* logo eklenemezse kutu yine çizilsin */
    }
  }

  // Orta: üst yarı başlık, alt yarı alt başlık
  const ortaX = solKenar + solGenislik + (kutuGenislik - solGenislik - sagGenislik) / 2;
  doc.setFontSize(11);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text(baslik, ortaX, ustY + yukseklik / 4 + 2, { align: "center" });

  doc.setFontSize(6.5);
  doc.setFont(FONT, "bold");
  doc.setTextColor(0, 0, 0);
  const altBlok = altBaslikLines.length * 3.6;
  const altY = ortaAyirici + yukseklik / 4 - altBlok / 2 + 3;
  doc.text(altBaslikLines, ortaX, altY, { align: "center" });

  // Sağ: doküman no / tarihler / sayfa no
  doc.setFontSize(7);
  doc.setFont(FONT, "normal");
  doc.setTextColor(0, 0, 0);
  const sagX = W - solKenar - sagGenislik + 2;
  const sagMetinY = (i: number) => ustY + sagSatirY * i + sagSatirY / 2 + 1.2;
  doc.text(`Doküman No: ${dokumanNo}`, sagX, sagMetinY(0));
  doc.text(`Yayın Tarihi: ${veri.bugun}`, sagX, sagMetinY(1));
  doc.text(`Revizyon Tarihi: ${veri.bugun}`, sagX, sagMetinY(2));
  doc.text("Sayfa No: Kapak Sayfası", sagX, sagMetinY(3));

  return ustY + yukseklik;
}

async function kapakSayfasiCiz(
  doc: JsPDFType,
  veri: GorevliListesiPdfVerisi,
  autoTable: (doc: JsPDFType, opts: Record<string, unknown>) => void
) {
  sayfaYonunuAyarla(false);

  kapakCercevesiCiz(doc);

  const solGenislik = 38;
  const sagGenislik = 45;
  const ortaGenislik = W - 2 * 6 - solGenislik - sagGenislik;
  const altBaslikMetni =
    "Tehlikeli Maddeler İle İlgili İş Ve İşlemlerde Görev Alan Tüm Personele Ait Bilgilerin Yer Aldığı Liste";
  const { yukseklik: baslikYukseklik, lines: altBaslikLines } = kapakBaslikYuksekligiHesapla(
    doc,
    altBaslikMetni,
    ortaGenislik
  );
  const kutuAlti = kapakBaslikTablosuCiz(
    doc,
    veri,
    "GÖREVLİ PERSONEL LİSTESİ",
    altBaslikLines,
    "TMGDK-G1",
    baslikYukseklik
  );

  doc.setFontSize(15);
  doc.setFont(FONT, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(veri.firmaAdi, W / 2, kutuAlti + 20, { align: "center", maxWidth: W - 2 * M });

  // Doküman kontrol tablosu — örnek kapak sayfasıyla (TM_Görevli_Listesi_
  // Kapak_Sayfası_Örnek_.docx) birebir aynı 4 satır.
  autoTable(doc, {
    startY: kutuAlti + 30,
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

  // HAZIRLAYAN / KONTROL EDEN / ONAYLAYAN imza tablosu — Belge Oluştur
  // kapak sayfasıyla (BelgeOlusturForm.tsx → altTabloCiz) AYNI çerçeveli
  // 3 sütunlu tablo ve AYNI konum: sayfanın ALTINA sabitlenir.
  //
  // NOT: İmza tablosunun altında daha önce "Doküman No: TMGDK-G1" ve
  // "Düzenleme Tarihi: ..." satırları vardı — kaldırıldı. Bu bilgiler
  // zaten kapağın üst başlık kutusunda ve tablo sayfasının bilgi
  // panelinde yer alıyor, tekrar ediyorlardı.
  // Sağ alt köşe: SİAM TMGDK kurumsal logosu + karekod — diğer TÜM
  // belgelerin kapağıyla AYNI yerleşim (bkz. BelgeOlusturForm.tsx).
  const qrBoyut = 22;
  const qrX = W - M - qrBoyut;
  const qrY = H - qrBoyut - 12;

  // İmza tablosu karekodun ÜZERİNDE, aralarında boşluk kalacak şekilde
  // konumlandırılır (Belge Oluştur kapak sayfasındaki altTabloCiz/karekod
  // yerleşimiyle AYNI mantık — bkz. BelgeOlusturForm.tsx kapakSayfasiCiz).
  // Önceki sabit "H - 28" değeri karekod kutusuyla çakışıyordu.
  const kapakImzaY = qrY - 3 - IMZA_BLOK_YUKSEKLIK;
  imzaBlokuCiz(doc, veri, kapakImzaY);
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
 * Sayfa 2 — kullanıcının paylaştığı örnek belgenin (ADR_1_3_Gorevli_
 * Listesi.docx) İLK SAYFASI ile AYNEN aynı içerik: başlık, alt başlık,
 * "1. Taraf Tanımları" bölümü ve tanımlar tablosu. Belgenin ikinci
 * bölümü (doldurulacak boş ADR 1.3 Eğitimi listesi) DAHİL EDİLMEDİ —
 * onun işlevini zaten uygulamanın kendi ürettiği sayfa 3'teki (yatay)
 * tablo görüyor.
 */
function tanimlarSayfasiCiz(
  doc: JsPDFType,
  autoTable: (doc: JsPDFType, opts: Record<string, unknown>) => void,
  veri: GorevliListesiPdfVerisi
) {
  sayfaYonunuAyarla(false);
  doc.addPage("a4", "portrait");
  fontuKaydet(doc);

  // Kapak sayfasıyla AYNI ince çerçeve (bkz. kapakCercevesiCiz).
  kapakCercevesiCiz(doc);

  // Diğer TÜM iç sayfalarla (kapak, yatay tablo sayfası) AYNI başlık
  // kutusu: sol üstte firma logosu, sağ üstte Doküman No/Tarih/Sayfa No
  // bilgi paneli. Önceden bu sayfada eksikti.
  baslikKutusuCiz(doc, veri);

  doc.setFontSize(12);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  const baslikSatirlari = doc.splitTextToSize(
    "TEHLİKELİ MADDELERİN KARAYOLUYLA TAŞINMASI HAKKINDA YÖNETMELİK",
    W - 2 * M
  );
  const icerikBaslangicY = 10 + BASLIK_KUTUSU_YUKSEKLIK + 10;
  doc.text(baslikSatirlari, W / 2, icerikBaslangicY, { align: "center" });

  doc.setFontSize(10);
  doc.setFont(FONT, "normal");
  doc.setTextColor(0, 0, 0);
  let y = icerikBaslangicY + baslikSatirlari.length * 5.5 + 3;
  const altBaslikSatirlari = doc.splitTextToSize(
    "Kapsamındaki Tarafların Tanımları ve ADR 1.3 Eğitimi Görevli Listesi",
    W - 2 * M
  );
  doc.text(altBaslikSatirlari, W / 2, y, { align: "center" });
  y += altBaslikSatirlari.length * 5 + 8;

  doc.setFontSize(10.5);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("1. Taraf Tanımları", M, y);
  y += 6;

  doc.setFontSize(8.5);
  doc.setFont(FONT, "normal");
  doc.setTextColor(0, 0, 0);
  const girisSatirlari = doc.splitTextToSize(
    "Aşağıdaki tabloda, Tehlikeli Maddelerin Karayoluyla Taşınması Hakkında Yönetmelik kapsamında yer alan başlıca tarafların tanımlarına yer verilmiştir.",
    W - 2 * M
  );
  doc.text(girisSatirlari, M, y);
  y += girisSatirlari.length * 4 + 5;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { font: FONT, fontSize: 7.8, cellPadding: 2.2, valign: "top", lineColor: [150, 150, 150] },
    headStyles: { font: FONT, fontStyle: "bold", fillColor: RENK_VURGU, textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: "bold" },
      1: { cellWidth: W - 2 * M - 48 },
    },
    head: [["Taraf", "Tanım"]],
    body: [
      [
        "Gönderen (Consignor)",
        "Kendi adına veya bir üçüncü şahıs adına tehlikeli maddeleri gönderen işletme; taşıma sözleşmesi mevcutsa sözleşmede gönderen olarak belirtilen taraf, sözleşme yoksa taşımanın başlangıcında tehlikeli maddeleri taşımacıya teslim eden gerçek veya tüzel kişi.",
      ],
      [
        "Taşımacı (Carrier)",
        "Taşıma işlemini bir taşıma sözleşmesi ile veya sözleşme olmaksızın gerçekleştiren işletme.",
      ],
      [
        "Alıcı (Consignee)",
        "Taşıma sözleşmesinde belirtilen alıcı; alıcı, taşıma sözleşmesi hükümlerine göre üçüncü bir tarafı belirlemişse, bu üçüncü taraf ADR anlamında alıcı sayılır.",
      ],
      [
        "Dolduran (Filler)",
        "Tehlikeli maddeleri bir tanka (tank aracına, portatif tanka, tank-konteynerine veya çok elemanlı gaz konteynerine/MEGC'ye), bir batarya araca ya da konteynere yükleyen; ayrıca tehlikeli maddeleri ambalajlara, büyük ambalajlara veya IBC'lere dolduran işletme.",
      ],
      [
        "Yükleyen (Loader)",
        "Ambalajlanmış tehlikeli maddeleri, küçük konteynerleri veya taşınabilir tankları bir araca ya da konteynere yükleyen; konteynerleri, çok elemanlı gaz konteynerlerini (MEGC), tank-konteynerlerini veya portatif tankları araca yükleyen işletme.",
      ],
      [
        "Boşaltan (Unloader)",
        "Konteyneri araçtan indiren; ambalajlanmış tehlikeli maddeleri araçtan veya konteynerden boşaltan; tehlikeli maddeleri bir tanktan (tank aracından, portatif tanktan, tank-konteynerinden veya MEGC'den) ya da bir batarya araçtan/konteynerden boşaltan işletme.",
      ],
      [
        "Paketleyen (Packer)",
        "Tehlikeli maddeleri ambalajlara, büyük ambalajlara veya IBC'lere yerleştiren ve gerektiğinde aracın ya da konteynerin taşımaya hazırlanmasını sağlayan işletme.",
      ],
      [
        "Tank-konteyner/Portatif Tank İşletmecisi",
        "Adına bir tank-konteyner veya portatif tank işletilen işletme.",
      ],
      [
        "Araç İşletmecisi",
        "Tehlikeli madde taşımasında kullanılan aracın işletiminden sorumlu, adına araç ruhsatlandırılmış olan işletme.",
      ],
      [
        "Ambalajlayan",
        "Ambalajları, tehlikeli maddelerin taşınmasına uygun olacak şekilde hazırlayan ve/veya dolduran işletme.",
      ],
      [
        "ADR Güvenlik Danışmanı",
        "İşletme yönetiminin sorumluluğu altında, uygun araç ve yöntemlerle, faaliyetlerin ilgili gereklilikler çerçevesinde ve mümkün olan en güvenli şekilde yürütülmesine yardımcı olmak amacıyla görevlendirilen, bakanlıkça yetkilendirilmiş kişi.",
      ],
    ],
  });
}

/**
 * Tablo sayfasının üst başlık kutusu — BelgeOlusturForm.tsx →
 * baslikTablosuCiz() ile AYNI 3 sütunlu şema:
 *   Sol hücre (38mm)   : firma logosu (kendi çerçeveli hücresinde)
 *   Orta hücre         : üstte "GÖREVLİ LİSTESİ" başlığı, ALTINDA yatay
 *                        ayırıcı çizgi, altta dokümanın açıklaması
 *   Sağ hücre (45mm)   : 4 satırlık bilgi paneli — Doküman No / Yayın
 *                        Tarihi / Revizyon Tarihi / Sayfa No
 * Toplam kutu yüksekliği BASLIK_KUTUSU_YUKSEKLIK sabitiyle dışarıya
 * açılır ki autoTable'ın startY/margin.top değerleri bununla tutarlı
 * kalsın (aksi halde devam sayfalarında tablo başlığı bu kutuyla çakışır).
 */
const BASLIK_KUTUSU_YUKSEKLIK = 24;
const LOGO_HUCRE_GENISLIK = 38;
const BILGI_PANELI_GENISLIK = 45;

function baslikKutusuCiz(doc: JsPDFType, veri: GorevliListesiPdfVerisi) {
  const kutuTop = 10;
  const kutuGenislik = W - 2 * M;
  const satirYuksekligi = BASLIK_KUTUSU_YUKSEKLIK / 4;
  const logoSagKenar = M + LOGO_HUCRE_GENISLIK;
  const bilgiSolKenar = M + kutuGenislik - BILGI_PANELI_GENISLIK;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, kutuTop, kutuGenislik, BASLIK_KUTUSU_YUKSEKLIK);
  // Sol (logo) / orta (başlık) ayırıcı dikey çizgi
  doc.line(logoSagKenar, kutuTop, logoSagKenar, kutuTop + BASLIK_KUTUSU_YUKSEKLIK);
  // Orta (başlık) / sağ (bilgi paneli) ayırıcı dikey çizgi
  doc.line(bilgiSolKenar, kutuTop, bilgiSolKenar, kutuTop + BASLIK_KUTUSU_YUKSEKLIK);
  // Orta hücreyi ikiye ayıran YATAY çizgi (Belge Oluştur'daki EK-3 şeması):
  // üstte doküman adı, altta açıklaması.
  const ortaAyirici = kutuTop + BASLIK_KUTUSU_YUKSEKLIK / 2;
  doc.line(logoSagKenar, ortaAyirici, bilgiSolKenar, ortaAyirici);
  // Bilgi panelindeki 4 satırı ayıran yatay çizgiler
  for (let i = 1; i < 4; i++) {
    const y = kutuTop + i * satirYuksekligi;
    doc.line(bilgiSolKenar, y, M + kutuGenislik, y);
  }

  // Sol hücre: firma logosu — kendi hücresine, kenarlardan 2.5mm boşlukla
  // ve oranı korunarak sığdırılır (Belge Oluştur ile aynı yaklaşım).
  if (veri.logo) {
    try {
      const kenar = 2.5;
      const alanG = LOGO_HUCRE_GENISLIK - 2 * kenar;
      const alanY = BASLIK_KUTUSU_YUKSEKLIK - 2 * kenar;
      const oran = veri.logo.enBoyOrani > 0 ? veri.logo.enBoyOrani : 1;
      let lw = alanG;
      let lh = lw / oran;
      if (lh > alanY) {
        lh = alanY;
        lw = lh * oran;
      }
      // Hücre içinde ortala
      const lx = M + (LOGO_HUCRE_GENISLIK - lw) / 2;
      const ly = kutuTop + (BASLIK_KUTUSU_YUKSEKLIK - lh) / 2;
      doc.addImage(veri.logo.data, veri.logo.fmt, lx, ly, lw, lh);
    } catch {
      /* logo eklenemezse başlık kutusu yine çizilsin */
    }
  }

  // Orta hücre — üst yarı: doküman adı
  const ortaMerkez = (logoSagKenar + bilgiSolKenar) / 2;
  const ortaGenislik = bilgiSolKenar - logoSagKenar;
  doc.setFontSize(11);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text("GÖREVLİ LİSTESİ", ortaMerkez, kutuTop + 8, {
    align: "center",
    maxWidth: ortaGenislik - 4,
  });

  // Orta hücre — alt yarı: dokümanın açıklaması
  doc.setFontSize(6.5);
  doc.setFont(FONT, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(
    [
      "TEHLİKELİ MADDELER İLE İLGİLİ İŞ VE İŞLEMLERDE GÖREV ALAN TÜM",
      "PERSONELE AİT BİLGİLERİN YER ALDIĞI LİSTE",
    ],
    ortaMerkez,
    ortaAyirici + 4.5,
    { align: "center", maxWidth: ortaGenislik - 4 }
  );

  // Sağ hücre: bilgi paneli
  doc.setFontSize(7);
  doc.setFont(FONT, "normal");
  doc.setTextColor(0, 0, 0);
  const bilgiX = bilgiSolKenar + 2.5;
  const bilgiSatirlari = [
    `Doküman No: TMGDK-G1`,
    `Yayın Tarihi: ${veri.bugun}`,
    `Revizyon Tarihi: ${veri.bugun}`,
    `Sayfa No: 1/1`,
  ];
  bilgiSatirlari.forEach((metin, i) => {
    doc.text(metin, bilgiX, kutuTop + satirYuksekligi * i + satirYuksekligi / 2 + 1.5);
  });
}

/**
 * HAZIRLAYAN / KONTROL EDEN / ONAYLAYAN üç sütunlu imza tablosu —
 * BelgeOlusturForm.tsx'teki altTabloCiz() ile AYNI görünüm: dış çerçeve +
 * iki dikey ayırıcı çizgi (önceden çerçevesizdi, Belge Oluştur'daki
 * kurumsal desenle tutarlı olsun diye çerçeveli hâle getirildi).
 * "KONTROL EDEN" her zaman sabit TMGD Koordinatörü'dür.
 */
const IMZA_BLOK_YUKSEKLIK = 20;

function imzaBlokuCiz(doc: JsPDFType, veri: GorevliListesiPdfVerisi, y: number) {
  const kolonGenislik = (W - 2 * M) / 3;

  const isimler = [veri.hazirlayanAdi.trim(), "YAKUP ATAŞ", veri.onaylayanAdi.trim()];
  const basliklar = ["HAZIRLAYAN", "KONTROL EDEN", "ONAYLAYAN"];
  const altBasliklar = [
    "Tehlikeli Madde Güvenlik Danışmanı",
    "Tehlikeli Madde Güvenlik Danışmanı Koordinatörü",
    "Sorumlu Kişi",
  ];
  const isimliUnvanlar = [altBasliklar[0], altBasliklar[1], "Tesis Sorumlusu"];

  // Çerçeve + dikey ayırıcılar (Belge Oluştur ile aynı)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, y, W - 2 * M, IMZA_BLOK_YUKSEKLIK);
  doc.line(M + kolonGenislik, y, M + kolonGenislik, y + IMZA_BLOK_YUKSEKLIK);
  doc.line(M + kolonGenislik * 2, y, M + kolonGenislik * 2, y + IMZA_BLOK_YUKSEKLIK);

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

export async function gorevliListesiPdfOlustur(
  veri: GorevliListesiPdfVerisi
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as unknown as JsPDFType;
  fontuKaydet(doc);

  // Sayfa 1 — kapak (dikey)
  await kapakSayfasiCiz(doc, veri, autoTable);

  // Sayfa 2 — kullanıcının paylaştığı örnek belgenin ilk sayfası (Taraf
  // Tanımları), aynen eklenir (dikey).
  tanimlarSayfasiCiz(doc, autoTable, veri);

  // Sayfa 3 — başlık kutusu + tablo (YATAY — uzun metinli sütunlar rahat sığsın diye)
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
    // cellPadding 2.5 → 1.4: her hücrede 4 yönde 2.5mm boşluk, 7 sütunda
    // yatayda ~35mm, her satırda dikeyde 5mm kayba yol açıyordu — metin
    // gereksiz yere sarıyor, satırlar şişiyor ve tablo erken taşarak fazladan
    // sayfa açılmasına neden oluyordu. 1.4mm hâlâ rahat okunur bir nefes
    // payı bırakır ama kaybı yarıdan fazla azaltır.
    //
    // minCellHeight + valign:"top": Çok satırlı hücrelerde (özellikle
    // "Tehlikeli Madde Görev Başlığı" ve "Yapılacak Görevler") satırlar
    // birbirine yapışık görünüyordu. valign "middle" iken autoTable metni
    // dikeyde ortalıyor ama satır aralığını değiştirmiyor; "top" + biraz
    // daha yüksek minCellHeight ile her satır kendi payını alır ve
    // sarmalanan alt satırlar üst satıra sıkışmış görünmez.
    styles: {
      font: FONT,
      fontSize: 8.5,
      cellPadding: { top: 1.8, right: 1.4, bottom: 1.8, left: 1.4 },
      valign: "top",
      minCellHeight: 7,
    },
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
    // Güncellemeler:
    // - Tehlikeli Madde Görev Başlığı %50 daraltıldı (53.9 → 27)
    // - Yapılacak Görevler daraltılan kısım eklenip genişletildi (44.2 → 71)
    // - cellPadding azaltılınca açığa çıkan yer, uzun metinli sütunlara
    //   (Yapılacak Görevler, Doldurulacak Döküman No, Sorumlu Kişi/ler)
    //   dağıtıldı; dar/sabit içerikli sütunlar (Sıra No, Eğitim Tarihi)
    //   biraz kısıldı. Toplam yine 267mm.
    columnStyles: {
      0: { cellWidth: 12.0, halign: "center" },
      1: { cellWidth: 28.0, overflow: "linebreak" },
      2: { cellWidth: 80.0, overflow: "linebreak" },
      3: { cellWidth: 34.0, overflow: "linebreak" },
      4: { cellWidth: 32.0, overflow: "linebreak" },
      5: { cellWidth: 55.0, overflow: "linebreak" },
      6: { cellWidth: 26.0, halign: "center" },
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
  const gerekliYukseklik = dipnotYukseklik + 8 + IMZA_BLOK_YUKSEKLIK; // dipnot + boşluk + imza tablosu

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
  imzaBlokuCiz(doc, veri, imzaY);

  return doc.output("blob");
}
