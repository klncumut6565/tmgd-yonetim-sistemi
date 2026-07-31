// src/lib/kapakSayfasi.ts
//
// "İçindekiler_TMGD" KAPAK SAYFASI — Excel çıktısı
//
// Genelge kapsamında istenen bilgi/belge listesinin kapak sayfasını üretir.
// Biçim (font, punto, sütun genişliği, satır yüksekliği, kenarlıklar)
// örnek dosyayla birebir eşleşecek şekilde ayarlanmıştır.
//
// Veriler firmanın kendi kayıtlarından doldurulur; karşılığı olmayan
// alanlar BOŞ bırakılır (uydurma tarih yazılmaz).
//
// NOT: SheetJS'in ücretsiz sürümü hücre biçimlendirmesi yazamadığı için
// burada ExcelJS kullanılıyor.

import ExcelJS from "exceljs";
import type { ActivityKey } from "./belgeKatalogu";

/** Belge takip kayıtları: kod → geçerlilik/düzenleme tarihi */
export type BelgeTarihleri = Record<string, string | null>;

export type KapakVerisi = {
  firmaAdi: string;
  /** firms.contract_start — TMGD hizmet sözleşmesi başlangıcı */
  sozlesmeBaslangic: string | null;
  /** Firmanın faaliyet konuları */
  faaliyetler: ActivityKey[];
  /** firm_belgeleri tablosundan: kod → valid_until */
  belgeTarihleri: BelgeTarihleri;
  /** En son yıllık faaliyet raporu tarihi (varsa) */
  yillikRaporTarihi?: string | null;
  /** En son ziyaret raporu tarihi (varsa) */
  ziyaretRaporTarihi?: string | null;
};

