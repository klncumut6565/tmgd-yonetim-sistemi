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
// kalmıyoruz. Önce Gemini denenir; geçici hatalarda (503 yoğunluk,
// 429 kota) kısa beklemelerle tekrar denenir, o da olmazsa OpenRouter
// üzerinden multimodal bir modele düşülür.
//
// Yalnızca super_admin çağırabilir (Bearer token).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperAdminFromRequest } from '@/lib/supabase/verifySuperAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 45

const TALIMAT =
  'Bu ses kaydını Türkçe olarak birebir yazıya dök. SADECE konuşulan metni yaz — ' +
  'açıklama, yorum, tırnak işareti veya başka hiçbir şey ekleme. Ses anlaşılmıyorsa boş döndür.'

function bekle(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
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
  })

  // 503 (yoğunluk) ve 429 (kota) geçici olabilir — artan beklemelerle 3 deneme
  const beklemeler = [0, 1500, 3500]
  let sonHata = ''
  let sonGeciciMi = false

  for (const bekleme of beklemeler) {
    if (bekleme > 0) await bekle(bekleme)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: govde,
      })

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
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
    })

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
    .in('provider', ['gemini', 'openrouter'])

  const gemini = satirlar?.find((s) => s.provider === 'gemini')
  const openrouter = satirlar?.find((s) => s.provider === 'openrouter')

  if (!gemini?.api_key && !openrouter?.api_key) {
    return NextResponse.json(
      {
        error:
          'Sesli komut için Gemini veya OpenRouter anahtarı gerekli. ' +
          'Yönetim → AI Motor Anahtarları sayfasından en az birini gir.',
      },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await dosya.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mimeType = dosya.type || 'audio/webm'
  const hatalar: string[] = []

  // 1) Gemini (tekrar denemeli)
  if (gemini?.api_key) {
    const sonuc = await geminiDene(gemini.api_key, gemini.model, base64, mimeType)
    if (sonuc.ok) {
      return NextResponse.json({ ok: true, text: sonuc.text, provider_used: 'gemini' })
    }
    hatalar.push(sonuc.hata)
  }

  // 2) OpenRouter (yedek)
  if (openrouter?.api_key) {
    const sonuc = await openRouterDene(openrouter.api_key, openrouter.model, base64, mimeType)
    if (sonuc.ok) {
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
