// src/app/api/admin/depolama-sikistir/route.ts
//
// Mevcut firm-files dosyalarını sıkıştırma (Yönetim → Depolama). YALNIZCA super_admin.
//
// Akış (tarayıcı tarafı: src/app/admin/depolama/page.tsx):
//   GET                      → özet + işlenmemiş aday dosyalar
//   POST {islem:'hazirla'}   → orijinali firm-files-yedek'e AYNI YOLLA kopyalar,
//                              sonra üzerine yazma için imzalı yükleme adresi döner
//   POST {islem:'tamamla'}   → sonucu depolama_sikistirma_kayitlari'na yazar
//
// Sıkıştırma tarayıcıda yapılır (pdf.js + canvas); sunucuya büyük dosya
// gönderilmez, böylece Vercel gövde sınırına (4,5 MB) takılmaz.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperAdminFromRequest } from '@/lib/supabase/verifySuperAdmin'

export const dynamic = 'force-dynamic'

const KAYNAK = 'firm-files'
const YEDEK = 'firm-files-yedek'

function gecerliYol(yol: unknown): yol is string {
  // Sadece '..' KLASÖR parçalarını reddet — "Rev..pdf" gibi dosya adları geçerli.
  return (
    typeof yol === 'string' &&
    yol.length > 0 &&
    yol.length < 1024 &&
    !yol.startsWith('/') &&
    !yol.split('/').some((p) => p === '..' || p === '.' || p === '')
  )
}

export async function GET(req: NextRequest) {
  if (!(await getSuperAdminFromRequest(req))) {
    return NextResponse.json({ error: 'Yalnızca süper yönetici.' }, { status: 401 })
  }
  const db = createAdminClient()
  const [ozet, adaylar] = await Promise.all([
    db.rpc('depolama_ozeti'),
    db.rpc('depolama_sikistirma_adaylari'),
  ])
  if (ozet.error || adaylar.error) {
    return NextResponse.json(
      { error: (ozet.error || adaylar.error)?.message + ' (migration 078 çalıştırıldı mı?)' },
      { status: 500 }
    )
  }
  return NextResponse.json({ ozet: ozet.data, adaylar: adaylar.data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await getSuperAdminFromRequest(req))) {
    return NextResponse.json({ error: 'Yalnızca süper yönetici.' }, { status: 401 })
  }
  const govde = await req.json().catch(() => null)
  const yol = govde?.yol
  if (!gecerliYol(yol)) return NextResponse.json({ error: 'Geçersiz yol.' }, { status: 400 })

  const db = createAdminClient()

  if (govde.islem === 'hazirla') {
    // 1) Orijinali yedekle (zaten yedeklenmişse — önceki yarım kalan deneme — sorun değil)
    const { error: kopyaHata } = await db.storage
      .from(KAYNAK)
      .copy(yol, yol, { destinationBucket: YEDEK })
    if (kopyaHata && !/exist|duplicate/i.test(kopyaHata.message)) {
      return NextResponse.json({ error: 'Yedek alınamadı: ' + kopyaHata.message }, { status: 500 })
    }
    // Yedek gerçekten var mı? (yoksa üzerine yazmaya izin verme)
    const klasor = yol.includes('/') ? yol.slice(0, yol.lastIndexOf('/')) : ''
    const ad = yol.slice(yol.lastIndexOf('/') + 1)
    const { data: liste } = await db.storage.from(YEDEK).list(klasor, { search: ad, limit: 100 })
    if (!liste?.some((d) => d.name === ad)) {
      return NextResponse.json({ error: 'Yedek doğrulanamadı, dosyaya dokunulmadı.' }, { status: 500 })
    }

    // 2) Üzerine yazma için imzalı yükleme adresi
    const { data, error } = await db.storage.from(KAYNAK).createSignedUploadUrl(yol, { upsert: true })
    if (error || !data) {
      return NextResponse.json({ error: 'Yükleme adresi alınamadı: ' + error?.message }, { status: 500 })
    }
    return NextResponse.json({ token: data.token })
  }

  if (govde.islem === 'tamamla') {
    const durum = govde.durum
    if (!['sikistirildi', 'degismedi', 'hata'].includes(durum)) {
      return NextResponse.json({ error: 'Geçersiz durum.' }, { status: 400 })
    }
    const { error } = await db.from('depolama_sikistirma_kayitlari').upsert({
      yol,
      eski_boyut: Number(govde.eskiBoyut) || 0,
      yeni_boyut: Number(govde.yeniBoyut) || 0,
      durum,
      hata: typeof govde.hata === 'string' ? govde.hata.slice(0, 500) : null,
      islenme: new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 })
}
