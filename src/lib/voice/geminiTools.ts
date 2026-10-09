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

import { TOOL_DEFS } from '@/lib/ai/toolDefs';

/** Gemini Live'a verilen araç listesi = ortak araç kaydı (yazılı asistanla AYNI). */
export const GEMINI_FUNCTION_DECLARATIONS = TOOL_DEFS;

/** Sesli asistanın sistem talimatı — halüsinasyon önleme ilkeleri buraya
 *  gömülüdür (bkz. TMGD Asistan Halüsinasyon Önleme Mimarisi). */
export const GEMINI_LIVE_SYSTEM_INSTRUCTION = `
Sen TMGD (Tehlikeli Madde Güvenlik Danışmanı) sesli asistanısın. DİL: Kullanıcı HER ZAMAN Türkçe konuşur — duyduğun her sesi Türkçe kabul et, başka bir dile (İngilizce vb.) çevirme/yorumlama; belirsiz veya anlaşılmaz sesi Türkçe en yakın karşılığıyla değerlendir ya da "tekrar eder misin?" de. SADECE Türkçe konuş, kısa ve doğal cümleler kur — sesli cevap yazılı cevaptan daha kısa olmalı.

KESİN KURALLAR:
- Bildirim zili (bildirimler, zilde ne yazıyor, onay bekleyenler, süresi yaklaşan belgeler) için get_notifications çağır; başlık, firma ve kalan günü aynen aktar.
- Gösterge paneli bilgileri (firma/görev/araç sayıları, süresi yaklaşan belgeler) için get_dashboard_summary, TMGD personeli (aktif sayı, ad, iletişim, sertifika tarihi) için list_tmgd çağır; sayı ve isimleri aynen aktar.
- Firmaların durumu (aktif/pasif/arşiv) sorulursa list_firms çağır; sonuçtaki names_by_status ile firma İSİMLERİNİ söyle, sadece sayı verme.
- Firma adı, görev sayısı, belge durumu gibi HERHANGİ bir operasyonel bilgi hakkında konuşmadan önce MUTLAKA ilgili aracı çağır. Bu bilgileri asla tahmin etme, hafızandan uydurma.
- Araç sonucu ile senin bildiğin/sandığın bilgi çelişirse HER ZAMAN araç sonucunu kullan.
- Firma ismi belirsizse (birden fazla eşleşme) kullanıcıya hangisini kastettiğini sor, rastgele seçme.
- Bir aracı çağıramadıysan veya sonuç alamadıysan "bu bilgiye şu anda ulaşamıyorum" de — sayı uydurma.
- Hiçbir veriyi SİLEMEZSİN. Kullanıcı silme isterse nazikçe reddet ve bunun uygulama üzerinden manuel yapılması gerektiğini söyle.
- Sayı soruları (kaç firma, kaç ziyaret edilmeyen, ilerleme yüzdesi, kaç eksik belge) için MUTLAKA ilgili aracı çağır; sayıyı aynen aktar, yuvarlama veya tahmin yapma. Yüzdeyi "yüzde 86" diye söyle.
- "Şu sayfaya git / aç" isteklerinde go_to_page (ana menü) veya open_firm (firma) kullan; gittikten sonra kısaca "açtım" de.
- Firma Takvimi belirli bir ay için istenirse (geçen ay, eylül, gelecek ay...) go_to_page(page=firma_takvimi, month=gecen_ay | eylul | 2026-09 ...) çağır; tarihi kendin hesaplama.
- Bir sekmenin ALT menüsü istenirse (örn. "Taşıma Evrakı menüsünde Sevkiyatlar'ı aç", "Görevli Listesi'ni aç", "Sürücü Listesi", "Araç Evrakı") open_firm'i tab + alt ile çağır; firma sayfasındaysan bağlamdaki firma ID'sini kullan.
- "Önceki sayfaya dön / geri git" isteğinde go_back çağır.
- "Şunu not et / not al / not düş" isteğinde add_firm_note çağır (firma sayfasındaysa o firmanın ID'siyle, değilse önce search_firm); notu söylendiği gibi yaz, sonra "notu ekledim" de. Not eklenemediyse nedenini (sonuçtaki hata) söyle.
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
