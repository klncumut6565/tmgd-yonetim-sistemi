// src/app/api/belge-tarama/baslat/route.ts
//
// Belge Takip'teki bir satır için mobil tarama oturumu başlatır.
//
// AKIŞ: TMGD kullanıcısı "📷 Mobilden Tara" butonuna basar → bu uç kısa
// ömürlü, tek kullanımlık bir token üretir → kullanıcı ayrı bir sekmede
// tarayici_ios PWA'sına yönlendirilir → tarama bitince PDF otomatik olarak
// /api/belge-tarama/callback ucuna gönderilir → kullanıcı bu sayfaya geri
// döner.
//
// Yetki: super_admin'e özel DEĞİL — o firmaya normal yazma erişimi olan
// herkes (mevcut dosya yükleme yetkisiyle aynı, bkz. verifyFirmAccess.ts).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFirmaYazmaYetkisiFromRequest } from '@/lib/supabase/verifyFirmAccess'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const govde = await req.json().catch(() => null)
  const firmId = govde?.firmId as string | undefined
  const code = (govde?.code as string | undefined)?.trim()
  const period = (govde?.period as string | undefined)?.trim() ?? ''

  if (!firmId || !code) {
    return NextResponse.json({ error: 'firmId ve code zorunlu.' }, { status: 400 })
  }

  const kullanici = await getFirmaYazmaYetkisiFromRequest(req, firmId)
  if (!kullanici) {
    return NextResponse.json({ error: 'Bu firmaya dosya yükleme yetkin yok.' }, { status: 403 })
  }

  const tarayiciUrl = process.env.NEXT_PUBLIC_TARAYICI_URL
  if (!tarayiciUrl) {
    return NextResponse.json(
      {
        error:
          'Mobil tarama aracı yapılandırılmamış. Yönetici, tarayici_ios PWA\'sını Vercel\'e deploy edip ' +
          'NEXT_PUBLIC_TARAYICI_URL ortam değişkenini ayarlamalı.',
      },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data: oturum, error } = await supabase
    .from('belge_tarama_oturumlari')
    .insert({ firm_id: firmId, code, period, created_by: kullanici.id })
    .select('id')
    .single()

  if (error || !oturum) {
    return NextResponse.json(
      {
        error:
          /does not exist|not find the table/i.test(error?.message ?? '')
            ? 'Veritabanı güncellemesi (040_belge_tarama_oturumlari.sql) çalıştırılmalı.'
            : 'Tarama oturumu oluşturulamadı: ' + (error?.message ?? 'bilinmeyen hata'),
      },
      { status: 500 }
    )
  }

  // Bu TMGD sunucusundaki callback ve dönüş adresleri (mutlak URL gerekir —
  // tarayici_ios ayrı bir origin'de çalıştığı için görece yol işe yaramaz).
  const kendiOrigin = req.nextUrl.origin
  const callbackUrl = `${kendiOrigin}/api/belge-tarama/callback`
  const returnTo = `${kendiOrigin}/firms/${firmId}?tab=belge_takip`

  const params = new URLSearchParams({
    callbackUrl,
    returnTo,
    field_token: oturum.id,
  })

  const tarayiciDeepLink = `${tarayiciUrl.replace(/\/$/, '')}/tara?${params.toString()}`

  return NextResponse.json({ ok: true, url: tarayiciDeepLink })
}
