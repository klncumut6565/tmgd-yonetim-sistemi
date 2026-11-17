// src/app/api/depo/route.ts — "firm-files" dosya erişimi (R2 + Supabase geçiş katmanı)
//
// Yetkiler Supabase Storage RLS politikalarıyla AYNI:
//   okuma : is_admin() VEYA is_assigned(<yolun ilk parçası = firm_id>)
//   yazma : is_admin() VEYA yazabilir()
//   silme : is_admin()
//
// Okuma: dosya R2'de varsa R2'den, yoksa Supabase'den imzalı adres verilir
//        (taşıma sürerken kesinti olmaz).
// Yazma: R2 tanımlıysa R2'ye imzalı PUT adresi; değilse istemci Supabase'e yükler.
// Silme: her iki depodan da silinir.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createUserScopedClient } from '@/lib/supabase/verifySuperAdmin'
import { r2Boyut, r2Etkin, r2ImzaliGet, r2ImzaliPut, r2Sil } from '@/lib/r2'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const BUCKET = 'firm-files'

function gecerliYol(yol: unknown): yol is string {
  return (
    typeof yol === 'string' &&
    yol.length > 0 &&
    yol.length < 1024 &&
    !yol.startsWith('/') &&
    !yol.split('/').some((p) => p === '..' || p === '.' || p === '')
  )
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function kullanici(req: NextRequest) {
  const h = req.headers.get('authorization')
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return null
  const anon = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  )
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) return null
  const db = createUserScopedClient(token)
  const { data: admin } = await db.rpc('is_admin')
  return { db, admin: admin === true }
}

export async function POST(req: NextRequest) {
  const k = await kullanici(req)
  if (!k) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })

  const govde = await req.json().catch(() => null)
  const islem = govde?.islem

  // ---------------------------------------------------------------- OKU
  if (islem === 'oku') {
    const yollar: unknown[] = Array.isArray(govde.yollar) ? govde.yollar.slice(0, 200) : []
    const sure = Math.min(Math.max(Number(govde.sure) || 600, 60), 7 * 24 * 3600)
    const atanmis = new Map<string, boolean>()
    const servis = createAdminClient()
    const r2 = r2Etkin()

    const adresler = await Promise.all(
      yollar.map(async (yol) => {
        if (!gecerliYol(yol)) return null
        if (!k.admin) {
          const firma = yol.split('/')[0]
          if (!UUID.test(firma)) return null
          if (!atanmis.has(firma)) {
            const { data } = await k.db.rpc('is_assigned', { p_firm_id: firma })
            atanmis.set(firma, data === true)
          }
          if (!atanmis.get(firma)) return null
        }
        try {
          if (r2 && (await r2Boyut(yol)) !== null) return await r2ImzaliGet(yol, sure)
        } catch {
          /* R2'ye ulaşılamazsa Supabase'e düş */
        }
        const { data } = await servis.storage.from(BUCKET).createSignedUrl(yol, sure)
        return data?.signedUrl ?? null
      })
    )
    return NextResponse.json({ adresler })
  }

  // ---------------------------------------------------------------- YAZ
  if (islem === 'yaz') {
    const yol = govde.yol
    if (!gecerliYol(yol)) return NextResponse.json({ error: 'Geçersiz yol.' }, { status: 400 })
    if (!k.admin) {
      const { data: yazar } = await k.db.rpc('yazabilir')
      if (yazar !== true) return NextResponse.json({ error: 'Yükleme yetkiniz yok.' }, { status: 403 })
    }
    if (!r2Etkin()) return NextResponse.json({ supabase: true })

    if (!govde.upsert && (await r2Boyut(yol)) !== null) {
      return NextResponse.json({ error: 'Bu adla bir dosya zaten var.' }, { status: 409 })
    }
    return NextResponse.json({ url: await r2ImzaliPut(yol) })
  }

  // ---------------------------------------------------------------- SİL
  if (islem === 'sil') {
    if (!k.admin) return NextResponse.json({ error: 'Silme yetkiniz yok.' }, { status: 403 })
    const yollar = (Array.isArray(govde.yollar) ? govde.yollar : []).filter(gecerliYol).slice(0, 100)
    if (r2Etkin()) await Promise.all(yollar.map((y: string) => r2Sil(y).catch(() => {})))
    await createAdminClient().storage.from(BUCKET).remove(yollar)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 })
}
