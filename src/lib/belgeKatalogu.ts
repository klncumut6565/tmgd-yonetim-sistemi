// =====================================================================
// BELGE KATALOĞU — merkezî yapılandırma
// =====================================================================
// Kaynak: "Genelge Kapsamında İstenenler" çalışma dosyası.
// Kod şeması: P1–P8 (Prosedür), T1–T21 (Talimat), K1–K7 (Kontrol Formu),
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
  /**
   * true → belge listelerde GÖRÜNMEZ (Belge Oluştur, Belge Takip).
   *
   * Silmek yerine pasif bırakılır: kodu ve şablonu yerinde kalır, daha önce
   * bu koda ait oluşturulmuş/yüklenmiş kayıtlar bozulmaz ve ileride tek
   * satır değişiklikle geri açılabilir.
   */
  pasif?: boolean;
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
  { code: "T21", name: "Tehlikeli Madde Taşıması Bildirim Talimatı (U-ETDS)", category: "T", activities: ["tasimaci"] },

  // ---------------- KONTROL FORMLARI ----------------
  { code: "K1", name: "Teslim Alınan Konteyner Kontrol Formu (Alıcı)", category: "K", activities: ["alici"] },
  { code: "K2", name: "Boşaltma Sonrası Arındırma / Kapatma Kontrol Formu", category: "K", activities: ["bosaltan"] },
  { code: "K3", name: "Sevkiyat Uygunluk Kontrol Formu (Gönderen · Yükleyen · Dolduran)", category: "K", activities: ["gonderen", "yukleyen", "dolduran"] },
  { code: "K4", name: "ADR Paketleme Kontrol Formu", category: "K", activities: ["paketleyen"] },
  { code: "K5", name: "Boş / Temizlenmiş Konteyner Takip Formu", category: "K", activities: ["bosaltan"] },
  { code: "K6", name: "Taşımacı Kontrol Dökümanı (Yönetmelik Md.22)", category: "K", activities: ["tasimaci"] },
  { code: "K7", name: "Taşıt Teçhizat Kontrol Formu (KKE · Yangınla Mücadele — ADR 8.1.4/8.1.5)", category: "K", activities: ["tasimaci"] },

  // ---------------- LİSTELER ----------------
  { code: "L1", name: "Tehlikeli Madde Envanter Listesi", category: "L", activities: [] },
  { code: "L2", name: "Araç / Taşımacı Listesi ve Taşıma Evrakı Kayıtları", category: "L", activities: ["gonderen", "tasimaci"] },
  { code: "L3", name: "Sürücü Listesi (SRC5 Kayıtları)", category: "L", activities: ["tasimaci"] },
  { code: "L4", name: "Ekipman / Ambalaj Takip Listesi", category: "L", activities: ["paketleyen", "dolduran"] },
  { code: "L5", name: "Ambalaj Bilgi Listesi (ADR Tablo A Değerlendirmesi)", category: "L", activities: ["paketleyen", "dolduran"] },

  // ---------------- SEFER / AKTARIM ----------------
  // SEFER / AKTARIM (SA) — PASİF.
  // Bu üç belge, Bakanlık genelgesinde istenen bilgi/belge listesinde yer
  // almıyor (genelge yalnızca gönderen/taşımacı/alıcı/boşaltan gibi ROLLERE
  // göre doküman istiyor; "sefer" veya "aktarım" başlığı geçmiyor).
  // Silinmedi çünkü şablonları ve daha önce üretilmiş kayıtlar korunmalı —
  // gerekirse pasif:false ile tek satırda geri açılır.
  { code: "SA1", name: "Sefer Takip Formu", category: "SA", activities: ["tasimaci"], pasif: true },
  { code: "SA2", name: "Aktarım Kaydı", category: "SA", activities: ["bosaltan", "yukleyen"], pasif: true },
  { code: "SA3", name: "ADR Belge Kaydı", category: "SA", activities: [], pasif: true },
];

// Faaliyete göre katalog filtresi
// NOT: L1 (Kimyasal/Tehlikeli Madde Envanter Listesi) özel durum — firma
// faaliyeti yalnızca Taşımacı ve/veya Tank İşletmecisi ise gizlenir,
// çünkü bu firmalar tehlikeli maddeyi stoklamaz, yalnızca taşır.
export function catalogForActivities(activities: string[]): CatalogItem[] {
  return CATALOG.filter((item) => {
    if (item.pasif) return false; // pasif belgeler hiçbir listede görünmez
    if (item.code === "L1") return envanterGerekli(activities);
    return (
      item.activities.length === 0 ||
      item.activities.some((a) => activities.includes(a))
    );
  });
}

