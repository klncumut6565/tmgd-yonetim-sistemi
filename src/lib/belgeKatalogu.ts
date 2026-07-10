// =====================================================================
// BELGE KATALOĞU — merkezî yapılandırma
// =====================================================================
// Kaynak: "Genelge Kapsamında İstenenler" çalışma dosyası.
// Kod şeması: P1–P8 (Prosedür), T1–T20 (Talimat), K1–K9 (Kontrol Formu),
//             L1–L4 (Liste), SA1–SA3 (Sefer/Aktarım).
//
// ✏️ Belge adlarını / faaliyet eşlemelerini değiştirmek için sadece
//    bu dosyayı düzenle — UI otomatik uyum sağlar.
//
// Faaliyet eşleme kuralı:
//   activities: []            → HER firma için geçerli (ortak belge)
//   activities: ["tasimaci"]  → sadece Taşımacı firmalarda görünür
// =====================================================================

export type ActivityKey =
  | "alici"
  | "bosaltan"
  | "yukleyen"
  | "tasimaci"
  | "dolduran"
  | "paketleyen"
  | "gonderen"
  | "tank_isletmecisi";

export const ACTIVITIES: { key: ActivityKey; label: string }[] = [
  { key: "alici", label: "Alıcı" },
  { key: "bosaltan", label: "Boşaltan" },
  { key: "yukleyen", label: "Yükleyen" },
  { key: "tasimaci", label: "Taşımacı" },
  { key: "dolduran", label: "Dolduran" },
  { key: "paketleyen", label: "Paketleyen" },
  { key: "gonderen", label: "Gönderen" },
  { key: "tank_isletmecisi", label: "Tank İşletmecisi" },
];

export const ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITIES.map((a) => [a.key, a.label])
);

// ---------------------------------------------------------------------
// Üretilebilir belge kataloğu (Belge Oluştur sayfası + Belge Takip)
// ---------------------------------------------------------------------
export type CatalogCategory = "P" | "T" | "K" | "L" | "SA";

export type CatalogItem = {
  code: string;
  name: string;
  category: CatalogCategory;
  activities: ActivityKey[]; // boş = tüm firmalar
};

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  P: "Prosedürler (P)",
  T: "Talimatlar (T)",
  K: "Kontrol Formları (K)",
  L: "Listeler (L)",
  SA: "Sefer / Aktarım (SA)",
};

