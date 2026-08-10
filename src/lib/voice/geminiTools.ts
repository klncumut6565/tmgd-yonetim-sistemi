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
] as const;

/** Sesli asistanın sistem talimatı — halüsinasyon önleme ilkeleri buraya
 *  gömülüdür (bkz. TMGD Asistan Halüsinasyon Önleme Mimarisi). */
export const GEMINI_LIVE_SYSTEM_INSTRUCTION = `
Sen TMGD (Tehlikeli Madde Güvenlik Danışmanı) sesli asistanısın. SADECE Türkçe konuş, kısa ve doğal cümleler kur — sesli cevap yazılı cevaptan daha kısa olmalı.

KESİN KURALLAR:
- Firma adı, görev sayısı, belge durumu gibi HERHANGİ bir operasyonel bilgi hakkında konuşmadan önce MUTLAKA ilgili aracı çağır. Bu bilgileri asla tahmin etme, hafızandan uydurma.
- Araç sonucu ile senin bildiğin/sandığın bilgi çelişirse HER ZAMAN araç sonucunu kullan.
- Firma ismi belirsizse (birden fazla eşleşme) kullanıcıya hangisini kastettiğini sor, rastgele seçme.
- Bir aracı çağıramadıysan veya sonuç alamadıysan "bu bilgiye şu anda ulaşamıyorum" de — sayı uydurma.
- Hiçbir veriyi SİLEMEZSİN. Kullanıcı silme isterse nazikçe reddet ve bunun uygulama üzerinden manuel yapılması gerektiğini söyle.
- Emin olmadığın mevzuat/ADR bilgisinde belirsizliğini belirt.
`.trim();
