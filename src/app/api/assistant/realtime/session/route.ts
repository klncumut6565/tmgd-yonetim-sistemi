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
// NOT: Live modeli artık BURADA belirtilmiyor — token'a liveConnectConstraints
// ile model kilitlemesi yapılmadığı için (bkz. aşağıdaki açıklama), model
// yalnızca WebSocket "setup" mesajında gönderiliyor (src/lib/voice/providers/
// geminiLive.ts → GEMINI_LIVE_MODEL). Tek kaynak orası.

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

  // Google'ın dokümantasyonundaki örnek format "YYYY-MM-DDTHH:MM:SSZ"
  // (milisaniyesiz) — Date.toISOString() milisaniyeli üretir
  // ("...T12:34:56.789Z"), bazı katı RFC3339 doğrulayıcıları bunu
  // reddedebiliyor. Milisaniye kısmını atıp örnek formatla birebir
  // eşleştiriyoruz.
  const expireTime = new Date(Date.now() + TOKEN_GECERLILIK_DK * 60_000)
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')

  // Token gövdesi — Google'ın resmi REST örneğine BİREBİR uygun (üst
  // seviye alanlar, "config" sarmalayıcısı YOK; SDK örneklerindeki
  // "config: {...}" sarmalayıcısı SDK'nın kendi imzası, HTTP gövdesi
  // değil).
  //
  // liveConnectConstraints BİLİNÇLİ OLARAK GÖNDERİLMİYOR: bu alan
  // dokümantasyonda opsiyoneldir ("It's also possible to lock an
  // ephemeral token to a set of configurations") ve tam da bu alan
  // yüzünden hem v1beta hem v1alpha 400 veriyordu ("Unknown name
  // \"liveConnectConstraints\" at 'auth_token': Cannot find field") —
  // görünüşe göre bu hesap/anahtar türünde veya bu API sürümünde alan
  // kabul edilmiyor. Model ve config'i kısıtlamaya gerek yok, çünkü
  // WebSocket bağlantısındaki ilk "setup" mesajı (bkz. geminiLive.ts)
  // zaten modeli, sistem talimatını ve araçları gönderiyor — token'ı
  // kilitlemek yalnızca ekstra bir güvenlik katmanıydı, işlevsel bir
  // gereklilik değil.
  const govde = JSON.stringify({
    uses: 1,
    expireTime,
  })

  // API sürümü: resmi dokümantasyon v1beta gösteriyor, ancak bazı hesap/
  // anahtar türlerinde ephemeral token üretimi yalnızca v1alpha ile
  // çalışıyor (Google geliştirici forumunda tekrar eden rapor). multiEngine.ts
  // ile AYNI felsefe: önce dokümante edilen sürümü dene, 400 ile başarısız
  // olursa diğerine düş.
  const denenecekSurumler = ['v1beta', 'v1alpha']
  const hatalar: string[] = []

  try {
    for (const surum of denenecekSurumler) {
      const res = await fetch(`https://generativelanguage.googleapis.com/${surum}/auth_tokens`, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: govde,
      })

      if (res.ok) {
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
          apiVersion: surum,
        })
      }

      const body = await res.text().catch(() => '')
      hatalar.push(`${surum}: HTTP ${res.status} — ${body.slice(0, 300)}`)
    }

    return NextResponse.json(
      {
        error: 'Gemini Live oturumu başlatılamadı (v1beta ve v1alpha ikisi de denendi).',
        details: hatalar.join(' | '),
      },
      { status: 502 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: 'Gemini Live oturumu başlatılamadı.', details: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    )
  }
}