export const CATALOG: CatalogItem[] = [
  // ---------------- PROSEDÜRLER ----------------
  { code: "P1", name: "Yük Kabul Prosedürü (Alıcı)", category: "P", activities: ["alici"] },
  { code: "P2", name: "Boşaltma Öncesi / Sırası / Sonrası Önlemler Prosedürü", category: "P", activities: ["bosaltan"] },
  { code: "P3", name: "Sevkiyat Uygunluk Kontrol Prosedürü (Taşıt · Ambalaj · Etiket · Karışık Yükleme)", category: "P", activities: ["gonderen"] },
  { code: "P4", name: "Tehlikeli Madde Tanımlama ve Sınıflandırma Prosedürü", category: "P", activities: ["gonderen"] },
  { code: "P5", name: "Yükleme Öncesi / Sırası / Sonrası Önlemler Prosedürü", category: "P", activities: ["yukleyen"] },
  { code: "P6", name: "Paketleme (ADR 4.1) Prosedürü", category: "P", activities: ["paketleyen"] },
  { code: "P7", name: "Dolum Öncesi / Sırası / Sonrası Önlemler Prosedürü", category: "P", activities: ["dolduran"] },
  { code: "P8", name: "Taşıma Öncesi / Sırası / Sonrası Önlemler Prosedürü", category: "P", activities: ["tasimaci"] },

  // ---------------- TALİMATLAR ----------------
  { code: "T1", name: "Boşaltma Sırasında Alınacak Önlemler Talimatı (Alıcı)", category: "T", activities: ["alici"] },
  { code: "T2", name: "Boşaltma Sonrası Arındırma · Vana/Kapak Kapatma Kontrol Talimatı", category: "T", activities: ["bosaltan"] },
  { code: "T3", name: "Taşıt / Konteyner Temizlik ve Dezenfeksiyon Talimatı", category: "T", activities: ["bosaltan"] },
  { code: "T4", name: "Boşaltma Öncesi Tahribat / Hasar Kontrol Talimatı", category: "T", activities: ["bosaltan"] },
  { code: "T5", name: "Sevkiyat Uygunluk Talimatı (Taşıt · Basınçlı Kap · Etiket · Karışık Yükleme)", category: "T", activities: ["gonderen"] },
  { code: "T6", name: "Karışık Yükleme Yasakları ve Ayırım Kuralları Talimatı", category: "T", activities: ["yukleyen"] },
  { code: "T7", name: "Konteyner Etiket / Levha ve Turuncu Plaka Kontrol Talimatı", category: "T", activities: ["yukleyen"] },
  { code: "T8", name: "Hasarlı / Sızdıran Ambalaj Yüklenmesi ve Yükleme Emniyeti (ADR 7.5) Talimatı", category: "T", activities: ["yukleyen"] },
  { code: "T9", name: "Basınçlı Ekipman Periyodik Test / Muayene Takip Talimatı", category: "T", activities: ["paketleyen"] },
  { code: "T10", name: "Muayenesi Geçmiş Ekipman Bertaraf Talimatı", category: "T", activities: ["paketleyen"] },
  { code: "T11", name: "Karışık Paketleme Kuralları Talimatı", category: "T", activities: ["paketleyen"] },
  { code: "T12", name: "Ambalaj İşaretleme ve Etiketleme Uygunluk Talimatı", category: "T", activities: ["paketleyen"] },
  { code: "T13", name: "YTB Muayene Kontrolü ve Uygun Tanka Dolum Talimatı", category: "T", activities: ["dolduran"] },
  { code: "T14", name: "Dolum Öncesi Etiket / Levha ve Turuncu Plaka Talimatı", category: "T", activities: ["dolduran"] },
  { code: "T15", name: "Bölmeli Tank Dolumu ve Azami Doldurma Derecesi Talimatı", category: "T", activities: ["dolduran"] },
  { code: "T16", name: "Dolum Sonrası Sızdırmazlık ve Bulaşma Kontrol Talimatı", category: "T", activities: ["dolduran"] },
  { code: "T17", name: "Dökme Dolum (ADR 7.3) ve Taşımacı TMFB Kontrol Talimatı", category: "T", activities: ["dolduran"] },
  { code: "T18", name: "Taşıt Etiket / Levha / Plaka ve Sızıntı-Hasar Kontrol Talimatı", category: "T", activities: ["tasimaci"] },
  { code: "T19", name: "Taşıtta Teçhizat Bulundurma Talimatı (ADR 8.1.4 / 8.1.5)", category: "T", activities: ["tasimaci"] },
  { code: "T20", name: "Karışık Yükleme · İhlal Durumu · Boş YTB Taşıma Evrakı Talimatı", category: "T", activities: ["tasimaci"] },

  // ---------------- KONTROL FORMLARI ----------------
  { code: "K1", name: "Teslim Alınan Konteyner Kontrol Formu (Alıcı)", category: "K", activities: ["alici"] },
  { code: "K2", name: "Boşaltma Sonrası Arındırma / Kapatma Kontrol Formu", category: "K", activities: ["bosaltan"] },
  { code: "K3", name: "Sevkiyat Uygunluk Kontrol Formu (Gönderen)", category: "K", activities: ["gonderen"] },
  { code: "K4", name: "Yükleme Kontrol Formu (Ayırım · Etiket · Emniyet)", category: "K", activities: ["yukleyen"] },
  { code: "K5", name: "Boş / Temizlenmiş Konteyner Takip Formu", category: "K", activities: ["bosaltan"] },
  { code: "K6", name: "Paketleme Kontrol Formu (Basınçlı Ekipman · İşaret/Etiket)", category: "K", activities: ["paketleyen"] },
  { code: "K7", name: "Dolum Kontrol Formu (Muayene · Plaka · Sızdırmazlık)", category: "K", activities: ["dolduran"] },
  { code: "K8", name: "Taşıt Teçhizat Kontrol Formu (KKE · Yangın Teçhizatı)", category: "K", activities: ["tasimaci"] },
  { code: "K9", name: "Taşıt / Sürücü Belge Kontrol ve Takip Formu", category: "K", activities: ["tasimaci"] },

  // ---------------- LİSTELER ----------------
  { code: "L1", name: "Tehlikeli Madde Envanter Listesi", category: "L", activities: [] },
  { code: "L2", name: "Araç / Taşımacı Listesi ve Taşıma Evrakı Kayıtları", category: "L", activities: ["gonderen", "tasimaci"] },
  { code: "L3", name: "Sürücü Listesi (Ad · TC · SRC5 · Giriş/Çıkış)", category: "L", activities: ["tasimaci"] },
  { code: "L4", name: "Ekipman / Ambalaj Takip Listesi", category: "L", activities: ["paketleyen", "dolduran"] },

  // ---------------- SEFER / AKTARIM ----------------
  { code: "SA1", name: "Sefer Takip Formu", category: "SA", activities: ["tasimaci"] },
  { code: "SA2", name: "Aktarım Kaydı", category: "SA", activities: ["bosaltan", "yukleyen"] },
  { code: "SA3", name: "ADR Belge Kaydı", category: "SA", activities: [] },
];

// Faaliyete göre katalog filtresi
export function catalogForActivities(activities: string[]): CatalogItem[] {
  return CATALOG.filter(
    (item) =>
      item.activities.length === 0 ||
      item.activities.some((a) => activities.includes(a))
  );
}

export function catalogItem(code: string): CatalogItem | undefined {
  return CATALOG.find((c) => c.code === code);
}