export function catalogItem(code: string): CatalogItem | undefined {
  return CATALOG.find((c) => c.code === code);
}

// ---------------------------------------------------------------------
// Katalog dışı (özel) maddeler için sabit etiket/bölüm bilgisi.
// "Belgeler" sekmesi gibi tüm ekleri tek listede gösteren yerlerde,
// hangi faaliyet filtresi uygulanırsa uygulansın herhangi bir koddan
// okunabilir isim/kategori üretebilmek için kullanılır.
// ---------------------------------------------------------------------
const SPECIAL_ITEMS: Record<string, { label: string; section: string }> = {
  G1: { label: "Tehlikeli Madde Faaliyet Belgesi (TMFB)", section: "TMFB · EK-3 · Görevli Listesi" },
  G2: { label: "Tehlikeli Madde Faaliyet Tespit Raporu (Ek-3 ve Eki)", section: "TMFB · EK-3 · Görevli Listesi" },
  G3: { label: "Tehlikeli Madde İş ve İşlemlerinde Görevli Personel Listesi", section: "TMFB · EK-3 · Görevli Listesi" },
  S1: { label: "TMGD Hizmet Sözleşmesi", section: "TMGD Sözleşme · Sertifika · Yetki" },
  S2: { label: "TMGD Sertifikası", section: "TMGD Sözleşme · Sertifika · Yetki" },
  S3: { label: "U-Net Yetkilendirme Kaydı (SİAM TMGDK Sertifikası)", section: "TMGD Sözleşme · Sertifika · Yetki" },
  YFR: { label: "Yıllık Faaliyet Raporu", section: "Yıllık Faaliyet Raporu" },
  L1: { label: "Tehlikeli Madde Envanter Listesi", section: "ADR Envanter Listesi" },
  E1: { label: "ADR 1.3 Genel Bilinçlendirme Eğitimi Kayıtları", section: "Eğitimler" },
  E2: { label: "Göreve Özgü ve Emniyet Eğitimi Kayıtları", section: "Eğitimler" },
  D1: { label: "Emniyet Planı / Değerlendirme Kaydı", section: "Emniyet Planı · GBF · Diğer" },
  D2: { label: "Güvenlik Bilgi Formları (GBF/SDS) Dosyası", section: "Emniyet Planı · GBF · Diğer" },
  D3: { label: "Kaza / Olay Bildirim Raporları", section: "Emniyet Planı · GBF · Diğer" },
  D4: { label: "Diğer", section: "Emniyet Planı · GBF · Diğer" },

  // Araç ve Sürücü Belgeleri — yalnızca faaliyet konusu "tasimaci" olan
  // firmalarda gösterilir. Bunlar TMGD kapsamındaki ADR belgeleri değil,
  // taşımacılık faaliyetinin kendi mevzuat belgeleridir; bu yüzden genel
  // ilerleme yüzdesine DAHİL EDİLMEZ (bkz. firms/[id]/page.tsx → totals).
  AS1: { label: "K1/K2 Taşıma Yetki Belgesi", section: "Araç ve Sürücü Belgeleri" },
  AS2: { label: "Taşıt Kartı", section: "Araç ve Sürücü Belgeleri" },
  AS3: { label: "Araç Muayenesi", section: "Araç ve Sürücü Belgeleri" },
  AS4: { label: "Araç Ruhsatı", section: "Araç ve Sürücü Belgeleri" },
  AS5: { label: "Araç Sigorta/Kasko veya Tehlikeli Madde Mali Sorumluluk Sigortası", section: "Araç ve Sürücü Belgeleri" },
  AS6: { label: "Karayolu ile Atık Taşıma Uygunluk Belgesi", section: "Araç ve Sürücü Belgeleri" },
  AS7: { label: "SRC-5 Belgeli Şoför Sertifikası", section: "Araç ve Sürücü Belgeleri" },
};

// Herhangi bir madde kodu (+ dönem) için okunabilir isim döndürür.
export function codeLabel(code: string, period?: string): string {
  if (code === "ZR" && period) {
    const [y, m] = period.split("-");
    const idx = parseInt(m, 10) - 1;
    const ay = AY_ADLARI[idx] || m;
    return `${ay} ${y} Ziyaret Raporu`;
  }
  if (code === "YFR" && period) {
    return `Yıllık Faaliyet Raporu ${period} (ADR 1.8.3.3)`;
  }
  if (SPECIAL_ITEMS[code]) return SPECIAL_ITEMS[code].label;
  const item = catalogItem(code);
  if (item) return `${item.code} — ${item.name}`;
  return code;
}

