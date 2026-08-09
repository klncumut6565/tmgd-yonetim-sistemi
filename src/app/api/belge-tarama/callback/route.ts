// src/app/api/belge-tarama/callback/route.ts
//
// tarayici_ios PWA'sının tarama bitince otomatik POST ettiği uç.
//
// ÖNEMLİ: Bu route HERKESE AÇIKTIR — çağıran taraf (tarayıcı PWA'sı) ayrı
// bir origin'de çalışır ve normal Supabase Bearer token TAŞIMAZ, sadece
// /baslat ucunun ürettiği URL'e gömülü token'ı form alanı olarak geri
// yansıtır (bkz. tarayici_ios/lib/scannerModule.ts → deliverDocument).
// Güvenlik modeli migration 040'ta açıklanmıştır: tahmin edilemez +
// kısa ömürlü + tek kullanımlık token.
//
// CORS: tarayici_ios ayrı bir origin'den (kendi Vercel adresi) tarayıcı
// içinden doğrudan fetch() ile POST attığı için bu uca CORS başlıkları
// eklenmesi ZORUNLU — yoksa istek sunucuya ulaşıp dosya kaydedilse bile
// tarayıcı, JS tarafının cevabı okumasını engelliyor ve istemci tarafında
// "Load failed" / "Failed to fetch" gibi bir hata görünüyor (isteğin
// kendisi değil, CEVABIN okunması engelleniyor). Kimlik doğrulama burada
// çerez/oturuma değil, tek kullanımlık token'a dayandığı için `*` ile
// açmak güvenlik açığı oluşturmuyor (credentials modu zaten kullanılmıyor).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function corsJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders })
}

// Bazı tarayıcılar (özellikle iOS Safari/WKWebView, form alanlarına bağlı
// olarak) multipart/form-data POST öncesi bir OPTIONS ön-uçuşu (preflight)
// gönderebilir. Bu olmadan preflight 404/405 alır ve asıl POST hiç
// denenmez.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) {
    return corsJson({ error: 'Geçersiz istek gövdesi.' }, 400)
  }

  const dosya = form.get('file')
  const token = form.get('token')

  // NOT: tarayici_ios, kullanıcının tarama ekranında seçtiği "Belge Türü"
  // (SDS/ADR/Fatura/...) bilgisini `docType` form alanı olarak da gönderir.
  // Burada BİLİNÇLİ OLARAK okunmuyor: bu entegrasyon yolunda hedef belge
  // türü (code/period) zaten oturum oluşturulurken (/baslat ucunda, kullanıcı
  // Belge Takip'teki spesifik satıra tıkladığında) sunucu tarafında
  // sabitleniyor — tarayıcı tarafındaki genel "Belge Türü" seçimi bu akış
  // için anlamlı bir yönlendirme sağlamıyor, sadece bilgi amaçlı geliyor.

  if (!dosya || !(dosya instanceof Blob) || typeof token !== 'string' || !token) {
    return corsJson({ error: 'Eksik alan: file veya token.' }, 400)
  }

  const supabase = createAdminClient()

  // ---- Token doğrulama: tahmin edilemez + süresi dolmamış + kullanılmamış ----
  const { data: oturum, error: oturumHata } = await supabase
    .from('belge_tarama_oturumlari')
    .select('id, firm_id, code, period, used_at, expires_at')
    .eq('id', token)
    .single()

  if (oturumHata || !oturum) {
    return corsJson({ error: 'Geçersiz tarama oturumu.' }, 403)
  }
  if (oturum.used_at) {
    return corsJson({ error: 'Bu tarama oturumu zaten kullanılmış.' }, 403)
  }
  if (new Date(oturum.expires_at).getTime() < Date.now()) {
    return corsJson({ error: 'Tarama oturumunun süresi dolmuş.' }, 403)
  }

  // ---- Dosyayı, mevcut manuel yükleme akışıyla AYNI konuma kaydet ----
  // (bkz. firms/[id]/page.tsx handleFileSelect — yol deseni birebir aynı
  // tutuluyor ki Belge Takip'teki önizleme/listeleme değişiklik istemesin)
  const orijinalAd = (form.get('title') as string | null) || 'tarama'
  const guvenliAd = orijinalAd.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.pdf'
  const donem = oturum.period || 'genel'
  const yol = `${oturum.firm_id}/belge-takip/${oturum.code}_${donem}/${Date.now()}_${guvenliAd}`

  const { error: yuklemeHata } = await supabase.storage
    .from('firm-files')
    .upload(yol, dosya, { upsert: true, contentType: 'application/pdf' })

  if (yuklemeHata) {
    return corsJson({ error: 'Dosya kaydedilemedi: ' + yuklemeHata.message }, 500)
  }

  const { error: dbHata } = await supabase.from('firm_belge_dosyalari').insert({
    firm_id: oturum.firm_id,
    code: oturum.code,
    period: oturum.period,
    file_path: yol,
    file_name: guvenliAd,
  })

  if (dbHata) {
    // Depoya yüklendi ama kayıt başarısız — dosyayı geri al, yarım kalmış
    // bir durum bırakma.
    await supabase.storage.from('firm-files').remove([yol])
    return corsJson({ error: 'Belge kaydı oluşturulamadı: ' + dbHata.message }, 500)
  }

  // Mevcut manuel akışla aynı: en az bir dosya varsa madde tamamlandı sayılır
  await supabase.from('firm_belgeleri').upsert(
    { firm_id: oturum.firm_id, code: oturum.code, period: oturum.period, done: true },
    { onConflict: 'firm_id,code,period' }
  )

  // Token'ı tek kullanımlık olarak işaretle
  await supabase
    .from('belge_tarama_oturumlari')
    .update({ used_at: new Date().toISOString(), file_name: guvenliAd })
    .eq('id', token)

  return corsJson({ ok: true })
}
