// src/lib/gorevliListesiExcel.ts
//
// TMGDK-G1 "Tehlikeli Madde İş ve İşlemlerinde Görevli Personel Listesi"
// belgesinin Excel çıktısını üretir. Format, kullanıcının yüklediği örnek
// Ariteks Görevli Listesi tablosuyla birebir sütun eşleşecek şekilde
// tasarlanmıştır (bkz. proje özeti — Sıra No / Görev Başlığı / Yapılacak
// Görevler / Bağlı Olduğu Birim / Sorumlu Kişi(ler) / Doldurulacak Döküman
// No / Eğitim Tarihi).
//
// NOT: SheetJS ücretsiz sürümü hücre biçimlendirmesi desteklemediği için
// (bkz. kapakSayfasi.ts'teki aynı gerekçe) burada da ExcelJS kullanılıyor.

import ExcelJS from "exceljs";

export type GorevliListesiSatiri = {
  sira_no: number;
  gorev_basligi: string;
  yapilacak_gorevler: string;
  bagli_oldugu_birim: string;
  sorumluIsimler: string; // birden fazla isim varsa ", " ile birleştirilmiş
  doldurulacak_dokuman_no: string;
  egitim_tarihi: string; // gg.aa.yyyy veya boş
};

export type GorevliListesiExcelVerisi = {
  firmaAdi: string;
  hazirlayanAdi: string;
  bugun: string; // gg.aa.yyyy
  satirlar: GorevliListesiSatiri[];
};

const BASLIK_FONT = { name: "Calibri", size: 9, bold: true } as const;
const HUCRE_FONT = { name: "Calibri", size: 9 } as const;
const INCE_KENARLIK = {
  top: { style: "thin" as const },
  left: { style: "thin" as const },
  bottom: { style: "thin" as const },
  right: { style: "thin" as const },
};

