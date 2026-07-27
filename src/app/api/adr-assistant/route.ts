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

  const systemPrompt = `Sen bir TMGD (Tehlikeli Madde Güvenlik Danışmanı) yardımcı asistanısın. Türkçe, kısa ve net cevap ver. Bu bir sohbet penceresi — önceki mesajları dikkate alarak bağlamı koru.

KURALLAR:
- Sadece sana verilen "Tablo A verisi" bölümündeki UN numarası bilgilerini KESİN OLARAK doğru kabul et. Orada olmayan UN numaraları hakkında kesin bilgi verme, "Tablo A'da doğrulayamadım" de.
- KARIŞIK YÜKLEME UYUMLULUĞU (bir aracta iki farklı maddenin birlikte taşınıp taşınamayacağı) sorularına SEN KESİN HÜKÜM VERMEZSİN — bunun yerine aşağıdaki EYLEM sistemiyle gerçek uyumluluk aracını (ADR 7.5.2 matrisi) açarsın.
- Regülasyon maddesi numarası verirken kesin değilsen belirt.
- Kısa, pratik, TMGD'nin günlük işine yarayacak şekilde cevap ver.
- SEN VERİ/KAYIT SİLEMEZSİN. Kullanıcı bir şeyi silmeni isterse KESİNLİKLE reddet ve "Silme işlemi güvenlik nedeniyle asistan üzerinden yapılamaz, ilgili sayfadan manuel yapman gerekiyor" de. Aşağıdaki eylem listesinde silme YOKTUR ve asla olmayacaktır.

EYLEM SİSTEMİ:
Kullanıcının isteği net şekilde şu iki eylemden birine uyuyorsa, cevabının SONUNA şu formatta bir blok ekle (blok dışına da kısa bir onay cümlesi yaz):

1) Belge oluşturma ekranını açmak istiyorsa (örn. "belge oluştur", "taşıma evrağı oluştur ekranını aç"):
\`\`\`eylem
{"type":"open_belge_olustur"}
\`\`\`

2) İki veya daha fazla UN numarasının birlikte taşınıp taşınamayacağını kontrol etmek istiyorsa (örn. "UN 1203'ü UN 1170 ile taşıyabilir miyim", "bu ikisi karışık yüklenebilir mi"):
\`\`\`eylem
{"type":"open_karisik_yukleme","un_numbers":["1203","1170"]}
\`\`\`
Bu eylemi ürettiğinde UYUMLULUK SONUCUNU SEN YAZMA (tahmin etme) — sistem bu eylemi gördüğünde gerçek hesaplama motorunu otomatik çalıştırıp sonucu cevabına ekleyecek. Sen sadece "Kontrol ediyorum..." gibi kısa bir cümle yaz, kesin sonuç iddiasında bulunma.

Bu iki durumun DIŞINDA hiçbir eylem bloğu üretme — sadece soruları normal şekilde cevapla. Eylem bloğunu ürettiğinde bile önce kısa bir Türkçe cümleyle ne yaptığını açıkla (örn. "Karışık yükleme aracını UN 1203 ve UN 1170 için açıyorum, sonucu kontrol ediyorum.").

${firmContext}

${unContext}`.trim()

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
  const { cleanText, action } = extractAction(result.text as string)
  let finalAnswer = cleanText

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

  return NextResponse.json({
    ok: true,
    answer: finalAnswer,
    action,
    provider_used: result.provider,
    fallback_errors: result.errors,
  })
}
