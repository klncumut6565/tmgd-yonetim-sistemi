// src/lib/aracEvrakStatik.ts
//
// Araç Evrakı Oluşturma özelliğinde TÜM araçlarda/firmalarda ORTAK olan,
// hiçbir firmaya/araca özel veri İÇERMEYEN jenerik ADR referans içeriği.
// Kullanıcı talebi: "Yazılı Talimat örneği ve ADR Çantası İçeriği görselleri
// tüm evraklarda ortaktır, onlar için ekstra bir şey yapma" — bu yüzden bu
// içerik veritabanında saklanmaz, yüklenmez; doğrudan burada sabit olarak
// tanımlanır ve her araç evrakı PDF'ine otomatik eklenir.
//
// KAYNAK: Kullanıcının paylaştığı örnek "Araç Evrakları" PDF'indeki Ek-6
// (Yazılı Talimat) ve Ek-8 (ADR Çantası İçeriği) bölümleri — İÇERİK metni
// ve tablo/ikon görselleri birebir korunmuştur. Örnek belgedeki "Yağız
// Nakliyat" firma logosu görsellerden temizlenmiştir (bu içerik SİSTEMDEKİ
// TÜM firmalar için ortak kullanılacağından, belirli bir firmanın markasını
// içeremez).

/** Ek-6 Yazılı Talimat'ın metin kısmı — ADR Bölüm 5.4.3 uyarınca araç
 *  ekibine yönelik kaza/acil durum talimatları. Görsel değil, gerçek metin
 *  olarak (LiberationSans ile) basılır — okunabilirlik ve arşivde
 *  aranabilirlik için. */
export const YAZILI_TALIMAT_BASLIK = "ADR'YE GÖRE YAZILI TALİMATLAR";
export const YAZILI_TALIMAT_ALT_BASLIK = "Kaza veya acil durum halinde alınacak tedbirler";
export const YAZILI_TALIMAT_GIRIS =
  "Taşıma esnasında oluşabilecek bir kaza veya acil durumda, araç ekibi tarafından güvenli ve elverişli bir yerde aşağıdaki eylemlerin yapılması gerekir:";

export const YAZILI_TALIMAT_MADDELERI = [
  "Fren sistemini devreye sokunuz, motoru durdurunuz ve mümkün ise ana şalter kesiciyi kullanarak aküyü devre dışı bırakınız;",
  "Ateşleme kaynaklarından kaçının, özellikle, sigara içmeyin, elektronik sigara ya da benzeri cihazlar kullanmayın veya herhangi bir elektrikli donanımı açmayınız;",
  "Olay, kaza veya taşınan madde ile ilgili mümkün olduğunca çok bilgi vermeye çalışarak uygun acil yardım hizmetlerini arayınız;",
  "Uyarı yeleği giyiniz ve uygun bir şekilde ikaz işaretlerini yerleştiriniz;",
  "Müdahale ekiplerine vermek amacıyla taşıma evraklarını hazırda bulundurunuz;",
  "Dökülen maddelerin üzerinde yürümeyiniz veya dokunmayınız. Üzerinize rüzgarla gelen havaya karışmış olabilecek gazı, dumanı, tozu, buharı solumaktan kaçınınız;",
  "Uygun ve güvenli olduğunda, lastik, fren ve motor bölümlerindeki ufak ve başlangıç yangınlarını söndürmek için yangın söndürücü kullanınız.",
  "Araç ekibi, yük bölümündeki yangınların üstesinden gelmeye çalışmamalıdır.",
  "İlgili durumlarda ve güvenliyse, taşınan tehlikeli maddelerin sulu ortama veya kanalizasyon sistemine karışmasını önlemek ve dökülenleri toplamak için taşıtta bulunan donanımı kullanınız.",
  "Kazanın veya acil durumun gerçekleştiği ortamdan uzaklaşınız; olay mahallinde bulunan insanları da uzaklaşmaları ve acil yardım ekibinin talimatlarına uymaları konusunda uyarınız.",
  "Tehlikeli madde ile temas etmiş olan kıyafetlerinizi ve tehlikeli maddelerle temas etmiş kullanılmış koruyucu donanımı üzerinizden çıkarın ve güvenli bir şekilde imha ediniz.",
];

/** Ek-6'nın devamı (tehlike sınıfı/etiket/talimat tabloları) — pikogramlar
 *  içerdiği için metin değil, görsel olarak eklenir (public/ altında). */
export const YAZILI_TALIMAT_TABLO_GORSELLERI = [
  "/arac-evrak-statik/yazili-talimat-2.jpg",
  "/arac-evrak-statik/yazili-talimat-3.jpg",
  "/arac-evrak-statik/yazili-talimat-4.jpg",
];

/** Ek-8 ADR Çantası İçeriği — tek sayfalık ekipman özet görseli. */
export const ADR_CANTA_ICERIGI_GORSELI = "/arac-evrak-statik/adr-canta-icerigi.jpg";
