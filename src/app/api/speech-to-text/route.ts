// src/app/api/speech-to-text/route.ts
//
// Tarayıcıdan gelen ses kaydını metne çevirir (Gemini multimodal).
//
// NEDEN SUNUCUDA: Web Speech API tarayıcının kendi konuşma servisine
// bağımlı olduğu için tarayıcıdan tarayıcıya davranış değişiyordu
// (Chrome'da sessizce cevapsız kalıyor, Opera hiç desteklemiyor).
// Sesi kendimiz metne çevirince davranış her tarayıcıda aynı olur.
//
// Yalnızca super_admin çağırabilir (Bearer token).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperAdminFromRequest } from '@/lib/supabase/verifySuperAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

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

  // Gemini'nin ses girişi desteği var — mevcut anahtarı kullanıyoruz,
  // ayrı bir transkripsiyon servisine abone olmaya gerek yok.
  const { data: satir } = await supabase
    .from('ai_provider_keys')
    .select('api_key, model')
    .eq('provider', 'gemini')
    .single()

  if (!satir?.api_key) {
    return NextResponse.json(
      {
        error:
          'Sesli komut için Gemini anahtarı gerekli. Yönetim → AI Motor Anahtarları sayfasından Gemini anahtarını gir.',
      },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await dosya.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mimeType = dosya.type || 'audio/webm'

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${satir.model}:generateContent?key=${satir.api_key}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  'Bu ses kaydını Türkçe olarak birebir yazıya dök. SADECE konuşulan metni yaz — ' +
                  'açıklama, yorum, tırnak işareti veya başka hiçbir şey ekleme. Ses anlaşılmıyorsa boş döndür.',
              },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 300, temperature: 0 },
      }),
    })

    if (!res.ok) {
      const govde = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `Ses metne çevrilemedi (Gemini HTTP ${res.status}): ${govde.slice(0, 200)}` },
        { status: 502 }
      )
    }

    const json = await res.json()
    const metin = (json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()

    return NextResponse.json({ ok: true, text: metin })
  } catch (e) {
    return NextResponse.json(
      { error: 'Ses metne çevrilemedi: ' + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    )
  }
}
