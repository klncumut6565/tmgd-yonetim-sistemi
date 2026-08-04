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

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const dosya = form.get('file')
  const token = form.get('token')

  if (!dosya || !(dosya instanceof Blob) || typeof token !== 'string' || !token) {
    return NextResponse.json({ error: 'Eksik alan: file veya token.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // ---- Token doğrulama: tahmin edilemez + süresi dolmamış + kullanılmamış ----
  const { data: oturum, error: oturumHata } = await supabase
    .from('belge_tarama_oturumlari')
    .select('id, firm_id, code, period, used_at, expires_at')
    .eq('id', token)
    .single()

  if (oturumHata || !oturum) {
    return NextResponse.json({ error: 'Geçersiz tarama oturumu.' }, { status: 403 })
  }
  if (oturum.used_at) {
    return NextResponse.json({ error: 'Bu tarama oturumu zaten kullanılmış.' }, { status: 403 })
  }
  if (new Date(oturum.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Tarama oturumunun süresi dolmuş.' }, { status: 403 })
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
    return NextResponse.json({ error: 'Dosya kaydedilemedi: ' + yuklemeHata.message }, { status: 500 })
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
    return NextResponse.json({ error: 'Belge kaydı oluşturulamadı: ' + dbHata.message }, { status: 500 })
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

  return NextResponse.json({ ok: true })
}
