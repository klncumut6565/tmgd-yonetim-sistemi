// src/app/api/adr-assistant/route.ts
// ADR Asistani — global floating sohbet penceresinden cagrilir (bkz.
// src/components/adr-assistant/ADRAssistantWidget.tsx). Sorudaki UN
// numaralarini gercek adr_un_numbers tablosundan dogrulayip, coklu-motor
// (Grok/Gemini/OpenRouter) fallback ile Turkce cevap uretir. Cok-turlu
// sohbet destekler (onceki mesajlar "history" ile gonderilir).
//
// Yalnizca super_admin cagirabilir (Bearer token, bkz. verifySuperAdmin.ts).
//
// ONEMLI: Karisik yukleme UYUMLULUK sorulari icin bu asistan KESIN HUKUM
// VERMEZ — mevcut /adr?tab=karisik aracina yonlendirir.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperAdminFromRequest } from '@/lib/supabase/verifySuperAdmin'
import { callWithFallback, type ProviderConfig, type ChatMessage } from '@/lib/ai/multiEngine'
import { extractAction } from '@/lib/ai/actions'
import { checkPair, type UnRow, type CheckResult } from '@/lib/adrMix'
import { searchFirm, getFirmTaskSummary, getFirmMissingDocuments } from '@/lib/ai/dataTools'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function extractUnNumbers(text: string): string[] {
  const matches = text.match(/\b\d{4}\b/g) ?? []
  return Array.from(new Set(matches)).slice(0, 5)
}

