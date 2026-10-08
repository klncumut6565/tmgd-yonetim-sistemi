// src/lib/voice/geminiTools.ts
//
// Gemini Live API'ye tanıtılacak fonksiyon (tool) tanımları.
//
// İKİ GRUP:
//   1) Navigasyon araçları — mevcut src/lib/ai/actions.ts beyaz listesiyle
//      (VALID_FIRM_TABS) UYUMLU, aynı eylemleri temsil eder. Metin
//      asistanındaki gibi regex/prompted-JSON değil, Gemini Live'ın NATIVE
//      function-calling'i kullanılır (bkz. plan Bölüm 15-16).
//   2) Veri araçları — src/lib/ai/dataTools.ts'teki GERÇEK Supabase
//      sorgularını çağırır (search_firm, get_task_summary,
//      get_missing_documents). Bunlar /api/assistant/tools üzerinden
//      çalıştırılır (bkz. o dosyadaki gerekçe: WebSocket doğrudan Google'a
//      gittiği için tool çalıştırma tarayıcıdan bizim backend'imize ayrı
//      bir istekle yapılır).
//
// GÜVENLİK: silme (delete) işlemi burada YOK ve asla eklenmeyecek — aynı
// actions.ts'teki bilinçli tasarım kararı.

export const GEMINI_FUNCTION_DECLARATIONS = [
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
      'Bir firmanın GERÇEK eksik/tamamlanmamış belge listesini döndürür. ' +
      'Belge durumu hakkında bu araç çağrılmadan KESİNLİKLE konuşulmaz.',
    parameters: {
      type: 'object',
      properties: {
        firm_id: { type: 'string', description: 'search_firm sonucundaki gerçek firma ID\'si' },
      },
      required: ['firm_id'],
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

/** Sesli asistanın sistem talimatı — halüsinasyon önleme ilkeleri buraya
 *  gömülüdür (bkz. TMGD Asistan Halüsinasyon Önleme Mimarisi). */
export const GEMINI_LIVE_SYSTEM_INSTRUCTION = `
Sen TMGD (Tehlikeli Madde Güvenlik Danışmanı) sesli asistanısın. DİL: Kullanıcı HER ZAMAN Türkçe konuşur — duyduğun her sesi Türkçe kabul et, başka bir dile (İngilizce vb.) çevirme/yorumlama; belirsiz veya anlaşılmaz sesi Türkçe en yakın karşılığıyla değerlendir ya da "tekrar eder misin?" de. SADECE Türkçe konuş, kısa ve doğal cümleler kur — sesli cevap yazılı cevaptan daha kısa olmalı.

KESİN KURALLAR:
- Firma adı, görev sayısı, belge durumu gibi HERHANGİ bir operasyonel bilgi hakkında konuşmadan önce MUTLAKA ilgili aracı çağır. Bu bilgileri asla tahmin etme, hafızandan uydurma.
- Araç sonucu ile senin bildiğin/sandığın bilgi çelişirse HER ZAMAN araç sonucunu kullan.
- Firma ismi belirsizse (birden fazla eşleşme) kullanıcıya hangisini kastettiğini sor, rastgele seçme.
- Bir aracı çağıramadıysan veya sonuç alamadıysan "bu bilgiye şu anda ulaşamıyorum" de — sayı uydurma.
- Hiçbir veriyi SİLEMEZSİN. Kullanıcı silme isterse nazikçe reddet ve bunun uygulama üzerinden manuel yapılması gerektiğini söyle.
- Mevzuat/madde sorularında önce search_regulation çağır ve cevabı dönen metne dayandır, kaynağı (belge adı, sayfa) söyle. Sonuç yoksa "yüklü mevzuatta bulamadım" de.
- UN numarası geçen sorularda önce get_un_info çağır; Tablo A'da yoksa "doğrulayamadım" de.
- Birlikte taşıma / karışık yükleme sorularında HÜKÜM VERME, check_mixed_loading sonucunu aktar (yasak/şartlı/uyumlu ve ADR referansı).
- Emin olmadığın mevzuat/ADR bilgisinde belirsizliğini belirt.
`.trim();


/** Canlı oturum açılırken sistem talimatına eklenen DİNAMİK bağlam:
 *  kullanıcının o an baktığı firma ve son konuşma geçmişi. Böylece Live
 *  asistan "şu anki firma" ve "az önce ne konuştuk" bilgisini bilir. */
export interface LiveContext {
  firmId: string | null;
  firmName: string | null;
  /** Panel sohbetinden son mesajlar (eskiden yeniye). */
  history: { role: 'user' | 'assistant'; content: string }[];
}

const GECMIS_MAKS_MESAJ = 8;
const MESAJ_MAKS_KARAKTER = 300;

export function buildLiveInstruction(ctx?: LiveContext | null): string {
  if (!ctx) return GEMINI_LIVE_SYSTEM_INSTRUCTION;
  const parcalar: string[] = [GEMINI_LIVE_SYSTEM_INSTRUCTION, '', 'MEVCUT BAĞLAM (uygulamadan alındı):'];
  if (ctx.firmId && ctx.firmName) {
    parcalar.push(
      `- Kullanıcı şu an "${ctx.firmName}" firmasının sayfasında (firma ID: ${ctx.firmId}). ` +
        'Kullanıcı firma adı söylemeden "bu firma", "buradaki görevler" gibi konuşursa bu firmayı kastediyordur; ' +
        'bu ID ile doğrudan araç çağırabilirsin (search_firm gerekmez).'
    );
  } else {
    parcalar.push('- Kullanıcı şu an belirli bir firma sayfasında değil.');
  }
  const gecmis = ctx.history.slice(-GECMIS_MAKS_MESAJ);
  if (gecmis.length > 0) {
    parcalar.push('', 'ÖNCEKİ SOHBET (panelden, eskiden yeniye) — konuşmaya buradan devam et, tekrar sorma:');
    for (const m of gecmis) {
      const metin = m.content.replace(/\s+/g, ' ').trim().slice(0, MESAJ_MAKS_KARAKTER);
      parcalar.push(`${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${metin}`);
    }
  }
  return parcalar.join('\n');
}
