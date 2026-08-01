// src/app/api/speech-to-text/route.ts
//
// Tarayıcıdan gelen ses kaydını metne çevirir.
//
// NEDEN SUNUCUDA: Web Speech API tarayıcının kendi konuşma servisine
// bağımlı olduğu için tarayıcıdan tarayıcıya davranış değişiyordu
// (Chrome'da sessizce cevapsız kalıyor, Opera hiç desteklemiyor).
// Sesi kendimiz metne çevirince davranış her tarayıcıda aynı olur.
//
// DAYANIKLILIK: Metin tarafındaki gibi burada da tek noktaya bağlı
// kalmıyoruz. Önce Gemini denenir; geçici bir hatada (503/429) BİR kez
// tekrar denenir, o da olmazsa OpenRouter'a düşülür.
//
// ZAMAN BÜTÇESİ (önemli): Sunucu fonksiyonunun toplam süre sınırı var.
// Aşılırsa Vercel HTML hata sayfası döndürür ve istemcideki JSON.parse
// patlar ('Unexpected token A...'). Bu yüzden HER dış çağrının kendi
// zaman sınırı var ve toplam bütçe maxDuration'ın altında tutuluyor.
//
// Yalnızca super_admin çağırabilir (Bearer token).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperAdminFromRequest } from '@/lib/supabase/verifySuperAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 25

const TALIMAT =
  'Bu ses kaydı TÜRKÇE konuşmadır. Duyduğun Türkçe konuşmayı birebir Türkçe yazıya dök. ' +
  'ÇEVİRİ YAPMA — başka dile çevirme, olduğu gibi Türkçe yaz. ' +
  'SADECE konuşulan metni yaz: açıklama, yorum, tırnak işareti, giriş cümlesi ekleme. ' +
  'Ses anlaşılmıyorsa veya sessizse HİÇBİR ŞEY YAZMA, tamamen boş döndür. ' +
  'Sessizliği doldurmak için metin UYDURMA.'


/**
 * WHISPER HALÜSİNASYON FİLTRESİ
 *
 * Whisper modelleri sessizlik veya anlamsız gürültü aldığında, eğitim
 * verisindeki YouTube altyazılarından öğrendikleri kalıpları UYDURUR.
 * Türkçe'de en sık görülenler: "İzlediğiniz için teşekkür ederim",
 * "Altyazı M.K.", "Abone olmayı unutmayın".
 *
 * Bu metinler kullanıcının söylediği bir şey DEĞİLDİR. Filtrelenmezse
 * asistana gider, asistan cevap verir ve sesli modda sonsuz bir
 * uydurma sohbet döngüsü başlar.
 */
const HALUSINASYON_KALIPLARI: RegExp[] = [
  /izlediginiz icin tesekkur/i,   // sadeleştirilmiş metinde yakalanır
  /izlediğiniz için teşekkür/i,   // ham metinde yakalanır
  /izleyip destek/i,
  /videoyu izle/i,
  /altyazı\s*[:.]?\s*m\.?k\.?/i,
  /altyazi\s*[:.]?\s*m\.?k\.?/i,
  /^altyazı/i,
  /^altyazi/i,
  /abone olmayı unutmayın/i,
  /abone olmayi unutmayin/i,
  /bir sonraki (video|bölüm)/i,
  /kanalıma abone/i,
  /thanks? for watching/i,
  /please subscribe/i,
  /subtitles? by/i,
  /^\s*(teşekkürler|tesekkurler|thank you|thanks)\s*[.!]?\s*$/i,
  /^\s*(altyazı|altyazi|subtitle)s?\s*[:.]/i,
];

/** Metin bir Whisper halüsinasyonu mu? */
function halusinasyonMu(metin: string): boolean {
  const t = metin.trim();
  if (!t) return true;
  // Çok kısa çıktılar da genelde gürültüden gelir
  if (t.length < 3) return true;
  return HALUSINASYON_KALIPLARI.some((k) => k.test(t));
}

