// src/app/api/admin/create-user/route.ts
//
// Yönetim panelinden yeni kullanıcı oluşturur.
//
// NEDEN API ROUTE: Supabase'de kullanıcı hesabı açmak (auth.admin.createUser)
// service_role yetkisi gerektirir. Bu anahtar ASLA tarayıcıya gönderilmez,
// bu yüzden işlem sunucuda yapılır.
//
// Yalnızca super_admin çağırabilir (Bearer token ile doğrulanır).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperAdminFromRequest } from '@/lib/supabase/verifySuperAdmin'

export const dynamic = 'force-dynamic'

// Şemadaki role CHECK kısıtıyla birebir aynı olmalı
const GECERLI_ROLLER = ['super_admin', 'admin', 'tmgd', 'assistant', 'viewer', 'company']

export async function POST(req: NextRequest) {
  const yonetici = await getSuperAdminFromRequest(req)
  if (!yonetici) {
    return NextResponse.json({ error: 'Bu işlem için süper yönetici yetkisi gerekli.' }, { status: 401 })
  }

  const govde = await req.json().catch(() => null)
  const email = (govde?.email as string | undefined)?.trim().toLowerCase()
  const password = govde?.password as string | undefined
  const fullName = (govde?.full_name as string | undefined)?.trim()
  const role = govde?.role as string | undefined

  // ---- Doğrulamalar ----
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta adresi gir.' }, { status: 400 })
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Şifre en az 8 karakter olmalı.' }, { status: 400 })
  }
  if (!role || !GECERLI_ROLLER.includes(role)) {
    return NextResponse.json({ error: 'Geçersiz rol.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // ---- 1) Auth hesabı oluştur ----
  // email_confirm: true → kullanıcı doğrulama e-postası beklemeden
  // doğrudan giriş yapabilir (yönetici zaten bilerek açıyor).
  const { data: authSonuc, error: authHata } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || null },
  })

  if (authHata || !authSonuc?.user) {
    const mesaj = authHata?.message || 'Kullanıcı hesabı oluşturulamadı.'
    // Supabase'in İngilizce mesajlarını Türkçeleştir
    const turkce = /already been registered|already exists/i.test(mesaj)
      ? 'Bu e-posta adresi zaten kayıtlı.'
      : /password/i.test(mesaj)
        ? 'Şifre Supabase kurallarına uymuyor (en az 6 karakter, bazı projelerde daha güçlü olmalı).'
        : mesaj
    return NextResponse.json({ error: turkce }, { status: 400 })
  }

  const yeniId = authSonuc.user.id

  // ---- 2) Profil kaydı ----
  // Projede profil oluşturan bir trigger olabilir; bu yüzden upsert
  // kullanıyoruz (varsa günceller, yoksa ekler) ve rolü kesin olarak
  // yöneticinin seçtiği değere ayarlıyoruz.
  const { error: profilHata } = await supabase
    .from('profiles')
    .upsert(
      {
        id: yeniId,
        email,
        full_name: fullName || null,
        role,
        approval_status: 'approved', // yönetici açtığı için onaylı başlar
        is_active: true,
      },
      { onConflict: 'id' }
    )

  if (profilHata) {
    // Profil yazılamadıysa yarım kalmış bir auth hesabı bırakmamak için geri al
    await supabase.auth.admin.deleteUser(yeniId).catch(() => {})
    return NextResponse.json(
      { error: 'Profil kaydedilemedi, işlem geri alındı: ' + profilHata.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    user: { id: yeniId, email, full_name: fullName || null, role },
  })
}
