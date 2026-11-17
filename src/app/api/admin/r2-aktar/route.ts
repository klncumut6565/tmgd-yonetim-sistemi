// src/app/api/admin/r2-aktar/route.ts — firm-files → Cloudflare R2 taşıma (YALNIZCA super_admin)
//
// GET            → R2 bağlantı testi + özet + aday dosyalar
// POST {yol}     → dosyayı Supabase'den indirir, R2'ye AYNI YOLLA yazar, boyutu doğrular.
//                  Supabase'deki dosya SİLİNMEZ.
// Dosya sunucudan sunucuya aktarılır; tarayıcıdan büyük veri gönderilmez.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperAdminFromRequest } from '@/lib/supabase/verifySuperAdmin'
import { r2Boyut, r2Etkin, r2Sil, r2Yaz } from '@/lib/r2'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TEST_YOLU = '_baglanti-testi.txt'

export async function GET(req: NextRequest) {
  if (!(await getSuperAdminFromRequest(req))) {
    return NextResponse.json({ error: 'Yalnızca süper yönetici.' }, { status: 401 })
  }
  if (!r2Etkin()) {
    return NextResponse.json({
      r2: { durum: 'eksik', mesaj: 'Vercel’de R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET tanımlı değil (ekledikten sonra yeniden yayın gerekir).' },
    })
  }
  let r2: { durum: string; mesaj?: string } = { durum: 'tamam' }
  try {
    await r2Yaz(TEST_YOLU, new TextEncoder().encode('ok'), 'text/plain')
    if ((await r2Boyut(TEST_YOLU)) !== 2) throw new Error('Test dosyası doğrulanamadı.')
    await r2Sil(TEST_YOLU)
  } catch (e) {
    r2 = { durum: 'hata', mesaj: (e as Error).message }
  }

  const db = createAdminClient()
  const [ozet, adaylar] = await Promise.all([db.rpc('depolama_r2_ozeti'), db.rpc('depolama_r2_adaylari')])
  if (ozet.error || adaylar.error) {
    return NextResponse.json(
      { r2, error: (ozet.error || adaylar.error)?.message + ' (migration 079 çalıştırıldı mı?)' },
      { status: 500 }
    )
  }
  return NextResponse.json({ r2, ozet: ozet.data, adaylar: adaylar.data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await getSuperAdminFromRequest(req))) {
    return NextResponse.json({ error: 'Yalnızca süper yönetici.' }, { status: 401 })
  }
  if (!r2Etkin()) return NextResponse.json({ error: 'R2 tanımlı değil.' }, { status: 400 })

  const govde = await req.json().catch(() => null)
  const yol = govde?.yol
  if (typeof yol !== 'string' || !yol || yol.split('/').some((p: string) => p === '..' || p === '')) {
    return NextResponse.json({ error: 'Geçersiz yol.' }, { status: 400 })
  }

  const db = createAdminClient()
  const kaydet = (durum: 'tamam' | 'hata', boyut: number, hata?: string) =>
    db.from('depolama_r2_aktarim').upsert({
      yol,
      boyut,
      durum,
      hata: hata?.slice(0, 500) ?? null,
      islenme: new Date().toISOString(),
    })

  try {
    const { data: blob, error } = await db.storage.from('firm-files').download(yol)
    if (error || !blob) throw new Error('Supabase’den indirilemedi: ' + (error?.message ?? ''))
    const veri = new Uint8Array(await blob.arrayBuffer())

    // R2'de aynı boyutta zaten varsa tekrar yazma
    const mevcut = await r2Boyut(yol)
    if (mevcut !== veri.byteLength) {
      await r2Yaz(yol, veri, blob.type || undefined)
      const yazilan = await r2Boyut(yol)
      if (yazilan !== veri.byteLength) throw new Error(`Boyut doğrulanamadı (${yazilan} ≠ ${veri.byteLength})`)
    }
    await kaydet('tamam', veri.byteLength)
    return NextResponse.json({ ok: true, boyut: veri.byteLength })
  } catch (e) {
    const mesaj = (e as Error).message
    await kaydet('hata', 0, mesaj)
    return NextResponse.json({ error: mesaj }, { status: 500 })
  }
}