export async function gorevliListesiExcelOlustur(
  veri: GorevliListesiExcelVerisi
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TMGD Yönetim Sistemi";
  wb.created = new Date();

  const ws = wb.addWorksheet("Görevli Listesi", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  ws.columns = [
    { width: 6 }, // Sıra No
    { width: 20 }, // Görev Başlığı
    { width: 34 }, // Yapılacak Görevler
    { width: 18 }, // Bağlı Olduğu Birim
    { width: 26 }, // Sorumlu Kişi/ler
    { width: 20 }, // Doldurulacak Döküman No
    { width: 14 }, // Eğitim Tarihi
  ];

  // --- Belge başlığı bloğu ------------------------------------------------
  // Orijinal örnekteki (TMFB_Faaliyetleri_Görevli_Listesi) düzenle birebir:
  // sol/orta alanda büyük "GÖREVLİ LİSTESİ" başlığı + alt açıklama satırı,
  // sağ üstte doküman kontrol kutusu (Doküman No / Yayın Tarihi / Revizyon
  // Tarihi / Sayı No — dört ayrı satır).
  ws.mergeCells("A1:E1");
  const firmaHucresi = ws.getCell("A1");
  firmaHucresi.value = veri.firmaAdi;
  firmaHucresi.font = { name: "Calibri", size: 11, bold: true };
  firmaHucresi.alignment = { horizontal: "left" };
  ws.getCell("F1").value = "Doküman No:";
  ws.getCell("F1").font = HUCRE_FONT;
  ws.getCell("G1").value = "TMGDK-G1";
  ws.getCell("G1").font = HUCRE_FONT;

  ws.mergeCells("A2:E2");
  const baslikHucresi = ws.getCell("A2");
  baslikHucresi.value = "GÖREVLİ LİSTESİ";
  baslikHucresi.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FF1E40AF" } };
  baslikHucresi.alignment = { horizontal: "center" };
  ws.getCell("F2").value = "Yayın Tarihi:";
  ws.getCell("F2").font = HUCRE_FONT;
  ws.getCell("G2").value = "01.11.2025";
  ws.getCell("G2").font = HUCRE_FONT;

  ws.mergeCells("A3:E3");
  const altAciklamaHucresi = ws.getCell("A3");
  altAciklamaHucresi.value =
    "TEHLİKELİ MADDELER İLE İLGİLİ İŞ VE İŞLEMLERDE GÖREV ALAN TÜM PERSONELE AİT BİLGİLERİN YER ALDIĞI LİSTE";
  altAciklamaHucresi.font = { name: "Calibri", size: 9, bold: true };
  altAciklamaHucresi.alignment = { horizontal: "center", wrapText: true };
  ws.getRow(3).height = 24;
  ws.getCell("F3").value = "Revizyon Tarihi:";
  ws.getCell("F3").font = HUCRE_FONT;
  ws.getCell("G3").value = veri.bugun;
  ws.getCell("G3").font = HUCRE_FONT;

  ws.getCell("F4").value = "Sayı No:";
  ws.getCell("F4").font = HUCRE_FONT;
  ws.getCell("G4").value = "1/1";
  ws.getCell("G4").font = HUCRE_FONT;

  // --- Tablo başlık satırı ---------------------------------------------
  const basliklarSatiri = 6;
  const basliklar = [
    "Sıra No",
    "Tehlikeli Madde Görev Başlığı",
    "Yapılacak Görevler",
    "Bağlı Olduğu Birim",
    "Sorumlu Kişi/ler",
    "Doldurulacak Döküman No",
    "Eğitim Tarihi",
  ];
  const baslikRow = ws.getRow(basliklarSatiri);
  basliklar.forEach((b, i) => {
    const cell = baslikRow.getCell(i + 1);
    cell.value = b;
    cell.font = BASLIK_FONT;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = INCE_KENARLIK;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E9F5" },
    };
  });
  baslikRow.height = 24;

  // --- Veri satırları ----------------------------------------------------
  veri.satirlar.forEach((s, idx) => {
    const row = ws.getRow(basliklarSatiri + 1 + idx);
    const degerler = [
      s.sira_no,
      s.gorev_basligi,
      s.yapilacak_gorevler,
      s.bagli_oldugu_birim,
      s.sorumluIsimler,
      s.doldurulacak_dokuman_no,
      s.egitim_tarihi,
    ];
    degerler.forEach((d, i) => {
      const cell = row.getCell(i + 1);
      cell.value = d;
      cell.font = HUCRE_FONT;
      cell.alignment = {
        horizontal: i === 0 ? "center" : "left",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = INCE_KENARLIK;
    });
  });

  // --- Dipnot + imza alanı -----------------------------------------------
  const dipnotSatiri = basliklarSatiri + veri.satirlar.length + 2;
  ws.mergeCells(`A${dipnotSatiri}:G${dipnotSatiri}`);
  const dipnotHucresi = ws.getCell(`A${dipnotSatiri}`);
  dipnotHucresi.value =
    "Yukarıda Belirtilen Formda kişi/kişiler değişmesi halinde en geç 7 gün içerisinde yazılı olarak Tehlikeli Madde Güvenlik Danışmanına Haber verilmesi gerekmektedir.";
  dipnotHucresi.font = { name: "Calibri", size: 8, italic: true };
  dipnotHucresi.alignment = { wrapText: true };
  ws.getRow(dipnotSatiri).height = 26;

  const imzaSatiri = dipnotSatiri + 2;
  ws.getCell(`A${imzaSatiri}`).value = "TMGD:";
  ws.getCell(`A${imzaSatiri}`).font = BASLIK_FONT;
  ws.getCell(`B${imzaSatiri}`).value = veri.hazirlayanAdi;
  ws.getCell(`B${imzaSatiri}`).font = HUCRE_FONT;

  ws.getCell(`E${imzaSatiri}`).value = "Sorumlu Kişi:";
  ws.getCell(`E${imzaSatiri}`).font = BASLIK_FONT;

  return wb.xlsx.writeBuffer();
}
