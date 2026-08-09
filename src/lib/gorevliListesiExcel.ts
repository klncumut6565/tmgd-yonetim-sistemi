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

  // --- Belge başlığı bloğu -------------------------------------------
  ws.mergeCells("A1:G1");
  const firmaHucresi = ws.getCell("A1");
  firmaHucresi.value = veri.firmaAdi;
  firmaHucresi.font = { name: "Calibri", size: 13, bold: true };
  firmaHucresi.alignment = { horizontal: "center" };

  ws.mergeCells("A2:G2");
  const belgeAdiHucresi = ws.getCell("A2");
  belgeAdiHucresi.value =
    "TEHLİKELİ MADDE İŞ VE İŞLEMLERİNDE GÖREVLİ PERSONEL LİSTESİ (TMGDK-G1)";
  belgeAdiHucresi.font = { name: "Calibri", size: 11, bold: true };
  belgeAdiHucresi.alignment = { horizontal: "center" };

  ws.mergeCells("A3:D3");
  const dokNoHucresi = ws.getCell("A3");
  dokNoHucresi.value = "Doküman No: TMGDK-G1";
  dokNoHucresi.font = HUCRE_FONT;

  ws.mergeCells("E3:G3");
  const tarihHucresi = ws.getCell("E3");
  tarihHucresi.value = `Düzenleme Tarihi: ${veri.bugun}`;
  tarihHucresi.font = HUCRE_FONT;
  tarihHucresi.alignment = { horizontal: "right" };

  // --- Tablo başlık satırı ---------------------------------------------
  const basliklarSatiri = 5;
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