// ---------------------------------------------------------------------
// BELGE TAKİP bölümleri (firma detay → Belge Takip sekmesi)
// Genelge "İçindekiler" sayfasındaki maddelerle uyumlu.
// ---------------------------------------------------------------------
export type ChecklistItem = {
  code: string;
  period: string; // dönemsiz maddelerde ''
  label: string;
};

export type ChecklistSection = {
  key: string;
  title: string;
  items: ChecklistItem[];
};

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// Sözleşme başlangıcından (yoksa yıl başından) İÇİNDE BULUNULAN AYA
// kadar aylık ziyaret raporu maddeleri üretir. Gelecek aylar istenmez;
// yeni ay girildikçe listeye otomatik eklenir.
function ziyaretAylari(contractStart: string | null): ChecklistItem[] {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Ocak
  let startMonth = 0; // Ocak

  if (contractStart) {
    const cs = new Date(contractStart);
    if (cs.getFullYear() === year) startMonth = cs.getMonth();
    // sözleşme geçmiş yıldaysa yıl başından itibaren say
  }

  const items: ChecklistItem[] = [];
  for (let m = startMonth; m <= currentMonth; m++) {
    items.push({
      code: "ZR",
      period: `${year}-${String(m + 1).padStart(2, "0")}`,
      label: `${AY_ADLARI[m]} ${year} Ziyaret Raporu`,
    });
  }
  return items;
}

function katalogMaddeleri(
  activities: string[],
  categories: CatalogCategory[]
): ChecklistItem[] {
  return catalogForActivities(activities)
    .filter((c) => categories.includes(c.category))
    .map((c) => ({ code: c.code, period: "", label: `${c.code} — ${c.name}` }));
}

// Firma faaliyetleri + sözleşme tarihine göre tüm takip bölümleri
export function buildChecklist(
  activities: string[],
  contractStart: string | null
): ChecklistSection[] {
  return [
    {
      key: "tmfb",
      title: "TMFB · EK-3 · Görevli Listesi",
      items: [
        { code: "G1", period: "", label: "Tehlikeli Madde Faaliyet Belgesi (TMFB) — geçerlilik takibi" },
        { code: "G2", period: "", label: "Tehlikeli Madde Faaliyet Tespit Raporu (Ek-3 ve Eki)" },
        { code: "G3", period: "", label: "Tehlikeli Madde İş ve İşlemlerinde Görevli Personel Listesi" },
      ],
    },
    {
      key: "tmgd",
      title: "TMGD Sözleşme · Sertifika · Yetki",
      items: [
        { code: "S1", period: "", label: "TMGD Hizmet Sözleşmesi" },
        { code: "S2", period: "", label: "TMGD Sertifikası" },
        { code: "S3", period: "", label: "U-Net Yetkilendirme Kaydı" },
      ],
    },
    {
      key: "ziyaret",
      title: "Ziyaret Raporları (Aylık)",
      items: ziyaretAylari(contractStart),
    },
    {
      key: "yfr",
      title: "Yıllık Faaliyet Raporu",
      items: [
        { code: "YFR", period: "", label: "Yıllık Faaliyet Raporu (ADR 1.8.3.3)" },
      ],
    },
    {
      key: "envanter",
      title: "ADR Envanter Listesi",
      items: [{ code: "L1", period: "", label: "L1 — Tehlikeli Madde Envanter Listesi" }],
    },
    {
      key: "prosedurler",
      title: "ADR Prosedürleri (P)",
      items: katalogMaddeleri(activities, ["P"]),
    },
    {
      key: "talimatlar",
      title: "ADR Talimatları (T)",
      items: katalogMaddeleri(activities, ["T"]),
    },
    {
      key: "kontrol",
      title: "Kontrol · Liste · Takip Formları (K/L/SA)",
      items: [
        ...katalogMaddeleri(activities, ["K"]),
        // L1 kendi bölümünde olduğundan burada L2-L4 kalır
        ...katalogMaddeleri(activities, ["L"]).filter((i) => i.code !== "L1"),
        ...katalogMaddeleri(activities, ["SA"]),
      ],
    },
    {
      key: "egitimler",
      title: "Eğitimler",
      items: [
        { code: "E1", period: "", label: "ADR 1.3 Genel Bilinçlendirme Eğitimi Kayıtları" },
        { code: "E2", period: "", label: "Göreve Özgü ve Emniyet Eğitimi Kayıtları" },
      ],
    },
    {
      key: "diger",
      title: "Emniyet Planı · GBF · Diğer",
      items: [
        { code: "D1", period: "", label: "Emniyet Planı (ADR 1.10.3.2 kapsamındaysa) / Değerlendirme Kaydı" },
        { code: "D2", period: "", label: "Güvenlik Bilgi Formları (GBF/SDS) Dosyası" },
        { code: "D3", period: "", label: "Kaza / Olay Bildirim Raporları (ADR 1.8.5.3 — varsa)" },
      ],
    },
  ].filter((s) => s.items.length > 0);
}
