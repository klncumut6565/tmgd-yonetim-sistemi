// BELGE ŞABLONLARI — gerçek TMGDK belgelerinden (kullanıcı tarafından
// yüklenen örnekler) yararlanılarak genelleştirilmiş içerik kütüphanesi.
//
// Her kod için: doküman türü + yapılandırılmış içerik blokları (Amaç,
// Kapsam, Tanımlar, numaralı/madde işaretli bölümler). PDF üretici
// (BelgeOlusturForm.tsx) bu şablonu bulursa zengin, çok sayfalı bir belge
// üretir; bulamazsa eski basit/boş çerçeveli formata döner.
//
// NOT: Şablonu olmayan kodlar için de zamanla buraya ekleme yapılacak —
// bu, kapsamı aşamalı büyüyen canlı bir kütüphanedir.

export type TemplateBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; text: string }
  | { type: "bullet"; items: string[] }
  | { type: "numbered"; items: string[] };

export type BelgeSablonu = {
  docType: "PROSEDÜR" | "TALİMAT" | "KONTROL FORMU" | "LİSTE";
  yayinTarihi: string; // sabit ilk yayın tarihi (revizyon tarihi = belge oluşturma tarihi olarak basılır)
  amac?: string;
  kapsam?: string;
  tanimlar?: { terim: string; tanim: string }[];
  blocks: TemplateBlock[];
};

