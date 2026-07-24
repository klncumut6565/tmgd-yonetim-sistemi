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
  | { type: "numbered"; items: string[] }
  | { type: "table"; headers?: string[]; rows: string[][]; note?: string; colWidths?: number[] }
  // Orijinal belgelerde yer alan görseller (ADR levhaları, teçhizat
  // görselleri vb.). `ids` içindeki anahtarlar belgeGorselleri.ts'te
  // tanımlıdır; `sutun` bir satırda kaç görsel yan yana dizileceğini,
  // `yukseklik` ise mm cinsinden görsel yüksekliğini belirtir.
  | { type: "images"; ids: string[]; sutun?: number; yukseklik?: number; note?: string };

export type BelgeSablonu = {
  /** true ise belge YATAY (landscape) A4 üretilir — çok sütunlu matris
   *  tabloları dikey sayfaya sığmadığı için (örn. T20 karışık yükleme). */
  yatay?: boolean;
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
    yayinTarihi: "17.06.2025",
    amac: "Bu prosedür, ADR kapsamında taşınan tehlikeli maddelerin işletme tarafından alıcı sıfatıyla güvenli ve düzenli bir şekilde teslim alınmasını, depolanmasını ve işlenmesini sağlamak amacıyla hazırlanmıştır.",
    kapsam: "Bu prosedür, ADR kapsamında taşınan tehlikeli maddelerin işletmeye ulaştığı andan itibaren geçerlidir ve teslim alma, kabul kontrolü, depolama ve kayıt süreçlerinde görev alan tüm personeli kapsar.",
    blocks: [
      { type: "subheading", text: "3. Yükümlülükler ve Uygulamalar" },
      { type: "subheading", text: "3.1. Teslimat Kontrolü" },
      { type: "subheading", text: "a) Yükün Kabul Edilmeme Kriterleri?" },
      { type: "paragraph", text: "Teslim alınacak yüklerde aşağıdaki durumlar tespit edilirse, yük tesise kabul edilmez:" },
      { type: "bullet", items: [
        "Yanlış veya Eksik Etiketleme: ADR’ye uygun işaretleme ve etiketleme yapılmamışsa.",
        "Ambalajlama Problemleri: Ambalajda yırtılma, sızıntı, fiziksel hasar veya uygunluk belgesinin bulunmaması durumunda.",
        "Uygun Dokümanların Eksikliği: ADR taşıma evrakları, güvenlik bilgi formları (GBF/SDS) eksikse veya hatalı düzenlenmişse.",
        "Araç ve Ekipman Eksiklikleri: Taşıma araçlarının ADR'ye uygun olmaması, güvenlik ekipmanlarının eksik olması veya araçta uygunsuz donanım bulunması.",
        "Yükün Taşımaya Uygun Olmaması: Yanıcı, patlayıcı, toksik maddelerin taşımaya uygun şekilde hazırlanmadığı durumlar.",
        "Taşıma Zinciri Uygunsuzluğu: Nakliyat sırasında zincirleme bir risk oluşturabilecek kusurlar veya standart dışı uygulamalar tespit edilmesi.",
      ]},
      { type: "subheading", text: "b) Yükün Kabul Edilme Kriterleri?" },
      { type: "paragraph", text: "Teslim alınacak yüklerde aşağıdaki hususlar dikkate alınır:" },
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
      { type: "subheading", text: "a) Depolama Alanı ve Düzenlemeler" },
      { type: "bullet", items: [
        "Tehlikeli maddeler, İSG yönetmeliklerine uygun olarak belirlenmiş alanlarda depolanır.",
        "Depolama alanının fiziksel güvenlik şartları sağlanır ve düzenli olarak denetlenir.",
        "Yanıcı, patlayıcı ve diğer tehlikeli maddeler ayrı ve uygun alanlarda depolanır.",
      ]},
      { type: "subheading", text: "b) Güvenlik Önlemleri" },
      { type: "bullet", items: [
        "Taşıtlardan boşaltma yapıldığı sırada taşıtların yakın çevresinde ateş yakılmasına, açık ışıklandırma yapılmasına ve sigara içilmesine izin verilmez.",
        "Kıvılcım çıkma özelliğine sahip cisimler bulundurulmaz ve bu özelliklere sahip giysilerle çalışmaya müsaade edilmez.",
        "Yangın söndürücüler ve diğer acil durum ekipmanları her zaman hazır bulundurulur.",
        "Boşaltma alanında uygun uyarı işaretleri bulundurulur.",
      ]},
      { type: "subheading", text: "3.3. Eğitim ve Bilgilendirme" },
      { type: "subheading", text: "a) Personel Eğitimi" },
      { type: "bullet", items: [
        "İlgili personel, ADR kapsamında tehlikeli maddelerle ilgili gerekli eğitimleri alır.",
        "Personele, tehlikeli maddelerin güvenli taşınması, depolanması ve kullanımı hakkında düzenli bilgilendirmeler yapılır.",
        "Yeni personel, işe başlamadan önce gerekli eğitimleri tamamlamalıdır.",
      ]},
      { type: "subheading", text: "b) Acil Durum Hazırlıkları" },
      { type: "bullet", items: [
        "Tehlikeli maddelerle ilgili acil durum planları ve talimatları oluşturulur ve duyurulur.",
        "İlk yardım malzemeleri ve acil durum ekipmanlarının düzenli kontrolü yapılır ve güncel tutulur.",
        "Acil durum tatbikatları düzenli olarak yapılır ve kayıt altına alınır.",
      ]},
      { type: "subheading", text: "3.4. Atık Yönetimi" },
      { type: "subheading", text: "a) Atık Bertarafı" },
      { type: "bullet", items: [
        "Tehlikeli maddelerin atık yönetimi prosedürlerine uygun olarak bertaraf edilmesi sağlanır.",
        "Atıkların güvenli ve çevreye zarar vermeyecek şekilde işlenmesi temin edilir.",
        "Atık yönetimi için lisanslı ve yetkili firmalarla çalışılır.",
        "Atıkların miktarı, türü ve bertaraf yöntemleri düzenli olarak kayıt altına alınır.",
      ]},
      { type: "subheading", text: "3.5. Kayıt Tutma ve Yasal Uyumluluk" },
      { type: "subheading", text: "a) Kayıt Tutma" },
      { type: "bullet", items: [
        "Teslim alınan tehlikeli maddelerle ilgili tüm kayıtlar tutulur ve arşivlenir.",
        "Güvenlik bilgi formları (SDS) ve diğer belgeler düzenli olarak güncellenir.",
        "Tüm işlemler ve denetimler kayıt altına alınır ve gerektiğinde ilgili mercilere sunulur.",
      ]},
      { type: "subheading", text: "b) Yasal Uyumluluk" },
      { type: "bullet", items: [
        "ADR ve diğer ilgili yasal düzenlemelere uyum sağlanır.",
        "Düzenli olarak iç denetimlerle uyumluluk kontrol edilir.",
        "Yasal değişiklikler ve güncellemeler takip edilerek prosedürler gerektiğinde revize edilir.",
      ]},
      { type: "subheading", text: "3.6. Turuncu Plakanın Özellikleri" },
      { type: "paragraph", text: "Plaka(Yazılı ya da Boş), 15 dakikalık yangına maruz kalma durumunda takıldığı yuvadan çıkmayacaktır. Aracın istikametinden bağımsız olarak sabit kalacaktır. Turuncu renkli plakalar, yukarıda belirtilen ebatlarda belirtilen şekilde olacak ve 15 mm kalınlıkta siyah yatay bir çizgi ile ortadan ikiye ayrılacaktır." },
      { type: "images", ids: ["turuncu_plaka"], sutun: 1, yukseklik: 55 },
      { type: "subheading", text: "3.7. Tehlikeli Madde Taşıyan Araçlarda Bulunması Gerekenler (Dökümantasyon)" },
      { type: "bullet", items: [
        "Şoför SRC5 Belgesi (Tehlikeli Madde Taşımacılığı Sürücü Eğitim Sertifikası- Tank Taşımacılığına uygun olmalıdır.)",
        "Araç Ekibinin Resimli Kimlik Belgeleri (Pasaport, Kimlik)",
        "ADR Araç Uygunluk Belgesi/Taşıt Uygunluk Belgesi ( 1 yıl geçerlidir.)",
        "Taşıma Evrakı (CMR Belgesi)/Çok Modlu Mal Taşıma Formu (Farklı modlarda yapılan taşımalar için kullanılır.)",
        "Yazılı Talimat/Kaza Talimatı",
        "Ambalajlı gönderimler için Ambalaj Uygunluk Sertifikası",
        "Ambalajlı gönderimler için ADR etiket kontrolü",
        "Tehlikeli Madde Faaliyet Belgesi",
        "Taşıma Yetki Belgesi",
      ]},
      { type: "subheading", text: "3.8. Tehlikeli Madde Taşıyan Araçlarda Bulunması Gerekenler Yangın Tüpleri" },
      { type: "bullet", items: [
        "Yangınlar, yanan maddenin yapısal formu bakımından sınıflara ayrılırlar: ‘’A ‘’sınıfı yangınlar: Katı madde yangınları (odun, kömür, kağıt, ot, kauçuk, şeker, deri)",
        "‘’B’’ sınıfı yangınlar: Sıvı madde yangınları (gaz yağı, benzin, mazot, alkol, vernik, yağlı boyalar)",
        "‘’C’’ sınıfı yangınlar: Gaz madde yangınları (metan, propan, bütan, Ipg, asetilen, doğalgaz, hidrojen vb.)",
        "‘’D’’ sınıfı yangınlar: Hafif metal yangınları (alüminyum, magnezyum, sodyum, potasyum, lityum vb.)",
      ]},
      { type: "paragraph", text: "ADR'ye göre araç ünitelerinde bulunması gereken söndürücülerin asgari miktarları aşağıdaki tabloda verilmiştir:" },
      { type: "table",
        headers: [
          "Taşıma biriminin azami kütlesi (azami yüklü ağırlık)",
          "Yangın söndürücünün asgari sayısı",
          "Taşıma ünitesindeki asgari toplam kapasite",
          "Motor veya sürücü kabini için asgari kapasite",
          "Kabin dışındaki ek söndürücülerden en az birinin asgari kapasitesi",
        ],
        colWidths: [1.6, 1.0, 1.1, 1.1, 1.2],
        rows: [
          ["3,5 tondan küçük", "2", "4 kg", "2 kg", "2 kg"],
          ["3,5 - 7,5 ton arası", "2", "8 kg", "2 kg", "6 kg"],
          ["7,5 tondan büyük", "2", "12 kg", "2 kg", "6 kg"],
        ],
        note: "Kapasiteler kuru toz (ya da söndürmede kullanılan diğer uygun eşdeğer ajan madde) cihazları içindir." },
      { type: "bullet", items: [
        "NOT: Araçta bulunması zorunlu olan yangın söndürme tüplerinin özellik, sayı ve kapasitelerinin kontrol edilmesi. Bu tüplerin, test tarihlerinin geçip geçmediği, mührünün olmadığı kontrol edilecektir.",
        "YANGIN EKİPMANLARI TAŞIYICI FİRMA TARAFINDAN TEDARİK EDİLEREK ARACA VERİLMESİ GEREKLİDİR.",
      ]},
      { type: "subheading", text: "3.9. Tehlikeli Madde Taşıyan Araçlarda Bulunması Gereken Teçhizatlar ve Kişisel Koruyucu Donanımlar" },
      { type: "images",
        ids: ["tec1","tec2","tec3","tec4","tec5","tec6","tec7","tec8","tec9","tec10","tec11","tec12","tec13"],
        sutun: 4, yukseklik: 26,
        note: "Yukarıdaki teçhizat ve kişisel koruyucu donanımlar, ADR 8.1.5 uyarınca taşıma ünitesinde eksiksiz bulundurulur." },
      { type: "bullet", items: [
      ]},
    ],
  },
  P2: {
    docType: "PROSEDÜR",
    yayinTarihi: "17.06.2025",
    amac: "Bu prosedür, ADR kapsamında taşınan tehlikeli maddelerin işletme tarafından boşaltan sıfatıyla güvenli ve mevzuata uygun şekilde boşaltılmasını; boşaltma öncesinde, sırasında ve sonrasında alınması gereken önlemlerin belirlenmesini sağlamak amacıyla hazırlanmıştır.",
    kapsam: "Bu prosedür, işletme sahasında gerçekleştirilen ambalajlı, dökme ve tank yük boşaltma işlemlerinin tamamını; bu işlemlerde görev alan personeli, kullanılan ekipmanları ve boşaltma alanının güvenlik şartlarını kapsar.",
    tanimlar: [
      { terim: "Ambalajlı Yük", tanim: "Tehlikeli maddelerin, ADR hükümlerine uygun kaplar veya ambalajlar içinde taşınması." },
      { terim: "Dökme Yük", tanim: "Kaplama olmadan, genellikle tank veya benzeri taşıma araçlarıyla taşınan tehlikeli maddelerdir." },
      { terim: "Tank Yük", tanim: "Tanker veya tank konteyner ile taşınan tehlikeli maddelerdir." },
      { terim: "ADR", tanim: "Tehlikeli Malların Karayolu ile Uluslararası Taşımacılığına İlişkin Avrupa Anlaşmasıdır." },
      { terim: "Alıcı", tanim: "Taşıma sözleşmesinde belirtilen yükün alıcısını veya taşıma sözleşmesinin hükümlerine göre alıcının atadığı işletme veya taşıma işlemi taşıma sözleşmesi olmadan gerçekleştiriliyorsa, varış noktasında tehlikeli maddenin idaresini üstüne alacak işletmedir." },
      { terim: "Boşaltan", tanim: "Tehlikeli madde yüklü konteyneri, çok elemanlı gaz konteyneri (MEGC), tank-konteyneri, portatif tankı bir taşıttan çıkartan; paketli tehlikeli maddeleri, küçük konteynerleri ve portatif tankları bir taşıt veya konteynerden indiren, tehlikeli maddeleri bir tanktan (sökülebilir tank, portatif tank veya tank konteyner) bir tüplü gaz tankerinden, çok elemanlı gaz konteynerinden, bir taşıttan veya dökme yük taşıyan konteynerden boşaltan işletmedir." },
      { terim: "Dolduran", tanim: "Tehlikeli maddeleri; sabit tanka (tanker), sökülebilir tanka, portatif tanka, bir tüplü gaz tankerine, çok elemanlı gaz konteynerine (MEGC) veya tank konteynere ve/veya dökme yük taşıması için bir araca veya büyük konteynere veya küçük konteynerlere dolduran herhangi bir işletmedir." },
      { terim: "Gönderen", tanim: "Kendi adına veya bir üçüncü şahıs adına tehlikeli maddeleri sevk eden işletmeyi veya taşıma işlemi bir taşıma sözleşmesine bağlı olarak yürütülüyorsa sözleşmede “Gönderen” olarak belirtilen kişidir." },
      { terim: "Kaza raporu", tanim: "ADR/RID 1.8.3.6 uyarınca işletmede; paketleme, doldurma, yükleme, boşaltma ya da taşıma sırasında meydana gelen herhangi bir kazanın, can, mal ya da çevreye etki etmesi veya zarar vermesi durumunda kaza hakkında ADR/RID 1.8.5.4’te yer alan formatta TMGD tarafından e-Devlet sistemi vasıtasıyla düzenlenen rapordur." },
      { terim: "Paketleyen", tanim: "Tehlikeli maddeleri, büyük ambalajlara ve orta boy dökme yük konteynerler de dâhil olmak üzere değişik tipteki ambalajlara yerleştiren ve gerektiğinde paketleri taşınmak üzere hazır hale getiren işletmelerdir." },
      { terim: "Taşıma Evrakı", tanim: "ADR Bölüm 5.4.1’deki bilgileri içerecek şekilde gönderen tarafından düzenlenmiş belgedir." },
      { terim: "Taşımacı", tanim: "İşletmelerden, Karayolu Taşıma Yönetmeliğine göre C1, C2, K1, K2, L1, L2, M1, M2, N1, N2, P1 ve P2 yetki belgesi sahiplerini ve tehlikeli madde taşımacılığı yapan kamu kurum ve kuruluşlardır." },
      { terim: "Tehlikeli madde (tehlikeli yük)", tanim: "ADR Bölüm 3.2’deki tehlikeli maddelerin listelendiği Tablo A’da yer alan madde ve nesnelerdir." },
      { terim: "Tehlikeli Madde Güvenlik Danışmanı (TMGD)", tanim: "İfa edeceği görev ve nitelikleri ADR Bölüm 1.8.3’te belirtilen ve Bakanlık tarafından Tehlikeli Madde Güvenlik Danışmanı Sertifikası düzenlenerek yetkilendirilen gerçek kişidir." },
      { terim: "Tehlike İkaz İşareti", tanim: "Tehlikeli yük taşımacılığında kullanılan ambalajlardaki yüklerin sınıf, tehlike derecesi ve muhteviyatı gibi özelliklerini ifade eden, harf, rakam ve şekillerin yer aldığı etikettir." },
      { terim: "Turuncu Renkli Plaka", tanim: "ADR Bölüm 5.3.2.2’de tanımlanan özellikteki plakalardır." },
      { terim: "UN Numarası", tanim: "ADR Bölüm 3.2’de Tablo A’da yer alan tehlikeli maddeleri tanımlayan 4 basamaklı Birleşmiş Milletler numarasıdır." },
      { terim: "Yazılı Talimat", tanim: "ADR Bölüm 5.4.3’te belirtildiği şekilde, taşıyıcı tarafından sürücüye verilmek üzere hazırlanan ve taşıma esnasında oluşabilecek bir kaza durumunda alınacak tedbirler ile taşınan maddelerle ilgili özelliklerin yazılı olduğu belgedir." },
      { terim: "Yükleyen", tanim: "Paketli veya dökme tehlikeli maddelerin içerisinde bulunduğu ambalaj, konteyner veya portatif tankları bir aracın içine veya üzerine veya bir konteynerin içine yükleyen işletmelerdir." },
    ],
    blocks: [
      { type: "subheading", text: "4. Boşaltma Öncesi Hazırlıklar" },
      { type: "subheading", text: "4.1. Tehlikeli Madde Tanımlaması ve Risk Analizi" },
      { type: "bullet", items: [
        "Taşınan tehlikeli maddenin sınıfı ve risk özellikleri belirlenmelidir.",
      ]},
      { type: "subheading", text: "4.2. Taşıma Belgelerinin ve Etiketlemenin Kontrolü" },
      { type: "bullet", items: [
        "Taşıma belgeleri ve etiketler kontrol edilmelidir.",
      ]},
      { type: "subheading", text: "4.3. Eğitim ve Personel Hazırlığı" },
      { type: "bullet", items: [
        "Boşaltma işlemine katılacak tüm personel, ilgili düzenlemelere uygun eğitim almalıdır.",
      ]},
      { type: "subheading", text: "4.4. Güvenlik Ekipmanlarının Kontrolü" },
      { type: "bullet", items: [
        "Yangın söndürücüler, gaz dedektörleri ve koruyucu ekipmanlar kontrol edilmelidir.",
      ]},
      { type: "subheading", text: "4.5. Boşaltma Alanının Hazırlığı" },
      { type: "bullet", items: [
        "Alanın çevresel etkilerden korunmuş, yeterli havalandırma sağlanmış olması gerekmektedir.",
      ]},
      { type: "subheading", text: "5. Boşaltma Sırasında Alınacak Güvenlik Önlemleri" },
      { type: "subheading", text: "5.1. Acil Durum Planı" },
      { type: "bullet", items: [
        "Sızıntı veya kaza durumlarında devreye girecek bir acil durum planı hazırlanmalıdır.",
      ]},
      { type: "subheading", text: "5.2. Yangın ve Patlama Öncesi ve Sırasındaki Önlemler" },
      { type: "bullet", items: [
        "Yangın söndürücüler ve diğer güvenlik önlemleri yeterli sayıda ve yerinde olmalıdır.",
      ]},
      { type: "subheading", text: "5.3. Boşaltma Süreci İzleme ve Denetim" },
      { type: "bullet", items: [
        "Boşaltma işlemi sırasında, sızıntı veya gaz salınımı olup olmadığı sürekli izlenmelidir.",
      ]},
      { type: "subheading", text: "5.4. Çevresel Güvenlik Önlemleri" },
      { type: "bullet", items: [
        "Tehlikeli madde sızıntılarının çevreye yayılmasını engelleyecek önlemler alınmalıdır.",
      ]},
      { type: "subheading", text: "5.5. İzole Alan ve Çalışan Güvenliği" },
      { type: "bullet", items: [
        "Çalışanlar, kişisel koruyucu ekipmanları kullanmalı, boşaltma alanı izole edilmelidir.",
      ]},
      { type: "subheading", text: "6. Boşaltma Sonrası Yapılması Gereken İşlemler" },
      { type: "subheading", text: "6.1. Alan Temizliği ve Sızıntı Kontrolü" },
      { type: "bullet", items: [
        "Boşaltma sonrası alan temizlenmeli, herhangi bir kimyasal kalıntı olup olmadığı kontrol edilmelidir.",
      ]},
      { type: "subheading", text: "6.2. Acil Durum Ekipmanlarının Kontrolü" },
      { type: "bullet", items: [
        "Yangın söndürücüler ve gaz maskeleri gibi acil durum ekipmanları kontrol edilmelidir.",
      ]},
      { type: "subheading", text: "6.3. Kişisel Koruyucu Ekipmanların Temizliği" },
      { type: "bullet", items: [
        "Çalışanların kullandığı koruyucu ekipmanlar temizlenmelidir.",
      ]},
      { type: "subheading", text: "6.4. Çevresel ve Sağlık Kontrolleri" },
      { type: "bullet", items: [
        "Çevresel ve sağlık kontrolü yapılmalı, kimyasal maddelere maruz kalan personel için takipler yapılmalıdır.",
      ]},
      { type: "subheading", text: "6.5. Raporlama ve Kayıt Tutma" },
      { type: "bullet", items: [
        "Boşaltma işlemi ve alınan güvenlik önlemleri kaydedilmelidir.",
      ]},
      { type: "subheading", text: "7. Yasal Yükümlülükler" },
      { type: "subheading", text: "7.1. Taşıma Belgeleri ve Yasal Yükümlülükler" },
      { type: "bullet", items: [
        "Tehlikeli maddelere dair taşınan belgeler, etiketleme ve düzenlemelere uygunluk sağlanmalıdır.",
      ]},
      { type: "subheading", text: "7.2. Taşıma Araçlarının Kontrolü" },
      { type: "bullet", items: [
        "Taşıma araçları, ADR ve Tehlikeli Maddelerin Karayoluyla Taşınması Hakkında Yönetmelik’e uygun olmalıdır.",
      ]},
      { type: "subheading", text: "8. Özellikle Boşaltma Sürecindeki Kontroller ve Önlemler" },
      { type: "subheading", text: "8.1. Tehlikeye Sokacak Durumlar ve Alınacak Önlemler" },
      { type: "bullet", items: [
        "Boşaltma öncesi ve sırasında, paket, taşıt, tank veya konteynerde boşaltma işlemini tehlikeye sokacak bir durum tespit edildiğinde, derhal gerekli önlemler alınmalıdır.",
        "Doküman Kontrolü: Boşaltma işlemini tehlikeye sokacak bir tahribat olup olmadığının kontrolüne dair bir doküman bulunmalıdır.",
      ]},
      { type: "subheading", text: "8.2. Taşıma Araçlarının Temizliği ve Dezenfekte Edilmesi" },
      { type: "bullet", items: [
        "Ambalajlı veya dökme tehlikeli madde taşımacılığında kullanılan taşıt ve konteynerlerin, ADR hükümleri çerçevesinde temizlik ve dezenfekte edilmesi sağlanmalıdır.",
        "Doküman Kontrolü: Temizlik ve dezenfekte işlemlerinin yapıldığının kontrolüne ilişkin bir doküman bulunmalıdır.",
      ]},
      { type: "subheading", text: "8.3. Tank, Taşıt veya Konteynerin Dışına Bulaşan Maddelerin Arındırılması" },
      { type: "bullet", items: [
        "Boşaltma sonrası, tank, taşıt veya konteynerin dışına bulaşan tehlikeli maddelerden arındırılmadığına dair bir durum tespit edilirse, derhal temizlik yapılmalıdır.",
        "Doküman Kontrolü: Temizlik ve arındırma işlemleri için bir doküman bulunmalıdır.",
      ]},
      { type: "subheading", text: "8.4. Tehlike İkaz Levhalarının Kaldırılması" },
      { type: "bullet", items: [
        "Konteyner tamamen boşaltıldıktan ve temizlendikten sonra, ADR Bölüm 5.3 kapsamındaki tehlike ikaz levhalarının kaldırılmadığı bir durum tespit edilirse, gerekli işlem yapılmalıdır.",
        "Doküman Kontrolü: İkaz levhalarının kaldırılması sürecine dair bir doküman bulunmalıdır.",
      ]},
    ],
  },
  P3: {
    docType: "PROSEDÜR",
    yayinTarihi: "17.06.2025",
    amac: "Bu prosedürün amacı, işletmenin iştigal ettiği tehlikeli maddelerin sevkiyatı sırasında uyulması gereken tüm düzenlemeleri tanımlamak, güvenli ve yasalara uygun taşımacılığı sağlamak, çevre ve insan sağlığı üzerindeki riskleri en aza indirmektir.",
    kapsam: "Bu prosedür; tehlikeli maddelerin sevkiyatı için kullanılan taşıt, ambalaj ve yük taşıma birimlerini, taşıma araçlarının uygunluk belgeleri ile test ve muayene süreçlerini, işaretleme, etiketleme ve levha zorunluluklarını, karışık ambalajlama ve yükleme kurallarını, tehlikeli maddelerin tanımlama ve sınıflandırma yöntemlerini kapsar.",
    tanimlar: [
      { terim: "ADR", tanim: "Tehlikeli Malların Karayolu ile Uluslararası Taşımacılığına İlişkin Avrupa Anlaşmasıdır." },
      { terim: "Gönderen", tanim: "Kendi adına veya bir üçüncü şahıs adına tehlikeli maddeleri sevk eden işletmeyi veya taşıma işlemi bir taşıma sözleşmesine bağlı olarak yürütülüyorsa sözleşmede “Gönderen” olarak belirtilen kişidir." },
      { terim: "Taşıma Evrakı", tanim: "ADR Bölüm 5.4.1’deki bilgileri içerecek şekilde gönderen tarafından düzenlenmiş belgedir." },
      { terim: "Taşımacı", tanim: "İşletmelerden, Karayolu Taşıma Yönetmeliğine göre C1, C2, K1, K2, L1, L2, M1, M2, N1, N2, P1 ve P2 yetki belgesi sahiplerini ve tehlikeli madde taşımacılığı yapan kamu kurum ve kuruluşlardır." },
      { terim: "Tehlikeli madde (tehlikeli yük)", tanim: "ADR Bölüm 3.2’deki tehlikeli maddelerin listelendiği Tablo A’da yer alan madde ve nesnelerdir." },
      { terim: "UN Numarası", tanim: "Tehlikeli maddelerin taşımacılıkta tanımlanmasını sağlayan dört haneli kod." },
      { terim: "Güvenlik Bilgi Formu (SDS)", tanim: "Maddelerin özelliklerini ve güvenlik önlemlerini içeren belge." },
      { terim: "ADR/Taşıt Uygunluk Belgesi", tanim: "ADR’ye uygun taşıma araçları için düzenlenen belge." },
      { terim: "Tehlikeli Madde Güvenlik Danışmanı (TMGD)", tanim: "İfa edeceği görev ve nitelikleri ADR Bölüm 1.8.3’te belirtilen ve Bakanlık tarafından Tehlikeli Madde Güvenlik Danışmanı Sertifikası düzenlenerek yetkilendirilen gerçek kişidir." },
      { terim: "Tehlike İkaz İşareti", tanim: "Tehlikeli yük taşımacılığında kullanılan ambalajlardaki yüklerin sınıf, tehlike derecesi ve muhteviyatı gibi özelliklerini ifade eden, harf, rakam ve şekillerin yer aldığı etikettir." },
      { terim: "Turuncu Renkli Plaka", tanim: "ADR Bölüm 5.3.2.2’de tanımlanan özellikteki plakalardır." },
    ],
    blocks: [
      { type: "subheading", text: "4. SORUMLULUKLAR" },
      { type: "bullet", items: [
        "Tehlikeli Madde Güvenlik Danışmanı (TMGD) : Yasal gerekliliklerin uygulanmasından sorumludur.",
        "Sevkiyat Birimi-Atık Alanı Sorumluları : Taşıma araçlarının uygunluğunun ve sevkiyat sürecinin düzenlenmesinden sorumludur.",
        "Kalite Kontrol Birimi : Ambalajların ve ekipmanların test ve muayenelerini gerçekleştirir.",
        "Sürücüler : Sevkiyat sırasında işaretleme, etiketleme ve güvenlik önlemlerine uygun hareket eder.",
      ]},
      { type: "subheading", text: "5. PROSEDÜR" },
      { type: "subheading", text: "5.1. Taşıt ve Yük Taşıma Birimlerinin Kontrolleri" },
      { type: "bullet", items: [
        "ADR/Taşıt Uygunluk Belgeleri: Sevkiyat yapılacak araçların ADR’ye uygunluk belgeleri düzenli olarak kontrol edilir.",
        "Belgeleri eksik veya geçerliliği dolmuş araçlarla sevkiyat yapılmaz.",
        "Ambalajlı taşımalarda bu belgenin sorulmasına gerek yoktur.",
        "Test ve Muayeneler: Tanker, konteyner ve taşıma ekipmanlarının periyodik muayeneleri ADR standartlarına göre yapılır.",
        "Sızdırmazlık, basınç ve dayanıklılık testleri belgelenir ve saklanır.",
        "Yük Taşıma Birimlerinin Uygunluğu: Palet, konteyner ve diğer birimlerin mekanik dayanıklılığı kontrol edilir.",
        "Hasarlı veya yetersiz taşıma birimleri kullanılmaz.",
      ]},
      { type: "subheading", text: "5.2. Ambalajların Uygunluk Kontrolleri" },
      { type: "bullet", items: [
        "UN Standartlarına Uygunluk: Sevkiyat için kullanılacak ambalajların UN sertifikalı olduğundan emin olunur.",
        "Sertifikasız veya standart dışı ambalajlar reddedilir.",
        "Ambalaj Testleri: Kimyasal ve fiziksel dayanıklılık testleri periyodik olarak yapılır.",
        "Özellikle kırılgan ve tehlikeli maddeler için özel ambalajlama kurallarına uyulur.",
      ]},
      { type: "subheading", text: "5.3. Dolumu Yapılan Taşınabilir Basınçlı Kapların Kontrolü" },
      { type: "bullet", items: [
        "Muayene Takibi: Basınçlı kapların son muayene tarihleri kontrol edilir.",
        "ADR’ye uygun olmayan kapların dolumu yapılmaz.",
        "Basınç Testleri: Kapların periyodik basınç testleri yapılır ve belgelenir.",
        "Sızdırmazlık ve güvenlik kontrolleri sevkiyattan önce tamamlanır.",
      ]},
      { type: "subheading", text: "5.4. İşaretleme, Etiketleme ve Levha Zorunlulukları" },
      { type: "bullet", items: [
        "Etiketleme: Her ambalajın ve taşıma biriminin üzerinde uygun sınıf etiketi ve UN numarası bulunmalıdır.",
        "Yanıcı, patlayıcı veya çevreye zararlı maddeler için özel işaretlemeler yapılır.",
        "Levhalar: Taşıma araçlarının ön, arka ve yanlarında ADR standartlarına uygun levhalar yer alır.",
        "Levhaların zarar görmesi durumunda hemen yenisi takılır.",
      ]},
      { type: "subheading", text: "5.5. Karışık Ambalajlama ve Yükleme Kuralları" },
      { type: "bullet", items: [
        "Uyumluluk Tabloları: Farklı sınıflardaki tehlikeli maddeler, uyumluluk tablolarına göre bir arada taşınır.",
        "Birbirine tepki verebilecek maddelerin karışık taşınmasına izin verilmez.",
        "Yükleme Düzeni: Maddeler, fiziksel özellikleri göz önüne alınarak taşınır (örneğin, sıvılar sızıntı ihtimaline karşı alta yerleştirilir).",
        "Uygunsuz yükleme durumunda sevkiyat yapılmaz.",
      ]},
      { type: "subheading", text: "5.6. Tehlikeli Maddelerin Sınıflandırılması ve Tanımlanması" },
      { type: "bullet", items: [
        "Maddeler, ADR’ye uygun şekilde UN numarası ve sınıf kodu ile tanımlanır.",
        "Kimyasal yapısı ve tehlike özellikleri dikkate alınır.",
        "Güvenlik Bilgi Formları (SDS):",
        "Her tehlikeli madde için MSDS hazırlanır ve tüm sevkiyat sürecinde erişilebilir hale getirilir.",
        "Eğitim:",
        "Çalışanlar, tehlikeli maddelerin sınıflandırılması ve taşınması konusunda düzenli olarak eğitilir.",
      ]},
      { type: "subheading", text: "6. KAYITLAR" },
      { type: "bullet", items: [
        "Araç ve ekipman muayene kayıtları",
        "Ambalaj ve yük taşıma birimi uygunluk belgeleri",
        "İşaretleme ve etiketleme kontrol listeleri",
        "Test ve muayene raporları",
      ]},
      { type: "subheading", text: "7. REVİZYON" },
      { type: "bullet", items: [
        "Bu prosedür yılda bir kez gözden geçirilir ve gerekirse güncellenir. Yasal düzenlemelerde değişiklik olması durumunda prosedür hemen revize edilir.",
      ]},
      { type: "subheading", text: "8. YÜRÜRLÜK" },
      { type: "bullet", items: [
        "Bu prosedür, işletme yönetimi tarafından onaylandıktan sonra yürürlüğe girer.",
      ]},
    ],
  },
  P4: {
    docType: "PROSEDÜR",
    yayinTarihi: "17.06.2025",
    amac: "Bu prosedür, işletme tarafından taşınacak veya sevk edilecek tehlikeli maddelerin ADR ve Tehlikeli Maddelerin Karayoluyla Taşınması Hakkında Yönetmelik hükümlerine uygun olarak doğru şekilde tanımlanması ve sınıflandırılması amacıyla hazırlanmıştır.",
    kapsam: "Bu prosedür, işletme bünyesinde bulunan veya sevkiyatı yapılacak tehlikeli maddelerin tanımlanması, UN numarasının belirlenmesi, tehlike sınıfı, ambalaj grubu ve uygun taşımacılık kategorisinin atanması ile ADR kapsamındaki belgelerinin hazırlanması işlemlerini kapsar.",
    tanimlar: [
      { terim: "ADR", tanim: "Tehlikeli Malların Karayolu ile Uluslararası Taşımacılığına İlişkin Avrupa Anlaşmasıdır." },
      { terim: "Gönderen", tanim: "Kendi adına veya bir üçüncü şahıs adına tehlikeli maddeleri sevk eden işletmeyi veya taşıma işlemi bir taşıma sözleşmesine bağlı olarak yürütülüyorsa sözleşmede “Gönderen” olarak belirtilen kişidir." },
      { terim: "Taşıma Evrakı", tanim: "ADR Bölüm 5.4.1’deki bilgileri içerecek şekilde gönderen tarafından düzenlenmiş belgedir." },
      { terim: "Tehlikeli Madde", tanim: "İnsan sağlığına, çevreye veya mülke zarar verebilecek fiziksel, kimyasal veya biyolojik özelliklere sahip maddeler." },
      { terim: "Ambalaj Grubu (Packing Group, PG)", tanim: "Maddenin tehlike seviyesine göre sınıflandırılması (PG I: Yüksek tehlike, PG II: Orta tehlike, PG III: Düşük tehlike)" },
      { terim: "Tehlike Sınıfı", tanim: "Maddenin özelliklerine göre ADR'de belirlenen 1’den 9’a kadar olan sınıflandırma." },
      { terim: "UN Numarası", tanim: "Tehlikeli maddelerin taşımacılıkta tanımlanmasını sağlayan dört haneli kod." },
      { terim: "Güvenlik Bilgi Formu (SDS)", tanim: "Maddelerin özelliklerini ve güvenlik önlemlerini içeren belge." },
      { terim: "Tehlikeli Madde Güvenlik Danışmanı (TMGD)", tanim: "İfa edeceği görev ve nitelikleri ADR Bölüm 1.8.3’te belirtilen ve Bakanlık tarafından Tehlikeli Madde Güvenlik Danışmanı Sertifikası düzenlenerek yetkilendirilen gerçek kişidir." },
      { terim: "Tehlike İkaz İşareti", tanim: "Tehlikeli yük taşımacılığında kullanılan ambalajlardaki yüklerin sınıf, tehlike derecesi ve muhteviyatı gibi özelliklerini ifade eden, harf, rakam ve şekillerin yer aldığı etikettir." },
    ],
    blocks: [
      { type: "subheading", text: "4. PROSEDÜR ADIMLARI" },
      { type: "bullet", items: [
        "Madde Bilgilerinin Toplanması:",
        "Maddenin kimyasal adı, ticari adı, formülasyonu, fiziksel hali (katı, sıvı, gaz), konsantrasyonu gibi bilgileri Güvenlik Bilgi Formundan (SDS) alınır.",
        "Maddenin patlama, yanıcılık, toksisite ve reaktivite gibi özellikleri değerlendirilir.",
        "SDS İncelemesi:",
        "Maddeye ait SDS incelenerek aşağıdaki kritik bilgiler doğrulanır:",
        "Kimyasal bileşenler",
        "Tehlike sınıflandırması",
        "Taşıma bilgileri (ADR sınıfı, UN numarası, ambalaj grubu).",
        "UN Numarasının Belirlenmesi:",
        "ADR Bölüm 3.2'de yer alan Tehlikeli Maddeler Listesi kullanılarak maddenin kimyasal özelliklerine uygun UN numarası seçilir.",
        "Listede bulunmayan maddeler için aşağıdaki adımlar uygulanır:",
        "Maddenin fiziksel hali ve tehlike potansiyeli değerlendirilir.",
        "ADR Bölüm 2'deki sınıflandırma kriterlerine göre madde sınıfı ve uygun UN numarası atanır.",
      ]},
      { type: "subheading", text: "4.2. Sınıflandırma Süreci" },
      { type: "bullet", items: [
        "Tehlike Sınıfının Belirlenmesi: Maddenin fiziksel, kimyasal ve biyolojik özellikleri dikkate alınarak aşağıdaki ADR sınıflarından biri atanır:",
      ]},
      { type: "bullet", items: [
        "Sınıf 1: Patlayıcılar",
        "Sınıf 2: Gazlar",
        "Sınıf 3: Yanıcı sıvılar",
        "Sınıf 4: Yanıcı katılar, kendiliğinden tutuşan maddeler",
        "Sınıf 5: Oksitleyici maddeler ve organik peroksitler",
        "Sınıf 6: Zehirli ve bulaşıcı maddeler",
        "Sınıf 7: Radyoaktif maddeler",
        "Sınıf 8: Aşındırıcı maddeler",
        "Sınıf 9: Diğer tehlikeli maddeler",
      ]},
      { type: "bullet", items: [
        "Ambalaj Grubunun (PG) Belirlenmesi: Maddenin taşınma sırasında çevreye veya insanlara olan zarar potansiyeli dikkate alınarak ambalaj grubu belirlenir:",
        "PG I: Yüksek tehlike",
        "PG II: Orta tehlike",
        "PG III: Düşük tehlike.",
      ]},
      { type: "paragraph", text: "Uygun Taşıma Kategorisinin Seçimi:" },
      { type: "bullet", items: [
        "ADR’de belirtilen taşıma kategorileri (örneğin, 0, 1, 2 veya 3) dikkate alınarak taşıma kısıtlamaları belirlenir.",
      ]},
      { type: "subheading", text: "4.3. Belgeleme ve Doğrulama" },
      { type: "bullet", items: [
        "ADR Uygunluğunun Kontrolü: Tanımlama ve sınıflandırma sonrası, maddenin ADR standartlarına uygunluğu kontrol edilir.",
        "Eksik bilgi veya uyumsuzluk varsa düzeltmeler yapılır.",
        "Belgelerin Hazırlanması: Güvenlik Bilgi Formu (SDS)",
        "Tehlikeli Madde Sınıfı",
        "Taşıma Evrakı UN numarasını içeren dokümanlar hazırlanır.",
      ]},
      { type: "subheading", text: "5. DİKKAT EDİLECEK HUSUSLAR" },
      { type: "bullet", items: [
        "Tanımlama ve sınıflandırma yalnızca yetkili ve uzman kişiler tarafından yapılmalıdır.",
        "Hatalı sınıflandırma, taşıma sırasında ciddi risklere ve yasal sorumluluklara yol açabileceğinden doğruluk mutlaka kontrol edilmelidir.",
        "İlgili tüm belgeler düzenli olarak güncellenmeli ve en az 5 yıl saklanmalıdır.",
      ]},
      { type: "subheading", text: "6. EĞİTİM VE YETKİLENDİRME" },
      { type: "bullet", items: [
        "Tanımlama ve sınıflandırma süreçlerini yürüten personel, ADR ve Tehlikeli Madde Yönetmeliği hakkında düzenli eğitim almalıdır.",
        "Eğitimlerin ardından yetki belgesi düzenlenir ve süreçlerin yalnızca yetkilendirilmiş kişilerce gerçekleştirilmesi sağlanır.",
      ]},
      { type: "subheading", text: "7. YÜRÜRLÜK" },
      { type: "bullet", items: [
        "Bu prosedür, işletme yönetiminin onayından itibaren yürürlüğe girer ve yılda bir kez veya mevzuat değişikliği durumunda gözden geçirilerek revize edilir.",
      ]},
    ],
  },
  T1: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
    amac: "Bu talimat, ambalajlı, dökme ve tank yükleriyle taşınan tehlikeli maddelerin boşaltılmasından sonra taşıt, tank veya konteynerin temizlenmesi, dezenfekte edilmesi ve güvenli bir şekilde kontrol edilmesi işlemlerini düzenler.",
    kapsam: "Ambalajlı, dökme ve tank yüklerinin taşındığı taşıtlar, tanklar, konteynerler ve diğer taşıma araçları için geçerlidir.",
    blocks: [
      { type: "subheading", text: "3. Temizlik ve Dezenfekte İşlemleri" },
      { type: "bullet", items: [
        "Boşaltma işlemi sonrasında, taşıt, tank veya konteynerin iç yüzeyleri, taşınan tehlikeli maddeye uygun şekilde temizlenmeli ve dezenfekte edilmelidir.",
        "Ambalajlı, dökme ve tank yükleri için temizlik, ADR ve yerel yönetmeliklere uygun şekilde yapılmalı ve her tür madde için özel temizlik gereksinimlerine dikkat edilmelidir.",
        "Ambalajlı yüklerde, taşıma sırasında kalabilecek kimyasal kalıntıların tamamen temizlenmesi sağlanmalıdır. Dökme yüklerde tankların iç yüzeyleri dikkatlice temizlenmelidir.",
        "Tank yükleri için, taşınan tehlikeli maddeye uygun tank temizliği ve dezenfeksiyon işlemi yapılmalıdır.",
      ]},
      { type: "subheading", text: "3.2. Temizlik İçin Kullanılan Ekipman" },
      { type: "bullet", items: [
        "Temizlikte kullanılan tüm ekipmanlar ADR ve yerel yönetmeliklere uygun olmalıdır.",
        "Temizlik sonrası ekipmanlar da aynı şekilde temizlenmeli ve dezenfekte edilmelidir.",
      ]},
      { type: "subheading", text: "3.3. Temizlik Sonrası Kontrol" },
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
    amac: "Bu doküman, tehlikeli maddelerin taşınması sırasında, boşaltma öncesi ve sırasında pakette, tankta, taşıtta veya konteynerde oluşabilecek herhangi bir tahribatın kontrol edilmesi ve olumsuz bir durumla karşılaşıldığında alınacak önlemleri tanımlar. Amaç, taşıma sırasında güvenli bir işlem sağlamak ve herhangi bir kaza, sızıntı veya çevreye zarar vermeyi önlemektir.",
    kapsam: "Ambalajlı, dökme ve tank yükleriyle taşınan tüm tehlikeli maddelerin taşınması sırasında meydana gelebilecek tahribatlara karşı alınacak önlemleri kapsar.",
    blocks: [
      { type: "subheading", text: "3. Boşaltma Öncesi Kontroller" },
      { type: "subheading", text: "Taşıma Aracının Durumu" },
      { type: "paragraph", text: "Taşıma aracı, konteyner veya tank, taşıma sırasında herhangi bir fiziksel hasar, tahribat veya sızıntıya karşı kontrol edilmelidir. Kontrol edilecek alanlar: kapaklar, vanalar, conta ve bağlantı noktaları; tank ve taşıma aracının dış yüzeyinde çatlaklar veya deformasyon; sızdırmazlık malzemelerinin durumu. Tahribat/hasar tespiti yapıldıysa boşaltma konulu kontrol dokümanına işlenir." },
      { type: "subheading", text: "Ambalajlı Yükler İçin Kontrol" },
      { type: "paragraph", text: "Ambalajın sağlamlığı ve taşıma sırasında hasar görmediği kontrol edilmelidir. Kontrol edilecek alanlar: ambalajın dış yüzeyi; etiketler ve uyarı işaretlerinin düzgünlüğü; ambalajın sızıntıya karşı dayanıklılığı." },
      { type: "subheading", text: "Dökme Yükler İçin Kontrol" },
      { type: "paragraph", text: "Tankların veya dökme yük taşıyan araçların durumu kontrol edilmelidir. Kontrol edilecek alanlar: tankın sızdırmazlık durumu; kapatma sistemleri ve vanaların durumu; araç altı ve yan yüzeyde herhangi bir sızıntı belirtisi." },
      { type: "subheading", text: "4. Boşaltma Sırasında Kontroller" },
      { type: "paragraph", text: "Boşaltma sırasında taşıma aracında, konteynerde veya tankta herhangi bir sızıntı veya tahribat olup olmadığı kontrol edilmelidir. Kontrol edilecek alanlar: sızıntıların tespiti için çevre kontrolü; vanalar, bağlantılar ve kapakların düzgün şekilde kapalı olup olmadığı; boşaltma işlemi sırasında güvenlik önlemleri (örn. yeterli havalandırma)." },
      { type: "subheading", text: "5. Olumsuz Durumda Alınacak Önlemler" },
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
    yayinTarihi: "01.11.2025",
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
      { type: "subheading", text: "3. Kayıt ve Arşivleme" },
      { type: "paragraph", text: "Test ve muayene raporları, sevkiyat belgeleri, güvenlik bilgi formları (SDS) ve taşıt uygunluk belgeleri düzenli olarak dosyalanır ve en az 5 yıl saklanır." },
    ],
  },

  // ============================= K1 — ALICI KONTROL FORMU (Konteyner Yükleme/Boşaltma) =============================
  K1: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "17.06.2025",
    amac: "Bu prosedür, ADR ve Tehlikeli Maddelerin Karayoluyla Taşınması Hakkında Yönetmelik kapsamında tehlikeli maddelerin taşınması sırasında yükleme öncesi, sırası ve sonrasında alınması gereken önlemleri ve ADR Bölüm 7.5'te belirtilen yükümlülükleri tanımlamak amacıyla hazırlanmıştır.",
    kapsam: "Bu prosedür; işletmenin sevkiyat süreçlerinde kullanılan araçları, yükleme, taşıma ve boşaltma süreçlerini, tüm işaretleme, sabitleme, belge düzenleme ve güvenlik kontrollerini kapsar.",
    tanimlar: [
      { terim: "ADR", tanim: "Tehlikeli Malların Karayolu ile Uluslararası Taşımacılığına İlişkin Avrupa Anlaşmasıdır." },
      { terim: "Yükleyen", tanim: "Paketli veya dökme tehlikeli maddelerin içerisinde bulunduğu ambalaj, konteyner veya portatif tankları bir aracın içine veya üzerine veya bir konteynerin içine yükleyen işletmelerdir." },
      { terim: "Taşıma Evrakı", tanim: "ADR Bölüm 5.4.1’deki bilgileri içerecek şekilde gönderen tarafından düzenlenmiş belgedir." },
      { terim: "Karışık Yükleme (Mixed Loading)", tanim: "Farklı tehlike sınıflarındaki maddelerin aynı araçta taşınması durumu." },
      { terim: "Tehlikeli madde (tehlikeli yük)", tanim: "ADR Bölüm 3.2’deki tehlikeli maddelerin listelendiği Tablo A’da yer alan madde ve nesnelerdir." },
      { terim: "Tehlikeli Madde", tanim: "İnsan sağlığı, çevre veya mülkiyet üzerinde zararlı etkiler oluşturabilecek maddeler." },
      { terim: "UN Numarası", tanim: "Tehlikeli maddelerin taşımacılıkta tanımlanmasını sağlayan dört haneli kod." },
      { terim: "Güvenlik Bilgi Formu (SDS)", tanim: "Maddelerin özelliklerini ve güvenlik önlemlerini içeren belge." },
      { terim: "ADR/Taşıt Uygunluk Belgesi", tanim: "ADR’ye uygun taşıma araçları için düzenlenen belge." },
      { terim: "Tehlikeli Madde Güvenlik Danışmanı (TMGD)", tanim: "İfa edeceği görev ve nitelikleri ADR Bölüm 1.8.3’te belirtilen ve Bakanlık tarafından Tehlikeli Madde Güvenlik Danışmanı Sertifikası düzenlenerek yetkilendirilen gerçek kişidir." },
      { terim: "Tehlike İkaz İşareti", tanim: "Tehlikeli yük taşımacılığında kullanılan ambalajlardaki yüklerin sınıf, tehlike derecesi ve muhteviyatı gibi özelliklerini ifade eden, harf, rakam ve şekillerin yer aldığı etikettir." },
      { terim: "Turuncu Renkli Plaka", tanim: "ADR Bölüm 5.3.2.2’de tanımlanan özellikteki plakalardır. tehlikeli madde taşındığını belirten plaka." },
    ],
    blocks: [
      { type: "subheading", text: "4. SORUMLULUKLAR" },
      { type: "bullet", items: [
        "Tehlikeli Madde Güvenlik Danışmanı (TMGD) : Yasal gerekliliklerin uygulanmasından sorumludur.",
        "Yükleme Operatörü: Ambalajların uygun şekilde yerleştirilmesi, sabitlenmesi ve etiketlenmesinden sorumludur.",
        "Yükleme Alanı Sorumlusu: Yükleme alanında güvenlik önlemlerinin alınmasını sağlar.",
      ]},
      { type: "subheading", text: "5. PROSEDÜR ADIMLARI" },
      { type: "subheading", text: "5.1. Yükleme Öncesi Alınacak Önlemler" },
      { type: "bullet", items: [
        "Araç Uygunluk Kontrolü: Aracın ADR Taşıt Uygunluk Belgesi geçerli olmalıdır.",
        "Aracın ön ve arka kısmına boş turuncu plakalar yerleştirilmelidir.",
        "Yangın söndürücüler, sızıntı setleri ve KKD gibi gerekli ekipmanların araçta bulunduğu doğrulanmalıdır.",
        "Yükleme Alanı Hazırlığı: Alan statik elektrik riskine karşı kontrol edilip topraklama yapılır.",
        "Uyarı levhaları yerleştirilir ve alan yetkisiz girişlere karşı izole edilir.",
        "Ambalaj ve Belgelerin Kontrolü: Ambalajların sızdırmaz, sağlam ve doğru işaretlemelerle donatılmış olduğu kontrol edilir.",
        "UN numarası, ADR sınıfı ve ambalaj grubu doğrulanır.",
        "SDS belgeleri hazırlanır ve sürücüye teslim edilir.",
        "Personel Yetkilendirme ve Eğitim: Yükleme personelinin ADR eğitimi aldığı kontrol edilir.",
        "KKD kullanımı zorunlu tutulur.",
      ]},
      { type: "subheading", text: "5.2. Yükleme Sırasında Alınacak Önlemler" },
      { type: "bullet", items: [
        "Ambalajların Yerleşimi: Ambalajlar devrilme, kayma ve çarpışma riskini önlemek için sabitlenir.",
        "Karışık yükleme yapılacaksa, ADR Bölüm 7.5.2’deki Karışık Yükleme Tablosu'na uygun hareket edilir.",
        "Statik Elektrik ve Ateşleme Kaynaklarının Kontrolü: Statik elektrik birikimini önlemek için topraklama yapılır.",
        "Yükleme sırasında kıvılcım oluşturabilecek cihazların kullanımı yasaktır.",
        "Etiketleme ve İşaretleme: Ambalajların üzerindeki tehlike etiketleri açık ve görünür olmalıdır.",
        "Araçta tehlike sınıfına uygun ek levhalar bulunmalıdır.",
      ]},
      { type: "subheading", text: "5.3. ADR Bölüm 7.5 Yükleme Emniyet Kuralları" },
      { type: "bullet", items: [
        "Uyumluluk Kontrolü: Farklı tehlike sınıflarına ait maddeler taşınıyorsa, uyumluluk kontrol edilir.",
        "Uyumsuz maddeler arasında fiziksel bariyer veya yeterli mesafe bırakılır.",
        "Ağırlık ve Dağılım: Yük, aracın dengesi bozulmayacak şekilde yerleştirilmelidir.",
        "Dingil ağırlık limitleri aşılmamalıdır.",
        "Çevresel Koşullar: Hava koşulları dikkate alınır; nem veya aşırı sıcaklığa karşı koruma sağlanır.",
        "Isıya duyarlı maddeler için yalıtım tedbirleri alınır.",
        "Sabitlenme Ekipmanları: Yük, hareket sırasında kaymayacak şekilde kemerler veya blokaj malzemeleri ile sabitlenir.",
      ]},
      { type: "subheading", text: "5.4. Yükleme Sonrası Alınacak Önlemler" },
      { type: "bullet", items: [
        "Son Kontroller: Yükün düzgün sabitlendiği ve aracın kapaklarının güvenli bir şekilde kapatıldığı doğrulanır.",
        "Aracın turuncu plakaları, işaret ve levhaları son kez kontrol edilir.",
        "Belge Teslimi: ADR taşıma evrakı ve SDS gibi dokümanlar sürücüye teslim edilir.",
        "Yükleme Alanının Temizliği: Yükleme alanı kontrol edilip temizlenir; herhangi bir dökülme varsa uygun şekilde temizlenir.",
      ]},
      { type: "subheading", text: "6. DİKKAT EDİLECEK HUSUSLAR" },
      { type: "bullet", items: [
        "ADR Bölüm 7.5’e uygun olmayan yüklemeler kesinlikle yapılmamalıdır.",
        "İşaretleme ve iş güvenliği kontrolleri ihmal edilmemelidir.",
        "Uyumsuzluk durumlarında sorumlu Tehlikeli Madde Güvenlik Danışmanı bilgilendirilmelidir.",
      ]},
    ],
  },
  T6: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2025",
    amac: "Bu talimat, işletmenin iştigal ettiği tehlikeli maddelerin ADR ve ilgili yönetmeliklere uygun şekilde yüklenmesi, karışık yükleme kurallarına uyulması, konteynerlerin işaretlenmesi, hasarlı ambalajların yönetimi ve yükleme emniyet kurallarının uygulanmasını sağlamayı amaçlar.",
    kapsam: "Bu talimat; tehlikeli maddelerin yüklenmesi/elleçlenmesi/karışık yüklenmesi, konteynerler üzerindeki işaretleme ve levhaların kontrolü, hasarlı/sızdırma riski taşıyan ambalajların yönetimi ve ADR Bölüm 7.5'te belirtilen yükleme emniyet kurallarını kapsar.",
    tanimlar: [
      { terim: "Ambalaj Grubu (Packing Group)", tanim: "Tehlikeli maddelerin tehlike seviyesine göre sınıflandırılmasıdır." },
      { terim: "Hasarlı Ambalaj", tanim: "Yapısal bütünlüğü bozulmuş veya sızdırma riski taşıyan kaplardır." },
    ],
    blocks: [
      { type: "subheading", text: "5.2. Karışık Yükleme Yasakları ve Ayırım Kuralları" },
      { type: "subheading", text: "Uyumluluk Kontrolü" },
      { type: "bullet", items: [
        "Farklı tehlike sınıfındaki maddelerin uyumluluğu ADR Bölüm 7.5.2'deki Karışık Yükleme Tablosuna göre kontrol edilmelidir.",
        "Uyumsuz maddeler aynı araçta veya konteynerde taşınamaz. Örneğin: yanıcı sıvılar ile oksitleyici maddeler; zehirli maddeler ile gıda maddeleri.",
      ]},
      { type: "subheading", text: "Fiziksel Ayrım" },
      { type: "bullet", items: [
        "Uyumlu olmayan maddeler arasında fiziksel bir bariyer oluşturulmalı veya yeterli mesafe bırakılmalıdır.",
        "Sıcaklık ve nem gibi çevresel faktörler dikkate alınarak uygun koşullar sağlanmalıdır.",
        "Yükler devrilmeyecek şekilde sabitlenmeli; üst üste konulan ambalajların dayanıklılığı kontrol edilmelidir.",
      ]},
      { type: "subheading", text: "4. Kontrol ve Denetim" },
      { type: "paragraph", text: "Tüm yükleme ve işaretleme işlemleri, yetkili birim veya Tehlikeli Madde Güvenlik Danışmanı tarafından kontrol edilmeli ve yapılan kontroller kayıt altına alınarak saklanmalıdır." },
    ],
  },

  T7: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2025",
    amac: "Bu talimat, konteyner ve ambalajların üzerindeki tehlike ikaz levhalarının kullanımını, araçların turuncu plaka kullanımını ve levhaların bakımını düzenler.",
    kapsam: "Tehlikeli maddelerin yüklendiği/taşındığı tüm konteyner, ambalaj ve araçlar için geçerlidir.",
    blocks: [
      { type: "subheading", text: "5.1. Yükleme ve Elleçleme Kuralları" },
      { type: "subheading", text: "Yükleme Öncesi Kontrol" },
      { type: "bullet", items: [
        "Ambalajların fiziksel bütünlüğü kontrol edilmelidir.",
        "Hasarlı, çatlak veya sızdırma riski taşıyan ambalajlar yükleme alanına alınmamalıdır.",
        "Yükleme öncesinde turuncu plakalar araca takılmalı ve doğru şekilde yerleştirildiği doğrulanmalıdır.",
      ]},
      { type: "subheading", text: "Tehlike İkaz Levhalarının Kullanımı" },
      { type: "bullet", items: [
        "Konteyner ve ambalajların üzerine ADR'de belirtilen tehlike ikaz levhaları açık ve görünür bir şekilde yerleştirilmelidir.",
        "Levhalar, taşınan maddenin tehlike sınıfına uygun olmalıdır (ör. yanıcı, aşındırıcı, zehirli).",
      ]},
      { type: "subheading", text: "Elleçleme Ekipmanları" },
      { type: "bullet", items: [
        "Yükleme sırasında statik elektrikten etkilenmeyecek uygun ekipmanlar kullanılmalıdır.",
        "Ambalajlar dikkatlice taşınmalı, çarpma ve düşme riski en aza indirilmelidir.",
      ]},
      { type: "subheading", text: "5.3. Konteyner ve Araç İşaretleme Kontrolleri" },
      { type: "bullet", items: [
        "Konteyner üzerine yerleştirilen tehlike ikaz levhaları taşınan maddenin sınıfı ile uyumlu olmalı; etiketler okunaklı ve silinmez şekilde yapıştırılmış olmalıdır.",
        "Araçların ön ve arka kısımlarına turuncu plakalar takılmalı, boş olduklarında plaka üzerindeki alanın temiz olduğundan emin olunmalıdır.",
        "Taşınan maddenin UN numarası gerektiğinde turuncu plakaya işlenmelidir.",
        "Levhaların temiz ve görünür olduğundan emin olunmalı; yıpranmış veya eksik levhalar derhal yenileriyle değiştirilmelidir.",
      ]},
    ],
  },

  T8: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2025",
    amac: "Bu talimat, hasarlı/sızdıran ambalajlar ile boş/temizlenmemiş ambalajların yönetimini ve ADR Bölüm 7.5 yükleme emniyet kurallarının uygulanmasını düzenler.",
    kapsam: "Yüklenen tüm ambalajlı, dökme ve tank yükleri için geçerlidir.",
    blocks: [
      { type: "subheading", text: "5.4. Hasarlı ve Sızdıran Ambalajlar ile Boş Ambalaj Yönetimi" },
      { type: "subheading", text: "Hasarlı Ambalajların Yönetimi" },
      { type: "bullet", items: [
        "Hasarlı veya sızdırma riski taşıyan ambalajlar kesinlikle taşımaya alınmamalıdır.",
        "Bu tür ambalajlar izolasyon altına alınarak uygun şekilde bertaraf edilmelidir.",
      ]},
      { type: "subheading", text: "Boş ve Temizlenmemiş Ambalajlar" },
      { type: "bullet", items: [
        "Temizlenmemiş boş ambalajlar, önceki içeriklerine uygun olarak tehlike ikaz levhaları ile işaretlenmelidir.",
        "Bu tür ambalajlar uyumsuz maddelerle birlikte taşınmamalıdır.",
      ]},
      { type: "subheading", text: "5.5. ADR Bölüm 7.5 Yükleme Emniyet Kurallarının Uygulanması" },
      { type: "subheading", text: "Yük Sabitleme" },
      { type: "bullet", items: [
        "Yükler, araç içinde devrilme veya kayma riski oluşturmayacak şekilde uygun ekipmanlarla sabitlenmelidir.",
        "Sabitleme ekipmanları düzenli olarak kontrol edilmelidir.",
      ]},
      { type: "subheading", text: "Statik Elektrik ve Ateşleme Kaynakları" },
      { type: "bullet", items: [
        "Yükleme sırasında statik elektriği önlemek için uygun topraklama yapılmalıdır.",
        "Alan içinde kıvılcım oluşturabilecek cihazların kullanımı yasaktır.",
        "Yükleme alanında yangın söndürme ekipmanları hazırda bulunmalı; uygunsuz durumlarda işlem hemen durdurularak TMGD bilgilendirilmelidir.",
      ]},
      { type: "subheading", text: "3. Cezai Yaptırımlar" },
      { type: "paragraph", text: "Bu talimatta belirtilen kurallara uyulmaması durumunda ilgili personele idari yaptırımlar uygulanacaktır." },
    ],
  },

  K4: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "17.06.2025",
    amac: "Bu prosedür, tehlikeli maddelerin ADR (Tehlikeli Malların Karayoluyla Taşınması Hakkında Avrupa Anlaşması) 4.1'de belirtilen paketleme talimatlarına uygun şekilde paketlenmesi, iş sağlığı ve güvenliği, çevre koruma ve yasal uygunluk çerçevesinde alınması gereken önlemleri, süreçleri ve sorumlulukları tanımlamayı amaçlamaktadır.",
    kapsam: "Bu prosedür, işletme bünyesinde gerçekleştirilen tüm tehlikeli madde paketleme işlemlerini ve bu işlemlerde görev alan çalışanları, kullanılan ekipmanları, ambalajlama süreçlerini ve ilgili diğer faaliyetleri kapsar.",
    tanimlar: [
      { terim: "ADR", tanim: "Tehlikeli Malların Karayolu ile Uluslararası Taşımacılığına İlişkin Avrupa Anlaşmasıdır." },
      { terim: "Paketleyen", tanim: "Tehlikeli maddeleri, büyük ambalajlara ve orta boy dökme yük konteynerler de dâhil olmak üzere değişik tipteki ambalajlara yerleştiren ve gerektiğinde paketleri taşınmak üzere hazır hale getiren işletmelerdir." },
      { terim: "Taşıma Evrakı", tanim: "ADR Bölüm 5.4.1'deki bilgileri içerecek şekilde gönderen tarafından düzenlenmiş belgedir." },
      { terim: "Tehlikeli Madde (Tehlikeli Yük)", tanim: "ADR Bölüm 3.2'deki tehlikeli maddelerin listelendiği Tablo A'da yer alan madde ve nesnelerdir." },
      { terim: "UN Numarası", tanim: "Tehlikeli maddelerin taşımacılıkta tanımlanmasını sağlayan dört haneli koddur." },
      { terim: "Güvenlik Bilgi Formu (SDS)", tanim: "Maddelerin özelliklerini ve güvenlik önlemlerini içeren belgedir." },
      { terim: "Tehlikeli Madde Güvenlik Danışmanı (TMGD)", tanim: "İfa edeceği görev ve nitelikleri ADR Bölüm 1.8.3'te belirtilen ve Bakanlık tarafından Tehlikeli Madde Güvenlik Danışmanı Sertifikası düzenlenerek yetkilendirilen gerçek kişidir." },
      { terim: "Tehlike İkaz İşareti", tanim: "Tehlikeli yük taşımacılığında kullanılan ambalajlardaki yüklerin sınıf, tehlike derecesi ve muhteviyatı gibi özelliklerini ifade eden, harf, rakam ve şekillerin yer aldığı etikettir." },
      { terim: "KKD (Kişisel Koruyucu Donanım)", tanim: "Çalışanları iş risklerine karşı koruyan ekipmanlardır (eldiven, maske vb.)." },
    ],
    blocks: [
      { type: "subheading", text: "4. Prosedür Adımları" },
      { type: "subheading", text: "4.1. Paketleme Öncesi Yapılacak İşlemler" },
      { type: "subheading", text: "4.1.1. Risk Değerlendirmesi ve Planlama" },
      { type: "bullet", items: [
        "Taşınacak tehlikeli maddenin türü ve özellikleri analiz edilir.",
        "Maddenin ADR sınıfı ve UN numarası belirlenir.",
        "Yapılan analizlere göre uygun ambalaj türü ve güvenlik önlemleri belirlenir.",
        "SDS (Güvenlik Bilgi Formu) raporları tedarik edilir.",
      ]},
      { type: "subheading", text: "4.1.2. Ambalaj Seçimi ve Hazırlığı" },
      { type: "bullet", items: [
        "ADR 4.1'e uygun, UN onaylı ambalajlar seçilir.",
        "Ambalajların temiz, hasarsız ve uygunluk işaretlerinin belirgin olduğu doğrulanır.",
        "Gerekirse ambalaja dolum öncesi emici materyaller temin edilir.",
      ]},
      { type: "subheading", text: "4.1.3. Eğitim ve Bilgilendirme" },
      { type: "bullet", items: [
        "Çalışanlara tehlikeli maddelerin paketlenmesi, işaretlenmesi, acil durum prosedürleri ve ADR gereklilikleri hakkında eğitim verilir.",
        "Çalışanların KKD kullanımı konusunda bilgilendirilmesi sağlanır.",
      ]},
      { type: "subheading", text: "4.2. Paketleme Sırasında Yapılacak İşlemler" },
      { type: "subheading", text: "4.2.1. Çalışma Alanının Güvenliği" },
      { type: "bullet", items: [
        "Paketleme alanında yalnızca yetkili personelin bulunması sağlanır.",
        "Alan temiz ve düzenli tutulur; dökülme ve sızıntılara karşı dökülme kitleri hazır bulundurulur.",
      ]},
      { type: "subheading", text: "4.2.2. Ambalajlama Süreci" },
      { type: "bullet", items: [
        "Tehlikeli madde, ambalajlama talimatlarında belirtilen şekilde ve miktarda ambalajlanır.",
        "Ambalajın kapasitesi aşılmamalı, uygun dolum oranı sağlanmalıdır.",
        "Kapaklar sıkıca kapatılır, sızdırmazlık kontrolü yapılır.",
      ]},
      { type: "subheading", text: "4.2.3. Etiketleme ve İşaretleme" },
      { type: "paragraph", text: "Ambalajlara ADR'ye uygun olarak aşağıdaki işaretlemeler yapılır:" },
      { type: "bullet", items: [
        "Sınıf etiketi (ör. yanıcı sıvılar için 3 numaralı etiket).",
        "UN sertifikalı olduğunu gösteren ambalaj kodu.",
        "UN numarası ve gerekli ise madde adı yazılır.",
        "Gerekirse \"kırılabilir\" veya \"üst taraf bu yön\" gibi ek işaretlemeler yapılır.",
      ]},
      { type: "paragraph", text: "Her bir ambalaj kodu farklılık gösterir. Örnek kodlama: 5M2/Y30/S/21, TR/TSE01*0017" },
      { type: "table", headers: ["Kod Bileşeni", "Anlamı"],
        colWidths: [1.1, 3.2],
        rows: [
          ["5M2", "Çok katmanlı su geçirmez kâğıt torba"],
          ["Y", "Paketleme grubu II ve III olan ürünler için uygun ambalaj"],
          ["30", "Katılar veya iç ambalajlar içerecek şekilde tasarlanmış ambalajlar için kilogram cinsinden azami brüt kütle"],
          ["S", "Ambalajın katı malzemelerin veya iç ambalajların taşınmasına yönelik tasarlandığını gösteren harf"],
          ["21, TR", "Üretim yılı ve üretildiği ülke"],
          ["TSE01*0017", "Yetkili makam onayı ve üretici kuruluş yetki numarası"],
        ]},
      { type: "subheading", text: "4.3. Paketleme Sonrasında Yapılacak İşlemler" },
      { type: "subheading", text: "4.3.1. Kontrol ve Onay" },
      { type: "bullet", items: [
        "Ambalajların kapakları ve contalarının sızdırmaz olduğu doğrulanır.",
        "Etiketlerin eksiksiz ve doğru şekilde yapıştırıldığı kontrol edilir.",
      ]},
      { type: "subheading", text: "4.3.2. Depolama Hazırlığı" },
      { type: "bullet", items: [
        "Paketlenen maddeler, İSG'nin depolama gerekliliklerine uygun şekilde ayrılmış alanlara taşınır.",
        "Depolama sırasında uygun sıcaklık ve nem kontrolü sağlanır.",
      ]},
      { type: "subheading", text: "4.3.3. Atık Yönetimi" },
      { type: "bullet", items: [
        "Kullanılan atık malzemeler (ör. dökülme kitleri, temizlik bezleri) tehlikeli atık yönetim prosedürlerine uygun şekilde bertaraf edilir.",
      ]},
      { type: "subheading", text: "4.3.4. Kayıt Tutma" },
      { type: "bullet", items: [
        "Paketleme sürecine ait belgeler (ambalaj türü, dolum miktarı, etiket bilgileri, kontrol formları) saklanır.",
        "Eğitim kayıtları, risk değerlendirme raporları ve uygunsuzluk raporları düzenlenir.",
      ]},
      { type: "subheading", text: "4.4. Acil Durumda Yapılacak İşlemler" },
      { type: "subheading", text: "4.4.1. Sızıntı veya Dökülme Durumu" },
      { type: "bullet", items: [
        "Alan derhal tahliye edilir.",
        "Dökülen maddenin türüne uygun temizlik ekipmanları kullanılarak müdahale edilir.",
        "Durum üst yönetime ve ilgili yetkililere raporlanır.",
      ]},
      { type: "subheading", text: "4.4.2. Yangın veya Patlama Riski" },
      { type: "bullet", items: [
        "Yangın söndürücüler (ör. köpük veya kuru kimyasal) kullanılarak müdahale edilir.",
        "Yetkililer bilgilendirilir ve çevredeki alan güvenlik çemberine alınır.",
      ]},
      { type: "subheading", text: "4.4.3. Yaralanma veya Zehirlenme Durumu" },
      { type: "bullet", items: [
        "Yaralanan kişiye ilk yardım yapılır ve acil sağlık ekiplerine haber verilir.",
        "Olay raporu hazırlanır ve risk yönetim prosedürleri yeniden değerlendirilir.",
      ]},
      { type: "subheading", text: "5. Sorumluluklar" },
      { type: "subheading", text: "5.1. Çalışanların Sorumlulukları" },
      { type: "bullet", items: [
        "Paketleme sırasında talimatlara uygun şekilde çalışmak, KKD kullanmak ve prosedüre riayet etmek.",
      ]},
      { type: "subheading", text: "5.2. Yöneticilerin Sorumlulukları" },
      { type: "bullet", items: [
        "Çalışanların eğitilmesini ve prosedüre uygun şekilde çalışmasını sağlamak.",
        "Paketleme işlemlerini denetlemek ve uygunsuzluk durumunda müdahale etmek.",
      ]},
      { type: "subheading", text: "5.3. İş Sağlığı ve Güvenliği Ekibinin Sorumlulukları" },
      { type: "bullet", items: [
        "Prosedürün güncelliğini sağlamak ve risk değerlendirmelerini düzenli olarak yapmak.",
        "Acil durum prosedürlerinin uygulanabilirliğini denetlemek.",
      ]},
      { type: "subheading", text: "6. Kayıt ve Raporlama" },
      { type: "bullet", items: [
        "Paketleme işlemleri ile ilgili tüm belgeler en az 5 yıl saklanmalıdır.",
        "Eğitim katılım belgeleri, risk değerlendirme raporları, denetim sonuçları ve uygunsuzluk bildirimleri düzenli olarak güncellenmelidir.",
      ]},
      { type: "subheading", text: "7. Revizyon ve İyileştirme" },
      { type: "bullet", items: [
        "Prosedür, ADR mevzuatındaki değişikliklere göre düzenli olarak gözden geçirilir ve güncellenir.",
      ]},
    ],
  },

  P7: {
    docType: "PROSEDÜR",
    yayinTarihi: "17.06.2025",
    amac: "Bu prosedür, ADR kapsamında tehlikeli maddelerin taşınması sürecinde yük taşıma birimlerine dolum öncesinde, sırasında ve sonrasında alınması gereken güvenlik önlemlerini ve yapılacak işlemleri belirlemek amacıyla hazırlanmıştır. Prosedürün temel hedefleri; tehlikeli maddelerin güvenli taşınmasını sağlamak, çevre ve insan sağlığına yönelik riskleri en aza indirmek, ADR mevzuatına tam uyum sağlamak, olası kaza ve sızıntılara karşı önleyici tedbirleri belirlemek ve yetkili personelin bilinçlendirilmesini sağlamaktır.",
    kapsam: "Bu prosedür, ADR'ye tabi tehlikeli maddelerin taşınmasında kullanılan tankerler, sabit ve sökülebilir tanklar, mobil tanklar ve konteynerlere dolum öncesinde, sırasında ve sonrasında uygulanacak önlemleri; ayrıca dolum işlemlerinde görev alan yetkili personel, sürücüler ve diğer ilgili çalışanlar için geçerli güvenlik önlemleri ile operasyonel kontrolleri kapsar.",
    blocks: [
      { type: "paragraph", text: "Prosedür, aşağıdaki yük taşıma birimlerini içerir:" },
      { type: "bullet", items: [
        "Tankerler",
        "Sabit ve sökülebilir tanklar",
        "Mobil tanklar ve konteynerler",
        "Ayrıca, dolum işlemlerinde görev alan yetkili personel, sürücüler ve diğer ilgili çalışanlar için uygulanması gereken güvenlik önlemlerini ve operasyonel kontrolleri de kapsamaktadır.",
      ]},
      { type: "subheading", text: "3. Dolum Öncesinde Alınacak Önlemler ve Yapılacak İşlemler" },
      { type: "subheading", text: "a. Taşıma Ünitesinin Kontrolü" },
      { type: "bullet", items: [
        "Kullanılacak tank, konteyner veya ambalajın ADR'ye uygunluğu kontrol edilmelidir.",
        "Tankın, konteynerin veya ambalajın temizliği ve önceki yükten kalıntı olup olmadığı incelenmelidir.",
        "Yük taşıma biriminin sızdırmazlık durumu değerlendirilmelidir.",
      ]},
      { type: "subheading", text: "b. Belgelendirme ve İşaretleme" },
      { type: "bullet", items: [
        "Taşıma biriminin UN numarası, tehlike etiketi ve uygun işaretlemelerle donatıldığından emin olunmalıdır.",
        "Gerekli belgeler (ADR taşıma belgesi, güvenlik bilgi formu, yazılı talimatlar vb.) eksiksiz hazırlanmalıdır.",
        "Şoförün ve ilgili personelin ADR eğitim sertifikası olup olmadığı kontrol edilmelidir.",
      ]},
      { type: "subheading", text: "c. Personel ve Ekipman Kontrolleri" },
      { type: "bullet", items: [
        "Dolumu yapacak personelin uygun kişisel koruyucu ekipman (KKD) kullanması sağlanmalıdır.",
        "Acil durum ekipmanları (yangın söndürücü, emniyet duşu, göz yıkama istasyonu vb.) hazır bulundurulmalıdır.",
        "Statik elektrik riskine karşı topraklama sağlanmalıdır.",
      ]},
      { type: "subheading", text: "4. Dolum Sırasında Alınacak Önlemler ve Yapılacak İşlemler" },
      { type: "subheading", text: "a. Güvenlik Önlemleri" },
      { type: "bullet", items: [
        "Statik elektrik oluşumunu önlemek için uygun bağlantılar sağlanmalı, gerekirse topraklama uygulanmalıdır.",
        "Yükleme bölgesinde sigara içmek, kıvılcım oluşturabilecek cihazlar kullanmak yasaklanmalıdır.",
        "Çalışma alanında yalnızca yetkili personelin bulunması sağlanmalıdır.",
      ]},
      { type: "subheading", text: "b. Dolum İşlemi" },
      { type: "bullet", items: [
        "Dolum işlemi yavaş ve kontrollü bir şekilde gerçekleştirilmelidir.",
        "Dolum oranları, taşınan maddenin fiziksel ve kimyasal özelliklerine uygun olmalıdır (örneğin genleşme payı bırakılmalıdır).",
        "Dolum esnasında aşırı basınç, sızıntı veya herhangi bir anormallik olup olmadığı sürekli olarak izlenmelidir.",
      ]},
      { type: "subheading", text: "c. Acil Durum Hazırlıkları" },
      { type: "bullet", items: [
        "Olası sızıntı veya dökülmelere karşı emici malzeme ve tahliye ekipmanları hazır bulundurulmalıdır.",
        "Acil bir durumda uygulanacak prosedürler personele önceden bildirilmiş olmalıdır.",
      ]},
      { type: "subheading", text: "5. Dolum Sonrasında Alınacak Önlemler ve Yapılacak İşlemler" },
      { type: "subheading", text: "a. Kapatma ve Sızdırmazlık Kontrolleri" },
      { type: "bullet", items: [
        "Tank veya konteynerin kapakları ve valfleri düzgün şekilde kapatılmalı ve sızdırmazlığı kontrol edilmelidir.",
        "Sızıntı olup olmadığı tekrar gözden geçirilmelidir.",
      ]},
      { type: "subheading", text: "b. Etiketleme ve Evrak Kontrolleri" },
      { type: "bullet", items: [
        "Araç ve yükleme birimi üzerindeki levha ve işaretlerin doğru ve görünür olduğu doğrulanmalıdır.",
        "Taşıma belgeleri (ADR belgesi, sevk irsaliyesi vb.) eksiksiz olarak tamamlanmalıdır.",
      ]},
      { type: "subheading", text: "c. Araç ve Çevre Güvenliği" },
      { type: "bullet", items: [
        "Yük taşıma birimi, güvenli bir şekilde park edilmiş ve hareket etmeye hazır olmalıdır.",
        "Araç, taşıma sırasında belirlenen güvenlik önlemlerine (örneğin hız sınırları, yasaklı güzergahlar) uygun şekilde hareket etmelidir.",
      ]},
    ],
  },
  T13: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "14.02.2025",
    amac: "Bu prosedürün amacı, tehlikeli maddelerin karayoluyla taşınması sırasında güvenliğin sağlanması, çevrenin korunması ve taşımacılık süreçlerinin yasal düzenlemelere uygun olarak gerçekleştirilmesi için gerekli önlemleri belirlemektir. Prosedür, tehlikeli madde taşımacılığı süreçlerinde olası riskleri minimize ederek insan sağlığına, çevreye ve mal varlıklarına gelebilecek zararları önlemeyi hedefler.",
    kapsam: "Bu prosedür, tehlikeli maddelerin karayolu ile taşınması işlemleriyle doğrudan veya dolaylı olarak ilgilenen taşıma firmalarını, sürücüleri ve ilgili diğer personeli kapsar; ADR düzenlemelerine uygun şekilde hareket edilmesi gerektiğini vurgular.",
    tanimlar: [
      { terim: "ADR", tanim: "Tehlikeli Malların Karayolu ile Uluslararası Taşımacılığına İlişkin Avrupa Anlaşmasıdır." },
      { terim: "Gönderen", tanim: "Kendi adına veya bir üçüncü şahıs adına tehlikeli maddeleri sevk eden işletmeyi veya taşıma işlemi bir taşıma sözleşmesine bağlı olarak yürütülüyorsa sözleşmede \"Gönderen\" olarak belirtilen kişidir." },
      { terim: "Taşıma Evrakı", tanim: "ADR Bölüm 5.4.1'deki bilgileri içerecek şekilde gönderen tarafından düzenlenmiş belgedir." },
      { terim: "Taşımacı", tanim: "İşletmelerden, Karayolu Taşıma Yönetmeliğine göre C1, C2, K1, K2, L1, L2, M1, M2, N1, N2, P1 ve P2 yetki belgesi sahiplerini ve tehlikeli madde taşımacılığı yapan kamu kurum ve kuruluşlardır." },
      { terim: "Tehlikeli Madde (Tehlikeli Yük)", tanim: "ADR Bölüm 3.2'deki tehlikeli maddelerin listelendiği Tablo A'da yer alan madde ve nesnelerdir." },
      { terim: "UN Numarası", tanim: "Tehlikeli maddelerin taşımacılıkta tanımlanmasını sağlayan dört haneli koddur." },
      { terim: "Güvenlik Bilgi Formu (SDS)", tanim: "Maddelerin özelliklerini ve güvenlik önlemlerini içeren belgedir." },
      { terim: "ADR/Taşıt Uygunluk Belgesi", tanim: "ADR'ye uygun taşıma araçları için düzenlenen belgedir." },
      { terim: "Tehlikeli Madde Güvenlik Danışmanı (TMGD)", tanim: "İfa edeceği görev ve nitelikleri ADR Bölüm 1.8.3'te belirtilen ve Bakanlık tarafından Tehlikeli Madde Güvenlik Danışmanı Sertifikası düzenlenerek yetkilendirilen gerçek kişidir." },
      { terim: "Tehlike İkaz İşareti", tanim: "Tehlikeli yük taşımacılığında kullanılan ambalajlardaki yüklerin sınıf, tehlike derecesi ve muhteviyatı gibi özelliklerini ifade eden, harf, rakam ve şekillerin yer aldığı etikettir." },
      { terim: "Turuncu Renkli Plaka", tanim: "ADR Bölüm 5.3.2.2'de tanımlanan özellikteki plakalardır." },
    ],
    blocks: [
      { type: "subheading", text: "4. Taşıma Öncesinde Alınması Gereken Önlemler" },
      { type: "subheading", text: "4.1. Tehlikeli Madde Sınıflandırması" },
      { type: "bullet", items: [
        "Taşınacak maddelerin doğru bir şekilde sınıflandırılması ve etiketlenmesi gereklidir.",
        "Güvenlik Bilgi Formları (SDS) temin edilmeli ve incelenmelidir.",
      ]},
      { type: "subheading", text: "4.2. Eğitim ve Sertifikasyon" },
      { type: "paragraph", text: "Taşıma işlemini gerçekleştirecek personelin ADR eğitimi almış olması zorunludur." },
      { type: "subheading", text: "4.3. Araç ve Ekipman Kontrolleri" },
      { type: "bullet", items: [
        "Taşımacılıkta kullanılacak araçların tehlikeli madde taşımaya uygunluk belgeleri ile doğrulanması gerekmektedir.",
        "Yangın söndürücü, acil durum kiti, Yazılı Talimat kapsamında istenen teçhizatların (muafiyet durumları hariç) ve diğer güvenlik ekipmanlarının araçta bulundurulması şarttır.",
      ]},
      { type: "subheading", text: "4.4. Yükleme Prosedürleri" },
      { type: "paragraph", text: "Maddelerin, uygun teknoloji ve ekipman kullanılarak güvenli şekilde yüklenmesi sağlanmalıdır." },
      { type: "subheading", text: "5. Taşıma Sırasında Alınması Gereken Önlemler" },
      { type: "subheading", text: "5.1. Yük Güvenliği" },
      { type: "paragraph", text: "Yüklerin doğru şekilde sabitlenmesi ve taşınma esnasında hareket etmeyecek şekilde konumlandırılması gereklidir." },
      { type: "subheading", text: "5.2. Seyir Güvenliği" },
      { type: "bullet", items: [
        "Taşıma güzergahı önceden belirlenmeli ve risk analizi yapılmalıdır.",
        "Trafik kurallarına ve taşıma esnasındaki özel güvenlik önlemlerine uyulmalıdır.",
      ]},
      { type: "subheading", text: "5.3. Acil Durum Prosedürleri" },
      { type: "paragraph", text: "Olası kaza veya tehlikeli durumlarda, önceden hazırlanmış acil durum planlarının devreye alınması gerekmektedir." },
      { type: "subheading", text: "6. Taşıma Sonrasında Alınması Gereken Önlemler" },
      { type: "subheading", text: "6.1. Boşaltma Prosedürleri" },
      { type: "paragraph", text: "Yüklerin dikkatli bir şekilde, uygun ekipman kullanılarak boşaltılması gereklidir." },
      { type: "subheading", text: "6.2. Araç Temizliği ve Kontrolü" },
      { type: "paragraph", text: "Araçta kalan maddeler ve kalıntılar temizlenmeli, araç hasar ve uygunluk açısından kontrol edilmelidir." },
      { type: "subheading", text: "6.3. Belge ve Raporlama" },
      { type: "paragraph", text: "Taşıma sürecine ait belgeler eksiksiz düzenlenmeli ve ilgili mevzuata uygun şekilde saklanmalıdır." },
      { type: "subheading", text: "6.4. Değerlendirme ve Geri Bildirim" },
      { type: "paragraph", text: "Süreçler gözden geçirilmeli, taşımacılık sürecindeki iyileştirme alanları belirlenmelidir." },
      { type: "subheading", text: "7. ADR Kapsamında Araçta Bulunması Gereken Evraklar" },
      { type: "bullet", items: [
        "Taşıma Evrakı: ADR Bölüm 5.4.1 kapsamında tehlikeli maddenin tanımı, miktarı, gönderici ve alıcı bilgilerini içeren belge.",
        "Güvenlik Bilgi Formları (SDS): Taşınan maddelerin güvenliğine dair detaylı bilgi içeren dokümanlar.",
        "ADR Uygunluk/Taşıt Uygunluk Belgesi: Taşıma aracının ADR uyumlu olduğunu gösteren belge (Sınıf-1 dışındaki ambalajlı taşımalar için istenmez).",
        "Yükleme ve Boşaltma Talimatları: Süreçlere ilişkin adımları içeren doküman.",
        "Acil Durum Planı: Olası bir tehlike anında izlenecek prosedürlerin belirtildiği plan.",
        "SRC5-ADR Belgeleri: ADR eğitimi almış personelin sertifikaları.",
        "Ehliyet / Kimlik / Pasaport: Resmî vatandaşlık belgeleri.",
        "Yazılı Talimat: ADR Bölüm 5.4.3 kapsamında oluşturulan, kaza durumunda kullanılacak ve ADR teçhizatlarının neler olduğunu gösteren belge.",
        "TMFB: Tehlikeli Madde Faaliyet Belgesi (faaliyet konusunda taşımacı bulunacak).",
        "Güvenlik Planı (Emniyet Planı): Gerekmesi halinde gönderici tarafından verilecek güvenlik planı.",
        "Özel İzin Belgeleri: Bazı sınıflar için alınması gereken belgeler.",
      ]},
      { type: "subheading", text: "8. Kontrol ve Belgelendirme Gereklilikleri" },
      { type: "subheading", text: "8.1. Taşıt Uygunluk ve Belge Kontrolleri" },
      { type: "bullet", items: [
        "Tanklı taşıma veya Sınıf 1 ambalajlı taşımalarda, taşıtların ADR/Taşıt Uygunluk Belgesi'ne sahip olup olmadığı kontrol edilmelidir.",
        "Taşınan maddenin özelliklerine uygun olmayan taşıtların kullanımı yasaktır ve bu durumun önlenmesi için denetim yapılmalıdır.",
        "Ara ve periyodik muayene tarihleri geçmiş olan tankların veya yük taşıma birimlerinin kullanılmadığından emin olunmalıdır.",
      ]},
      { type: "subheading", text: "8.2. Etiketleme ve İşaretleme Kontrolleri" },
      { type: "bullet", items: [
        "Taşıtlarda veya yük taşıma birimlerinde, uygun özellikte ve ebatta tehlike ikaz etiketleri, turuncu plakalar ve diğer işaretlemelerin kullanımı denetlenmelidir.",
        "Yanlış veya uygun olmayan etiket/levha kullanımının tespit edilmesi halinde, taşıma işlemi durdurulmalıdır.",
      ]},
      { type: "subheading", text: "8.3. Yükleme ve Emniyet Kuralları" },
      { type: "bullet", items: [
        "Yüklemenin ADR Bölüm 7.5'te belirtilen yükleme emniyet kurallarına uygun olarak yapıldığı kontrol edilmelidir.",
        "Yükleme sırasında, karışık yükleme veya yükleme sınırlamaları kurallarına aykırı hareket edilmediği doğrulanmalıdır.",
      ]},
      { type: "subheading", text: "8.4. Sürücü Uygunluğu ve Eğitim Sertifikaları" },
      { type: "bullet", items: [
        "Taşıma işlemleri, yalnızca SRC5 Eğitim Sertifikası'na sahip, tehlikeli madde taşıma eğitimi almış sürücüler tarafından gerçekleştirilmelidir.",
        "Sürücülerin kimlik bilgileri, sertifika durumları ve taşıma sürecindeki görevleri belgelenmiş olmalıdır.",
      ]},
      { type: "subheading", text: "8.5. Görsel Kontrol ve Teçhizat Kontrolleri" },
      { type: "bullet", items: [
        "Taşıma işlemi öncesinde, taşıtlarda, tanklarda ve yüklerde görsel olarak belirgin bir sızıntı, çatlak veya hasar olup olmadığı kontrol edilmelidir.",
        "ADR Bölüm 8.1.4'e uygun yangınla mücadele ekipmanları ile Bölüm 8.1.5'e uygun genel ve kişisel koruyucu teçhizatın taşıtta bulundurulması kontrol edilmelidir.",
      ]},
      { type: "subheading", text: "8.6. Taşıma Sürecine İlişkin Belgeler ve Kayıtlar" },
      { type: "paragraph", text: "Aşağıdaki dokümanların hazırlanması ve taşınma süresince araçta bulundurulması gereklidir:" },
      { type: "bullet", items: [
        "Taşıma Belgesi: Boş temizlenmemiş yük taşıma birimlerine ilişkin belgeler dahil olmak üzere, ADR Bölüm 5.4.1.1.6'ya uygun şekilde düzenlenmiş taşıma evrakları.",
        "Yükleme ve Boşaltma Talimatları: ADR düzenlemelerine uygun emniyet ve prosedür bilgileri.",
        "SRC5 Sertifikaları: Sürücülerin eğitimi ve yeterliliğine dair belgeler.",
        "Muayene ve Test Belgeleri: Taşıtların ve yük taşıma birimlerinin periyodik test ve muayene süreçlerini gösteren belgeler.",
        "Tehlike İkaz Etiket ve İşaret Belgeleri: Araçta doğru ve uygun işaretleme yapıldığını gösteren belgeler.",
        "Güvenlik Planları: Trafik ve kamu güvenliğini tehlikeye atabilecek ihlallerin önlenmesi için uygulanacak adımlara ilişkin planlar.",
      ]},
      { type: "subheading", text: "8.7. Süreç İzleme ve Değerlendirme" },
      { type: "bullet", items: [
        "Taşıma öncesinde, sırasında ve sonrasında alınması gereken önlemlere ilişkin kayıt ve raporların düzenli tutulması gereklidir.",
        "Tespit edilen eksiklikler ve uygunsuzluklar raporlanarak süreçlerin iyileştirilmesi sağlanmalıdır.",
      ]},
    ],
  },

  T18: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2025",
    amac: "Bu talimat, tehlikeli madde taşımacılığında kullanılan araçların ADR/Taşıt Uygunluk Belgesi ve yük taşıma birimlerinin test/muayene süreçlerini, tehlike ikaz etiket/levha ve turuncu plaka kurallarını ve taşıma öncesi fiziksel kontrolleri düzenler.",
    kapsam: "Tehlikeli madde taşıyan tüm araçlar, tanklar ve yük taşıma birimleri (konteyner, IBC vb.) için geçerlidir.",
    blocks: [
      { type: "subheading", text: "3. ADR/Taşıt Uygunluk Belgesi ve Yük Taşıma Birimlerinin Test ve Muayene Süreçleri (ADR Bölüm 9.1.2 ve 6.8)" },
      { type: "subheading", text: "3.1. Taşıt Uygunluk Belgesi" },
      { type: "bullet", items: [
        "ADR Bölüm 9.1.2 gereğince, taşıtlar için düzenlenmiş ADR/Taşıt Uygunluk Belgesi geçerli ve güncel olmalıdır.",
        "Belgenin taşıt üzerinde bulundurulması zorunludur; yetkili otoritelerce yapılan muayeneler sonucunda onaylanmış olmalıdır.",
      ]},
      { type: "subheading", text: "3.2. Yük Taşıma Birimlerinin Test ve Muayenesi" },
      { type: "bullet", items: [
        "ADR Bölüm 6.8.2'ye göre, tanklar ve yük taşıma birimlerinin (konteyner, IBC vb.) periyodik testleri yapılmalı ve kayıt altına alınmalıdır.",
        "Tanklarda bulunan tank muayeneleri tank plakartında da ayrıca mevcuttur.",
        "Hidrostatik testler, sızdırmazlık kontrolleri ve görsel muayeneler ADR standartlarına uygun olarak gerçekleştirilmelidir.",
        "Test ve muayene sertifikaları taşınan yükle birlikte bulundurulmalıdır.",
      ]},
      { type: "subheading", text: "4. Tehlike İkaz Etiket/Levha ve Turuncu Plakalar (ADR Bölüm 5.3)" },
      { type: "subheading", text: "4.1. Etiketleme ve İşaretleme" },
      { type: "bullet", items: [
        "ADR Bölüm 5.3.1 gereğince, taşıma birimlerinde tehlike ikaz levhaları ve işaretleri uygun boyut ve özellikte olmalıdır.",
        "Tehlike sınıfı (örneğin 3 - Yanıcı Sıvılar) ve UN numarası taşıma birimi üzerinde belirtilmelidir.",
      ]},
      { type: "subheading", text: "4.2. Turuncu Plakalar" },
      { type: "bullet", items: [
        "ADR Bölüm 5.3.2'ye göre, turuncu renkli plakalar (UN numarası veya tehlike tanımlama numarası ile) taşıtın ön ve arka tarafında görünür şekilde yerleştirilmelidir.",
        "Plaka boyutu genellikle 40x30 cm'dir (yeterli yüzey yoksa 30x12 cm'e düşürülebilir); dikdörtgen, turuncu renkli reflektif malzemeden yapılmalı, kenar kalınlığı en az 15 mm olmalıdır.",
        "Üst kısımda tehlike tanımlama numarası (ör. \"33\" = çok yanıcı bir sıvı), alt kısımda UN numarası (ör. \"1203\" = benzin) yer alır.",
        "Ambalajlı taşımalarda ve bölmeli tankerlerde sadece düz (boş) turuncu plaka kullanılır (muafiyet ve akaryakıt hariç).",
        "Plakalar temiz, dayanıklı, hasarsız ve gece/gündüz kolayca görülebilir (reflektif) olmalıdır.",
      ]},
      { type: "subheading", text: "5. Taşıma Öncesi Fiziksel Kontroller (ADR Bölüm 7.1 ve 4.1)" },
      { type: "bullet", items: [
        "ADR Bölüm 7.1.7'ye uygun olarak, yükleme yapılacak tank, konteyner ve diğer birimler üzerinde sızıntı, çatlak veya fiziksel hasar kontrol edilmelidir.",
        "Araçların teknik durumu (frenler, lastikler, ışıklar) ADR standartlarına uygun olmalıdır.",
        "ADR Bölüm 4.1.1.1 gereğince ambalajlar, taşıma sırasında tehlike yaratmayacak şekilde kapatılmış olmalıdır.",
      ]},
    ],
  },

  T19: {
    docType: "TALİMAT",
    yayinTarihi: "01.11.2025",
    amac: "Bu talimat, ADR Bölüm 8.1.4 ve 8.1.5 uyarınca araçta bulundurulması zorunlu olan genel ve kişisel koruyucu teçhizatın kapsamını ve kontrolünü düzenler.",
    kapsam: "Tehlikeli madde taşıyan tüm araçlar için geçerlidir.",
    blocks: [
      { type: "subheading", text: "4.2. Yangınla Mücadele Teçhizatı (ADR Bölüm 8.1.4)" },
      { type: "paragraph", text: "Araçların izin verilen azami kütlesine göre bulundurulması gereken asgari yangın söndürücü sayı/kapasitesi (ADR-2023 Bölüm 8.1.4.2):" },
      { type: "table", headers: [
        "Taşıma Ünitesinin\nAzami Kütlesi",
        "Asgari Söndürücü\nSayısı",
        "Toplam Asgari\nKapasite",
        "Motor/Kabin İçin\nAsgari Kapasite",
        "Ek Söndürücü\nAsgari Kapasite",
      ], rows: [
        ["≤ 3,5 ton", "2", "4 kg", "2 kg", "2 kg"],
        ["> 3,5 ton – ≤ 7,5 ton", "2", "8 kg", "2 kg", "6 kg"],
        ["> 7,5 ton", "2", "12 kg", "2 kg", "6 kg"],
      ], note: "Kapasiteler kuru toz (veya söndürmede kullanılan diğer uygun eşdeğer malzemeler) cihazları içindir. Muafiyet kapsamındaki taşımalarda 2 kg'lık yangın söndürme cihazı yeterlidir." },
      { type: "bullet", items: [
        "Söndürücülerin periyodik bakım ve kontrolleri düzenli yapılmalı, üzerinde kontrol tarihi işlenmelidir.",
        "Yangın söndürme tüpleri sabitlenmiş bir şekilde bulunmalıdır.",
      ]},
      { type: "subheading", text: "4.1. Kişisel Koruyucu Ekipman (ADR Bölüm 8.1.5)" },
      { type: "bullet", items: [
        "Her araç mürettebatı üyesi için: uyarı yeleği, kıvılcım oluşturmayan patlamaya dayanıklı el feneri, koruyucu eldiven ve göz koruması.",
        "Yol kenarına konulacak uyarı işaretleri (üçgen reflektörler veya yanıp sönen ışıklar).",
        "Sızan maddeleri toplamak için kürek, süpürge, toplama kabı veya sızıntı önleme malzemeleri.",
        "Sızıntıların yayılmasını önlemek için uygun drenaj tıkaçları veya bariyer malzemeleri.",
        "ADR 5.4.3'e göre taşınan tehlikeli maddeyle ilgili yazılı talimatlar (taşıma talimatı) araçta bulundurulmalıdır.",
        "Belirli maddeler için ek teçhizat: göz/cilt yıkama seti, gaz kaçağı tespit cihazı, kimyasal emici malzemeler.",
      ]},
      { type: "subheading", text: "Kullanım ve Bakım" },
      { type: "bullet", items: [
        "Sürücü ve taşıma personeli, teçhizatın nasıl kullanılacağı konusunda eğitilmiş olmalı ve tehlike durumunda yazılı talimattaki adımları izlemelidir.",
        "Teçhizat düzenli olarak kontrol edilmeli; eksik, hasarlı veya tarihi geçmiş malzemeler yenilenmelidir.",
      ]},
    ],
  },

  T20: {
    docType: "TALİMAT",
    yatay: true, // 13 sütunlu karışık yükleme matrisi dikey sayfaya sığmaz
    yayinTarihi: "01.11.2025",
    amac: "Bu talimat; yükleme/karışık yükleme sınırlamalarını (ADR 7.5), taşıma sırasında tespit edilen güvenlik ihlallerinde izlenecek yolu (ADR 1.8.5 ve 8.3) ve boş/temizlenmemiş yük taşıma birimleri için gerekli taşıma evrakı kurallarını (ADR 5.4.1.1.6) belirler.",
    kapsam: "Tehlikeli madde taşıyan tüm araçlar ve boş/temizlenmemiş yük taşıma birimi (YTB) sevkiyatları için geçerlidir.",
    blocks: [
      { type: "subheading", text: "3. Yükleme, Karışık Yükleme ve Sınırlamalar (ADR Bölüm 7.5)" },
      { type: "bullet", items: [
        "ADR Bölüm 7.5.2'ye uygun olarak, uyumsuz tehlikeli maddeler aynı taşıma biriminde taşınmamalıdır; karışık yükleme yapılırken taşıma kategorileri dikkate alınarak sınırlamalara uyulmalıdır.",
        "ADR Bölüm 7.5.7'ye göre yükler, taşıma sırasında hareket etmeyecek şekilde sabitlenmeli, taşıma birimlerinde aşırı yükleme yapılmamalıdır.",
      ]},
      { type: "subheading", text: "4. Taşıma Sırasında Güvenlik İhlalleri Durumunda Alınacak Önlemler (ADR Bölüm 1.8.5 ve 8.3)" },
      { type: "subheading", text: "4.1. İhlalin Tespiti" },
      { type: "bullet", items: [
        "ADR Bölüm 8.3.6'ya göre, taşıma sırasında ihlal tespit edilirse araç güvenli bir alana çekilmeli.",
        "İhlal giderilmeden taşıma işlemine devam edilmemelidir.",
      ]},
      { type: "subheading", text: "4.2. Yetkililerin Bilgilendirilmesi" },
      { type: "paragraph", text: "ADR Bölüm 1.8.5'e uygun olarak, büyük kazalar veya sızıntılar yetkili mercilere bildirilmelidir." },
      { type: "subheading", text: "5. Boş ve Temizlenmemiş Yük Taşıma Birimleri için Evrak (ADR Bölüm 5.4.1.1.6)" },
      { type: "bullet", items: [
        "Temizlenmemiş boş yük taşıma birimleri için taşıma belgesi hazırlanmalıdır.",
        "Belgede, daha önce taşınan tehlikeli maddeye dair bilgiler (UN numarası, sınıf, ambalaj grubu vb.) belirtilmelidir.",
      ]},
      { type: "subheading", text: "Ek Bilgi — ADR'ye Göre Araç Tipleri (ADR Bölüm 9.1.1.2)" },
      { type: "bullet", items: [
        "FL Tipi Araç: Yanıcı sıvı (parlama noktası <60°C) ve yanıcı gaz taşınmasına özel donatılmış; kıvılcım önleyici elektrik sistemi ve topraklama mekanizması bulunur.",
        "AT Tipi Araç: Özel koruma gerektirmeyen, tehlikesiz/az tehlikeli sınıflardaki kimyasalların genel taşınmasına uygun araçlardır.",
        "EX-II / EX-III Tipi Araç: Patlayıcı madde ve nesnelerin (Sınıf 1) taşınması için tasarlanmış; EX-III daha yüksek miktar/tehlikeye uygun, daha ağır koruma özellikleri taşır.",
        "MEMU Tipi Araç: Mobil patlayıcı üretim birimi; patlayıcı hammaddeleri taşır ve belirli bir alanda işleyerek patlayıcı maddeye dönüştürebilir.",
      ]},
      { type: "subheading", text: "6. Karışık Yükleme Matrisi (ADR 7.5.2.1)" },
      { type: "paragraph", text: "Aşağıdaki matris, farklı tehlike etiketlerine sahip ambalajlı yüklerin aynı taşıma biriminde birlikte taşınıp taşınamayacağını gösterir. (+) birlikte taşınabilir, (X) birlikte taşınamaz, (K) koşulludur; ADR 7.5.2.1 dipnotlarındaki şartlar sağlanmalıdır. (*) Sınıf 1 için uyumluluk grubu tablosuna (ADR 7.5.2.2) bakılır." },
      { type: "table",
        headers: ["Sınıf", "1", "2", "3", "4.1", "4.2", "4.3", "5.1", "5.2", "6.1", "6.2", "7", "8", "9"],
        colWidths: [1.4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        rows: [
          ["1", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
          ["2", "*", "+", "+", "+", "+", "+", "+", "+", "+", "X", "X", "+", "+"],
          ["3", "*", "+", "+", "+", "+", "+", "+", "K", "+", "X", "X", "+", "+"],
          ["4.1", "*", "+", "+", "+", "+", "+", "+", "K", "+", "X", "X", "+", "+"],
          ["4.2", "*", "+", "+", "+", "+", "+", "+", "K", "+", "X", "X", "+", "+"],
          ["4.3", "*", "+", "+", "+", "+", "+", "+", "K", "+", "X", "X", "+", "+"],
          ["5.1", "*", "+", "+", "+", "+", "+", "+", "+", "+", "X", "X", "+", "+"],
          ["5.2", "*", "+", "K", "K", "K", "K", "+", "+", "+", "X", "X", "K", "+"],
          ["6.1", "*", "+", "+", "+", "+", "+", "+", "+", "+", "X", "X", "+", "+"],
          ["6.2", "*", "X", "X", "X", "X", "X", "X", "X", "X", "+", "X", "X", "X"],
          ["7", "*", "X", "X", "X", "X", "X", "X", "X", "X", "X", "+", "X", "X"],
          ["8", "*", "+", "+", "+", "+", "+", "+", "K", "+", "X", "X", "+", "+"],
          ["9", "*", "+", "+", "+", "+", "+", "+", "+", "+", "X", "X", "+", "+"],
        ],
        note: "Bu matris sistemdeki ADR karışık yükleme motorunun verisiyle birebir aynıdır; Taşıma Evrakı ekranı girilen ürünler için aynı kontrolü otomatik yapar." },
    ],
  },

  K8: {
    docType: "KONTROL FORMU",
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    yayinTarihi: "01.11.2025",
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
    docType: "KONTROL FORMU",
    yayinTarihi: "18.07.2025",
    amac: "Bu form, tehlikeli madde sevkiyatı yapan her seferin başlamadan önce sistemsel ve evraksal olarak ADR'ye uygunluğunun doğrulanmasını, sefer sırasında izlenmesini ve sefer sonunda kapatılmasını sağlamak amacıyla kullanılır.",
    kapsam: "Taşımacı faaliyeti kapsamındaki tüm seferler için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Sefer Bilgileri" },
      { type: "bullet", items: [
        "Sefer No: ……………", "Çıkış Noktası: ……………", "Varış Noktası: ……………",
        "Çekici Plaka: ……………", "Dorse Plaka: ……………", "Sürücü Ad/Soyad: ……………",
      ]},
      { type: "subheading", text: "3. Sefer Öncesi Sistemsel ve Evraksal Eşleştirme" },
      { type: "table", headers: ["No", "Kontrol Edilen Evraksal Bağlantı Adımı", "UYGUN", "RED", "İlgili Belge"],
        colWidths: [0.45, 3.0, 0.6, 0.6, 1.6],
        rows: [
          ["1.1", "Sefere ait tüm UN numaralarını içeren güncel taşıma evrakı (ADR 5.4.1) düzenlenmiş ve basılmış mı?", "[   ]", "[   ]", "ADR Belge Kaydı (SA3)"],
          ["1.2", "Sahalar arası aktarım varsa, karışık yükleme ve ayrım (ADR 7.5.2) onayı alınmış mı?", "[   ]", "[   ]", "Aktarım Kaydı (SA2)"],
          ["1.3", "Sürücünün SRC5 belgesi ve mesleki yeterlilik eğitim sertifikası geçerlilik tarihi içinde mi?", "[   ]", "[   ]", "Sürücü Listesi (L3)"],
          ["1.4", "Çekici/dorse için ADR Taşıt Uygunluk Belgesi mevcut ve süresi geçmemiş mi?", "[   ]", "[   ]", "Taşıt Kontrol Talimatı (T18)"],
          ["1.5", "Araçta ADR 8.1.4/8.1.5 uyarınca zorunlu yangın söndürücü ve kişisel koruyucu teçhizat eksiksiz mi?", "[   ]", "[   ]", "Teçhizat Bulundurma Talimatı (T19) · Teçhizat Kontrol Formu (K8)"],
          ["1.6", "Turuncu plaka ve tehlike etiketleri taşınan maddenin sınıfına uygun şekilde takılmış mı?", "[   ]", "[   ]", "Taşıt Kontrol Talimatı (T18) · Belge Takip Formu (K9)"],
        ], note: "UYGUN/RED sütunlarındaki her RED işareti için düzeltici eylem tamamlanmadan sefer başlatılmaz." },
      { type: "subheading", text: "4. Araç ve Ekipman Emniyet Kontrolleri" },
      { type: "table", headers: ["No", "Kontrol Edilen Fiziksel Adım", "UYGUN", "RED"],
        colWidths: [0.45, 4.4, 0.7, 0.7],
        rows: [
          ["2.1", "Sürücü kabininde, sürücünün anladığı dilde hazırlanmış yasal Yazılı Talimat (Kaza Talimatı, ADR 5.4.3) mevcut mu?", "[   ]", "[   ]"],
          ["2.2", "Araç tonajına uygun sayı ve kapasitede, son kullanma tarihi geçmemiş, mühürlü yangın söndürme cihazları araçta konuşlu mu? (bkz. Taşıtta Teçhizat Bulundurma Talimatı — T19)", "[   ]", "[   ]"],
          ["2.3", "Her bir mürettebat üyesi için koruyucu gözlük, maske, reflektörlü yelek, kıvılcım çıkarmayan el feneri ve acil durum donanımları (ADR çantası) tam mı?", "[   ]", "[   ]"],
        ]},
      { type: "subheading", text: "5. Sefer Sırası İzleme" },
      { type: "bullet", items: [
        "Sürücünün AETR/sürüş-dinlenme sürelerine uyumu takip edilir.",
        "Rota üzerinde tünel kısıtlaması olan güzergâh bulunuyorsa (ADR 1.9.5) buna uygun geçiş planlanır.",
        "Sefer sırasında yaşanan kaza, sızıntı, arıza veya kontrol noktası ihlali derhal TMGD'ye ve saha sorumlusuna bildirilir.",
      ]},
      { type: "subheading", text: "6. Sefer Sonu Kapanış" },
      { type: "bullet", items: [
        "Varışta teslim tutanağı/CMR imzalatılır, gerçekleşen varış saati kaydedilir.",
        "Boşaltma sonrası araç ADR Bölüm 5.3 kapsamındaki işaret ve levhalar bakımından kontrol edilir (boşsa kaldırılır).",
        "Sefer sırasında bir RED/ihlal kaydı varsa kapanış öncesi düzeltici eylemin tamamlandığı teyit edilir.",
      ]},
    ],
  },

  SA2: {
    docType: "KONTROL FORMU",
    yayinTarihi: "18.07.2025",
    amac: "Bu form, sahalar arası veya taşıma birimleri arası (araçtan araca, tanktan tanka) yapılan tehlikeli madde aktarım işlemlerinin ADR 7.5.2 karışık yükleme/ayrım kurallarına uygunluğunun ve aktarımın fiziksel emniyet şartlarının denetlenerek kayıt altına alınmasını sağlar.",
    kapsam: "Boşaltan ve Yükleyen faaliyetleri kapsamında gerçekleştirilen tüm sahalar arası aktarım işlemleri için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Aktarım Bilgileri" },
      { type: "bullet", items: [
        "Kaynak Saha/Depo: ……………", "Hedef Saha/Depo: ……………",
        "Gelen Araç Plaka: ……………", "Giden Araç Plaka: ……………",
        "Madde Adı / UN No: ……………", "Aktarılan Miktar: ……………",
      ]},
      { type: "subheading", text: "3. Karışık Yükleme ve Ayrım Denetimleri (ADR 7.5.2)" },
      { type: "table", headers: ["No", "Kontrol Edilen Operasyonel Adım", "UYGUN", "RED", "Açıklama"],
        colWidths: [0.45, 3.3, 0.7, 0.7, 1.5],
        rows: [
          ["1.1", "Aynı araca aktarılan farklı sınıftaki paketler arasında karışık yükleme yasağı (ADR 7.5.2 matrisi) ihlali var mı?", "[   ]", "[   ]", ""],
          ["1.2", "Toksik (Sınıf 6.1) veya bulaşıcı (Sınıf 6.2) maddeler gıda/hayvan yemi maddelerinden ayrı konumlandırıldı mı? (ADR 7.5.4)", "[   ]", "[   ]", ""],
          ["1.3", "Aktarılan ürün miktarı kaynak sahanın Kimyasal Envanterinden (L1) düşüldü, hedef sahanın Kimyasal Envanter (L1) kabul limitleri doğrulandı mı?", "[   ]", "[   ]", ""],
          ["1.4", "Aktarılan ambalaj/tankın taşınacak madde ile kimyasal uyumluluğu ve sızdırmazlığı önceden kontrol edildi mi?", "[   ]", "[   ]", ""],
        ]},
      { type: "subheading", text: "4. Fiziksel Aktarım ve Emniyet Kontrolleri" },
      { type: "table", headers: ["No", "Kontrol Edilen Operasyonel Adım", "UYGUN", "RED", "Açıklama"],
        colWidths: [0.45, 3.3, 0.7, 0.7, 1.5],
        rows: [
          ["2.1", "Aktarım öncesi/sırasında paketlerde delinme, ezilme, sızıntı veya gaz kaçırma emaresi var mı?", "[   ]", "[   ]", ""],
          ["2.2", "Yeni araca aktarılan ambalajlar devrilmeye/kaymaya karşı takoz, kayış veya hava yastığıyla sabitlendi mi?", "[   ]", "[   ]", ""],
          ["2.3", "Hedef araca yükleme bitiminde tehlike etiketleri ve turuncu plakalar yükün sınıfına göre güncellendi mi?", "[   ]", "[   ]", ""],
        ], note: "2.1 maddesinde sızıntı, hasar veya gaz kaçağı tespit edilmesi halinde aktarım durdurulur ve Dolum Sonrası Sızdırmazlık ve Bulaşma Kontrol Talimatı (T16) uygulanır." },
      { type: "paragraph", text: "Aktarım öncesi her iki taşıma biriminin de maddeye uygunluğu ve sızdırmazlığı kontrol edilir; sızıntı/dökülme yaşanması halinde açıklama sütununa not düşülür ve TMGD'ye bildirilir." },
    ],
  },

  SA3: {
    docType: "KONTROL FORMU",
    yayinTarihi: "18.07.2025",
    amac: "Bu form, düzenlenen taşıma evrakının ADR Bölüm 5.4.1 kapsamındaki zorunlu içerik unsurlarını taşıyıp taşımadığının sevkiyat öncesi kontrol edilmesini ve firmanın ADR kapsamındaki diğer belgelerinin (TMFB, sertifikalar, muayene belgeleri) tek noktadan takip edilmesini sağlar.",
    kapsam: "Gönderen ve Taşımacı faaliyetleri kapsamında düzenlenen tüm taşıma evrakları ile işletmenin ADR mevzuatı kapsamında sahip olması gereken tüm belgeler için geçerlidir.",
    blocks: [
      { type: "subheading", text: "Evrak Bilgileri" },
      { type: "bullet", items: [
        "Sefer / Evrak No: ……………", "Kontrol Tarihi: ……………", "Plaka / Sürücü: ……………",
      ]},
      { type: "subheading", text: "3. Zorunlu Metin ve İçerik Kontrolleri (ADR 5.4.1.1)" },
      { type: "table", headers: ["No", "Kontrol Kriteri / Madde Gerekliliği", "UYGUN", "RED", "Açıklama"],
        colWidths: [0.45, 3.3, 0.7, 0.7, 1.5],
        rows: [
          ["1.1", "UN Numarası: Başına \"UN\" ibaresi konularak doğru girilmiş mi? (Örn: UN 1203)", "[   ]", "[   ]", ""],
          ["1.2", "Resmi Taşıma Adı (PSN): ADR 3.2 Tablo A'ya göre tam ve uygun mu?", "[   ]", "[   ]", ""],
          ["1.3", "Sınıf ve tehlike etiketleri: Ana ve varsa ilave risk etiket numaraları parantez içinde belirtilmiş mi?", "[   ]", "[   ]", ""],
          ["1.4", "Ambalaj Grubu (PG): Varsa PG I, PG II veya PG III olarak doğru yazılmış mı?", "[   ]", "[   ]", ""],
          ["1.5", "Tünel Kısıtlama Kodu: Parantez içinde büyük harfle belirtilmiş mi? (Örn: (D/E))", "[   ]", "[   ]", ""],
          ["1.6", "Paket sayısı, tipi ve toplam brüt kütle net şekilde belirtilmiş mi? (ADR 5.4.1.1.1)", "[   ]", "[   ]", ""],
          ["1.7", "Gönderen ve alıcı bilgileri (unvan, adres) eksiksiz mi?", "[   ]", "[   ]", ""],
        ]},
      { type: "subheading", text: "4. Özel Durum ve Muafiyet Kontrolleri" },
      { type: "table", headers: ["No", "Kontrol Kriteri / Madde Gerekliliği", "UYGUN", "RED", "Açıklama"],
        colWidths: [0.45, 3.3, 0.7, 0.7, 1.5],
        rows: [
          ["2.1", "ADR 1.1.3.6 muafiyeti: Taşıma kategorisi puan hesabı yapılmış ve toplam puan 1000'in altında mı?", "[   ]", "[   ]", ""],
          ["2.2", "Sınırlı miktar (LQ) sevkiyatlarında \"Sınırlı Miktarda Tehlikeli Madde\" işaretlemesi (ADR 3.4) yapılmış mı?", "[   ]", "[   ]", ""],
          ["2.3", "Boş temizlenmemiş ambalajlar için \"BOŞ AMBALAJ, 3 (D/E)\" veya \"BOŞ TANK-KONTEYNER, 9, (E)\" ibaresi mevcut mu?", "[   ]", "[   ]", ""],
          ["2.4", "Çevreye zararlı maddelerde \"ÇEVREYE ZARARLI\" veya \"DENİZ KİRLETİCİ\" ibaresi var mı?", "[   ]", "[   ]", ""],
        ]},
      { type: "subheading", text: "5. Takip Edilecek Diğer ADR Belgeleri" },
      { type: "bullet", items: [
        "Tehlikeli Madde Faaliyet Belgesi (TMFB) ve geçerlilik tarihi",
        "TMGD Hizmet Sözleşmesi ve TMGD Sertifikası",
        "Araç ADR/Taşıt Uygunluk Belgeleri ve muayene tarihleri",
        "Sürücü SRC5 belgeleri ve geçerlilik tarihleri",
        "Basınçlı ekipman/tank muayene belgeleri",
        "Yıllık Faaliyet Raporları ve Ziyaret Raporları",
      ]},
      { type: "paragraph", text: "1. ve 2. bölümlerdeki her RED işareti, evrak sevkiyat öncesi düzeltilmeden sefer başlatılmaz. 3. bölümdeki belgeler, sistemdeki Belge Takip kayıtlarıyla tutarlı olacak şekilde düzenli güncellenir." },
    ],
  },
};

export function belgeSablonu(code: string): BelgeSablonu | undefined {
  return BELGE_SABLONLARI[code];
}