/** ISO tarihi gg.aa.yyyy biçimine çevirir; yoksa boş string. */
function tr(tarih: string | null | undefined): string {
  if (!tarih) return "";
  const d = new Date(tarih);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * 14-21. satırlar: faaliyet konusuna bağlı yükümlülük dokümanları.
 * Firma o faaliyete sahipse açıklama BOŞ bırakılır (belge hazırlanmıştır).
 * Sahip değilse "<Faaliyet> Konusu bulunmamakta" yazılır.
 */
const FAALIYET_SATIRLARI: { faaliyet: ActivityKey; etiket: string; belgeAdi: string }[] = [
  {
    faaliyet: "alici",
    etiket: "Alıcı",
    belgeAdi:
      "Alıcının Yükümlülüklerine İlişkin Hazırlanmış Dokümanlar (Alıcı faaliyet konusuna sahip isletmeler)",
  },
  {
    faaliyet: "bosaltan",
    etiket: "Boşaltan",
    belgeAdi:
      "Boşaltanın Yükümlülüklerine İlişkin Hazırlanmış Dokümanlar (Boşaltan faaliyet konusuna sahip işletmeler)",
  },
  {
    faaliyet: "gonderen",
    etiket: "Gönderen",
    belgeAdi:
      "Gönderenin Yükümlülüklerine İlişkin Hazırlanmış Dokümanlar (Gönderen faaliyet konusuna sahip işletmeler)",
  },
  {
    faaliyet: "dolduran",
    etiket: "Dolduran",
    belgeAdi:
      "Dolduranın Yükümlülüklerine İlişkin Hazırlanmış Dokümanlar(Dolduran faaliyet konusuna sahip işletmeler)",
  },
  {
    faaliyet: "yukleyen",
    etiket: "Yükleyen",
    belgeAdi:
      "Yükleyenin Yükümlülüklerine İlişkin Hazırlanmış Dokümanlar (Yükleyen faaliyet konusuna sahip işletmeler)",
  },
  {
    faaliyet: "paketleyen",
    etiket: "Paketleyen",
    belgeAdi:
      "Paketleyenin Yükümlülüklerine İlişkin Hazırlanmış Dokümanlar (Paketleyen faaliyet konusuna sahip işletmeler)",
  },
  {
    faaliyet: "tasimaci",
    etiket: "Taşımacı",
    belgeAdi:
      "Taşımacının Yükümlülüklerine İlişkin Hazırlanmış Dokümanlar (Taşımacı faaliyet konusuna sahip işletmeler)",
  },
  {
    faaliyet: "tank_isletmecisi",
    etiket: "Tank Konteyner / Portatif Tank",
    belgeAdi:
      "Tank Konteyner/Portatif Tank İşletmecisinin Yükümlülüklerine İlişkin Hazırlanmış Dokümanlar (Tank Konteyner/Portatif Tank İşletmecisi faaliyet konusuna sahip işletmeler)",
  },
];

export async function kapakSayfasiOlustur(veri: KapakVerisi): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("İçindekiler_TMGD");

  // ---- Sütun genişlikleri (örnek dosyayla birebir) ----
  ws.getColumn(1).width = 9.86;
  ws.getColumn(2).width = 71.43;
  ws.getColumn(3).width = 26.57;
  ws.getColumn(4).width = 21.29;

  const KENARLIK: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // ---- Satır 5: Firma Adı ----
  ws.getRow(5).height = 21;
  const a5 = ws.getCell("A5");
  a5.value = "Firma Adı";
  a5.font = { name: "Calibri", size: 12, bold: true };
  a5.alignment = { vertical: "middle" };
  a5.border = KENARLIK;

  ws.mergeCells("B5:D5");
  const b5 = ws.getCell("B5");
  b5.value = veri.firmaAdi;
  b5.font = { name: "Calibri", size: 14, bold: true };
  b5.alignment = { horizontal: "center", vertical: "middle" };
  ["B5", "C5", "D5"].forEach((h) => (ws.getCell(h).border = KENARLIK));

  // ---- Satır 6: boş ayırıcı ----
  ws.getRow(6).height = 11.45;
  ws.mergeCells("A6:D6");
  const a6 = ws.getCell("A6");
  a6.font = { name: "Calibri", size: 12, bold: true };
  a6.alignment = { horizontal: "center", vertical: "middle" };
  ["A6", "B6", "C6", "D6"].forEach((h) => {
    ws.getCell(h).border = { left: { style: "thin" }, right: { style: "thin" } };
  });

  // ---- Satır 7: tablo başlıkları ----
  ws.getRow(7).height = 18.75;
  const basliklar = ["Sıra_No", "Bilgi ve Belge Adı", "Revize_Tarihi/Açıklama", "Klasör_Numarası"];
  basliklar.forEach((b, i) => {
    const c = ws.getCell(7, i + 1);
    c.value = b;
    c.font = { name: "Calibri", size: 14, bold: true };
    c.border = KENARLIK;
  });

  // ---- Satır 8+: içerik ----
  const g1Tarih = tr(veri.belgeTarihleri["G1"]);
  const g2Tarih = tr(veri.belgeTarihleri["G2"]);

  /** Faaliyet konusuna göre açıklama: varsa boş, yoksa "... bulunmamakta" */
  const faaliyetAciklama = (f: ActivityKey, etiket: string) =>
    veri.faaliyetler.includes(f) ? "" : `${etiket} Konusu bulunmamakta`;
  const faaliyetKlasor = (f: ActivityKey) => (veri.faaliyetler.includes(f) ? "6" : "-");

  const satirlar: { ad: string; aciklama: string; klasor: string }[] = [
    {
      ad:
        "En Son Düzenleniş Tehlikeli Madde Faaliyet Belgesi\n" +
        (g1Tarih ? `(Geçerlilik Tarihi:${g1Tarih})` : "(Geçerlilik Tarihi:)"),
      aciklama: g2Tarih ? `Ek-3 Raporu Düzenleme Tarihi: ${g2Tarih}` : "",
      klasor: "1",
    },
    {
      ad: "En Son Düzenleniş Tehlikeli Madde Faaliyet Tespit Raporu\n(Ek-3 ve Eki)",
      aciklama: g2Tarih ? `Ek-3 Raporu Düzenleme Tarihi: ${g2Tarih}` : "",
      klasor: "1",
    },
    {
      ad: "TMGD Hizmet alma zorunluluğu bulunan işletmeler için TMGD hizmet sözleşmesi",
      aciklama: tr(veri.sozlesmeBaslangic),
      klasor: "2",
    },
    {
      ad: "Faaliyet konusu devir etmiş işletmelerde devir sözleşmesi/leri veya devir işlemine ilişkin E-Devlet sisteminden alınmış belge örneği ",
      aciklama: "Devreden bir faaliyet konusu mevcut değildir.",
      klasor: "-",
    },
    {
      ad: "TMKTHY'nin 7 nci maddesinin onuncu fıkrası kapsamında gönderim faaliyeti (TMFB adresi dışında başka adresten gönderim işlemi) yapan işletmeler için gönderim yapılan adreslerin listesi",
      aciklama: "Ek bir adreste gönderim işlemi bulunmamaktadır.",
      klasor: "-",
    },
    {
      ad: "İşletmede, tehlikeli maddelere ilişkin iş ve işlemlerde görev alan kişilere ait bilgilerin yer aldığı doküman",
      aciklama: tr(veri.belgeTarihleri["G3"]),
      klasor: "1",
    },
    {
      ad: "ADR 1.8.5.3 kapsamında hazırlanmış kaza/olay bildirim raporları (Varsa)",
      aciklama: veri.belgeTarihleri["D3"] ? tr(veri.belgeTarihleri["D3"]) : "Kaza Bulunmamakta",
      klasor: veri.belgeTarihleri["D3"] ? "8" : "-",
    },
    {
      ad: "İşletmenin iştigal edilen tehlikeli maddelere ait güvenlik bilgi formları",
      aciklama:
        "Dijital Ortamda Tutulmakta envanter listesi çıktısı alınmış olup ADR kapsamı belirtilmiştir.",
      klasor: "4",
    },
    {
      ad: "ADR 1.3 kapsamında verilmiş eğitimlere ilişkin kayıtlar",
      aciklama: tr(veri.belgeTarihleri["E1"]),
      klasor: "9",
    },
    {
      // 10. satır: emniyet planı — kullanıcı talebi üzerine örnek dosyadaki
      // ifade korunuyor. Emniyet/kapsam dışı kontrol motoru eklendikten
      // sonra bu alan yeniden değerlendirilecek.
      ad: "ADR 1.10.3.2'de belirtilen hususlar dahilinde hazırlanmış bir güvenlik planı (ADR 1.10.3.2 kapsamında olan işletmeler icin)",
      aciklama:
        "Yapılan değerlendirmeye istinaden emniyet planı hazırlanmasına gerek yoktur." +
        (veri.belgeTarihleri["D1"] ? `\nGüncelleme Tarihi: ${tr(veri.belgeTarihleri["D1"])}` : ""),
      klasor: "7",
    },
    {
      ad: "ADR 1.8.3.3 uyarınca tehlikeli madde faaliyetlerine ilişkin en son hazırlanmış yıllık faaliyet raporu",
      aciklama: tr(veri.yillikRaporTarihi),
      klasor: "5",
    },
    {
      ad: "İşletmenin işlem yapılan tehlikeli maddenin sınıfına göre taşıtta bulunması gereken doküman ve emniyet teçhizatlarının bulundurulmasına yönelik talimat (Taşımacı ve/veya Gönderen)",
      aciklama: tr(veri.belgeTarihleri["T13"] ?? veri.belgeTarihleri["T4"]),
      klasor: "6",
    },
    {
      ad: "TMGD'nin ziyaret raporlarına ilişkin kayıtlar (TMGD hizmeti alanlar için)",
      aciklama: tr(veri.ziyaretRaporTarihi),
      klasor: "3",
    },
    ...FAALIYET_SATIRLARI.map((f) => ({
      ad: f.belgeAdi,
      aciklama: faaliyetAciklama(f.faaliyet, f.etiket),
      klasor: faaliyetKlasor(f.faaliyet),
    })),
  ];

  satirlar.forEach((s, i) => {
    const r = 8 + i;
    ws.getRow(r).height = 45;

    const a = ws.getCell(r, 1);
    a.value = i + 1;
    a.font = { name: "Calibri", size: 16, bold: true };
    a.alignment = { horizontal: "center", vertical: "middle" };
    a.border = KENARLIK;

    const b = ws.getCell(r, 2);
    b.value = s.ad;
    b.font = { name: "Calibri", size: 12, bold: true };
    b.alignment = { vertical: "middle", wrapText: true };
    b.border = KENARLIK;

    const c = ws.getCell(r, 3);
    c.value = s.aciklama;
    c.font = { name: "Calibri", size: 10, bold: false };
    c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    c.border = KENARLIK;

    const d = ws.getCell(r, 4);
    d.value = s.klasor;
    d.font = { name: "Calibri", size: 22, bold: true };
    d.alignment = { horizontal: "center", vertical: "middle" };
    d.border = KENARLIK;
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