export const BELGE_SABLONLARI: Record<string, BelgeSablonu> = {
  // ============================= P1 — ALICI PROSEDÜRÜ =============================
  P1: {
    docType: "PROSEDÜR",
    yayinTarihi: "01.01.2020",
    amac: "Bu prosedür, ADR kapsamında tehlikeli maddelerin alıcı firma tarafından güvenli ve düzenli bir şekilde teslim alınmasını, depolanmasını ve işlenmesini sağlamak amacıyla hazırlanmıştır.",
    kapsam: "Bu prosedür, ADR kapsamında taşınan tehlikeli maddelerin alıcı firmaya ulaştığı andan itibaren geçerlidir ve tüm ilgili personel tarafından uygulanmalıdır.",
    blocks: [
      { type: "subheading", text: "3.1. Teslimat Kontrolü" },
      { type: "subheading", text: "a) Yükün Kabul Edilmeme Kriterleri" },
      { type: "paragraph", text: "Teslim alınacak yüklerde aşağıdaki durumlar tespit edilirse, yük tesise kabul edilmez:" },
      { type: "numbered", items: [
        "Yanlış veya Eksik Etiketleme: ADR'ye uygun işaretleme ve etiketleme yapılmamışsa.",
        "Ambalajlama Problemleri: Ambalajda yırtılma, sızıntı, fiziksel hasar veya uygunluk belgesinin bulunmaması.",
        "Uygun Dokümanların Eksikliği: ADR taşıma evrakları, güvenlik bilgi formları (GBF/SDS) eksikse veya hatalı düzenlenmişse.",
        "Araç ve Ekipman Eksiklikleri: Taşıma araçlarının ADR'ye uygun olmaması, güvenlik ekipmanlarının eksik olması.",
        "Yükün Taşımaya Uygun Olmaması: Yanıcı, patlayıcı, toksik maddelerin taşımaya uygun şekilde hazırlanmadığı durumlar.",
        "Taşıma Zinciri Uygunsuzluğu: Nakliyat sırasında zincirleme bir risk oluşturabilecek kusurlar veya standart dışı uygulamalar.",
      ]},
      { type: "subheading", text: "b) Yükün Kabul Edilme Kriterleri" },
      { type: "bullet", items: [
        "Etiketleme ve İşaretleme: Her tehlikeli madde uygun ADR sınıfına göre doğru şekilde etiketlenmeli.",
        "Ambalaj Uygunluğu: Ambalajlar, ADR'ye uygun şekilde tasarlanmalı ve hasarsız olmalı.",
        "Gerekli Dokümanlar: ADR taşıma evrakları, sürücünün eğitim belgeleri, taşımaya uygunluk sertifikaları tam olmalı.",
        "Araç Kontrolü: Araçlar ADR taşıma şartlarına uygun olmalı, uygun yangın söndürücü ve diğer ekipmanlarla donatılmalı.",
      ]},
      { type: "subheading", text: "c) Diğer Durumlar" },
      { type: "bullet", items: [
        "Tehlikeli maddelerin konteyner ile taşındığı durumlarda, ADR hükümlerinin ihlal edildiği tespit edilirse, konteyner ihlal giderildikten sonra teslim alınır.",
        "İhlalin giderilmesi için gerekli işlemler hızlıca gerçekleştirilir ve ilgili mercilere bilgi verilir.",
      ]},
      { type: "subheading", text: "3.2. Depolama ve Güvenlik Önlemleri" },
      { type: "bullet", items: [
        "Tehlikeli maddeler, İSG yönetmeliklerine uygun olarak belirlenmiş alanlarda depolanır.",
        "Depolama alanının fiziksel güvenlik şartları sağlanır ve düzenli olarak denetlenir.",
        "Yanıcı, patlayıcı ve diğer tehlikeli maddeler ayrı ve uygun alanlarda depolanır.",
        "Taşıtlardan boşaltma yapıldığı sırada taşıtların yakın çevresinde ateş yakılmasına, açık ışıklandırma yapılmasına ve sigara içilmesine izin verilmez.",
        "Kıvılcım çıkma özelliğine sahip cisimler bulundurulmaz.",
        "Yangın söndürücüler ve diğer acil durum ekipmanları her zaman hazır bulundurulur.",
        "Boşaltma alanında uygun uyarı işaretleri bulundurulur.",
      ]},
      { type: "subheading", text: "3.3. Eğitim ve Bilgilendirme" },
      { type: "bullet", items: [
        "İlgili personel, ADR kapsamında tehlikeli maddelerle ilgili gerekli eğitimleri alır.",
        "Personele, tehlikeli maddelerin güvenli taşınması, depolanması ve kullanımı hakkında düzenli bilgilendirmeler yapılır.",
        "Yeni personel, işe başlamadan önce gerekli eğitimleri tamamlamalıdır.",
      ]},
      { type: "subheading", text: "3.4. Acil Durum Hazırlıkları ve Atık Yönetimi" },
      { type: "bullet", items: [
        "Tehlikeli maddelerle ilgili acil durum planları ve talimatları oluşturulur ve duyurulur.",
        "İlk yardım malzemeleri ve acil durum ekipmanlarının düzenli kontrolü yapılır ve güncel tutulur.",
        "Tehlikeli maddelerin atık yönetimi prosedürlerine uygun olarak bertaraf edilmesi sağlanır; lisanslı ve yetkili firmalarla çalışılır.",
      ]},
      { type: "subheading", text: "3.5. Kayıt Tutma ve Yasal Uyumluluk" },
      { type: "bullet", items: [
        "Teslim alınan tehlikeli maddelerle ilgili tüm kayıtlar tutulur ve arşivlenir.",
        "Güvenlik bilgi formları (SDS) ve diğer belgeler düzenli olarak güncellenir.",
        "ADR ve diğer ilgili yasal düzenlemelere uyum sağlanır; düzenli iç denetimlerle kontrol edilir.",
      ]},
    ],
  },

  // ============================= P2 — BOŞALTAN PROSEDÜRÜ =============================
  P2: {
    docType: "PROSEDÜR",
    yayinTarihi: "01.01.2020",
    amac: "Bu prosedür, tehlikeli maddelerin karayolu ile taşınması ve boşaltılması sırasında güvenlik, çevre koruma ve iş sağlığı güvenliği önlemlerini belirlemek ve uygun işlem adımlarını tanımlamaktadır. Bu prosedür, ADR ve Tehlikeli Maddelerin Karayoluyla Taşınması Hakkında Yönetmelik hükümlerine dayanmaktadır.",
    kapsam: "Ambalajlı, dökme ve tank yüklerinin taşındığı taşıtlar, tanklar, konteynerler ve diğer taşıma araçları için geçerlidir.",
    tanimlar: [
      { terim: "Ambalajlı Yük", tanim: "Tehlikeli maddelerin, ADR hükümlerine uygun kaplar veya ambalajlar içinde taşınması." },
      { terim: "Dökme Yük", tanim: "Kaplama olmadan, genellikle tank veya benzeri taşıma araçlarıyla taşınan tehlikeli maddeler." },
      { terim: "Tank Yük", tanim: "Tanker veya tank konteyner ile taşınan tehlikeli maddeler." },
    ],
    blocks: [
      { type: "subheading", text: "1. Boşaltma Öncesi Hazırlıklar" },
      { type: "numbered", items: [
        "Tehlikeli Madde Tanımlaması ve Risk Analizi: Taşınan tehlikeli maddenin sınıfı ve risk özellikleri belirlenmelidir.",
        "Taşıma Belgelerinin ve Etiketlemenin Kontrolü: Taşıma belgeleri ve etiketler kontrol edilmelidir.",
        "Eğitim ve Personel Hazırlığı: Boşaltma işlemine katılacak tüm personel, ilgili düzenlemelere uygun eğitim almalıdır.",
        "Güvenlik Ekipmanlarının Kontrolü: Yangın söndürücüler, gaz dedektörleri ve koruyucu ekipmanlar kontrol edilmelidir.",
        "Boşaltma Alanının Hazırlığı: Alanın çevresel etkilerden korunmuş, yeterli havalandırma sağlanmış olması gerekmektedir.",
      ]},
      { type: "subheading", text: "2. Boşaltma Sırasında Alınacak Güvenlik Önlemleri" },
      { type: "numbered", items: [
        "Acil Durum Planı: Sızıntı veya kaza durumlarında devreye girecek bir acil durum planı hazırlanmalıdır.",
        "Yangın ve Patlama Öncesi/Sırasındaki Önlemler: Yangın söndürücüler ve diğer güvenlik önlemleri yeterli sayıda ve yerinde olmalıdır.",
        "Boşaltma Süreci İzleme ve Denetim: Boşaltma işlemi sırasında, sızıntı veya gaz salınımı olup olmadığı sürekli izlenmelidir.",
        "Çevresel Güvenlik Önlemleri: Tehlikeli madde sızıntılarının çevreye yayılmasını engelleyecek önlemler alınmalıdır.",
        "İzole Alan ve Çalışan Güvenliği: Çalışanlar kişisel koruyucu ekipmanları kullanmalı, boşaltma alanı izole edilmelidir.",
      ]},
      { type: "subheading", text: "3. Boşaltma Sonrası Yapılması Gereken İşlemler" },
      { type: "numbered", items: [
        "Alan Temizliği ve Sızıntı Kontrolü: Boşaltma sonrası alan temizlenmeli, herhangi bir kimyasal kalıntı olup olmadığı kontrol edilmelidir.",
        "Acil Durum Ekipmanlarının Kontrolü: Yangın söndürücüler ve gaz maskeleri gibi acil durum ekipmanları kontrol edilmelidir.",
        "Kişisel Koruyucu Ekipmanların Temizliği: Çalışanların kullandığı koruyucu ekipmanlar temizlenmelidir.",
        "Çevresel ve Sağlık Kontrolleri: Kimyasal maddelere maruz kalan personel için takipler yapılmalıdır.",
        "Raporlama ve Kayıt Tutma: Boşaltma işlemi ve alınan güvenlik önlemleri kaydedilmelidir.",
      ]},
      { type: "subheading", text: "4. Yasal Yükümlülükler ve Boşaltma Sürecindeki Özel Kontroller" },
      { type: "bullet", items: [
        "Tehlikeli maddelere dair taşınan belgeler, etiketleme ve düzenlemelere uygunluk sağlanmalıdır.",
        "Taşıma araçları, ADR ve Tehlikeli Maddelerin Karayoluyla Taşınması Hakkında Yönetmelik'e uygun olmalıdır.",
        "Boşaltma öncesi ve sırasında tespit edilen her tür tahribata karşı derhal gerekli önlemler alınmalı ve boşaltma işlemini tehlikeye sokacak bir tahribat olup olmadığının kontrolüne dair bir doküman bulundurulmalıdır.",
        "Kullanılan taşıt ve konteynerlerin ADR hükümleri çerçevesinde temizlik ve dezenfekte edilmesi sağlanmalıdır.",
        "Konteyner tamamen boşaltıldıktan ve temizlendikten sonra, ADR Bölüm 5.3 kapsamındaki tehlike ikaz levhalarının kaldırılması gerekir.",
      ]},
    ],
  },

  // ========================= P3 — SEVKİYAT UYGUNLUK KONTROL PROSEDÜRÜ =========================
  P3: {
    docType: "PROSEDÜR",
    yayinTarihi: "01.11.2024",
    amac: "Bu prosedürün amacı, işletmenin iştigal ettiği tehlikeli maddelerin sevkiyatı sırasında uyulması gereken tüm düzenlemeleri tanımlamak, güvenli ve yasalara uygun taşımacılığı sağlamak, çevre ve insan sağlığı üzerindeki riskleri en aza indirmektir.",
    kapsam: "Bu prosedür; tehlikeli maddelerin sevkiyatı için kullanılan taşıt, ambalaj ve yük taşıma birimlerini, taşıma araçlarının uygunluk belgeleri ve test/muayene süreçlerini, işaretleme/etiketleme/levha zorunluluklarını, karışık ambalajlama ve yükleme kurallarını, tehlikeli maddelerin tanımlama ve sınıflandırma yöntemlerini kapsar.",
    tanimlar: [
      { terim: "Gönderen", tanim: "Kendi adına veya bir üçüncü şahıs adına tehlikeli maddeleri sevk eden işletmeyi veya taşıma sözleşmesinde \"Gönderen\" olarak belirtilen kişidir." },
      { terim: "Taşıma Evrakı", tanim: "ADR Bölüm 5.4.1'deki bilgileri içerecek şekilde gönderen tarafından düzenlenmiş belgedir." },
      { terim: "Taşımacı", tanim: "Karayolu Taşıma Yönetmeliğine göre C1, C2, K1, K2, L1, L2, M1, M2, N1, N2, P1 ve P2 yetki belgesi sahiplerini ve tehlikeli madde taşımacılığı yapan kamu kurum/kuruluşlarını ifade eder." },
      { terim: "ADR/Taşıt Uygunluk Belgesi", tanim: "ADR'ye uygun taşıma araçları için düzenlenen belgedir." },
    ],
    blocks: [
      { type: "subheading", text: "5.1. Taşıt ve Yük Taşıma Birimlerinin Kontrolleri" },
      { type: "bullet", items: [
        "Sevkiyat yapılacak araçların ADR'ye uygunluk belgeleri düzenli olarak kontrol edilir; belgeleri eksik veya geçerliliği dolmuş araçlarla sevkiyat yapılmaz.",
        "Tanker, konteyner ve taşıma ekipmanlarının periyodik muayeneleri ADR standartlarına göre yapılır; sızdırmazlık, basınç ve dayanıklılık testleri belgelenir ve saklanır.",
        "Palet, konteyner ve diğer birimlerin mekanik dayanıklılığı kontrol edilir; hasarlı veya yetersiz taşıma birimleri kullanılmaz.",
      ]},
      { type: "subheading", text: "5.2. Ambalajların Uygunluk Kontrolleri" },
      { type: "bullet", items: [
        "Sevkiyat için kullanılacak ambalajların UN sertifikalı olduğundan emin olunur; sertifikasız veya standart dışı ambalajlar reddedilir.",
        "Kimyasal ve fiziksel dayanıklılık testleri periyodik olarak yapılır; kırılgan ve tehlikeli maddeler için özel ambalajlama kurallarına uyulur.",
      ]},
      { type: "subheading", text: "5.3. Dolumu Yapılan Taşınabilir Basınçlı Kapların Kontrolü" },
      { type: "bullet", items: [
        "Basınçlı kapların son muayene tarihleri kontrol edilir; ADR'ye uygun olmayan kapların dolumu yapılmaz.",
        "Kapların periyodik basınç testleri yapılır ve belgelenir; sızdırmazlık ve güvenlik kontrolleri sevkiyattan önce tamamlanır.",
      ]},
      { type: "subheading", text: "5.4. İşaretleme, Etiketleme ve Levha Zorunlulukları" },
      { type: "bullet", items: [
        "Her ambalajın ve taşıma biriminin üzerinde uygun sınıf etiketi ve UN numarası bulunmalıdır.",
        "Taşıma araçlarının ön, arka ve yanlarında ADR standartlarına uygun levhalar yer alır; levhaların zarar görmesi durumunda hemen yenisi takılır.",
      ]},
      { type: "subheading", text: "5.5. Karışık Ambalajlama ve Yükleme Kuralları" },
      { type: "bullet", items: [
        "Farklı sınıflardaki tehlikeli maddeler, uyumluluk tablolarına göre bir arada taşınır; birbirine tepki verebilecek maddelerin karışık taşınmasına izin verilmez.",
        "Maddeler fiziksel özellikleri göz önüne alınarak taşınır (örn. sıvılar sızıntı ihtimaline karşı alta yerleştirilir); uygunsuz yükleme durumunda sevkiyat yapılmaz.",
      ]},
      { type: "subheading", text: "5.6. Tehlikeli Maddelerin Sınıflandırılması ve Tanımlanması" },
      { type: "bullet", items: [
        "Maddeler ADR'ye uygun şekilde UN numarası ve sınıf kodu ile tanımlanır; kimyasal yapısı ve tehlike özellikleri dikkate alınır.",
        "Her tehlikeli madde için güvenlik bilgi formu (SDS) hazırlanır ve tüm sevkiyat sürecinde erişilebilir hale getirilir.",
        "Çalışanlar, tehlikeli maddelerin sınıflandırılması ve taşınması konusunda düzenli olarak eğitilir.",
      ]},
      { type: "subheading", text: "6. Kayıtlar" },
      { type: "bullet", items: [
        "Araç ve ekipman muayene kayıtları, ambalaj ve yük taşıma birimi uygunluk belgeleri, işaretleme/etiketleme kontrol listeleri, test ve muayene raporları düzenli tutulur ve en az 5 yıl saklanır.",
      ]},
    ],
  },

  // ==================== P4 — TEHLİKELİ MADDE TANIMLAMA VE SINIFLANDIRMA PROSEDÜRÜ ====================
  P4: {
    docType: "PROSEDÜR",
    yayinTarihi: "01.11.2024",
    amac: "Bu prosedür, işletme tarafından taşınacak veya sevk edilecek tehlikeli maddelerin ADR ve Tehlikeli Maddelerin Karayoluyla Taşınması Hakkında Yönetmelik hükümlerine uygun olarak doğru bir şekilde tanımlanması ve sınıflandırılması için izlenecek yöntemleri belirler.",
    kapsam: "Bu prosedür; işletme bünyesinde bulunan veya sevkiyatı yapılacak tehlikeli maddelerin tanımlanması, UN numarasının belirlenmesi, tehlike sınıfı/ambalaj grubu/uygun taşımacılık kategorisinin atanması ve ADR kapsamındaki belgelerinin hazırlanması işlemlerini kapsar.",
    tanimlar: [
      { terim: "Tehlikeli Madde", tanim: "İnsan sağlığına, çevreye veya mülke zarar verebilecek fiziksel, kimyasal veya biyolojik özelliklere sahip maddeler." },
      { terim: "Ambalaj Grubu (PG)", tanim: "Maddenin tehlike seviyesine göre sınıflandırılması: PG I (Yüksek), PG II (Orta), PG III (Düşük)." },
      { terim: "Tehlike Sınıfı", tanim: "Maddenin özelliklerine göre ADR'de belirlenen 1'den 9'a kadar olan sınıflandırma." },
    ],
    blocks: [
      { type: "subheading", text: "4.1. Tanımlama Süreci" },
      { type: "bullet", items: [
        "Madde Bilgilerinin Toplanması: Maddenin kimyasal adı, ticari adı, formülasyonu, fiziksel hali, konsantrasyonu gibi bilgiler Güvenlik Bilgi Formundan (SDS) alınır; patlama, yanıcılık, toksisite ve reaktivite gibi özellikleri değerlendirilir.",
        "SDS İncelemesi: Kimyasal bileşenler, tehlike sınıflandırması ve taşıma bilgileri (ADR sınıfı, UN numarası, ambalaj grubu) doğrulanır.",
        "UN Numarasının Belirlenmesi: ADR Bölüm 3.2'deki Tehlikeli Maddeler Listesi kullanılarak uygun UN numarası seçilir. Listede bulunmayan maddeler için fiziksel hali ve tehlike potansiyeli değerlendirilerek ADR Bölüm 2'deki kriterlere göre sınıf ve UN numarası atanır.",
      ]},
      { type: "subheading", text: "4.2. Sınıflandırma Süreci" },
      { type: "paragraph", text: "Maddenin fiziksel, kimyasal ve biyolojik özellikleri dikkate alınarak aşağıdaki ADR sınıflarından biri atanır:" },
      { type: "numbered", items: [
        "Sınıf: Patlayıcılar", "Sınıf: Gazlar", "Sınıf: Yanıcı sıvılar",
        "Sınıf: Yanıcı katılar, kendiliğinden tutuşan maddeler",
        "Sınıf: Oksitleyici maddeler ve organik peroksitler",
        "Sınıf: Zehirli ve bulaşıcı maddeler", "Sınıf: Radyoaktif maddeler",
        "Sınıf: Aşındırıcı maddeler", "Sınıf: Diğer tehlikeli maddeler",
      ]},
      { type: "paragraph", text: "Ambalaj grubu, maddenin taşınma sırasında çevreye veya insanlara olan zarar potansiyeli dikkate alınarak belirlenir (PG I/II/III). Uygun taşıma kategorisi (0, 1, 2 veya 3) ADR'de belirtilen kısıtlamalar dikkate alınarak seçilir." },
      { type: "subheading", text: "4.3. Belgeleme ve Doğrulama" },
      { type: "bullet", items: [
        "Tanımlama ve sınıflandırma sonrası, maddenin ADR standartlarına uygunluğu kontrol edilir; eksik bilgi veya uyumsuzluk varsa düzeltmeler yapılır.",
        "Güvenlik Bilgi Formu (SDS), Tehlikeli Madde Sınıfı ve UN numarasını içeren Taşıma Evrakı hazırlanır.",
      ]},
      { type: "subheading", text: "5. Dikkat Edilecek Hususlar" },
      { type: "bullet", items: [
        "Tanımlama ve sınıflandırma yalnızca yetkili ve uzman kişiler tarafından yapılmalıdır.",
        "Hatalı sınıflandırma, taşıma sırasında ciddi risklere ve yasal sorumluluklara yol açabileceğinden doğruluk mutlaka kontrol edilmelidir.",
        "İlgili tüm belgeler düzenli olarak güncellenmeli ve en az 5 yıl saklanmalıdır.",
      ]},
      { type: "subheading", text: "6. Eğitim ve Yetkilendirme" },
      { type: "paragraph", text: "Tanımlama ve sınıflandırma süreçlerini yürüten personel, ADR ve Tehlikeli Madde Yönetmeliği hakkında düzenli eğitim almalı; eğitimlerin ardından yetki belgesi düzenlenerek süreçlerin yalnızca yetkilendirilmiş kişilerce gerçekleştirilmesi sağlanmalıdır." },
    ],
  },

  // ============================= T1 — ALICI (BOŞALTMA) TALİMATI =============================
  T1: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, tehlikeli maddelerin ADR Sözleşmesi ve Türkiye Cumhuriyeti Tehlikeli Maddelerin Karayoluyla Taşınması Yönetmeliği hükümlerine uygun şekilde, güvenli ve çevreye zarar vermeden boşaltılmasını sağlamak için gereken prosedürleri belirler.",
    kapsam: "Bu talimat, ADR kapsamında taşınan ambalajlı, dökme ve tank konteynerler içindeki tehlikeli maddelerin boşaltılması işlemlerinde uygulanır.",
    tanimlar: [
      { terim: "Ambalajlı Yük", tanim: "Tehlikeli maddelerin, ADR hükümlerine uygun kaplar veya ambalajlar içinde taşınması." },
      { terim: "Dökme Yük", tanim: "Kaplama olmadan tank veya benzeri taşıma araçlarıyla taşınan tehlikeli maddeler." },
      { terim: "Tank Yük", tanim: "Tanker veya tank konteyner ile taşınan tehlikeli maddeler." },
    ],
    blocks: [
      { type: "subheading", text: "4. Genel Kurallar" },
      { type: "numbered", items: [
        "Yetkilendirme ve Eğitim: Tüm personel ADR eğitimi almış ve sertifikalandırılmış olmalıdır. Boşaltma işlemlerini gerçekleştirecek personel yetkilendirilmelidir.",
        "Alan ve Ekipman Kontrolü: Boşaltma alanı güvenli, stabilize edilmiş ve ADR standartlarına uygun şekilde işaretlenmiş olmalıdır. Boşaltma ekipmanları tehlikeli maddenin türüne uygun olmalı ve sızdırmazlık kontrolünden geçirilmelidir.",
        "Koruyucu Ekipman Kullanımı: Boşaltma sırasında kişisel koruyucu ekipman (KKD) kullanılmalıdır — kimyasal dayanıklı eldivenler, koruyucu gözlük/yüz siperi, kimyasal koruma giysisi, solunum koruma cihazı.",
        "Belge ve Etiket Kontrolü: Taşınan maddenin ADR'ye uygun şekilde etiketlendiği ve taşıma evraklarının eksiksiz olduğu doğrulanmalıdır. Yükün tehlike sınıfı, UN numarası ve diğer bilgileri kontrol edilmelidir.",
      ]},
      { type: "subheading", text: "5. Ambalajlı Yüklerin Boşaltılması" },
      { type: "numbered", items: [
        "Boşaltma Alanı Hazırlığı: Ambalajlı yükler sadece stabilize ve güvenli yüzeylerde boşaltılmalıdır.",
        "Ambalaj Kontrolü: Yükleme alanında ambalajların sağlamlığı kontrol edilmelidir. Hasar görmüş ambalajlar tespit edilirse işlem durdurulmalı ve sorumlu kişi bilgilendirilmelidir.",
        "Elleçleme: Ambalajlar taşınırken darbelerden ve düşmelerden korunmalıdır; ani hareketlerden kaçınılmalıdır.",
        "Boşaltma İşlemi: Maddeler güvenli bir şekilde istiflenmeli ve ADR'ye uygun uyarı etiketlerinin görünür kalması sağlanmalıdır.",
      ]},
      { type: "subheading", text: "6. Tank ve Dökme Yüklerin Boşaltılması" },
      { type: "numbered", items: [
        "Tanker Araçlarının Konumu: Tankerler park freni çekilmiş ve tekerlek takozları yerleştirilmiş şekilde sabitlenmelidir. Tankın basıncı, boşaltmadan önce dikkatlice ölçülmeli ve güvenli seviyeye indirilmelidir.",
        "Boşaltma Sistemi Kontrolü: Hortum bağlantıları sıkıca yapılmalı ve sızdırmazlık testi yapılmalıdır.",
        "Dökme Yüklerin Elleçlenmesi: Dökme yükler için uygun ekipman kullanılmalıdır; boşaltılacak tank/konteynerlerin ADR uygunluğu kontrol edilmelidir.",
      ]},
      { type: "subheading", text: "7. Acil Durum Yönetimi" },
      { type: "bullet", items: [
        "Dökülme Durumları: Dökülen tehlikeli maddeye uygun absorbanlar kullanılarak müdahale edilmelidir; alan temizliği tamamlanana kadar diğer işlemler durdurulmalıdır.",
        "Yangın ve Patlama Riskleri: Yangın durumunda ADR tarafından belirtilen uygun söndürme ekipmanları kullanılmalıdır.",
        "Kirlilik Önlemleri: Kirlenmiş ekipman ve alan derhal temizlenmelidir; çevresel etkileri azaltmak için uygun atık bertaraf prosedürleri uygulanmalıdır.",
      ]},
    ],
  },

  // ==================== T2 — BOŞALTMA SONRASI ARINDIRMA / KAPATMA KONTROL TALİMATI ====================
  T2: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, ambalajlı, dökme ve tank yükleriyle taşınan tehlikeli maddelerin boşaltılmasından sonra taşıt, tank veya konteynerin temizlenmesi, dezenfekte edilmesi ve güvenli bir şekilde kontrol edilmesi işlemlerini düzenler.",
    kapsam: "Ambalajlı, dökme ve tank yüklerinin taşındığı taşıtlar, tanklar, konteynerler ve diğer taşıma araçları için geçerlidir.",
    blocks: [
      { type: "subheading", text: "1. Temizlik ve Dezenfekte İşlemleri" },
      { type: "bullet", items: [
        "Boşaltma işlemi sonrasında, taşıt, tank veya konteynerin iç yüzeyleri, taşınan tehlikeli maddeye uygun şekilde temizlenmeli ve dezenfekte edilmelidir.",
        "Ambalajlı, dökme ve tank yükleri için temizlik, ADR ve yerel yönetmeliklere uygun şekilde yapılmalı ve her tür madde için özel temizlik gereksinimlerine dikkat edilmelidir.",
        "Ambalajlı yüklerde, taşıma sırasında kalabilecek kimyasal kalıntıların tamamen temizlenmesi sağlanmalıdır. Dökme yüklerde tankların iç yüzeyleri dikkatlice temizlenmelidir.",
        "Tank yükleri için, taşınan tehlikeli maddeye uygun tank temizliği ve dezenfeksiyon işlemi yapılmalıdır.",
      ]},
      { type: "subheading", text: "1.2. Temizlik İçin Kullanılan Ekipman" },
      { type: "bullet", items: [
        "Temizlikte kullanılan tüm ekipmanlar ADR ve yerel yönetmeliklere uygun olmalıdır.",
        "Temizlik sonrası ekipmanlar da aynı şekilde temizlenmeli ve dezenfekte edilmelidir.",
      ]},
      { type: "subheading", text: "1.3. Temizlik Sonrası Kontrol" },
      { type: "bullet", items: [
        "Temizlik ve dezenfekte işlemi tamamlandıktan sonra, taşıt veya konteynerin iç yüzeyleri kontrol edilmeli ve kimyasal kalıntılar veya kirlilik olup olmadığı tespit edilmelidir.",
        "Tank, taşıt veya konteynerde kalan herhangi bir tehlikeli madde kalıntısı bulunmamalıdır.",
      ]},
      { type: "subheading", text: "2.4. Temizlik Sonrası Kontrol ve Onay" },
      { type: "bullet", items: [
        "Temizlik işlemi sonrası, taşıt, tank veya konteynerde herhangi bir kimyasal kalıntı olmadığından emin olunmalıdır.",
        "Vanalar ve kontrol/doldurma kapakları güvenli bir şekilde kapatılmalı ve herhangi bir sızıntı riski olup olmadığı kontrol edilmelidir.",
      ]},
    ],
  },

  // ==================== T3 — TAŞIT/KONTEYNER TEMİZLİK VE DEZENFEKSİYON + TAHRİBAT KONTROLÜ ====================
  T3: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, ambalajlı, dökme ve tank yükleriyle taşınan tehlikeli maddelerin boşaltılmasından sonra taşıt/konteynerin tahribat kontrolü ile temizlik ve güvenlik önlemlerinin alınmasını düzenler.",
    kapsam: "Ambalajlı, dökme ve tank yüklerinin taşındığı taşıtlar, tanklar, konteynerler ve diğer taşıma araçları için geçerlidir.",
    blocks: [
      { type: "subheading", text: "2.1. Boşaltma Öncesi Kontroller" },
      { type: "bullet", items: [
        "Taşıt, tank veya konteynerin dış yüzeylerinde herhangi bir tahribat (çatlak, delik, deformasyon vb.) olup olmadığı kontrol edilmelidir.",
        "Tahribat varsa, taşıma aracının kullanılmadan önce onarılması veya güvenli bir şekilde değiştirilmesi sağlanmalıdır.",
        "Ambalajlı, dökme ve tank yükleri için her tür tahribat, taşıma işlemi güvenliğini riske atacağından derhal tespit edilip raporlanmalıdır.",
        "Tahribat tespit edilirse, boşaltma işlemi durdurulmalı ve ilgili güvenlik önlemleri alınmalıdır.",
      ]},
      { type: "subheading", text: "2.2. Boşaltma Sırasında Kontroller" },
      { type: "bullet", items: [
        "Boşaltma işlemi sırasında sızıntı, delik veya tahribat gibi güvenlik riski taşıyan durumların oluşup oluşmadığı sürekli kontrol edilmelidir.",
        "Ambalajlı yüklerde paketlerin hasar görüp görmediği kontrol edilmeli, dökme yüklerde tank veya taşıma araçlarında sızıntı olup olmadığı izlenmelidir.",
        "Tahribat, sızıntı veya başka bir güvenlik riski tespit edildiğinde, işlem derhal durdurulmalı ve güvenlik önlemleri alınmalıdır.",
      ]},
      { type: "subheading", text: "2.3. Tahribat Durumunda Alınacak Önlemler" },
      { type: "bullet", items: [
        "Tahribat tespit edilirse, güvenli bir şekilde onarım yapılmalı veya taşıma aracı değiştirilmelidir.",
        "Ambalajlı yüklerde, taşıma paketinin hasar görmesi durumunda yeni bir paketleme yapılmalı; dökme yüklerde sızıntı olan tank/taşıma aracı tamir edilmelidir.",
        "Tank yüklerinde, oluşabilecek herhangi bir sızıntı veya hasar için uygun sızıntı öncesi ve sonrası güvenlik önlemleri alınmalıdır.",
      ]},
    ],
  },

  // ==================== T4 — BOŞALTMA ÖNCESİ TAHRİBAT / HASAR KONTROL TALİMATI ====================
  T4: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu doküman, tehlikeli maddelerin taşınması sırasında, boşaltma öncesi ve sırasında pakette, tankta, taşıtta veya konteynerde oluşabilecek herhangi bir tahribatın kontrol edilmesi ve olumsuz bir durumla karşılaşıldığında alınacak önlemleri tanımlar. Amaç, taşıma sırasında güvenli bir işlem sağlamak ve herhangi bir kaza, sızıntı veya çevreye zarar vermeyi önlemektir.",
    kapsam: "Ambalajlı, dökme ve tank yükleriyle taşınan tüm tehlikeli maddelerin taşınması sırasında meydana gelebilecek tahribatlara karşı alınacak önlemleri kapsar.",
    blocks: [
      { type: "subheading", text: "1. Boşaltma Öncesi Kontroller" },
      { type: "subheading", text: "Taşıma Aracının Durumu" },
      { type: "paragraph", text: "Taşıma aracı, konteyner veya tank, taşıma sırasında herhangi bir fiziksel hasar, tahribat veya sızıntıya karşı kontrol edilmelidir. Kontrol edilecek alanlar: kapaklar, vanalar, conta ve bağlantı noktaları; tank ve taşıma aracının dış yüzeyinde çatlaklar veya deformasyon; sızdırmazlık malzemelerinin durumu. Tahribat/hasar tespiti yapıldıysa boşaltma konulu kontrol dokümanına işlenir." },
      { type: "subheading", text: "Ambalajlı Yükler İçin Kontrol" },
      { type: "paragraph", text: "Ambalajın sağlamlığı ve taşıma sırasında hasar görmediği kontrol edilmelidir. Kontrol edilecek alanlar: ambalajın dış yüzeyi; etiketler ve uyarı işaretlerinin düzgünlüğü; ambalajın sızıntıya karşı dayanıklılığı." },
      { type: "subheading", text: "Dökme Yükler İçin Kontrol" },
      { type: "paragraph", text: "Tankların veya dökme yük taşıyan araçların durumu kontrol edilmelidir. Kontrol edilecek alanlar: tankın sızdırmazlık durumu; kapatma sistemleri ve vanaların durumu; araç altı ve yan yüzeyde herhangi bir sızıntı belirtisi." },
      { type: "subheading", text: "2. Boşaltma Sırasında Kontroller" },
      { type: "paragraph", text: "Boşaltma sırasında taşıma aracında, konteynerde veya tankta herhangi bir sızıntı veya tahribat olup olmadığı kontrol edilmelidir. Kontrol edilecek alanlar: sızıntıların tespiti için çevre kontrolü; vanalar, bağlantılar ve kapakların düzgün şekilde kapalı olup olmadığı; boşaltma işlemi sırasında güvenlik önlemleri (örn. yeterli havalandırma)." },
      { type: "subheading", text: "3. Olumsuz Durumda Alınacak Önlemler" },
      { type: "subheading", text: "A. Sızıntı Tespiti" },
      { type: "bullet", items: [
        "İlk Müdahale: Sızıntıyı izole etme ve alanı güvenli hale getirme; tüm uygun güvenlik ekipmanlarının (eldiven, gözlük, maske vb.) giyilmesi; taşıma aracının çevresindeki alanın boşaltılması; sızıntının kaynağının kapatılması veya kontrol altına alınması.",
        "Yapılacak İşlemler: İlgili güvenlik birimlerine derhal bildirimde bulunulması; sızıntı durumuna göre uygun temizlik ve arındırma işlemlerinin başlatılması.",
      ]},
      { type: "subheading", text: "B. Fiziksel Tahribat" },
      { type: "bullet", items: [
        "İlk Müdahale: Hasar görmüş bölgelerin hızlı bir şekilde izole edilmesi; tahribatın türüne göre geçici onarım işlemlerinin yapılması.",
        "Yapılacak İşlemler: Hasar raporunun hazırlanması; hasar gördüğü tespit edilen aracın taşıma için güvenli hale getirilip getirilmediğinin kontrol edilmesi.",
      ]},
    ],
  },

  // ============================= T5 — SEVKİYAT UYGUNLUK TALİMATI =============================
  T5: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, tehlikeli maddelerin taşınması sırasında ulusal ve uluslararası yasal düzenlemelere uygun olarak güvenli ve çevreye duyarlı bir süreç yürütülmesini sağlamak amacıyla, taşıma araçlarının, ambalajların, yükleme ve boşaltma işlemlerinin detaylı kurallarını belirler.",
    kapsam: "Bu talimat; işletmede iştigal edilen tehlikeli maddelerin taşınmasında kullanılan taşıtlar, ambalajlar ve yük taşıma birimlerini, işaretleme/etiketleme/levha düzenlemelerini, test/muayene/bakım süreçlerini, sevkiyat öncesi/sırası/sonrası uyulması gereken kuralları kapsar.",
    blocks: [
      { type: "subheading", text: "5.1. Sevkiyat Öncesi Hazırlıklar" },
      { type: "bullet", items: [
        "Araç Kontrolleri: Taşıma araçlarının ADR/Taşıt Uygunluk Belgeleri kontrol edilir. Araçta ADR'ye uygun ekipmanların (yangın söndürücü, emniyet levhaları, dökülme önleme seti, ilk yardım çantası) eksiksiz olduğu doğrulanır.",
        "Ambalaj ve Yük Taşıma Birimlerinin Kontrolü: Kullanılacak ambalajların UN standartlarına uygunluğu kontrol edilir; eksik veya hasarlı ambalajlar kullanılmaz.",
        "Belge Hazırlığı: Güvenlik Bilgi Formu (SDS) doldurulur ve sevkiyat sırasında erişilebilir hale getirilir. Sevkiyat belgelerinde UN numarası, tehlike sınıfı, ambalaj grubu, tünel kategori bilgileri belirtilir. Muafiyet kapsamında bir taşıma var ise taşıma evrakında belirtilir.",
      ]},
      { type: "subheading", text: "5.2. Dolum ve Yükleme Süreci" },
      { type: "bullet", items: [
        "Dolum Öncesi: Taşınacak maddelerin basınçlı kapları, periyodik muayene ve test belgeleri açısından kontrol edilir; kaplarda sızdırmazlıkları kontrol edilir.",
        "Yükleme Düzeni: Maddeler ADR uyumluluk tablolarına göre bir arada taşınır; yanıcı, patlayıcı veya reaktif maddeler ayrı bölmelere yerleştirilir; yüklerin kaymasını önleyecek sabitleme önlemleri alınır.",
      ]},
      { type: "subheading", text: "5.3. İşaretleme, Etiketleme ve Levhalama" },
      { type: "bullet", items: [
        "Her ambalaj üzerinde: tehlike sınıfını gösteren sınıf etiketi, UN numarası, ambalaj yönlendirme işaretleri yer alır; etiketlerin suya/darbeye/aşınmaya dayanıklı olması sağlanır.",
        "Taşıma araçlarının ön, arka ve yan taraflarına ADR standartlarına uygun levhalar yerleştirilir; levhalar temiz, okunabilir ve aracın hareketi sırasında görünür durumda olmalıdır.",
        "Yanıcı, patlayıcı, zehirli veya çevreye zararlı maddeler için özel uyarı işaretleri eklenir.",
      ]},
      { type: "subheading", text: "5.4. Sevkiyat Sırasında Dikkat Edilecek Hususlar" },
      { type: "bullet", items: [
        "Araç, yalnızca belirlenen güzergahlarda ve hız sınırlarına uygun olarak kullanılmalıdır; araçta sigara içilmesi veya açık alev kullanılması yasaktır.",
        "Sürücü, sevkiyat belgelerini araçta bulundurmalıdır.",
        "Dökülme, sızıntı veya yangın durumunda acil durum ekipmanları kullanılır; çevredeki kişiler ve çevre üzerinde oluşabilecek zararlar için gerekli tedbirler alınır.",
      ]},
      { type: "subheading", text: "5.5. Sevkiyat Sonrası Kontroller" },
      { type: "bullet", items: [
        "Maddeler boşaltılırken ambalajların ve taşıma birimlerinin hasar almadığı doğrulanır; boşaltma sırasında uygun koruyucu ekipman kullanılır.",
        "Yeniden kullanılabilir ambalajlar temizlenir ve bakımı yapılır; tek kullanımlık ambalajlar yasal düzenlemelere uygun şekilde bertaraf edilir.",
        "Sevkiyatın tamamlandığına dair rapor hazırlanır; süreçte yaşanan eksiklik veya aksaklıklar raporlanır.",
      ]},
      { type: "subheading", text: "6. Kayıt ve Arşivleme" },
      { type: "paragraph", text: "Test ve muayene raporları, sevkiyat belgeleri, güvenlik bilgi formları (SDS) ve taşıt uygunluk belgeleri düzenli olarak dosyalanır ve en az 5 yıl saklanır." },
    ],
  },

  // ============================= K1 — ALICI KONTROL FORMU (Konteyner Yükleme/Boşaltma) =============================
  K1: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2024",
    blocks: [
      { type: "subheading", text: "1. Konteyner Bilgileri" },
      { type: "bullet", items: ["Konteyner Numarası: ……………", "Konteyner Tipi: ……………", "Taşıyıcı Firma: ……………", "Teslim Tarihi: ……………"] },
      { type: "subheading", text: "2. Konteynerin Dış Kontrolü (Evet / Hayır)" },
      { type: "bullet", items: [
        "Fiziksel Hasar Var mı?",
        "Etiket ve İşaretlemeler Doğru mu?",
        "Koruyucu Donanım Var mı?",
        "Kapak ve Kapak Mühürleri Sağlam mı?",
        "Paslanma veya Korozyon Var mı?",
      ]},
      { type: "subheading", text: "3. İç Kontrol (Evet / Hayır)" },
      { type: "bullet", items: [
        "Konteynerin İç Yüzeyi Temiz mi?",
        "Yük Güvenli ve Sabit mi?",
        "Sızıntı veya Koku Var mı?",
        "Havalandırma Durumu Uygun mu?",
        "Konteyner İçindeki Malzeme Türleri Kontrol Edildi mi?",
      ]},
      { type: "subheading", text: "4. Tehlikeli Maddeler İçin Özel Kontroller (Evet / Hayır)" },
      { type: "bullet", items: [
        "ADR Etiketleri ve İşaretleri Var mı?",
        "Güvenlik Belgeleri Mevcut mu?",
        "İzinler ve Sertifikalar Tam mı?",
        "Tehlikeli Maddeler İçin Uygun Ambalaj Kullanılmış mı?",
        "Acil Durum Talimatları ve İletişim Bilgileri Mevcut mu?",
        "Yangın Söndürücü ve Diğer Güvenlik Ekipmanları Mevcut mu?",
      ]},
      { type: "subheading", text: "5. Ek Bilgiler" },
      { type: "bullet", items: [
        "Yükleme ve Boşaltma Talimatlarına Uygunluk: Evet / Hayır",
        "Aksi Durumlar ve Notlar: …………………………………………………",
      ]},
      { type: "subheading", text: "Kontrolü Yapan" },
      { type: "bullet", items: ["Adı: ……………", "İmzası: ……………", "Tarih: ……………"] },
      { type: "paragraph", text: "*Herhangi bir negatif durum boşaltma sırasında dökülme vb. gibi durumları üst yönetime raporlayınız; mümkünse bu durumları fotoğraflar ile kayıt altına alınız." },
    ],
  },

  // ============================= K2 — BOŞALTMA SONRASI ARINDIRMA / KAPATMA KONTROL FORMU =============================
  K2: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2024",
    blocks: [
      { type: "paragraph", text: "Bu kontrol listesi, boşaltma öncesi ve sonrasında tahribat tespiti, temizlik/dezenfekte işlemleri ve güvenlik önlemlerinin kayıt altına alınması için kullanılır." },
      { type: "subheading", text: "Kontrol Alanları (Evet / Hayır)" },
      { type: "bullet", items: [
        "Boşaltma Öncesinde Tahribat Tespiti Yapıldı mı? (Tahribat varsa, işlem yapılmamalıdır.)",
        "Boşaltma Sırasında Tahribat Tespiti Yapıldı mı? (Tahribat varsa, derhal müdahale edilmelidir.)",
        "Tahribat Tespit Edildiğinde Alınan Önlemler Uygulandı mı?",
        "Ambalajlı/Dökme/Tank Yükü İçin Temizlik ve Dezenfekte İşlemi Yapıldı mı?",
        "Kalan Kimyasal Kalıntı Kontrolü Yapıldı mı?",
        "Temizlik İçin Kullanılan Ekipman Kontrolü Yapıldı mı?",
        "Temizlik Sonrası Kalan Kirlilik Kontrolü Yapıldı mı?",
        "Vanalar/Kapaklar Güvenli Bir Şekilde Kapatıldı mı?",
        "ADR Bölüm 5.3 Uygun İşaretler Boşaltma Sonrasında Araç/Konteynerden Çıkarıldı mı?",
      ]},
      { type: "subheading", text: "Kayıt Bilgileri" },
      { type: "bullet", items: ["Araç Plakası: ……………", "Açıklama: ……………", "Gerekçeler/Açıklama: ……………", "Onaylayan: ……………"] },
    ],
  },

  // ==================== K3 — SEVKİYAT UYGUNLUK KONTROL FORMU (GÖNDEREN) ====================
  K3: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2024",
    blocks: [
      { type: "subheading", text: "Levha ve İşaret Kontrolleri (Evet / Hayır / İlgili Değil)" },
      { type: "bullet", items: [
        "Ambalajlı Taşıma için Aracın önünde/arkasında boş turuncu plaka mevcut mu?",
        "Tank ve Dökme Taşıma için Aracın önünde/arkasında yazılı turuncu plaka ve her iki yanında tehlike ikaz işareti mevcut mu?",
        "Konteyner ile yük taşınması durumunda konteynerin dört tarafında tehlike ikaz işareti ve UN numarası mevcut mu?",
      ]},
      { type: "subheading", text: "Sevkiyat Bilgileri" },
      { type: "bullet", items: ["Tarih: ……………", "Gönderici Firma Unvanı: ……………", "Taşıyıcı Firma Unvanı: ……………", "Araç Plaka No: ……………", "Araç Türü: Kamyon / Tank / Diğer"] },
      { type: "subheading", text: "Gönderen-Paketleyen Kontrolleri" },
      { type: "numbered", items: [
        "Tehlikeli Madde Faaliyet Belgesi (Taşımacı konulu olarak) mevcut mu?",
        "Taşıma Evrağı mevcut mu?",
        "Yazılı Talimat mevcut mu?",
        "Taşıma Yetki Belgesi (K1-K2-TİO vb.) mevcut mu?",
        "Basınçlı kap olması halinde muayene ve test mevcut mu?",
        "Ambalajlarda uygun etiket ve işaretleme var mı?",
        "Uygun sertifikalı ambalajlar (UN sertifikalı) kullanıldı mı?",
        "Tank ve patlayıcı madde taşımasına uygun ADR/Taşıt uygunluk belgesi mevcut mu?",
        "Tankların test ve muayeneleri mevcut mu?",
      ]},
      { type: "subheading", text: "Yükleyen Kontrolleri" },
      { type: "numbered", items: [
        "Birlikte yükleme, karışık yükleme kurallarına uygun mu? (ADR 7.5)",
        "Yüklenecek mallarda hasar, sızdırma kontrolü yapıldı mı?",
        "Araç levha kontrolü yapıldı mı?",
        "Yükleme sırasında çevrede güvenlik önlemleri alındı mı?",
        "Araçta bulunması gereken donanım, teçhizat, yangın tüpü mevcut mu?",
        "SRC5 belgeli şoför mevcut mu?",
      ]},
      { type: "subheading", text: "Uyulması Gereken Talimatlar" },
      { type: "numbered", items: [
        "ADR Bölüm 5.4.1'de belirtilen mahiyette taşıma evrakı eksiksiz hazırlanır ve taşımacıya verilir.",
        "Tehlikeli Madde faaliyet belgesi ve diğer araçta bulunması gereken evraklar kontrol edilir.",
        "Araçta ve ambalajlarda bulunması gereken levha, etiketler ve işaretlemelerin uygunluğu sağlanır.",
        "Paketleme ADR 4.1 paketleme talimatına uygun olarak yapılır.",
        "Yükleme öncesi araçta sızıntı varsa yükleme yapılmaz; hasarlı, tahrip olmuş ambalajlar araca yüklenmez.",
      ]},
    ],
  },

  // ============================= L2 — ARAÇ / TAŞIMACI LİSTESİ VE TAŞIMA EVRAKI KAYITLARI =============================
  L2: {
    docType: "LİSTE",
    yayinTarihi: "01.11.2024",
    amac: "Bu liste, tehlikeli madde sevkiyatlarında kullanılan taşıma evrakı, işletme bilgileri, ADR/Taşıt uygunluk belgesi ve ambalaj sertifikası bilgilerinin firma bazında takip edilmesi amacıyla tutulur.",
    blocks: [
      { type: "paragraph", text: "Aşağıdaki alanlar her sevkiyat için ayrı bir satırda kayıt altına alınır:" },
      { type: "bullet", items: [
        "Taşımacı İşletme Unvanı", "Vergi Numarası", "Araç Plakası", "Taşıma Türü",
        "Tank/Ambalaj/Konteyner Sertifika Numarası", "Sertifika Numaraları Geçerlilik Tarihi",
        "Yük Taşıma Birimi Muayene Tarihi", "Basınçlı Kap Mevcut ise Uygunluk Durumu",
        "Basınçlı Kap Muayene Tarihi", "Taşıma Evrağı Numarası", "Muafiyet Kapsamında Taşıma mı?",
        "SRC5 Belgeli Şoför", "Yük Miktarı (ton)", "Taşıma Tarihi",
      ]},
      { type: "paragraph", text: "Bu liste düzenli olarak güncellenir; her sevkiyat sonrası ilgili satır doldurularak kayıt altına alınır ve en az 5 yıl saklanır." },
    ],
  },

  K5: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2024",
    amac: "Bu form, boşaltılan ve temizlenen konteyner/tankların durumunun ve tekrar kullanıma hazır olup olmadığının takibi amacıyla kullanılır.",
    kapsam: "Boşaltan faaliyeti kapsamında işlem gören tüm konteyner ve tanklar için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Kayıt Bilgileri" },
      { type: "bullet", items: ["Konteyner/Tank No: ……………", "Boşaltma Tarihi: ……………", "Önceki Madde / UN No: ……………"] },
      { type: "subheading", text: "Kontrol Alanları (Evet / Hayır)" },
      { type: "bullet", items: [
        "Konteyner/tank tamamen boşaltıldı mı?",
        "İç yüzey temizliği ve dezenfeksiyonu yapıldı mı?",
        "Kalan kimyasal kalıntı kontrolü yapıldı mı?",
        "ADR Bölüm 5.3 tehlike ikaz levhaları kaldırıldı mı (temizse) veya \"BOŞ, TEMİZLENMEMİŞ\" olarak mı işaretlendi?",
        "Konteyner/tank tekrar kullanıma (bir sonraki dolum/yükleme) hazır mı?",
        "Hasar/tahribat tespit edildi mi? (Evet ise T4/T3 talimatına göre işlem yapılır.)",
      ]},
      { type: "subheading", text: "Durum" },
      { type: "bullet", items: ["Kullanıma Hazır / Beklemede / Hizmet Dışı", "Kontrolü Yapan: ……………", "Tarih: ……………"] },
    ],
  },

  // ═══════════════════════════ YÜKLEYEN (P5, T6-T8, K4) ═══════════════════════════

  P5: {
    docType: "PROSEDÜR",
    yayinTarihi: "01.01.2020",
    amac: "Bu prosedür, ADR kapsamında tehlikeli maddelerin araca/konteynere güvenli, ADR uyumluluk kurallarına ve karışık yükleme yasaklarına uygun şekilde yüklenmesini sağlamak amacıyla hazırlanmıştır.",
    kapsam: "Bu prosedür, ambalajlı, dökme ve tank yüklerinin yüklenmesi işleminde görev alan tüm personel ve kullanılan ekipmanlar için geçerlidir.",
    blocks: [
      { type: "subheading", text: "1. Yükleme Öncesi Önlemler" },
      { type: "numbered", items: [
        "Araç/konteynerin ADR'ye uygunluğu (taşıt uygunluk belgesi, temizlik durumu, dış yüzey hasar kontrolü) doğrulanır.",
        "Yüklenecek maddenin ADR sınıfı, UN numarası ve ambalaj grubu taşıma evrakıyla karşılaştırılarak teyit edilir.",
        "Ambalajların/konteynerlerin fiziksel bütünlüğü (hasar, sızıntı, deformasyon) kontrol edilir; hasarlı ambalaj yüklenmez.",
        "Karışık yükleme yapılacaksa ADR 7.5'teki uyumluluk tablosuna göre farklı sınıfların bir arada taşınabilirliği kontrol edilir.",
        "Personelin gerekli KKD'yi (eldiven, gözlük, koruyucu giysi) kullandığı doğrulanır.",
      ]},
      { type: "subheading", text: "2. Yükleme Sırasında Önlemler" },
      { type: "numbered", items: [
        "Yükler, taşıma sırasında kaymayı/devrilmeyi önleyecek şekilde sabitlenir.",
        "Sıvı yükler sızıntı ihtimaline karşı alt katmanlara, yanıcı/reaktif maddeler ayrı bölmelere yerleştirilir.",
        "Yükleme sırasında araç motoru kapalı tutulur, açık alev ve sigara kullanımı yasaktır.",
        "Yükleme esnasında sızıntı, dökülme veya hasar tespit edilirse işlem derhal durdurulur ve sorumlu kişi bilgilendirilir.",
      ]},
      { type: "subheading", text: "3. Yükleme Sonrası Önlemler" },
      { type: "numbered", items: [
        "Araç/konteynerin dış yüzeyindeki etiket, levha ve turuncu plakaların ADR'ye uygun ve görünür olduğu kontrol edilir.",
        "Kapılar/kapaklar güvenli şekilde kapatılır ve mühürlenir.",
        "Yükleme kontrol formu (K4) doldurularak imza altına alınır.",
        "Taşıma evrakının araçta bulunduğu ve sürücüye teslim edildiği teyit edilir.",
      ]},
    ],
  },

  T6: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, farklı ADR sınıflarındaki tehlikeli maddelerin aynı araçta/konteynerde birlikte taşınmasına ilişkin yasak ve ayırım kurallarını (ADR 7.5.2) belirler.",
    kapsam: "Birden fazla tehlikeli madde türünün aynı sevkiyatta yükleneceği tüm durumlar için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Genel Kurallar" },
      { type: "bullet", items: [
        "Farklı ADR sınıflarındaki maddeler yalnızca ADR 7.5.2'deki karışık yükleme (uyumluluk) tablosunda izin verilen kombinasyonlarla bir arada taşınabilir.",
        "Tablo'da açıkça izin verilmeyen veya yasaklanan sınıf çiftleri asla birlikte yüklenmez.",
        "1. Sınıf (patlayıcılar) için ayrıca ADR 7.5.2.1'deki özel ayırım/uyumluluk grubu kuralları uygulanır.",
        "Gıda, yem veya tüketim maddeleriyle belirli tehlikeli madde sınıflarının birlikte taşınması ADR 7.5.4 uyarınca yasaktır; bu maddeler ayrı yüklenir veya araya koruyucu bariyer konur.",
      ]},
      { type: "subheading", text: "Uygulama" },
      { type: "numbered", items: [
        "Yükleme öncesi taşınacak tüm maddelerin sınıf ve UN numaraları listelenir.",
        "Uyumluluk tablosu kontrol edilerek karışık yüklemenin izinli olup olmadığı belirlenir.",
        "İzinli değilse sevkiyat ayrı araçlara bölünür veya yükleme ertelenir; uygunsuz yükleme durumunda sevkiyat yapılmaz.",
        "Karışık yükleme kararı ve gerekçesi taşıma evrakında/kontrol formunda belgelenir.",
      ]},
    ],
  },

  T7: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, yükleme öncesi ve sonrası araç/konteyner üzerindeki tehlike ikaz etiketlerinin, levhaların ve turuncu plakaların ADR'ye uygunluğunun kontrolünü düzenler.",
    kapsam: "ADR kapsamında yüklenen tüm ambalajlı, dökme ve tank yükleri için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Kontrol Edilecek Hususlar" },
      { type: "bullet", items: [
        "Her ambalaj/konteyner üzerinde ilgili ADR sınıfına ait tehlike ikaz etiketi ve UN numarası bulunmalıdır.",
        "Ambalajlı taşımada araç önünde/arkasında boş turuncu plaka bulunur.",
        "Tank ve dökme taşımada araç önünde/arkasında yazılı turuncu plaka (Kemler No. + UN No.) ve aracın her iki yanı ile arkasında tehlike ikaz işareti bulunur.",
        "Konteyner ile taşımada, konteynerin dört tarafında tehlike ikaz işareti ve UN numarası bulunur.",
        "Levha ve etiketler temiz, okunabilir, suya/darbeye/aşınmaya dayanıklı ve aracın hareketi sırasında görünür durumda olmalıdır.",
      ]},
      { type: "subheading", text: "Uygulama" },
      { type: "numbered", items: [
        "Yükleme tamamlandıktan sonra tüm etiket/levha/plaka kontrolü yapılır ve K4 kontrol formuna işlenir.",
        "Eksik, hasarlı veya yanlış levha/etiket tespit edilirse araç sevke çıkarılmaz; düzeltme yapılana kadar bekletilir.",
        "Boş ancak temizlenmemiş taşıma birimlerinde de (varsa) uygun işaretleme sürdürülür.",
      ]},
    ],
  },

  T8: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, hasarlı veya sızdıran ambalajların araca yüklenmesinin önlenmesi ve yükleme sırasında genel emniyet kurallarının (ADR 7.5) uygulanmasını düzenler.",
    kapsam: "Ambalajlı yüklerin araç/konteynere yüklendiği tüm işlemler için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Ambalaj Kontrolü" },
      { type: "bullet", items: [
        "Yükleme öncesi her ambalaj dış yüzeyinden sızıntı, yırtılma, ezilme veya deformasyon açısından kontrol edilir.",
        "Hasarlı veya sızdıran ambalaj tespit edilirse yüklenmez; ayrı bir alanda izole edilir ve sorumlu kişiye/TMGD'ye bildirilir.",
        "Sızıntı tespit edilen ambalajlar için ADR'ye uygun acil müdahale (izolasyon, absorban malzeme kullanımı) uygulanır.",
      ]},
      { type: "subheading", text: "Yükleme Emniyeti (ADR 7.5)" },
      { type: "numbered", items: [
        "Yükler kayma, devrilme veya hasar görmeyi önleyecek şekilde sabitlenir (ADR 7.5.7).",
        "Araç taşıma kapasitesi aşılmaz; yük dağılımı dengeli yapılır.",
        "Elleçleme sırasında ani hareketlerden, düşürmeden ve darbelerden kaçınılır.",
        "Yükleme alanında iş sağlığı ve güvenliği kurallarına (KKD kullanımı, ateşle çalışma yasağı vb.) uyulur.",
      ]},
    ],
  },

  K4: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2024",
    blocks: [
      { type: "subheading", text: "Sevkiyat Bilgileri" },
      { type: "bullet", items: ["Tarih: ……………", "Araç Plaka No: ……………", "Yükleyen İşletme Unvanı: ……………", "Taşıma Türü: Ambalajlı / Dökme / Tank"] },
      { type: "subheading", text: "Kontrol Alanları (Evet / Hayır)" },
      { type: "bullet", items: [
        "Birlikte yükleme, karışık yükleme kurallarına (ADR 7.5) uygun mu?",
        "Yüklenecek mallarda hasar, sızdırma kontrolü yapıldı mı?",
        "Araç levha/etiket kontrolü yapıldı mı?",
        "Yükleme sırasında çevrede güvenlik önlemleri alındı mı?",
        "Yükler kayma/devrilmeye karşı sabitlendi mi?",
        "Araçta bulunması gereken donanım, teçhizat, yangın tüpü mevcut mu?",
        "Taşıma evrakı ve etiketleme eksiksiz mi?",
        "SRC5 belgeli şoför mevcut mu?",
      ]},
      { type: "subheading", text: "Kontrolü Yapan" },
      { type: "bullet", items: ["Adı: ……………", "İmzası: ……………", "Tarih: ……………"] },
    ],
  },

  // ═══════════════════════════ PAKETLEYEN (P6, T9-T12, K6) ═══════════════════════════

  P6: {
    docType: "PROSEDÜR",
    yayinTarihi: "01.01.2020",
    amac: "Bu prosedür, tehlikeli maddelerin ADR Bölüm 4.1'deki paketleme talimatlarına uygun şekilde ambalajlanmasını sağlamak amacıyla hazırlanmıştır.",
    kapsam: "Tehlikeli maddelerin paketleme, ambalajlama ve etiketleme işlemlerinde görev alan tüm personel için geçerlidir.",
    tanimlar: [
      { terim: "UN Sertifikalı Ambalaj", tanim: "ADR Bölüm 6'daki test ve onay kriterlerini karşılayarak UN kodu almış ambalajdır." },
      { terim: "Karışık Paketleme", tanim: "Birden fazla iç ambalajın tek bir dış ambalaj içinde birlikte paketlenmesidir." },
    ],
    blocks: [
      { type: "subheading", text: "1. Paketleme Öncesi Hazırlık" },
      { type: "numbered", items: [
        "Maddenin ADR sınıfı, ambalaj grubu ve ilgili paketleme talimatı (P-kodu, ADR 4.1.4) SDS üzerinden belirlenir.",
        "Kullanılacak ambalajın UN sertifikalı ve maddeye uygun (kimyasal uyumluluk, basınç dayanımı) olduğu doğrulanır.",
        "Ambalaj dış yüzeyi hasar, çatlak veya deformasyon açısından kontrol edilir; hasarlı ambalaj kullanılmaz.",
      ]},
      { type: "subheading", text: "2. Paketleme İşlemi" },
      { type: "numbered", items: [
        "Madde, ADR 4.1'deki genel ve özel paketleme talimatlarına uygun olarak ambalaja yerleştirilir.",
        "Karışık paketleme yapılacaksa ADR 4.1.10'daki uyumluluk kısıtlamalarına uyulur; reaktif maddeler bir arada paketlenmez.",
        "Ambalaj, taşıma sırasında sızıntı veya dökülmeyi önleyecek şekilde sıkıca kapatılır.",
      ]},
      { type: "subheading", text: "3. Etiketleme ve Belgeleme" },
      { type: "numbered", items: [
        "Her ambalaj üzerine ADR'ye uygun tehlike sınıf etiketi, UN numarası ve gerekiyorsa yönlendirme işareti (\"Yukarı Bu Taraf\") yapıştırılır.",
        "Paketleme işlemi, kullanılan ambalaj bilgileri ve kontrol sonucu K6 kontrol formuna kaydedilir.",
      ]},
    ],
  },

  T9: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, tehlikeli madde paketlemesinde kullanılan basınçlı ekipmanların (basınçlı kaplar, taşınabilir tanklar vb.) periyodik test ve muayenelerinin takibini düzenler.",
    kapsam: "Paketleme sürecinde kullanılan tüm basınçlı ekipmanlar için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Muayene Takibi" },
      { type: "bullet", items: [
        "Her basınçlı ekipmanın periyodik muayene ve test tarihleri (ADR standartlarına göre) bir takip listesinde tutulur.",
        "Muayene süresi dolmuş veya dolmak üzere olan ekipmanlar kullanım dışı bırakılır; kullanılmaz.",
        "Basınç testi, sızdırmazlık testi ve dış yüzey kontrolü sonuçları belgelenir ve arşivlenir.",
      ]},
      { type: "subheading", text: "Uygulama Adımları" },
      { type: "numbered", items: [
        "Ekipman envanteri çıkarılır; her ekipmana benzersiz bir tanımlama numarası verilir.",
        "Muayene tarihi yaklaşan ekipmanlar için önceden yetkili muayene kuruluşuyla randevu planlanır.",
        "Muayene sonucu \"uygun\" çıkmayan ekipman derhal hizmet dışı bırakılır ve T10 talimatına göre bertaraf/iade süreci başlatılır.",
      ]},
    ],
  },

  T10: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, periyodik muayene süresi geçmiş veya muayeneden \"uygunsuz\" çıkan basınçlı ekipmanların güvenli şekilde hizmet dışı bırakılması ve bertaraf edilmesini düzenler.",
    kapsam: "Muayene süresi dolmuş, hasarlı veya uygunsuz bulunan tüm basınçlı ekipmanlar için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Uygulama" },
      { type: "numbered", items: [
        "Muayenesi geçmiş/uygunsuz ekipman derhal kullanımdan çekilir ve \"KULLANILAMAZ\" etiketiyle işaretlenir.",
        "İçinde tehlikeli madde kalıntısı varsa, ADR ve yerel mevzuata uygun şekilde boşaltılır ve arındırılır.",
        "Ekipman, tamir/yeniden muayene için yetkili kuruluşa gönderilir ya da geri dönüşü olmayacak şekilde bertaraf edilir.",
        "Bertaraf işlemi lisanslı atık yönetim firması aracılığıyla yapılır ve bertaraf belgesi arşivlenir.",
        "Hizmet dışı bırakılan ekipman, envanterden düşülür ve takip kaydına işlenir.",
      ]},
    ],
  },

  T11: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, farklı tehlikeli maddelerin tek bir dış ambalaj içinde birlikte paketlenmesine (karışık paketleme) ilişkin ADR 4.1.10 kurallarını belirler.",
    kapsam: "Birden fazla iç ambalajın aynı dış ambalajda paketleneceği tüm durumlar için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Genel Kurallar" },
      { type: "bullet", items: [
        "Farklı tehlikeli maddeler, ADR 4.1.10.4'teki uyumluluk tablosunda izin verilmedikçe aynı dış ambalajda birlikte paketlenemez.",
        "Birbiriyle tehlikeli reaksiyona girebilecek maddeler (yanma, ısı/gaz üretimi, patlama vb.) kesinlikle bir arada paketlenmez.",
        "İç ambalajlar, dış ambalaj içinde hareket etmeyecek ve birbirine temas etmeyecek şekilde sabitlenir/ayrılır.",
      ]},
      { type: "subheading", text: "Uygulama" },
      { type: "numbered", items: [
        "Karışık paketleme öncesi tüm maddelerin SDS'leri incelenerek kimyasal uyumluluk teyit edilir.",
        "Uyumluluk tablosu kontrol edilir; izin verilmeyen kombinasyon tespit edilirse maddeler ayrı ambalajlanır.",
        "Karışık paket dış yüzeyine, içerdiği tüm maddelerin etiket ve UN numaraları eksiksiz işlenir.",
      ]},
    ],
  },

  T12: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, paketlenen tehlikeli maddelerin ambalaj işaretleme ve etiketleme uygunluğunun kontrolünü düzenler.",
    kapsam: "Paketleme sonrası tüm ambalajlı ürünler için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Kontrol Edilecek Hususlar" },
      { type: "bullet", items: [
        "Her ambalaj üzerinde tehlike sınıf etiketi, UN numarası ve varsa yönlendirme/çevresel tehlike işaretleri bulunmalıdır.",
        "Etiketler suya, darbeye ve aşınmaya dayanıklı malzemeden olmalı ve ambalaj üzerinde görünür şekilde konumlandırılmalıdır.",
        "Ambalaj üzerindeki UN kodlaması (ör. \"UN 4G/X...\"), kullanılan ambalajın test/onay bilgisini doğru şekilde yansıtmalıdır.",
        "Sınırlı miktar (LQ) veya istisna miktar (EQ) kapsamında paketleme yapılıyorsa ilgili özel işaretleme (LQ elması, EQ işareti) uygulanmalıdır.",
      ]},
      { type: "subheading", text: "Uygulama" },
      { type: "numbered", items: [
        "Paketleme tamamlandıktan sonra her ambalaj tek tek kontrol edilir ve K6 kontrol formuna işlenir.",
        "Etiketleme eksik/hatalı bulunan ambalajlar sevke çıkarılmadan düzeltilir.",
      ]},
    ],
  },

  K6: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2024",
    blocks: [
      { type: "subheading", text: "Paketleme Bilgileri" },
      { type: "bullet", items: ["Tarih: ……………", "Madde Adı / UN No: ……………", "Ambalaj Türü ve UN Kodu: ……………", "Paketleyen İşletme: ……………"] },
      { type: "subheading", text: "Kontrol Alanları (Evet / Hayır)" },
      { type: "bullet", items: [
        "Ambalaj UN sertifikalı ve maddeye uygun mu?",
        "Ambalaj dış yüzeyinde hasar/çatlak/deformasyon var mı?",
        "Basınçlı ekipman kullanıldıysa muayene/test tarihi geçerli mi?",
        "Karışık paketleme yapıldıysa uyumluluk tablosuna uygun mu?",
        "Etiketleme ve UN numarası eksiksiz mi?",
        "Sınırlı/istisna miktar işaretlemesi (varsa) doğru mu?",
        "Ambalaj sıkıca kapatıldı, sızıntı riski yok mu?",
      ]},
      { type: "subheading", text: "Kontrolü Yapan" },
      { type: "bullet", items: ["Adı: ……………", "İmzası: ……………", "Tarih: ……………"] },
    ],
  },

  // ═══════════════════════════ DOLDURAN (P7, T13-T17, K7) ═══════════════════════════

  P7: {
    docType: "PROSEDÜR",
    yayinTarihi: "01.01.2020",
    amac: "Bu prosedür, tehlikeli maddelerin tank/YTB (Yük Taşıma Birimi) içine güvenli şekilde doldurulmasını sağlamak amacıyla hazırlanmıştır.",
    kapsam: "Tank, tanker ve taşınabilir tankların doldurulması işleminde görev alan tüm personel için geçerlidir.",
    tanimlar: [
      { terim: "YTB (Yük Taşıma Birimi)", tanim: "Tank, tanker, batarya araç veya çok elemanlı gaz konteyneri gibi dökme/tank yük taşıma üniteleridir." },
      { terim: "Azami Doldurma Derecesi", tanim: "Tankın, taşınan maddenin genleşmesine izin verecek şekilde doldurulabileceği azami hacim oranıdır (ADR 4.3.2)." },
    ],
    blocks: [
      { type: "subheading", text: "1. Dolum Öncesi Önlemler" },
      { type: "numbered", items: [
        "YTB'nin periyodik muayene ve test tarihlerinin geçerli olduğu, tankın maddeye uygun olduğu doğrulanır.",
        "Tank iç yüzeyinin temiz olduğu ve önceki yükten kalıntı bulunmadığı kontrol edilir.",
        "Doldurulacak maddenin ADR sınıfı ve tankın onaylı taşıma kodu karşılaştırılır.",
        "Vana, conta ve bağlantı noktalarının sızdırmazlığı test edilir.",
      ]},
      { type: "subheading", text: "2. Dolum Sırasında Önlemler" },
      { type: "numbered", items: [
        "Dolum, ADR 4.3.2'deki azami doldurma derecesi sınırları içinde yapılır; taşma önlenir.",
        "Bölmeli tanklarda her bölme ayrı ayrı kontrol edilerek dolum yapılır (bkz. T15).",
        "Dolum sırasında sızıntı, taşma veya anormal basınç artışı tespit edilirse işlem derhal durdurulur.",
        "Statik elektrik riski olan maddelerde topraklama önlemleri alınır.",
      ]},
      { type: "subheading", text: "3. Dolum Sonrası Önlemler" },
      { type: "numbered", items: [
        "Vanalar ve kapaklar güvenli şekilde kapatılır, sızdırmazlık kontrolü yapılır.",
        "Tankın dış yüzeyine bulaşan madde kalıntıları temizlenir (arındırma).",
        "Etiket, levha ve turuncu plaka kontrolü yapılır ve dolum kontrol formu (K7) doldurulur.",
      ]},
    ],
  },

  T13: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, dolum öncesi YTB muayene kontrolünün yapılmasını ve maddenin uygun tanka doldurulmasını düzenler.",
    kapsam: "Dolum yapılacak tüm tank ve taşınabilir tanklar için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Uygulama" },
      { type: "numbered", items: [
        "Tankın periyodik muayene plakası kontrol edilir; muayene süresi geçmiş tanka dolum yapılmaz.",
        "Tankın onaylı taşıma kodu (ör. \"L4BN\") ile doldurulacak maddenin ADR gereksinimi karşılaştırılır; uyumsuzluk varsa dolum yapılmaz.",
        "Tank iç yüzeyi önceki yükten kaynaklı kalıntı, uyumsuz madde artığı açısından kontrol edilir.",
        "Kontrol sonucu ve tank bilgileri dolum kontrol formuna (K7) işlenir.",
      ]},
    ],
  },

  T14: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, dolum öncesi tank/araç üzerindeki etiket, levha ve turuncu plakaların kontrolünü ve doğru şekilde takılmasını düzenler.",
    kapsam: "Dolum yapılacak tüm tank ve tanker araçları için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Uygulama" },
      { type: "bullet", items: [
        "Dolum öncesi tank/araç üzerinde önceki yüke ait etiket/levha/plaka varsa kaldırılır veya güncellenir.",
        "Doldurulacak maddeye uygun turuncu plaka (Kemler No. + UN No.) araç önü/arkasına takılır.",
        "İlgili ADR sınıf etiketleri aracın her iki yanına ve arkasına yapıştırılır.",
        "Levha ve etiketlerin okunabilir, sağlam ve doğru bilgileri yansıttığı doğrulanır.",
      ]},
    ],
  },

  T15: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, bölmeli tankların dolumunda her bölmenin azami doldurma derecesine (ADR 4.3.2) uygun şekilde doldurulmasını düzenler.",
    kapsam: "Birden fazla bölmesi olan tank/tanker araçları için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Uygulama" },
      { type: "numbered", items: [
        "Her bölmeye doldurulacak madde önceden planlanır; farklı bölmelerdeki maddelerin birbiriyle uyumluluğu (kaza anında karışma riski) değerlendirilir.",
        "Her bölme, maddenin sıcaklığa bağlı genleşmesine izin verecek şekilde ADR 4.3.2'deki azami doldurma derecesi sınırları içinde doldurulur.",
        "Dolum sırasında her bölme ayrı ayrı seviye kontrolüne tabi tutulur; taşma kesinlikle önlenir.",
        "Dolum tamamlandığında her bölmenin vanası/kapağı ayrı ayrı kontrol edilip kapatılır.",
      ]},
    ],
  },

  T16: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, dolum sonrası tankın sızdırmazlığının ve dış yüzeye bulaşma olup olmadığının kontrolünü düzenler.",
    kapsam: "Dolumu tamamlanmış tüm tank ve tanker araçları için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Uygulama" },
      { type: "bullet", items: [
        "Dolum sonrası tüm vana, conta ve bağlantı noktalarında sızdırmazlık kontrolü yapılır.",
        "Tankın dış yüzeyi, doldurma ağzı çevresi ve alt kısmı bulaşma/damlama açısından kontrol edilir.",
        "Bulaşma tespit edilirse ADR'ye uygun şekilde derhal temizlik ve arındırma yapılır.",
        "Kontrol sonucu dolum kontrol formuna (K7) işlenir; sızıntı riski olan araç sevke çıkarılmaz.",
      ]},
    ],
  },

  T17: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, dökme dolum işlemlerinde (ADR Bölüm 7.3) uyulması gereken kuralları ve taşımacının Tehlikeli Madde Faaliyet Belgesi (TMFB) kontrolünü düzenler.",
    kapsam: "Dökme yük taşıyan araçlara yapılan tüm dolum işlemleri için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Dökme Dolum Kuralları (ADR 7.3)" },
      { type: "bullet", items: [
        "Dökme yük, yalnızca ADR 7.3.1'de o madde için özel olarak izin verilmişse dökme halde taşınabilir.",
        "Dökme yük taşıma birimi (konteyner, araç kasası vb.) maddeye uygun ve sızdırmaz olmalıdır.",
        "Dolum ve boşaltma sırasında tozuma, saçılma ve çevreye yayılmayı önleyecek önlemler alınır.",
      ]},
      { type: "subheading", text: "Taşımacı TMFB Kontrolü" },
      { type: "bullet", items: [
        "Dolum yapılmadan önce taşımacı firmanın geçerli Tehlikeli Madde Faaliyet Belgesi (TMFB) kontrol edilir.",
        "TMFB'si bulunmayan veya süresi dolmuş taşımacıya dolum/teslim yapılmaz.",
        "Kontrol sonucu dolum kontrol formuna (K7) işlenir.",
      ]},
    ],
  },

  K7: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2024",
    blocks: [
      { type: "subheading", text: "Dolum Bilgileri" },
      { type: "bullet", items: ["Tarih: ……………", "Araç/Tank Plaka No: ……………", "Madde Adı / UN No: ……………", "Dolduran İşletme: ……………"] },
      { type: "subheading", text: "Kontrol Alanları (Evet / Hayır)" },
      { type: "bullet", items: [
        "Tank muayene/test tarihi geçerli mi?",
        "Tank taşınacak maddeye uygun (onaylı taşıma kodu) mu?",
        "Dolum öncesi etiket/levha/turuncu plaka kontrolü yapıldı mı?",
        "Azami doldurma derecesine uyuldu mu? (bölmeli tanklarda her bölme ayrı kontrol edildi mi?)",
        "Dolum sonrası sızdırmazlık ve bulaşma kontrolü yapıldı mı?",
        "Taşımacının TMFB'si geçerli mi? (dökme dolumda)",
        "Vanalar/kapaklar güvenli şekilde kapatıldı mı?",
      ]},
      { type: "subheading", text: "Kontrolü Yapan" },
      { type: "bullet", items: ["Adı: ……………", "İmzası: ……………", "Tarih: ……………"] },
    ],
  },

  // ═══════════════════════════ TAŞIMACI (P8, T18-T20, K8-K9) ═══════════════════════════

  P8: {
    docType: "PROSEDÜR",
    yayinTarihi: "01.01.2020",
    amac: "Bu prosedür, tehlikeli madde taşımacılığı yapan firmanın sevkiyat öncesi, sırası ve sonrasında uyması gereken ADR yükümlülüklerini tanımlar.",
    kapsam: "Tehlikeli madde taşıması yapan tüm araçlar, sürücüler ve lojistik süreçler için geçerlidir.",
    blocks: [
      { type: "subheading", text: "1. Taşıma Öncesi Önlemler" },
      { type: "numbered", items: [
        "Aracın ADR/Taşıt Uygunluk Belgesi ve periyodik muayenelerinin geçerli olduğu kontrol edilir.",
        "Sürücünün SRC5 (ADR şoför) belgesinin geçerli olduğu doğrulanır.",
        "Araçta bulunması gereken teçhizat (yangın söndürücü, KKD, dökülme önleme seti, ilk yardım çantası, uyarı üçgeni vb.) ADR 8.1.4/8.1.5 uyarınca eksiksiz kontrol edilir.",
        "Taşıma evrakı, TMFB ve gerekli diğer belgeler (K9) araçta bulundurulur.",
        "Yüklenen malın etiket, levha ve plakalarının uygunluğu teyit edilir.",
      ]},
      { type: "subheading", text: "2. Taşıma Sırasında Önlemler" },
      { type: "numbered", items: [
        "Araç yalnızca belirlenen güzergahlarda ve hız sınırlarına uygun kullanılır.",
        "Sürücü, mola ve park kurallarına (ADR 8.4/8.5) uyar; kalabalık yerlerde gereksiz bekleme yapılmaz.",
        "Sızıntı, kaza veya acil durumda ADR 5.4.3 taşıma yazılı talimatlarına göre hareket edilir.",
      ]},
      { type: "subheading", text: "3. Taşıma Sonrası Önlemler" },
      { type: "numbered", items: [
        "Teslimat sonrası araç/konteyner boşaltılmış ve temizlenmişse ADR 5.3 uyarınca tehlike ikaz levhaları kaldırılır.",
        "Sevkiyata dair kayıtlar (taşıma evrakı, kontrol formları) arşivlenir.",
        "Herhangi bir ihlal, kaza veya olağandışı durum raporlanır ve TMGD'ye bildirilir.",
      ]},
    ],
  },

  T18: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, taşıma öncesi ve sırasında araç üzerindeki etiket, levha, plaka kontrolü ile sızıntı/hasar kontrolünü düzenler.",
    kapsam: "Tehlikeli madde taşıyan tüm araçlar için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Uygulama" },
      { type: "bullet", items: [
        "Sevkiyat öncesi aracın ön, arka ve yan taraflarındaki turuncu plaka ve tehlike ikaz levhalarının doğru ve eksiksiz olduğu kontrol edilir.",
        "Aracın dış yüzeyinde sızıntı, hasar veya deformasyon olup olmadığı kontrol edilir; tespit edilirse araç sevke çıkarılmaz.",
        "Yük bağlama/sabitleme ekipmanlarının sağlam olduğu doğrulanır.",
        "Kontrol sonucu K9 formuna işlenir.",
      ]},
    ],
  },

  T19: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat, ADR 8.1.4 ve 8.1.5 uyarınca araçta bulundurulması zorunlu olan genel ve sınıfa özel teçhizatın kontrolünü düzenler.",
    kapsam: "Tehlikeli madde taşıyan tüm araçlar için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Genel Teçhizat (ADR 8.1.4)" },
      { type: "bullet", items: [
        "Her araç için en az bir adet takoz (araç ağırlığına ve tekerlek çapına uygun).",
        "İki adet kendinden ayakta durabilen uyarı işareti.",
        "Göz durulama sıvısı (belirli yük sınıfları için).",
        "Her araç mürettebatı üyesi için uyarı yeleği, taşınabilir aydınlatma cihazı, koruyucu eldiven ve göz koruması.",
      ]},
      { type: "subheading", text: "Sınıfa Özel Teçhizat (ADR 8.1.5)" },
      { type: "bullet", items: [
        "Yazılı talimatlarda belirtilen her araç mürettebatı üyesi için acil durum maskesi (belirli sınıflar için).",
        "Küreğe benzer ekipman, kanalizasyon örtüsü, toplama kabı (dökülme durumları için).",
        "Sınıfa özel ek koruyucu ekipman (SDS/yazılı talimatta belirtildiği şekilde).",
      ]},
      { type: "subheading", text: "Uygulama" },
      { type: "paragraph", text: "Sevkiyat öncesi tüm teçhizatın araçta eksiksiz ve kullanılabilir durumda olduğu kontrol edilir ve K8 formuna işlenir. Eksik teçhizatla sevkiyat yapılmaz." },
    ],
  },

  T20: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2024",
    amac: "Bu talimat; karışık yükleme kontrolü, tespit edilen ihlal durumlarında izlenecek yol ve boş YTB (yük taşıma birimi) taşınırken gerekli taşıma evrakı kurallarını belirler.",
    kapsam: "Tehlikeli madde taşıyan tüm araçlar ve boş/temizlenmemiş YTB taşımaları için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Karışık Yükleme Kontrolü" },
      { type: "paragraph", text: "Sevkiyat öncesi araca yüklenen tüm maddelerin ADR 7.5.2 uyumluluk tablosuna göre birlikte taşınabilir olduğu doğrulanır (bkz. T6)." },
      { type: "subheading", text: "İhlal Durumunda İzlenecek Yol" },
      { type: "bullet", items: [
        "Sevkiyat sırasında bir ADR ihlali (eksik belge, yanlış etiketleme, uygunsuz yükleme vb.) tespit edilirse taşıma derhal durdurulur.",
        "İhlal, TMGD'ye ve ilgili sorumlu kişiye bildirilir; giderilmeden sevkiyata devam edilmez.",
        "İhlalin niteliğine göre gerekiyorsa yetkili mercilere (İl Müdürlüğü vb.) bilgi verilir.",
      ]},
      { type: "subheading", text: "Boş YTB Taşıma Evrakı" },
      { type: "bullet", items: [
        "Temizlenmemiş boş YTB, önceki yükün taşıma evrakı ve etiketleriyle (veya \"BOŞ, TEMİZLENMEMİŞ\" ibaresiyle) taşınmaya devam eder; ADR kuralları uygulanmaya devam eder.",
        "Boş taşımada da SRC5 belgeli sürücü ve araç teçhizatı zorunluluğu geçerlidir.",
      ]},
    ],
  },

  K8: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2024",
    blocks: [
      { type: "subheading", text: "Araç ve Sürücü Bilgileri" },
      { type: "bullet", items: ["Tarih: ……………", "Araç Plaka No: ……………", "Sürücü Adı Soyadı: ……………", "SRC5 Belge No: ……………"] },
      { type: "subheading", text: "Teçhizat Kontrolü (Evet / Hayır)" },
      { type: "bullet", items: [
        "Takozlar mevcut mu?",
        "Uyarı işaretleri (2 adet, kendinden ayakta duran) mevcut mu?",
        "Uyarı yeleği, aydınlatma cihazı, koruyucu eldiven, göz koruması mürettebat sayısınca mevcut mu?",
        "Yangın söndürücüler (araç ve yük sınıfına uygun sayı/kapasitede) mevcut mu?",
        "Sınıfa özel ek ekipman (acil durum maskesi, dökülme müdahale seti vb.) mevcut mu?",
        "Tüm ekipmanın son kullanma/muayene tarihleri geçerli mi?",
      ]},
      { type: "subheading", text: "Kontrolü Yapan" },
      { type: "bullet", items: ["Adı: ……………", "İmzası: ……………", "Tarih: ……………"] },
    ],
  },

  K9: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2024",
    blocks: [
      { type: "subheading", text: "Belge Kontrolü (Evet / Hayır)" },
      { type: "bullet", items: [
        "ADR/Taşıt Uygunluk Belgesi geçerli mi?",
        "Araç periyodik muayenesi güncel mi?",
        "Sürücü SRC5 belgesi geçerli mi?",
        "Taşıma evrakı (ADR 5.4.1) eksiksiz mi?",
        "Yazılı talimatlar (ADR 5.4.3) araçta mevcut mu?",
        "Tehlikeli Madde Faaliyet Belgesi (Taşımacı) mevcut mu?",
        "Araç levha/etiket/plaka kontrolü yapıldı mı?",
      ]},
      { type: "subheading", text: "Kayıt Bilgileri" },
      { type: "bullet", items: ["Tarih: ……………", "Araç Plaka No: ……………", "Sürücü Adı Soyadı: ……………", "Kontrolü Yapan: ……………"] },
    ],
  },

  // ═══════════════════════════ LİSTELER (L1, L3, L4) ═══════════════════════════

  L1: {
    docType: "LİSTE",
    yayinTarihi: "01.11.2024",
    amac: "Bu liste, işletmede bulunan/iştigal edilen tüm tehlikeli maddelerin ADR sınıf, UN numarası ve miktar bilgileriyle güncel şekilde envanterinin tutulmasını sağlar.",
    kapsam: "İşletmenin faaliyet konusuna giren tüm tehlikeli maddeler için geçerlidir.",
    blocks: [
      { type: "paragraph", text: "Envanterde her madde için aşağıdaki bilgiler tutulur:" },
      { type: "bullet", items: [
        "Madde Adı / Ticari Adı", "UN Numarası", "ADR Sınıfı", "Ambalaj Grubu (PG)",
        "Yıllık Ortalama/Azami Miktar", "Depolama/Kullanım Yeri", "Güvenlik Bilgi Formu (SDS) Mevcudiyeti",
        "Muafiyet Kapsamında Olup Olmadığı (ADR 1.1.3.6)",
      ]},
      { type: "paragraph", text: "Envanter, yeni madde eklendiğinde/çıkarıldığında güncellenir ve en az yılda bir kez TMGD tarafından gözden geçirilir." },
    ],
  },

  L3: {
    docType: "LİSTE",
    yayinTarihi: "01.11.2024",
    amac: "Bu liste, işletme adına tehlikeli madde taşıyan sürücülerin bilgilerinin ve ADR/SRC5 eğitim durumlarının takip edilmesi amacıyla tutulur.",
    kapsam: "Tehlikeli madde taşıma faaliyetinde görev alan tüm sürücüler için geçerlidir.",
    blocks: [
      { type: "paragraph", text: "Listede her sürücü için aşağıdaki bilgiler tutulur:" },
      { type: "bullet", items: [
        "Ad Soyad", "T.C. Kimlik No", "Ehliyet Sınıfı ve Geçerlilik Tarihi",
        "SRC5 Belge No ve Geçerlilik Tarihi", "Bağlı Olduğu Araç Plakası",
        "Giriş/Çıkış (İşe Başlama/Ayrılış) Tarihi",
      ]},
      { type: "paragraph", text: "SRC5 veya ehliyet geçerlilik süresi dolan sürücüler, yenileme sağlanana kadar tehlikeli madde taşıma görevinde çalıştırılmaz. Liste düzenli olarak güncellenir." },
    ],
  },

  L4: {
    docType: "LİSTE",
    yayinTarihi: "01.11.2024",
    amac: "Bu liste, paketleme ve dolum süreçlerinde kullanılan ambalaj/ekipman envanterinin ve muayene durumlarının takibi amacıyla tutulur.",
    kapsam: "Paketleyen ve dolduran faaliyetlerinde kullanılan tüm ambalaj ve basınçlı ekipmanlar için geçerlidir.",
    blocks: [
      { type: "paragraph", text: "Listede her ekipman/ambalaj türü için aşağıdaki bilgiler tutulur:" },
      { type: "bullet", items: [
        "Ekipman/Ambalaj Tanımlama No", "Türü (ambalaj / basınçlı kap / tank)", "UN Sertifika No (varsa)",
        "Son Muayene/Test Tarihi", "Bir Sonraki Muayene Tarihi", "Durum (Kullanımda / Hizmet Dışı / Bertaraf Edildi)",
      ]},
      { type: "paragraph", text: "Muayene tarihi yaklaşan veya geçen ekipmanlar bu listeden takip edilerek T9/T10 talimatlarına göre işlem yapılır." },
    ],
  },

  // ═══════════════════════════ SEFER / AKTARIM (SA1-SA3) ═══════════════════════════

  SA1: {
    docType: "LİSTE",
    yayinTarihi: "01.11.2024",
    amac: "Bu form, tehlikeli madde sevkiyatı yapan her seferin (aracın çıkış-varış sürecinin) takip edilmesi amacıyla kullanılır.",
    kapsam: "Taşımacı faaliyeti kapsamındaki tüm seferler için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Sefer Bilgileri" },
      { type: "bullet", items: [
        "Sefer Tarihi", "Araç Plaka No", "Sürücü Adı Soyadı", "Çıkış Noktası", "Varış Noktası",
        "Taşınan Madde / UN No / Miktar", "Çıkış Saati", "Varış Saati (Gerçekleşen)", "Sefer Durumu (Tamamlandı / Devam Ediyor / İptal)",
      ]},
      { type: "paragraph", text: "Her sefer tamamlandığında ilgili satır doldurularak kayıt altına alınır; olağandışı bir durum (gecikme, kaza, ihlal) varsa açıklama bölümüne not düşülür." },
    ],
  },

  SA2: {
    docType: "LİSTE",
    yayinTarihi: "01.11.2024",
    amac: "Bu kayıt, bir taşıma biriminden diğerine yapılan tehlikeli madde aktarım işlemlerinin (örn. araçtan araca, tanktan tanka) belgelenmesi amacıyla tutulur.",
    kapsam: "Boşaltan ve Yükleyen faaliyetleri kapsamında gerçekleştirilen tüm aktarım işlemleri için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Aktarım Bilgileri" },
      { type: "bullet", items: [
        "Aktarım Tarihi", "Madde Adı / UN No", "Kaynak Taşıma Birimi (Plaka/Tank No)",
        "Hedef Taşıma Birimi (Plaka/Tank No)", "Aktarılan Miktar", "Aktarımı Yapan Personel",
        "Sızıntı/Dökülme Yaşandı mı? (Evet/Hayır — açıklama)",
      ]},
      { type: "paragraph", text: "Aktarım öncesi her iki taşıma biriminin de maddeye uygunluğu ve sızdırmazlığı kontrol edilir; aktarım sonrası kayıt bu forma işlenir." },
    ],
  },

  SA3: {
    docType: "LİSTE",
    yayinTarihi: "01.11.2024",
    amac: "Bu kayıt, firmanın ADR kapsamındaki tüm belgelerinin (TMFB, sözleşme, sertifikalar, muayene belgeleri vb.) tek bir yerden takip edilmesi amacıyla tutulur.",
    kapsam: "İşletmenin ADR mevzuatı kapsamında sahip olması gereken tüm belgeler için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Takip Edilecek Belgeler" },
      { type: "bullet", items: [
        "Tehlikeli Madde Faaliyet Belgesi (TMFB) ve geçerlilik tarihi",
        "TMGD Hizmet Sözleşmesi ve TMGD Sertifikası",
        "Araç ADR/Taşıt Uygunluk Belgeleri ve muayene tarihleri",
        "Sürücü SRC5 belgeleri ve geçerlilik tarihleri",
        "Basınçlı ekipman/tank muayene belgeleri",
        "Yıllık Faaliyet Raporları ve Ziyaret Raporları",
      ]},
      { type: "paragraph", text: "Bu kayıt, Belge Takip modülündeki verilerle tutarlı olacak şekilde düzenli olarak güncellenir; süresi yaklaşan/geçen belgeler öncelikli olarak takip edilir." },
    ],
  },
};

export function belgeSablonu(code: string): BelgeSablonu | undefined {
  return BELGE_SABLONLARI[code];
}