// Herhangi bir madde kodu için ait olduğu bölüm/kategori başlığını döndürür.
export function codeSection(code: string): string {
  if (code === "ZR") return "Ziyaret Raporları (Aylık)";
  if (SPECIAL_ITEMS[code]) return SPECIAL_ITEMS[code].section;
  const item = catalogItem(code);
  if (item) return CATEGORY_LABELS[item.category];
  return "Diğer";
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

// HER ZAMAN geçen yılın (currentYear - 1) Yıllık Faaliyet Raporu (ADR
// 1.8.3.3) en azından listede görünür — sözleşme tarihinden bağımsız
// olarak. Sözleşme daha eski bir yıldaysa, o yıldan itibaren geçen yıla
// kadar TÜM eksik yıllar da eklenir.
//
// SORUMLULUK KURALI: Bir yılın raporu, o yıl tamamlandıktan sonra
// hazırlanır ve TAKİP EDEN YILIN MAYIS BAŞINA kadar teslim edilir.
// TMGD, göreve başladığı anda bu teslim tarihi henüz geçmemiş bir
// raporun sorumluluğunu ÜSTLENİR:
//   • Sözleşme, İÇİNDE BULUNULAN YILIN Mayıs ayından ÖNCE (Ocak–Nisan)
//     başladıysa → GEÇEN YILIN raporu henüz teslim edilmemiştir (teslim
//     tarihi olan Mayıs başı henüz gelmemiştir), TMGD bundan sorumludur.
//     Örnek: 01.03.2026 sözleşme → 2025 raporu Mayıs 2026 başına kadar
//     TMGD tarafından hazırlanmalıdır.
//   • Sözleşme, Mayıs ayı veya sonrasında başladıysa → geçen yılın
//     teslim tarihi (Mayıs başı) zaten geçmiştir, sorumluluk önceki
//     TMGD'ye aittir; TMGD ilk kez KENDİ BAŞLADIĞI yıldan sorumlu olur
//     (o yılın raporu ise ancak takip eden yıl gündeme gelir).
//
// İÇİNDE BULUNULAN YIL asla listede görünmez — henüz tamamlanmadığı
// için raporu hazırlanamaz (bkz. sonRaporYili = currentYear - 1).
function yillikFaaliyetRaporlari(contractStart: string | null): ChecklistItem[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const sonRaporYili = currentYear - 1; // her zaman: en son gösterilecek yıl

  // Varsayılan (sözleşme bilgisi yok ya da geçen yıldan da eskiyse):
  // en azından geçen yılın raporu gösterilir.
  let startYear = sonRaporYili;

  if (contractStart) {
    const cs = new Date(contractStart);
    const sozlesmeYili = cs.getFullYear();
    const mayisOncesi = cs.getMonth() < 4; // 0-indeksli: Mayıs = 4

    if (sozlesmeYili <= sonRaporYili) {
      // Sözleşme geçen yıl veya daha eski bir yılda başlamış: normal
      // akış — sözleşme yılından itibaren (mayıs istisnasına göre ilk
      // yıl dahil/hariç) geçen yıla kadar tüm yıllar listelenir.
      startYear = mayisOncesi ? sozlesmeYili : sozlesmeYili + 1;
    } else {
      // Sözleşme İÇİNDE BULUNULAN YILDA (ya da ileride) başlamış: geçen
      // yılın raporundan TMGD'nin sorumlu olup olmadığı yukarıdaki
      // kurala göre belirlenir.
      startYear = mayisOncesi ? sonRaporYili : currentYear;
    }
  }

  const items: ChecklistItem[] = [];
  for (let y = startYear; y <= sonRaporYili; y++) {
    items.push({
      code: "YFR",
      period: String(y),
      label: `Yıllık Faaliyet Raporu ${y} (ADR 1.8.3.3)`,
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

// Firma faaliyeti YALNIZCA Taşımacı ve/veya Tank İşletmecisi ise kimyasal
// envanter listesi istenmez — bu firmalar tehlikeli maddeyi stoklamaz,
// yalnızca taşır. Envanter yalnızca fiili elleçleme/depolama faaliyeti
// (alıcı, boşaltan, yükleyen, dolduran, paketleyen, gönderen) olan
// firmalardan istenir.
const TASIMA_ODAKLI: ActivityKey[] = ["tasimaci", "tank_isletmecisi"];

function envanterGerekli(activities: string[]): boolean {
  if (activities.length === 0) return true; // faaliyet seçilmemişse varsayılan: iste
  return activities.some((a) => !TASIMA_ODAKLI.includes(a as ActivityKey));
}

// Firma faaliyeti YALNIZCA Taşımacı ve/veya Tank İşletmecisi ise (başka hiçbir
// elleçleme faaliyeti yoksa) aşağıdaki maddeler de gösterilmez:
//   - Emniyet Planı / Değerlendirme Kaydı (D1)
//   - Güvenlik Bilgi Formları (GBF/SDS) Dosyası (D2)
//   - Eğitimler bölümünün tamamı (E1, E2)
// Bu firmalar tehlikeli maddeyi elleçlemediği/depolamadığı için bu belgeler
// TMGD kapsamında istenmez.
function sadeceTasimaVeyaTankIsletmecisi(activities: string[]): boolean {
  if (activities.length === 0) return false; // faaliyet seçilmemişse varsayılan: göster
  return activities.every((a) => TASIMA_ODAKLI.includes(a as ActivityKey));
}

// Firma faaliyetleri + sözleşme tarihine göre tüm takip bölümleri
export function buildChecklist(
  activities: string[],
  contractStart: string | null
): ChecklistSection[] {
  const gizliTasimaTank = sadeceTasimaVeyaTankIsletmecisi(activities);

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
        { code: "S3", period: "", label: "U-Net Yetkilendirme Kaydı (SİAM TMGDK Sertifikası)" },
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
      items: yillikFaaliyetRaporlari(contractStart),
    },
    ...(envanterGerekli(activities)
      ? [
          {
            key: "envanter",
            title: "ADR Envanter Listesi",
            items: [{ code: "L1", period: "", label: "L1 — Tehlikeli Madde Envanter Listesi" }],
          },
        ]
      : []),
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
      items: gizliTasimaTank
        ? []
        : [
            { code: "E1", period: "", label: "ADR 1.3 Genel Bilinçlendirme Eğitimi Kayıtları" },
            { code: "E2", period: "", label: "Göreve Özgü ve Emniyet Eğitimi Kayıtları" },
          ],
    },
    // Araç ve Sürücü Belgeleri — YALNIZCA faaliyet konusu "tasimaci" olan
    // firmalarda gösterilir. Bunlar ADR/TMGD kapsamındaki belgeler değil,
    // taşımacılık faaliyetinin kendi mevzuat belgeleridir (yetki belgesi,
    // taşıt kartı, muayene, ruhsat, sigorta vb.) — bu yüzden genel
    // ilerleme yüzdesine dahil edilmez (bkz. firms/[id]/page.tsx →
    // totals, AS ile başlayan kodlar sayaç dışı bırakılır).
    ...(activities.includes("tasimaci")
      ? [
          {
            key: "arac_surucu",
            title: "Araç ve Sürücü Belgeleri",
            items: [
              { code: "AS1", period: "", label: "K1/K2 Taşıma Yetki Belgesi" },
              { code: "AS2", period: "", label: "Taşıt Kartı" },
              { code: "AS3", period: "", label: "Araç Muayenesi" },
              { code: "AS4", period: "", label: "Araç Ruhsatı" },
              { code: "AS5", period: "", label: "Araç Sigorta/Kasko veya Tehlikeli Madde Mali Sorumluluk Sigortası" },
              { code: "AS6", period: "", label: "Karayolu ile Atık Taşıma Uygunluk Belgesi" },
              { code: "AS7", period: "", label: "SRC-5 Belgeli Şoför Sertifikası" },
            ],
          },
        ]
      : []),
    {
      key: "diger",
      title: "Emniyet Planı · GBF · Diğer",
      items: [
        ...(gizliTasimaTank
          ? []
          : [
              { code: "D1", period: "", label: "Emniyet Planı (ADR 1.10.3.2 kapsamındaysa) / Değerlendirme Kaydı" },
              { code: "D2", period: "", label: "Güvenlik Bilgi Formları (GBF/SDS) Dosyası" },
            ]),
        { code: "D3", period: "", label: "Kaza / Olay Bildirim Raporları (ADR 1.8.5.3 — varsa)" },
        { code: "D4", period: "", label: "Diğer (zorunlu olmayan ek belgeler)" },
      ],
    },
  ].filter((s) => s.items.length > 0);
}
