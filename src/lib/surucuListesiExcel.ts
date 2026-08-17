// src/lib/surucuListesiExcel.ts
//
// "ARAÇ SÜRÜCÜ LİSTESİ / TAŞIMADA GÖREV ALAN SÜRÜCÜLERE İLİŞKİN BİLGİLER"
// (Doküman No: TMGDK-L3) belgesinin Excel çıktısını üretir. Format,
// kullanıcının yüklediği örnek SRC5_Kayıtları.xlsx dosyasıyla birebir
// sütun/şema eşleşecek şekilde tasarlanmıştır: sol üst blok (logo alanı
// yer tutucusu) + orta başlık/alt açıklama + sağ üst 4 satırlık belge
// kontrol kutusu (Doküman No/Yayın Tarihi/Revizyon Tarihi/Sayfa No),
// Sertifika Numarası sütunu, ve alt HAZIRLAYAN/KONTROL EDEN/ONAYLAYAN
// üç imza bloğu (gorevliListesiExcel.ts ile AYNI desen, ExcelJS).

import ExcelJS from "exceljs";

export type SurucuListesiSatiri = {
  sira_no: number;
  ad_soyad: string;
  tc_kimlik_no: string;
  src5_sertifikasi: string; // "Var" / "Yok"
  ise_giris_tarihi: string; // gg.aa.yyyy veya boş
  sertifika_numarasi: string;
  isten_cikis_tarihi: string;
  sertifika_gecerlilik_tarihi: string;
};

export type SurucuListesiExcelVerisi = {
  firmaAdi: string;
  hazirlayanAdi: string;
  /** Onaylayan (tesis sorumlusu) — firms.approver_name. */
  onaylayanAdi: string;
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
    { width: 8 },  // A: Sıra No
    { width: 22 }, // B: Adı Soyadı
    { width: 20 }, // C: T.C. Kimlik No
    { width: 20 }, // D: SRC5 Sertifikası
    { width: 14 }, // E: İşe Giriş Tarihi
    { width: 22 }, // F: Sertifika Numarası
    { width: 14 }, // G: İşe Çıkış Tarihi
    { width: 20 }, // H: Sertifika Geçerlilik Tarihi
  ];

  // --- Belge başlığı bloğu — örnek Excel'in (SRC5_Kayıtları.xlsx) AYNI
  // şeması: sol üst A1:B4 firma/logo alanı, orta C1:F2 başlık, C3:F4 alt
  // açıklama, sağ üst G/H sütunlarında 4 satırlık belge kontrol kutusu. ---
  ws.mergeCells("A1:B4");
  const firmaHucresi = ws.getCell("A1");
  firmaHucresi.value = veri.firmaAdi;
  firmaHucresi.font = { name: "Calibri", size: 10, bold: true };
  firmaHucresi.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  firmaHucresi.border = INCE_KENARLIK;

  ws.mergeCells("C1:F2");
  const baslikHucresi = ws.getCell("C1");
  baslikHucresi.value = "ARAÇ SÜRÜCÜ LİSTESİ";
  baslikHucresi.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FF1E40AF" } };
  baslikHucresi.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("C3:F4");
  const altAciklamaHucresi = ws.getCell("C3");
  altAciklamaHucresi.value = "TAŞIMADA GÖREV ALAN SÜRÜCÜLERE İLİŞKİN BİLGİLER";
  altAciklamaHucresi.font = { name: "Calibri", size: 9, bold: true };
  altAciklamaHucresi.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  const bilgiPaneli: [string, string, string, string][] = [
    ["G1", "Doküman No:", "H1", "TMGDK-L3"],
    ["G2", "Yayın Tarihi:", "H2", veri.bugun],
    ["G3", "Revizyon Tarihi:", "H3", veri.bugun],
    ["G4", "Sayfa No:", "H4", "1"],
  ];
  bilgiPaneli.forEach(([etikHucre, etikMetin, degHucre, degMetin]) => {
    ws.getCell(etikHucre).value = etikMetin;
    ws.getCell(etikHucre).font = HUCRE_FONT;
    ws.getCell(degHucre).value = degMetin;
    ws.getCell(degHucre).font = HUCRE_FONT;
  });

  ws.getRow(1).height = 18.75;
  ws.getRow(2).height = 18.75;
  ws.getRow(3).height = 18.75;
  ws.getRow(4).height = 18.75;

  // --- Tablo başlık satırı ---------------------------------------------
  const basliklarSatiri = 6;
  const basliklar = [
    "Sıra No", "Adı Soyadı", "T.C. Kimlik No", "SRC5 Sertifikası (Var/Yok)",
    "İşe Giriş Tarihi", "Sertifika Numarası", "İşe Çıkış Tarihi", "Sertifika Geçerlilik Tarihi",
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
      s.ise_giris_tarihi, s.sertifika_numarasi, s.isten_cikis_tarihi, s.sertifika_gecerlilik_tarihi,
    ];
    degerler.forEach((d, i) => {
      const cell = row.getCell(i + 1);
      cell.value = d;
      cell.font = HUCRE_FONT;
      cell.alignment = { horizontal: i === 0 ? "center" : "left", vertical: "middle", wrapText: true };
      cell.border = INCE_KENARLIK;
    });
  });

  // --- HAZIRLAYAN / KONTROL EDEN / ONAYLAYAN üç sütunlu imza bloğu ------
  // Örnek Excel'deki (A12:C19 / D12:F19 / G12:H19 birleştirilmiş üç kutu)
  // AYNI şema. "KONTROL EDEN" — BelgeOlusturForm.tsx'teki sabit desenle
  // tutarlı olarak her zaman TMGD Koordinatörü'dür.
  const imzaBasiSatir = basliklarSatiri + veri.satirlar.length + 2;
  const imzaSonSatir = imzaBasiSatir + 5;

  ws.mergeCells(`A${imzaBasiSatir}:C${imzaSonSatir}`);
  ws.mergeCells(`D${imzaBasiSatir}:F${imzaSonSatir}`);
  ws.mergeCells(`G${imzaBasiSatir}:H${imzaSonSatir}`);

  const imzaKutulari: { hucre: string; baslik: string; isim: string; unvan: string }[] = [
    {
      hucre: `A${imzaBasiSatir}`,
      baslik: "HAZIRLAYAN",
      isim: veri.hazirlayanAdi || "—",
      unvan: "Tehlikeli Madde Güvenlik Danışmanı",
    },
    {
      hucre: `D${imzaBasiSatir}`,
      baslik: "KONTROL EDEN",
      isim: "YAKUP ATAŞ",
      unvan: "Tehlikeli Madde Güvenlik Danışmanı Koordinatörü",
    },
    {
      hucre: `G${imzaBasiSatir}`,
      baslik: "ONAYLAYAN",
      isim: veri.onaylayanAdi || "—",
      unvan: "Tesis Sorumlusu",
    },
  ];

  imzaKutulari.forEach(({ hucre, baslik, isim, unvan }) => {
    const cell = ws.getCell(hucre);
    cell.value = { richText: [
      { font: { name: "Calibri", size: 9, bold: true }, text: `${baslik}\n` },
      { font: { name: "Calibri", size: 9, bold: true }, text: `${isim.toLocaleUpperCase("tr-TR")}\n` },
      { font: { name: "Calibri", size: 8 }, text: unvan },
    ] };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = INCE_KENARLIK;
  });

  return wb.xlsx.writeBuffer();
}
