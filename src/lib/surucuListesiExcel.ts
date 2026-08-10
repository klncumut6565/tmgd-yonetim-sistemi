// src/lib/surucuListesiExcel.ts
//
// "ARAÇ SÜRÜCÜ LİSTESİ / TAŞIMADA GÖREV ALAN SÜRÜCÜLERE İLİŞKİN BİLGİLER"
// (Doküman No: TMGDK-L3) belgesinin Excel çıktısını üretir. Format,
// kullanıcının yüklediği örnek SRC5 Kayıtları dosyasıyla birebir sütun
// eşleşecek şekilde tasarlanmıştır — bkz. gorevliListesiExcel.ts ile aynı
// desen (ExcelJS, hücre biçimlendirmesi için).

import ExcelJS from "exceljs";

export type SurucuListesiSatiri = {
  sira_no: number;
  ad_soyad: string;
  tc_kimlik_no: string;
  src5_sertifikasi: string; // "Var" / "Yok"
  ise_giris_tarihi: string; // gg.aa.yyyy veya boş
  isten_cikis_tarihi: string;
  sertifika_gecerlilik_tarihi: string;
};

export type SurucuListesiExcelVerisi = {
  firmaAdi: string;
  hazirlayanAdi: string;
  bugun: string; // gg.aa.yyyy
  satirlar: SurucuListesiSatiri[];
};

const BASLIK_FONT = { name: "Calibri", size: 9, bold: true } as const;
const HUCRE_FONT = { name: "Calibri", size: 9 } as const;
const INCE_KENARLIK = {
  top: { style: "thin" as const },
  left: { style: "thin" as const },
  bottom: { style: "thin" as const },
  right: { style: "thin" as const },
};

export async function surucuListesiExcelOlustur(
  veri: SurucuListesiExcelVerisi
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TMGD Yönetim Sistemi";
  wb.created = new Date();

  const ws = wb.addWorksheet("Sürücü Listesi", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  ws.columns = [
    { width: 7 }, // Sıra No
    { width: 24 }, // Adı Soyadı
    { width: 16 }, // T.C. Kimlik No
    { width: 18 }, // SRC5 Sertifikası
    { width: 15 }, // İşe Giriş Tarihi
    { width: 15 }, // İşten Çıkış Tarihi
    { width: 20 }, // Sertifika Geçerlilik Tarihi
  ];

  // --- Belge başlığı bloğu -------------------------------------------
  ws.mergeCells("A1:G1");
  const firmaHucresi = ws.getCell("A1");
  firmaHucresi.value = veri.firmaAdi;
  firmaHucresi.font = { name: "Calibri", size: 13, bold: true };
  firmaHucresi.alignment = { horizontal: "center" };

  ws.mergeCells("A2:G2");
  const belgeAdiHucresi = ws.getCell("A2");
  belgeAdiHucresi.value = "ARAÇ SÜRÜCÜ LİSTESİ — TAŞIMADA GÖREV ALAN SÜRÜCÜLERE İLİŞKİN BİLGİLER (TMGDK-L3)";
  belgeAdiHucresi.font = { name: "Calibri", size: 11, bold: true };
  belgeAdiHucresi.alignment = { horizontal: "center" };

  ws.mergeCells("A3:D3");
  const dokNoHucresi = ws.getCell("A3");
  dokNoHucresi.value = "Doküman No: TMGDK-L3";
  dokNoHucresi.font = HUCRE_FONT;

  ws.mergeCells("E3:G3");
  const tarihHucresi = ws.getCell("E3");
  tarihHucresi.value = `Düzenleme Tarihi: ${veri.bugun}`;
  tarihHucresi.font = HUCRE_FONT;
  tarihHucresi.alignment = { horizontal: "right" };

  // --- Tablo başlık satırı ---------------------------------------------
  const basliklarSatiri = 5;
  const basliklar = [
    "Sıra No", "Adı Soyadı", "T.C. Kimlik No", "SRC5 Sertifikası (Var/Yok)",
    "İşe Giriş Tarihi", "İşten Çıkış Tarihi", "Sertifika Geçerlilik Tarihi",
  ];
  const baslikRow = ws.getRow(basliklarSatiri);
  basliklar.forEach((b, i) => {
    const cell = baslikRow.getCell(i + 1);
    cell.value = b;
    cell.font = BASLIK_FONT;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = INCE_KENARLIK;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E9F5" } };
  });
  baslikRow.height = 24;

  // --- Veri satırları ----------------------------------------------------
  veri.satirlar.forEach((s, idx) => {
    const row = ws.getRow(basliklarSatiri + 1 + idx);
    const degerler = [
      s.sira_no, s.ad_soyad, s.tc_kimlik_no, s.src5_sertifikasi,
      s.ise_giris_tarihi, s.isten_cikis_tarihi, s.sertifika_gecerlilik_tarihi,
    ];
    degerler.forEach((d, i) => {
      const cell = row.getCell(i + 1);
      cell.value = d;
      cell.font = HUCRE_FONT;
      cell.alignment = { horizontal: i === 0 ? "center" : "left", vertical: "middle", wrapText: true };
      cell.border = INCE_KENARLIK;
    });
  });

  // --- İmza alanı ------------------------------------------------------
  const imzaSatiri = basliklarSatiri + veri.satirlar.length + 2;
  ws.getCell(`A${imzaSatiri}`).value = "Hazırlayan (TMGD):";
  ws.getCell(`A${imzaSatiri}`).font = BASLIK_FONT;
  ws.getCell(`C${imzaSatiri}`).value = veri.hazirlayanAdi;
  ws.getCell(`C${imzaSatiri}`).font = HUCRE_FONT;

  return wb.xlsx.writeBuffer();
}
