// src/app/api/assistant/realtime/session/route.ts
//
// Gerçek zamanlı sesli asistan (Realtime Voice) için oturum başlatma
// endpoint'i — bkz. "TMGD Asistan — Gerçek Zamanlı Sesli Motor Geliştirme
// Planı" Bölüm 7 ve Faz 3.
//
// SAĞLAYICI: Google Gemini Live API. Neden: gerçek bir ücretsiz katmanı var
// (Flash modelleri), sistemde zaten GEMINI anahtarı yapılandırılı
// (ai_provider_keys tablosu — bkz. multiEngine.ts / speech-to-text route.ts
// ile AYNI anahtar, yeni bir sağlayıcı/anahtar EKLENMEDİ), native ses-ses
// (STT+LLM+TTS tek pakette), barge-in ve tool-calling destekliyor.
//
// AKIŞ (client kalıcı API anahtarı ASLA görmez):
//   1) Bu endpoint, kalıcı GEMINI_API_KEY ile Google'ın
//      /v1beta/auth_tokens endpoint'ine istek atar.
//   2) Google kısa ömürlü (ephemeral) bir token döner — bu token'ın
//      kullanım sayısı ve süresi sınırlıdır, kalıcı anahtar DEĞİLDİR.
//   3) Bu token client'a döndürülür; client WebSocket ile doğrudan
//      Gemini Live API'ye bağlanırken bunu "apiKey" gibi kullanır.
//
// NOT: Gemini Live API şu an yalnızca WebSocket destekliyor (WebRTC değil).
// Plan dokümanının "WebRTC tercih edilmeli" maddesi bu nedenle uygulanmadı;
// dokümanın kendisi de "kullanılan sağlayıcının desteklediği protokole göre
// implementasyon yapılmalı" diyor (Bölüm 6).
//
// Yalnızca super_admin çağırabilir — diğer /api/adr-assistant ve
// /api/speech-to-text endpoint'leriyle AYNI yetkilendirme deseni (bkz.
// Faz 1 analiz notu: bu kısıt bilinçli bir ürün kararı olarak ayrıca
// gözden geçirilebilir, bu endpoint mevcut deseni bozmuyor).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperAdminFromRequest } from '@/lib/supabase/verifySuperAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

// Gemini Live modeli — normal sohbet modelinden (ai_provider_keys.model)
// AYRI ve SABİT tutulur, çünkü Live API farklı bir API yüzeyidir (WebSocket,
// ses-ses). Model adı zaman içinde değişebilir; güncel isim için Gemini
// Live API dokümantasyonu kontrol edilmelidir.
const GEMINI_LIVE_MODEL = 'models/gemini-3.1-flash-live-preview'

// Ephemeral token'ın geçerlilik süresi. Kısa tutulur (güvenlik) ama
// bağlantı kurmaya yetecek kadar uzun olmalı.
const TOKEN_GECERLILIK_DK = 30

export async function POST(req: NextRequest) {
  const admin = await getSuperAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from('ai_provider_keys')
    .select('api_key')
    .eq('provider', 'gemini')
    .single()

  const apiKey = row?.api_key
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Gerçek zamanlı sesli asistan için Gemini anahtarı gerekli. ' +
          'Yönetim → AI Motor Anahtarları sayfasından Gemini anahtarını gir ' +
          '(metin sohbeti ile aynı anahtar kullanılır, ek bir şey gerekmez).',
      },
      { status: 400 }
    )
  }

  const expireTime = new Date(Date.now() + TOKEN_GECERLILIK_DK * 60_000).toISOString()

  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uses: 1,
        expireTime,
        liveConnectConstraints: {
          model: GEMINI_LIVE_MODEL,
          config: {
            sessionResumption: {},
            responseModalities: ['AUDIO'],
          },
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `Gemini Live oturumu başlatılamadı (HTTP ${res.status}).`, details: body.slice(0, 300) },
        { status: 502 }
      )
    }

    const json = (await res.json()) as { name?: string; expireTime?: string }
    if (!json.name) {
      return NextResponse.json(
        { error: 'Gemini Live oturum token\'ı alınamadı — beklenmeyen yanıt.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      sessionId: crypto.randomUUID(),
      token: json.name,
      expiresAt: json.expireTime ?? expireTime,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Gemini Live oturumu başlatılamadı.', details: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    )
  }
}
