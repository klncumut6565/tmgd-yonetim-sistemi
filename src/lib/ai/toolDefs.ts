// src/lib/ai/toolDefs.ts
//
// TEK KAYNAK — asistan araçlarının (tool) tanımları. HEM sesli asistan
// (Gemini Live function calling) HEM yazılı asistan (/api/adr-assistant
// araç döngüsü) AYNI listeyi kullanır; böylece iki asistanın yetkileri
// birbirinden ayrışamaz. Yeni bir araç eklemek = buraya tanım + toolExec.ts'ye
// (veri aracıysa) yürütücü eklemek; iki asistan da otomatik kazanır.
//
// İSTEMCİ-GÜVENLİ: bu dosya sunucu/Supabase kodu İÇERMEZ (tarayıcıdaki Live
// sağlayıcı da import eder). Çalıştırma mantığı: src/lib/ai/toolExec.ts.

export const TOOL_DEFS = [
  {
    name: 'search_firm',
    description:
      'Kullanıcının söylediği firma ismine göre sistemdeki GERÇEK firmaları arar. ' +
      'Firma adı geçen HER istekte (açma, görev sorma, belge sorma) ÖNCE bu çağrılmalı — ' +
      'firma ID\'si asla uydurulmaz. 0 sonuç dönerse kullanıcıya bulunamadığı söylenir; ' +
      '2+ sonuç dönerse kullanıcıya hangisini kastettiği sorulur, tahmin edilmez.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Kullanıcının söylediği firma adı (aynen, düzeltmeden)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'open_firm',
    description: 'search_firm ile bulunan GERÇEK bir firmayı uygulamada açar (navigasyon).',
    parameters: {
      type: 'object',
      properties: {
        firm_id: { type: 'string', description: 'search_firm sonucundaki gerçek firma ID\'si' },
        tab: {
          type: 'string',
          description: 'Açılacak sekme (opsiyonel)',
          enum: [
            'belge_takip', 'tasks', 'documents', 'belge_olustur',
            'vehicles', 'drivers', 'employees', 'visits',
            'adr_transport', 'genel', 'denetim', 'notlar',
          ],
        },
      },
      required: ['firm_id'],
    },
  },
  {
    name: 'get_task_summary',
    description:
      'Bir firmanın GERÇEK görev sayısını ve listesini döndürür (gecikmiş/bugünkü/yaklaşan/tümü). ' +
      'Görev sayısı veya isimleri hakkında bu araç çağrılmadan KESİNLİKLE konuşulmaz.',
    parameters: {
      type: 'object',
      properties: {
        firm_id: { type: 'string', description: 'search_firm sonucundaki gerçek firma ID\'si' },
        scope: {
          type: 'string',
          enum: ['overdue', 'today', 'upcoming', 'all'],
          description: 'overdue=gecikmiş, today=bugün, upcoming=yaklaşan, all=tüm açık görevler',
        },
      },
      required: ['firm_id', 'scope'],
    },
  },
  {
    name: 'get_missing_documents',
    description:
      'Bir firmanın Belge Takip ekranındaki GERÇEK eksik belgelerini (belge adı + bölüm), eksik sayısını, ' +
      'toplam/tamamlanan sayısını ve ilerleme yüzdesini döndürür. Eksik belge veya belge durumu sorularında ' +
      'bu araç çağrılmadan KESİNLİKLE konuşulmaz. Çok sayıda eksik varsa önce sayıyı ve bölüm dağılımını (by_section) söyle, ' +
      'tek tek saymayı kullanıcı isterse yap.',
    parameters: {
      type: 'object',
      properties: {
        firm_id: { type: 'string', description: 'search_firm sonucundaki gerçek firma ID\'si' },
      },
      required: ['firm_id'],
    },
  },
  {
    name: 'list_firms',
    description:
      'Sistemdeki GERÇEK firma sayısını ve isimlerini döndürür (toplam, duruma göre dağılım ve liste). ' +
      '"Kaç firmam var", "firmalarımı say/listele", "kaç aktif firma", "hangi firma pasif/aktif" gibi sorularda çağrılır. ' +
      'Sonuçta names_by_status (durum → firma isimleri) vardır: "hangi firma pasif" sorusunda İSİMLERİ mutlaka söyle, sadece sayı verme.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'active', 'passive', 'archived', 'tmfb_kapsamdisi'],
          description: 'Durum filtresi (opsiyonel, varsayılan all). active=aktif, passive=pasif, archived=arşiv, tmfb_kapsamdisi=TMFB kapsamdışı',
        },
      },
    },
  },
  {
    name: 'get_dashboard_summary',
    description:
      'Gösterge panelindeki GERÇEK bilgileri döndürür: toplam firma ve durum dağılımı, açık görev, yüklenen belge dosyası, araç sayısı, ' +
      'süresi yaklaşan sürücü/araç/firma belgeleri, TMFB ve TMGD sertifika uyarıları, son görevler. "Gösterge panelinde ne var", ' +
      '"süresi dolacak belge var mı", "kaç açık görevim var", "kaç aracım var" gibi sorularda çağrılır.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_notifications',
    description:
      'Bildirim zilindeki GERÇEK bildirimleri döndürür (zilden kaldırılanlar hariç): onay bekleyen kullanıcılar, süresi yaklaşan/geçen ' +
      'belgeler (TMFB, TMGD sertifikası, firma belgeleri), sürücü SRC-5/ehliyet, araç ADR/muayene uyarıları; her biri için başlık, firma, ' +
      'bitiş tarihi ve kalan gün. "Bildirimlerim neler", "zilde ne yazıyor", "kaç bildirimim var" sorularında çağrılır.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_tmgd',
    description:
      'Roller bölümündeki TMGD (Tehlikeli Madde Güvenlik Danışmanı) personelini döndürür (rolü TMGD, Yönetici veya Asistan olanlar; Süper Yönetici hariç): aktif çalışan TMGD sayısı, her TMGD için ad, ' +
      'e-posta, telefon, atandığı firma sayısı, sertifika (S2) geçerlilik tarihi ve kalan gün; ayrıca aktif personelin rol dağılımı. ' +
      '"Kaç aktif TMGD var", "TMGD bilgileri", "TMGD sertifikası ne zaman bitiyor" sorularında çağrılır.',
    parameters: {
      type: 'object',
      properties: {
        include_inactive: { type: 'boolean', description: 'true ise pasif/onaysız TMGD de listelenir (varsayılan false)' },
      },
    },
  },
  {
    name: 'get_visit_overview',
    description:
      'Firma Takvimi ile aynı kuralla, bir ayda ziyaret edilen ve ziyaret EDİLMEYEN firma sayısını ve ziyaret edilmeyen ' +
      'firma isimlerini döndürür. "Ziyaret edilmeyen firma sayım kaç", "bu ay kimleri ziyaret etmedim" sorularında çağrılır.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'YYYY-AA biçiminde ay (opsiyonel; boşsa içinde bulunulan ay)' },
      },
    },
  },
  {
    name: 'get_firm_progress',
    description:
      'Belge Takip ilerleme yüzdesini döndürür. firm_id verilirse o firmanın yüzdesi (örn. %86) ve tamamlanan/toplam sayısı; ' +
      'verilmezse tüm firmaların ortalaması ve en düşük ilerlemeli firmalar. "X firmasının ilerlemesi ne durumda" sorusunda ' +
      'önce search_firm ile firma ID\'sini bul, sonra bunu çağır ve yüzdeyi aynen söyle ("yüzde 86").',
    parameters: {
      type: 'object',
      properties: {
        firm_id: { type: 'string', description: 'search_firm sonucundaki gerçek firma ID\'si (opsiyonel)' },
      },
    },
  },
  {
    name: 'go_to_page',
    description:
      'Uygulamanın ana menü sayfalarından birine gider (navigasyon). Belirli bir firmanın sayfası için open_firm kullanılır.',
    parameters: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          enum: [
            'dashboard', 'firma_takvimi', 'firmalar', 'gorevler', 'araclar', 'suruculer',
            'personeller', 'ziyaretler', 'raporlar', 'adr_bilgi_motoru', 'ayarlar',
          ],
          description:
            'dashboard=Gösterge Paneli, firma_takvimi=Firma Takvimi, firmalar=Firmalar, gorevler=Görevler, araclar=Araçlar, ' +
            'suruculer=Sürücüler, personeller=Personeller, ziyaretler=Ziyaretler, raporlar=Raporlar, ' +
            'adr_bilgi_motoru=ADR Bilgi Motoru, ayarlar=Ayarlar',
        },
      },
      required: ['page'],
    },
  },
  {
    name: 'search_regulation',
    description:
      'Sisteme yüklenmiş GERÇEK mevzuat belgelerinde (ADR, Tehlikeli Madde Yönetmeliği vb.) arama yapar ve ilgili ' +
      'bölümleri kaynak/sayfa ile döndürür. Mevzuat, madde veya yükümlülük sorularında cevaptan ÖNCE çağrılır; ' +
      'cevap dönen metne dayandırılır ve kaynak söylenir. Sonuç boşsa bunu söyle, kendi bilginden uydurma.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Aranacak konu/ifade (Türkçe, örn. "yangın söndürücü sayısı")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_un_info',
    description:
      'Bir veya birden fazla UN numarasının GERÇEK ADR Tablo A kaydını döndürür (madde adı, sınıf, ambalaj grubu, ' +
      'tünel kodu, tehlike no, etiketler, taşıma kategorisi). UN numarası geçen her soruda ÖNCE çağrılır.',
    parameters: {
      type: 'object',
      properties: {
        un_numbers: {
          type: 'array',
          items: { type: 'string' },
          description: '4 haneli UN numaraları, örn. ["1203", "1950"]',
        },
      },
      required: ['un_numbers'],
    },
  },
  {
    name: 'check_mixed_loading',
    description:
      'İki veya daha fazla UN numaralı maddenin aynı araçta birlikte taşınıp taşınamayacağını (ADR 7.5.2 karışık ' +
      'yükleme) sistemin GERÇEK hesaplama motoruyla kontrol eder. Bu konuda kendin hüküm VERME, bu aracın sonucunu aktar.',
    parameters: {
      type: 'object',
      properties: {
        un_numbers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Karşılaştırılacak en az iki UN numarası, örn. ["1203", "1428"]',
        },
      },
      required: ['un_numbers'],
    },
  },
] as const;

/** Tarayıcıda/uygulamada sayfa değiştiren (sunucuda çalıştırılmayan) araçlar. */
export const NAV_TOOL_NAMES = ['open_firm', 'go_to_page'] as const;

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name) as string[];