function bekle(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Belirtilen süre içinde yanıt gelmezse isteği iptal eden fetch. */
async function fetchZamanSinirli(url: string, init: RequestInit, msSinir: number) {
  const kontrolcu = new AbortController()
  const zamanlayici = setTimeout(() => kontrolcu.abort(), msSinir)
  try {
    return await fetch(url, { ...init, signal: kontrolcu.signal })
  } finally {
    clearTimeout(zamanlayici)
  }
}


/**
 * Groq Whisper ile transkripsiyon — SES İÇİN ÖZELLEŞMİŞ model.
 *
 * Gemini gibi genel amaçlı çok modlu modeller yerine Whisper kullanmak
 * hem çok daha hızlı (özel donanımda ~228x gerçek zaman) hem de ücretsiz
 * katmanda cömert (günde 2.000 istek). Bu yüzden ilk sırada denenir.
 *
 * NOT: 'groq' (bu, Whisper sağlayıcısı) ile 'grok' (xAI sohbet modeli)
 * karıştırılmamalı — farklı şirketler, farklı anahtarlar.
 */
async function groqDene(
  apiKey: string,
  model: string,
  ses: Blob,
  mimeType: string
): Promise<{ ok: true; text: string } | { ok: false; hata: string }> {
  const uzanti = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
  const form = new FormData()
  form.append('file', ses, `kayit.${uzanti}`)
  form.append('model', model)
  form.append('language', 'tr')
  form.append('response_format', 'text')

  try {
    const res = await fetchZamanSinirli(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form },
      9000
    )

    if (!res.ok) {
      const cevap = await res.text().catch(() => '')
      return { ok: false, hata: `Groq HTTP ${res.status}: ${cevap.slice(0, 150)}` }
    }

    // response_format=text olduğu için düz metin döner
    const metin = (await res.text()).trim()
    return { ok: true, text: metin }
  } catch (e) {
    return { ok: false, hata: 'Groq: ' + (e instanceof Error ? e.message : String(e)) }
  }
}

/** Gemini ile transkripsiyon. Geçici hatalarda (429/503) tekrar dener. */
async function geminiDene(
  apiKey: string,
  model: string,
  base64: string,
  mimeType: string
): Promise<{ ok: true; text: string } | { ok: false; hata: string; geciciMi: boolean }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const govde = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: TALIMAT }, { inline_data: { mime_type: mimeType, data: base64 } }],
      },
    ],
    generationConfig: { maxOutputTokens: 300, temperature: 0 },
    // Not: temperature 0 — transkripsiyonda yaratıcılık istemiyoruz,
    // uydurma metin riskini en aza indirir.
  })

  // 503/429 geçici olabilir — ama zaman bütçesi dar, sadece 1 tekrar
  const beklemeler = [0, 800]
  let sonHata = ''
  let sonGeciciMi = false

  for (const bekleme of beklemeler) {
    if (bekleme > 0) await bekle(bekleme)
    try {
      const res = await fetchZamanSinirli(
        url,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: govde },
        9000
      )

      if (res.ok) {
        const json = await res.json()
        const metin = (json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
        return { ok: true, text: metin }
      }

      const cevap = await res.text().catch(() => '')
      sonGeciciMi = res.status === 503 || res.status === 429
      sonHata = `Gemini HTTP ${res.status}: ${cevap.slice(0, 150)}`
      if (!sonGeciciMi) break // kalıcı hata (401 vs.) — tekrar denemenin anlamı yok
    } catch (e) {
      sonHata = 'Gemini: ' + (e instanceof Error ? e.message : String(e))
      sonGeciciMi = true
    }
  }

  return { ok: false, hata: sonHata, geciciMi: sonGeciciMi }
}