export async function POST(req: NextRequest) {
  const admin = await getSuperAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const firmId = body?.firmId as string | undefined
  const question = (body?.question as string | undefined)?.trim()
  const history = Array.isArray(body?.history) ? (body.history as ChatMessage[]) : []

  if (!question) {
    return NextResponse.json({ error: '"question" alanı boş olamaz.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1) Firma bağlamı (widget şu an bir firma sayfasındaysa gönderilir)
  let firmContext = ''
  if (firmId) {
    const { data: firm } = await supabase
      .from('firms')
      .select('name, activities')
      .eq('id', firmId)
      .single()
    if (firm) {
      firmContext = `Şu an görüntülenen firma: ${firm.name}. Faaliyet konuları: ${(firm.activities ?? []).join(', ') || 'belirtilmemiş'}.`
    }
  }

  // 2) Sorudaki UN numaralarını gerçek Tablo A'dan doğrula (halüsinasyon önleme)
  const unNumbers = extractUnNumbers(question)
  let unContext = ''
  if (unNumbers.length > 0) {
    const { data: unRows } = await supabase
      .from('adr_un_numbers')
      .select('un_number, proper_shipping_name, class, packing_group, tunnel_code, hazard_no, labels, transport_category, limited_quantity, excepted_quantity')
      .in('un_number', unNumbers)

    if (unRows && unRows.length > 0) {
      unContext =
        'Sorudan tespit edilen UN numaralarına ait gerçek Tablo A verisi:\n' +
        unRows
          .map(
            (r) =>
              `UN ${r.un_number}: ${r.proper_shipping_name} — Sınıf ${r.class ?? '?'}, Ambalaj Grubu ${r.packing_group ?? '-'}, Tünel Kodu ${r.tunnel_code ?? '-'}, Tehlike No ${r.hazard_no ?? '-'}, Etiketler: ${r.labels ?? '-'}`
          )
          .join('\n')
    } else {
      unContext = `Not: Soruda ${unNumbers.join(', ')} numaraları geçiyor ama Tablo A'da bu numaralarla eşleşen kayıt bulunamadı — bu numaraları teyit etmeden kullanma.`
    }
  }

  // ---- MEVZUAT ARAMASI ----
  // Kullanıcının yüklediği GERÇEK mevzuat belgelerinde arama yapılır ve
  // yalnızca ilgili bölümler prompt'a eklenir. Belgenin tamamını göndermek
  // token sınırını aşacağı için sayfa bazlı, skora göre ilk birkaç parça
  // alınır. Böylece asistan kendi eğitim bilgisinden değil, resmî metinden
  // konuşur ve kaynak gösterebilir.
  let mevzuatContext = ''
  try {
    const { data: parcalar } = await supabase.rpc('mevzuat_ara', {
      p_sorgu: question,
      p_limit: 4,
    })

    if (parcalar && parcalar.length > 0) {
      mevzuatContext =
        'YÜKLÜ MEVZUAT BELGELERİNDEN İLGİLİ BÖLÜMLER:\n' +
        (parcalar as {
          baslik: string
          tur: string
          sayi_no: string | null
          sayfa_no: number
          icerik: string
        }[])
          .map(
            (p, i) =>
              `[${i + 1}] ${p.baslik}${p.sayi_no ? ` (${p.sayi_no})` : ''} — sayfa ${p.sayfa_no}:\n${p.icerik}`
          )
          .join('\n\n')
    }
  } catch {
    // Migration 038 çalıştırılmamışsa veya arama başarısızsa sessizce geç —
    // asistan mevzuat bağlamı olmadan çalışmaya devam etsin.
  }

  const systemPrompt = `### DİL KURALI — EN ÖNEMLİ KURAL ###
SEN SADECE TÜRKÇE KONUŞURSUN. Her cevabın istisnasız TÜRKÇE olmalı.
- Kullanıcı hangi dilde yazarsa yazsın, sen TÜRKÇE cevap verirsin.
- İngilizce TEK BİR KELİME bile yazma (uluslararası teknik kısaltmalar hariç: ADR, UN, SDS, MSDS, SRC).
- Düşünme sürecini, muhakemeni, plan yapmanı ASLA yazma. Sadece son cevabı Türkçe yaz.
- "We need to...", "The user wants...", "Let's..." gibi ifadeler KESİNLİKLE YASAK.
- Cevabına doğrudan başla; ne yapacağını anlatan giriş cümlesi kurma.

Sen bir TMGD (Tehlikeli Madde Güvenlik Danışmanı) yardımcı asistanısın. Kısa ve net cevap ver. Bu bir sohbet penceresi — önceki mesajları dikkate alarak bağlamı koru.

KURALLAR:
- Sadece sana verilen "Tablo A verisi" bölümündeki UN numarası bilgilerini KESİN OLARAK doğru kabul et. Orada olmayan UN numaraları hakkında kesin bilgi verme, "Tablo A'da doğrulayamadım" de.
- KARIŞIK YÜKLEME UYUMLULUĞU (bir aracta iki farklı maddenin birlikte taşınıp taşınamayacağı) sorularına SEN KESİN HÜKÜM VERMEZSİN — bunun yerine aşağıdaki EYLEM sistemiyle gerçek uyumluluk aracını (ADR 7.5.2 matrisi) açarsın.
- Regülasyon maddesi numarası verirken kesin değilsen belirt.
- Kısa, pratik, TMGD'nin günlük işine yarayacak şekilde cevap ver.
- Sana "YÜKLÜ MEVZUAT BELGELERİNDEN İLGİLİ BÖLÜMLER" verilmişse cevabını ÖNCELİKLE o metne dayandır ve sonunda kaynağı belirt (örn. "Kaynak: [1] Tehlikeli Madde Yönetmeliği, sayfa 12"). Verilen bölümlerde cevap yoksa bunu açıkça söyle, uydurma.
- CÜMLELERİNİ MUTLAKA TAMAMLA. Uzun bir konuyu anlatman gerekiyorsa az madde yaz ama her cümleyi bitir — yarım kalmış cümle bırakma. Anlatım uzayacaksa özetle, kesme.
- SEN VERİ/KAYIT SİLEMEZSİN. Kullanıcı bir şeyi silmeni isterse KESİNLİKLE reddet ve "Silme işlemi güvenlik nedeniyle asistan üzerinden yapılamaz, ilgili sayfadan manuel yapman gerekiyor" de. Aşağıdaki eylem listesinde silme YOKTUR ve asla olmayacaktır.

EYLEM SİSTEMİ:
Kullanıcının isteği net şekilde şu beş eylemden birine uyuyorsa, cevabının SONUNA şu formatta bir blok ekle (blok dışına da kısa bir onay cümlesi yaz):

1) Belge oluşturma ekranını açmak istiyorsa (örn. "belge oluştur", "belge oluşturma ekranını aç"):
\`\`\`eylem
{"type":"open_belge_olustur"}
\`\`\`

2) İki veya daha fazla UN numarasının birlikte taşınıp taşınamayacağını kontrol etmek istiyorsa (örn. "UN 1203'ü UN 1170 ile taşıyabilir miyim", "bu ikisi karışık yüklenebilir mi"):
\`\`\`eylem
{"type":"open_karisik_yukleme","un_numbers":["1203","1170"]}
\`\`\`
Bu eylemi ürettiğinde UYUMLULUK SONUCUNU SEN YAZMA (tahmin etme) — sistem bu eylemi gördüğünde gerçek hesaplama motorunu otomatik çalıştırıp sonucu cevabına ekleyecek. Sen sadece "Kontrol ediyorum..." gibi kısa bir cümle yaz, kesin sonuç iddiasında bulunma.

3) Şu an üzerinde bulunulan FİRMANIN kendi ekranları arasında geçiş istiyorsa (örn. "Taşıma Evrakı ekranını aç", "görevler sekmesine geç") — SADECE firma bağlamı varsa (aşağıdaki "Firma:" satırı doluysa) bu eylemi üret:
\`\`\`eylem
{"type":"open_firm_tab","tab":"adr_transport"}
\`\`\`
Geçerli "tab" değerleri: belge_takip, tasks, documents, belge_olustur, vehicles, drivers, employees, visits, adr_transport (Taşıma Evrakı), genel, denetim, notlar. Başka bir değer ASLA üretme.

4) Kullanıcı BAŞKA BİR FİRMAYI İSMİYLE açmak istiyorsa (örn. "ABC firmasını aç", "XYZ Ltd'nin taşıma evrakını göster") — bu, hangi ekranda olunursa olunsun kullanılabilir (genel ekranda dahil):
\`\`\`eylem
{"type":"open_firm","firm_name":"ABC"}
\`\`\`
Belirli bir sekme de isteniyorsa "tab" ekle, UN numarası da varsa "un_numbers" ekle:
\`\`\`eylem
{"type":"open_firm","firm_name":"ABC","tab":"adr_transport","un_numbers":["1203","1170"]}
\`\`\`
"firm_name" alanına kullanıcının söylediği ismi olabildiğince AYNEN yaz (kısaltma/düzeltme yapma) — sistem gerçek veritabanında arayıp en yakın eşleşmeyi bulacak. Firma bulunamazsa veya birden fazla eşleşme varsa sistem sana/kullanıcıya bunu bildirecek, sen firma ID'si UYDURMA.

(3) ve (4) için "un_numbers" verildiğinde ve tab "adr_transport" ise: ürünler OTOMATİK EKLENMEZ, sistem sadece firmanın envanterinde arayıp bulduğu ilkini formda seçili getirir. Miktarı kullanıcı kendi girip "Kalem Ekle"ye basmalı — miktarı SEN uydurmazsın. Bunu kullanıcıya kısaca belirt.

5) Kullanıcı YENİ BİR GÖREV eklemek istiyorsa (örn. "şu görevi ekle: ziyaret raporu sisteme girilecek", "görev oluştur: SDS güncellemesi"):
\`\`\`eylem
{"type":"prefill_task","title":"Ziyaret raporu sisteme girilecek"}
\`\`\`
"title" alanına kullanıcının tarif ettiği görevi KISA ve NET bir başlık olarak yaz (baştaki "şu görevi ekle" gibi komut kelimelerini çıkar). Görev OTOMATİK OLARAK KAYDEDİLMEZ — sistem Görevler sayfasını açıp başlığı forma doldurur, kullanıcı firmayı seçip "Ekle" butonuna basmalıdır. Bunu kullanıcıya kısaca belirt.

6) Kullanıcı bir firmanın GÖREV SAYISINI/DURUMUNU soruyorsa (örn. "ABC'nin kaç gecikmiş görevi var", "bugün hangi görevlerim var", "XYZ'nin yaklaşan görevleri neler"):
\`\`\`eylem
{"type":"get_task_summary","firm_name":"ABC","scope":"overdue"}
\`\`\`
"scope" değerleri: "overdue" (gecikmiş), "today" (bugün), "upcoming" (yaklaşan/gelecek), "all" (tümü — tamamlanmış/iptal hariç). Bu eylemi ürettiğinde SAYIYI VEYA GÖREV İSİMLERİNİ SEN YAZMA (tahmin etme) — sistem bu eylemi gördüğünde gerçek veritabanı sorgusunu otomatik çalıştırıp sonucu cevabına ekleyecek. Sen sadece "Kontrol ediyorum..." gibi kısa bir cümle yaz.

7) Kullanıcı bir firmanın EKSİK/TAMAMLANMAMIŞ BELGELERİNİ soruyorsa (örn. "ABC'nin eksik belgeleri neler", "XYZ'de hangi belgeler tamamlanmadı"):
\`\`\`eylem
{"type":"get_missing_documents","firm_name":"ABC"}
\`\`\`
Aynı şekilde: liste veya sayıyı SEN UYDURMA, sistem gerçek sorguyu çalıştırıp ekleyecek.

Bu yedi durumun DIŞINDA hiçbir eylem bloğu üretme — sadece soruları normal şekilde cevapla. Eylem bloğunu ürettiğinde bile önce kısa bir Türkçe cümleyle ne yaptığını açıkla.

### HALÜSİNASYON YASAĞI — OPERASYONEL VERİLER (KRİTİK) ###
Firma görev sayısı, belge durumu, tarih, denetim sonucu gibi operasyonel TMGD verilerini SEN ASLA TAHMİN ETMEZSİN. Bu tür bir soru geldiğinde YUKARIDAKİ (6) veya (7) eylemini üretmeden kesinlikle sayı/isim/tarih söyleme. Sana bu bilgi az önce "GERÇEK SİSTEM SONUCU" olarak verilmemişse ve ilgili eylemi de üretmiyorsan, "Bu bilgiyi kontrol etmem gerekiyor" de.

${firmContext}

${unContext}

${mevzuatContext}

### SON HATIRLATMA ###
CEVABIN TAMAMI TÜRKÇE OLACAK. Düşünme metni yazma, doğrudan cevabı ver.
Eylem bloğu yazıyorsan MUTLAKA üç ters tırnakla KAPAT — kapatmazsan blok kullanıcıya ham haliyle görünür.`.trim()

  const { data: providerRows, error: provErr } = await supabase
    .from('ai_provider_keys')
    .select('provider, api_key, model, priority')

  if (provErr || !providerRows) {
    return NextResponse.json({ error: 'AI sağlayıcı yapılandırması okunamadı.' }, { status: 500 })
  }

  const configs = providerRows as ProviderConfig[]
  const anyKeyConfigured = configs.some((c) => !!c.api_key)
  if (!anyKeyConfigured) {
    return NextResponse.json(
      { error: 'Hiçbir AI sağlayıcı anahtarı girilmemiş. Yönetim → AI Motor Anahtarları sayfasından en az bir anahtar ekle.' },
      { status: 400 }
    )
  }

  const messages: ChatMessage[] = [...history, { role: 'user', content: question }]

  const result = await callWithFallback(configs, systemPrompt, messages)

  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'Hiçbir AI motoru yanıt veremedi.',
        details: result.errors,
      },
      { status: 502 }
    )
  }

  // Eylem bloğunu ayrıştır (varsa metinden çıkar, temiz metni ayır)
  const { cleanText, action: rawAction } = extractAction(result.text as string)
  let finalAnswer = cleanText
  let action = rawAction

  // open_firm eylemiyse: LLM sadece bir isim söyledi, firm_id BİLMİYOR
  // ve UYDURAMAZ. Sunucu gerçek "firms" tablosunda arar:
  //   0 eşleşme  -> eyleme devam etmez, kullanıcıya bilgi verilir
  //   1 eşleşme  -> firm_id doldurulur, navigasyon güvenle yapılabilir
  //   2+ eşleşme -> belirsiz, kullanıcıya seçenekler listelenir, navigasyon yapılmaz
  if (action?.type === 'open_firm' && !action.firm_id) {
    const { matches } = await searchFirm(supabase, action.firm_name)

    if (matches.length === 0) {
      finalAnswer += `\n\n⚠️ "${action.firm_name}" isminde bir firma bulunamadı.`
      action = null
    } else if (matches.length === 1) {
      action = { ...action, firm_id: matches[0].id, firm_name: matches[0].name }
    } else {
      finalAnswer +=
        '\n\nBirden fazla eşleşme buldum, hangisini kastettiğini belirtir misin?\n' +
        matches.map((m) => `• ${m.name}`).join('\n')
      action = null
    }
  }

  // open_karisik_yukleme eylemiyse: LLM'in tahminine GÜVENME, gerçek
  // checkPair() motorunu (aynı /adr sayfasının kullandığı) çalıştırıp
  // deterministik sonucu cevaba EKLE. Böylece "uyumlu mu" sorusunun
  // cevabı her zaman sistemin kendi hesaplamasından gelir.
  if (action?.type === 'open_karisik_yukleme' && action.un_numbers.length >= 2) {
    const { data: pairRows } = await supabase
      .from('adr_un_numbers')
      .select('*')
      .in('un_number', action.un_numbers)

    const rows = (pairRows ?? []) as UnRow[]
    const foundNumbers = new Set(rows.map((r) => r.un_number))
    const missing = action.un_numbers.filter((n) => !foundNumbers.has(n))

    if (rows.length >= 2) {
      const STATUS_TR: Record<string, string> = {
        OK: '✓ Uyumlu',
        NO: '✗ YASAK — birlikte taşınamaz',
        COND: '⚠ Şartlı uyumlu',
        UNKNOWN: '? Belirsiz — manuel kontrol gerekir',
        EXPLOSIVE_SPECIAL: '⚠ Patlayıcı — manuel kontrol gerekir',
        FOOD: '🍎 Gıda tedbiri gerekir',
      }

      const pairResults: CheckResult[] = []
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          pairResults.push(checkPair(rows[i], rows[j]))
        }
      }

      const sonucSatirlari = pairResults
        .map(
          (p) =>
            `• UN ${p.un1} ↔ UN ${p.un2}: ${STATUS_TR[p.status] ?? p.status} (ADR ${p.adrRef}) — ${p.reason}`
        )
        .join('\n')

      finalAnswer +=
        '\n\n📊 GERÇEK SİSTEM SONUCU (Karışık Yükleme motoru — ADR 7.5.2):\n' + sonucSatirlari

      if (missing.length > 0) {
        finalAnswer += `\n\n⚠️ Not: ${missing.join(', ')} numaraları Tablo A'da bulunamadı, hesaba dahil edilemedi.`
      }
    } else {
      finalAnswer +=
        '\n\n⚠️ Karışık yükleme hesaplaması yapılamadı — belirtilen UN numaralarından yeterlisi Tablo A\'da bulunamadı.'
    }
  }

  // get_task_summary / get_missing_documents eylemleri: LLM'in tahminine
  // GÜVENME — önce firma adını gerçek firm_id'ye çöz (aynı open_firm
  // mantığı), sonra dataTools.ts'teki gerçek Supabase sorgusunu çalıştırıp
  // YAPISAL sonucu cevaba EKLE. Bu, Halüsinasyon Önleme Mimarisi'nin temel
  // ilkesi: "TOOL RESULT > MODEL MEMORY" — sayı/görev/belge asla modelin
  // kendi ürettiği metinden gelmez.
  if (action?.type === 'get_task_summary' || action?.type === 'get_missing_documents') {
    const firmMatch = await searchFirm(supabase, action.firm_name)

    if (firmMatch.matches.length === 0) {
      finalAnswer += `\n\n⚠️ "${action.firm_name}" isminde bir firma bulunamadı.`
      action = null
    } else if (firmMatch.matches.length > 1) {
      finalAnswer +=
        '\n\nBirden fazla eşleşme buldum, hangisini kastettiğini belirtir misin?\n' +
        firmMatch.matches.map((m) => `• ${m.name}`).join('\n')
      action = null
    } else {
      const firmId = firmMatch.matches[0].id
      const firmAdi = firmMatch.matches[0].name

      if (action.type === 'get_task_summary') {
        const sonuc = await getFirmTaskSummary(supabase, firmId, action.scope)
        const SCOPE_TR: Record<typeof action.scope, string> = {
          overdue: 'gecikmiş görev',
          today: 'bugüne ait görev',
          upcoming: 'yaklaşan görev',
          all: 'açık görev',
        }
        if (sonuc.count === 0) {
          finalAnswer += `\n\n📊 GERÇEK SİSTEM SONUCU: ${firmAdi} için ${SCOPE_TR[action.scope]} bulunmuyor.`
        } else {
          const satirlar = sonuc.tasks
            .map((t) => `• ${t.title}${t.due_date ? ` — ${t.due_date}` : ''} (${t.status})`)
            .join('\n')
          finalAnswer += `\n\n📊 GERÇEK SİSTEM SONUCU: ${firmAdi} — ${sonuc.count} ${SCOPE_TR[action.scope]}:\n${satirlar}`
        }
      } else {
        const sonuc = await getFirmMissingDocuments(supabase, firmId)
        if (sonuc.count === 0) {
          finalAnswer += `\n\n📊 GERÇEK SİSTEM SONUCU: ${firmAdi} için eksik/tamamlanmamış belge bulunmuyor.`
        } else {
          const satirlar = sonuc.documents.map((d) => `• ${d.code}${d.period ? ` (${d.period})` : ''}`).join('\n')
          finalAnswer += `\n\n📊 GERÇEK SİSTEM SONUCU: ${firmAdi} — ${sonuc.count} eksik belge:\n${satirlar}`
        }
      }
      // Bunlar navigasyon eylemi değil, veri sorgusu — widget'ın
      // actionToUrl() ile bir sayfaya gitmeye çalışmaması için temizlenir.
      action = null
    }
  }

  return NextResponse.json({
    ok: true,
    answer: finalAnswer,
    action,
    provider_used: result.provider,
    fallback_errors: result.errors,
  })
}
