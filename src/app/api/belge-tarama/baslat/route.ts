// src/app/api/belge-tarama/baslat/route.ts
//
// Belge Takip / Araç Evrakı Oluştur / Sürücü Listesi'ndeki bir yükleme
// alanı için mobil tarama oturumu başlatır.
//
// AKIŞ: TMGD kullanıcısı "📷 Mobilden Tara" butonuna basar → bu uç kısa
// ömürlü, tek kullanımlık bir token üretir → kullanıcı ayrı bir sekmede
// tarayici_ios PWA'sına yönlendirilir → tarama bitince PDF otomatik olarak
// /api/belge-tarama/callback ucuna gönderilir → kullanıcı bu sayfaya geri
// döner.
//
// HEDEF TİPİ (migration 047): tarama sonucunun nereye kaydedileceğini
// belirler. Geriye dönük uyumluluk için varsayılan 'belge_takip' — eski
// çağıranlar (code/period gönderenler) davranış değişikliği görmez.
//   'belge_takip'  -> firm_belgeleri/firm_belge_dosyalari (code+period)
//   'arac_ortak'   -> firms.{tur}_dosya_yolu/adi (hedefVeri: { tur })
//   'arac_ozel'    -> firm_arac_evraklari (hedefVeri: { vehicleId, anahtar })
//   'surucu_belge' -> firm_surucu_listesi (hedefVeri: { satirId, tur })
//
// Yetki: super_admin'e özel DEĞİL — o firmaya normal yazma erişimi olan
// herkes (mevcut dosya yükleme yetkisiyle aynı, bkz. verifyFirmAccess.ts).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFirmaYazmaYetkisiFromRequest } from '@/lib/supabase/verifyFirmAccess'

export const dynamic = 'force-dynamic'

type HedefTipi = 'belge_takip' | 'arac_ortak' | 'arac_ozel' | 'surucu_belge'

export async function POST(req: NextRequest) {
  const govde = await req.json().catch(() => null)
  const firmId = govde?.firmId as string | undefined
  const hedefTipi = ((govde?.hedefTipi as string | undefined) ?? 'belge_takip') as HedefTipi
  const hedefVeri = (govde?.hedefVeri as Record<string, unknown> | undefined) ?? {}

  // Geriye dönük uyumluluk: eski çağıran (Belge Takip) code/period'u
  // doğrudan gövdede gönderir, hedefTipi belirtmez.
  const code = (govde?.code as string | undefined)?.trim()
  const period = (govde?.period as string | undefined)?.trim() ?? ''

  if (!firmId) {
    return NextResponse.json({ error: 'firmId zorunlu.' }, { status: 400 })
  }

  if (hedefTipi === 'belge_takip' && !code) {
    return NextResponse.json({ error: 'code zorunlu.' }, { status: 400 })
  }
  if (hedefTipi === 'arac_ortak' && !hedefVeri.tur) {
    return NextResponse.json({ error: 'hedefVeri.tur zorunlu.' }, { status: 400 })
  }
  if (hedefTipi === 'arac_ozel' && (!hedefVeri.vehicleId || !hedefVeri.anahtar)) {
    return NextResponse.json({ error: 'hedefVeri.vehicleId ve hedefVeri.anahtar zorunlu.' }, { status: 400 })
  }
  if (hedefTipi === 'surucu_belge' && (!hedefVeri.satirId || !hedefVeri.tur)) {
    return NextResponse.json({ error: 'hedefVeri.satirId ve hedefVeri.tur zorunlu.' }, { status: 400 })
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
    .insert({
      firm_id: firmId,
      code: code ?? '',
      period,
      hedef_tipi: hedefTipi,
      hedef_veri: hedefVeri,
      created_by: kullanici.id,
    })
    .select('id')
    .single()

  if (error || !oturum) {
    return NextResponse.json(
      {
        error:
          /does not exist|not find the table|column .* does not exist/i.test(error?.message ?? '')
            ? 'Veritabanı güncellemesi (040_belge_tarama_oturumlari.sql ve 047_mobil_tarama_hedef_genelleme.sql) çalıştırılmalı.'
            : 'Tarama oturumu oluşturulamadı: ' + (error?.message ?? 'bilinmeyen hata'),
      },
      { status: 500 }
    )
  }

  // Bu TMGD sunucusundaki callback ve dönüş adresleri (mutlak URL gerekir —
  // tarayici_ios ayrı bir origin'de çalıştığı için görece yol işe yaramaz).
  const kendiOrigin = req.nextUrl.origin
  const callbackUrl = `${kendiOrigin}/api/belge-tarama/callback`

  // Dönüş adresi, hedef tipine göre kullanıcıyı doğru sekmeye/alt sekmeye
  // ve (araç için) doğru araç seçili şekilde geri götürür.
  let returnTo: string
  if (hedefTipi === 'arac_ortak' || hedefTipi === 'arac_ozel') {
    const aracIdParam = hedefTipi === 'arac_ozel' ? `&arac_id=${encodeURIComponent(String(hedefVeri.vehicleId))}` : ''
    returnTo = `${kendiOrigin}/firms/${firmId}?tab=vehicles&alt=arac_evraki${aracIdParam}`
  } else if (hedefTipi === 'surucu_belge') {
    returnTo = `${kendiOrigin}/firms/${firmId}?tab=drivers&alt=surucu_listesi`
  } else {
    returnTo = `${kendiOrigin}/firms/${firmId}?tab=belge_takip`
  }

  const params = new URLSearchParams({
    callbackUrl,
    returnTo,
    field_token: oturum.id,
  })

  const tarayiciDeepLink = `${tarayiciUrl.replace(/\/$/, '')}/tara?${params.toString()}`

  return NextResponse.json({ ok: true, url: tarayiciDeepLink })
}