/** OpenRouter ile transkripsiyon (yedek yol, OpenAI uyumlu ses formatı). */
async function openRouterDene(
  apiKey: string,
  model: string,
  base64: string,
  mimeType: string
): Promise<{ ok: true; text: string } | { ok: false; hata: string }> {
  // OpenAI uyumlu "input_audio" formatı — format alanı uzantı adı bekler
  const format = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'

  try {
    const res = await fetchZamanSinirli(
      'https://openrouter.ai/api/v1/chat/completions',
      {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: TALIMAT },
              { type: 'input_audio', input_audio: { data: base64, format } },
            ],
          },
        ],
        max_tokens: 300,
      }),
      },
      9000
    )

    if (!res.ok) {
      const cevap = await res.text().catch(() => '')
      return { ok: false, hata: `OpenRouter HTTP ${res.status}: ${cevap.slice(0, 150)}` }
    }

    const json = await res.json()
    const metin = (json?.choices?.[0]?.message?.content ?? '').trim()
    return { ok: true, text: metin }
  } catch (e) {
    return { ok: false, hata: 'OpenRouter: ' + (e instanceof Error ? e.message : String(e)) }
  }
}

export async function POST(req: NextRequest) {
  const admin = await getSuperAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const dosya = form?.get('audio')
  if (!dosya || !(dosya instanceof Blob)) {
    return NextResponse.json({ error: 'Ses verisi bulunamadı.' }, { status: 400 })
  }

  if (dosya.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Ses kaydı çok büyük (en fazla 8MB).' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: satirlar } = await supabase
    .from('ai_provider_keys')
    .select('provider, api_key, model')
    .in('provider', ['groq', 'gemini', 'openrouter'])

  const groq = satirlar?.find((s) => s.provider === 'groq')
  const gemini = satirlar?.find((s) => s.provider === 'gemini')
  const openrouter = satirlar?.find((s) => s.provider === 'openrouter')

  if (!groq?.api_key && !gemini?.api_key && !openrouter?.api_key) {
    return NextResponse.json(
      {
        error:
          'Sesli komut için bir ses motoru anahtarı gerekli. En iyi seçenek: Groq (Whisper) — ' +
          'ücretsiz ve hızlı. Yönetim → AI Motor Anahtarları sayfasından gir.',
      },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await dosya.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mimeType = dosya.type || 'audio/webm'
  const hatalar: string[] = []

  // 1) Groq Whisper — ses için özelleşmiş, en hızlı ve ücretsiz katmanı cömert
  if (groq?.api_key) {
    const sonuc = await groqDene(groq.api_key, groq.model, dosya, mimeType)
    if (sonuc.ok) {
      if (halusinasyonMu(sonuc.text)) {
        return NextResponse.json({ ok: true, text: '', provider_used: 'groq', filtered: true })
      }
      return NextResponse.json({ ok: true, text: sonuc.text, provider_used: 'groq' })
    }
    hatalar.push(sonuc.hata)
  }

  // 2) Gemini (tekrar denemeli)
  if (gemini?.api_key) {
    const sonuc = await geminiDene(gemini.api_key, gemini.model, base64, mimeType)
    if (sonuc.ok) {
      if (halusinasyonMu(sonuc.text)) {
        return NextResponse.json({ ok: true, text: '', provider_used: 'gemini', filtered: true })
      }
      return NextResponse.json({ ok: true, text: sonuc.text, provider_used: 'gemini' })
    }
    hatalar.push(sonuc.hata)
  }

  // 3) OpenRouter (son yedek)
  if (openrouter?.api_key) {
    const sonuc = await openRouterDene(openrouter.api_key, openrouter.model, base64, mimeType)
    if (sonuc.ok) {
      if (halusinasyonMu(sonuc.text)) {
        return NextResponse.json({ ok: true, text: '', provider_used: 'openrouter', filtered: true })
      }
      return NextResponse.json({ ok: true, text: sonuc.text, provider_used: 'openrouter' })
    }
    hatalar.push(sonuc.hata)
  }

  return NextResponse.json(
    {
      error:
        'Ses metne çevrilemedi — tüm motorlar başarısız oldu. Birazdan tekrar dene ya da yazarak sorabilirsin.',
      details: hatalar,
    },
    { status: 502 }
  )
}
