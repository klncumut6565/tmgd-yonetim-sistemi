// Firmaya bağlı tabloların (araçlar / sürücüler / personeller / ziyaretler)
// ortak alan tanımları. Hem bağımsız sayfalar (/vehicles, /drivers, ...)
// hem de firma detay sayfasındaki gömülü sekmeler bu tanımları kullanır —
// tek yerden yönetilir, ikisi de aynı formu gösterir.

import { FieldDef } from "@/components/FirmScopedCrud";

export const VEHICLE_FIELDS: FieldDef[] = [
  { key: "plate_number", label: "Plaka", type: "text", required: true },
  { key: "brand", label: "Marka", type: "text" },
  { key: "model", label: "Model", type: "text" },
  { key: "model_year", label: "Model Yılı", type: "number" },
  { key: "vehicle_type", label: "Araç Tipi", type: "text" },
  { key: "adr_certificate_no", label: "ADR Belge No", type: "text", inTable: false },
  { key: "adr_valid_until", label: "ADR Geçerlilik", type: "date" },
  { key: "inspection_valid_until", label: "Muayene Geçerlilik", type: "date", inTable: false },
  {
    key: "status",
    label: "Durum",
    type: "select",
    options: [
      { value: "active", label: "Aktif" },
      { value: "inactive", label: "Pasif" },
      { value: "sold", label: "Satıldı" },
    ],
  },
];

export const DRIVER_FIELDS: FieldDef[] = [
  { key: "first_name", label: "Ad", type: "text", required: true },
  { key: "last_name", label: "Soyad", type: "text", required: true },
  { key: "national_id", label: "T.C. Kimlik No", type: "text", inTable: false },
  { key: "phone", label: "Telefon", type: "text" },
  { key: "email", label: "E-posta", type: "text", inTable: false },
  { key: "adr_certificate_no", label: "ADR Belge No", type: "text", inTable: false },
  { key: "adr_valid_until", label: "ADR Geçerlilik", type: "date" },
  { key: "driving_license_class", label: "Ehliyet Sınıfı", type: "text" },
  {
    key: "status",
    label: "Durum",
    type: "select",
    options: [
      { value: "active", label: "Aktif" },
      { value: "inactive", label: "Pasif" },
    ],
  },
];

export const EMPLOYEE_FIELDS: FieldDef[] = [
  { key: "first_name", label: "Ad", type: "text", required: true },
  { key: "last_name", label: "Soyad", type: "text", required: true },
  { key: "department", label: "Departman", type: "text" },
  { key: "position", label: "Pozisyon", type: "text" },
  { key: "phone", label: "Telefon", type: "text" },
  { key: "email", label: "E-posta", type: "text", inTable: false },
  {
    key: "status",
    label: "Durum",
    type: "select",
    options: [
      { value: "active", label: "Aktif" },
      { value: "inactive", label: "Pasif" },
    ],
  },
];

// Yeni ziyaret kaydı açıldığında rapor alanına ön dolu gelen şablon.
// TMGD ziyaret raporlarında kullanılan standart "Planlanan/Gerçekleşen
// Faaliyet" formatı — kullanıcı içeriği serbestçe düzenleyebilir.
export const VISIT_REPORT_TEMPLATE = `PLANLANAN FAALİYET
1- İşletmenin faaliyet konularında herhangi bir değişiklik olup olmadığına,
2- İşletmenin tehlikeli madde is ve işlemlerinde görev alan personele ilişkin ADR 1.3 kapsamında eğitim kayıtlarının güncel olup olmadığına,
3- İşletmenin faaliyet konularına uygun olarak hazırlanması gerektiği değerlendirilen; prosedür, kontrol formu, talimat, vb. dokümanlarda eksiklik olup olmadığına,
4- İşletmenin faaliyet konusu/konularına bağlı olarak ADR 1.10.3.2 de belirtilen hususlar dâhilinde hazırlanan Emniyet Planının güncel olup olmadığına,

GERÇEKLEŞEN FAALİYET
Ziyaret Tarihi: 12.06.2026
Rapor Saati: 12:40
1- İşletmenin faaliyet konularında herhangi bir değişiklik yoktur.
2- İşletmenin tehlikeli madde is ve işlemlerinde görev alan personele ilişkin ADR 1.3 kapsamında;
- Genel Bilinçlendirme Eğitimi,
- Emniyet Eğitimi,
- Göreve Özgü Eğitim,
eğitimler bir önceki TMGDK firması tarafından verilmiştir. (Geçerlilik tarihi: 14.08.2027)
3- İşletmenin faaliyet konularına uygun hazırlanan Prosedürler, kontrol formları ve talimatlar bir kısmı hazırlanmış olup ilgili birimlere teslim edilmiştir.
4- İşletme için güncel envanter listesi oluşturulacak olup, envanter listesi kontrollerine istinaden emniyet planı değerlendirmesi yapılacaktır.`;

export const VISIT_FIELDS: FieldDef[] = [
  { key: "visit_date", label: "Ziyaret Tarihi", type: "date", required: true },
  {
    key: "visit_type",
    label: "Ziyaret Tipi",
    type: "select",
    options: [
      { value: "periyodik", label: "Periyodik" },
      { value: "denetim", label: "Denetim" },
      { value: "egitim", label: "Eğitim" },
      { value: "olay", label: "Olay/Kaza" },
      { value: "diger", label: "Diğer" },
    ],
  },
  { key: "summary", label: "Özet", type: "text" },
  { key: "next_visit_date", label: "Sonraki Ziyaret", type: "date" },
];
