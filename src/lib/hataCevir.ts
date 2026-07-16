// =====================================================================
// MERKEZİ TÜRKÇE HATA ÇEVİRİCİ
// =====================================================================
// Supabase (auth + PostgREST + Postgres) hatalarını Türkçeleştirir.
// Listede olmayan hatalar bile İngilizce GÖSTERİLMEZ: teknik detay
// parantez içinde küçük not olarak eklenir, ana mesaj hep Türkçedir.
//
// Kullanım:  import { hataCevir } from "@/lib/hataCevir";
//            setError(hataCevir(error));   // error objesi veya string

type HataGibi = { message?: string; code?: string } | string | null | undefined;

const KALIPLAR: [RegExp, string][] = [
  // ---- Auth ----
  [/invalid login credentials/i, "E-posta veya şifre hatalı."],
  [/email not confirmed/i, "E-postanı henüz doğrulamadın. Mailindeki bağlantıya tıkla."],
  [/unable to validate email|invalid format/i, "E-posta adresi geçersiz görünüyor. Başında/sonunda boşluk olmadığından emin ol."],
  [/already registered|already exists|already been registered/i, "Bu e-posta zaten kayıtlı. Giriş yapmayı dene."],
  [/password should be at least|weak password/i, "Şifre çok zayıf. En az 6 karakter kullan."],
  [/same password|different from the old password/i, "Yeni şifre eskisiyle aynı olamaz."],
  [/rate limit|too many requests/i, "Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar dene."],
  [/token.*(expired|invalid)|jwt expired/i, "Oturumun süresi doldu. Lütfen tekrar giriş yap."],
  [/user not found/i, "Kullanıcı bulunamadı."],
  [/signups? not allowed|disabled/i, "Yeni kayıt şu anda kapalı. Sistem yöneticisiyle iletişime geç."],

  // ---- RLS / Yetki ----
  [/row-level security|violates row-level security|permission denied|not authorized|insufficient/i,
    "Bu işlem için yetkin yok. Hesabın onaylı değilse yönetici onayını bekle; onaylıysa bu firmaya atanmış olman gerekir."],

  // ---- Postgres kısıtlamaları ----
  [/duplicate key|unique constraint/i, "Bu kayıt zaten mevcut (aynı bilgiyle ikinci kayıt eklenemez)."],
  [/violates foreign key.*delete|still referenced/i, "Bu kayıt silinemedi: başka kayıtlar tarafından kullanılıyor. Önce bağlı kayıtları sil."],
  [/violates foreign key/i, "Bağlantılı kayıt bulunamadı. Seçtiğin firma/kayıt silinmiş olabilir — sayfayı yenile."],
  [/not-null constraint|null value in column/i, "Zorunlu bir alan boş bırakılmış. Lütfen tüm zorunlu alanları doldur."],
  [/violates check constraint/i, "Girilen değer izin verilen seçenekler arasında değil."],
  [/invalid input syntax for type date/i, "Tarih biçimi hatalı. Lütfen tarih alanını takvimden seç."],
  [/invalid input syntax for type (integer|numeric)/i, "Sayı alanına geçersiz bir değer girildi. Lütfen yalnızca rakam kullan."],
  [/invalid input syntax for type uuid/i, "Geçersiz kayıt kimliği. Sayfayı yenileyip tekrar dene."],
  [/value too long/i, "Girilen değer çok uzun. Lütfen kısalt."],

  // ---- Tablo / kolon ----
  [/(relation|table).*(does not exist)/i, "Veritabanı tablosu bulunamadı. Supabase'de schema.sql'in güncel sürümünün çalıştırıldığından emin ol."],
  [/column.*does not exist/i, "Veritabanı sütunu bulunamadı. Supabase şeması ile uygulama sürümü uyumsuz olabilir — SQL güncellemelerini çalıştır."],

  // ---- Ağ ----
  [/failed to fetch|networkerror|network request failed|load failed|fetch failed/i,
    "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene."],
  [/timeout/i, "İstek zaman aşımına uğradı. Lütfen tekrar dene."],
];

export function hataCevir(hata: HataGibi): string {
  const mesaj =
    typeof hata === "string" ? hata : hata?.message || "";

  if (!mesaj) return "Beklenmeyen bir hata oluştu. Lütfen tekrar dene.";

  for (const [kalip, turkce] of KALIPLAR) {
    if (kalip.test(mesaj)) return turkce;
  }

  // Listede yok → yine de Türkçe konuş, teknik detayı nota düşür.
  return `İşlem tamamlanamadı. Lütfen tekrar dene. (Teknik detay: ${mesaj})`;
}
