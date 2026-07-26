// src/lib/supabase/verifySuperAdmin.ts
// SADECE server tarafinda kullanilir (API route'lar).
//
// Bu uygulamanin oturumu cookie'de degil localStorage'da tutuldugu icin
// (bkz. authFetch.ts'teki not), kimlik dogrulama cookie uzerinden degil,
// istemcinin gonderdigi "Authorization: Bearer <access_token>" header'i
// uzerinden yapilir.
//
// Akis:
//   1) Token'i anon-key client ile dogrula (auth.getUser(token)) — bu
//      sadece token'in gecerli olup olmadigini ve kime ait oldugunu sorar,
//      RLS'ye tabi degildir.
//   2) Kullanicinin profilini SERVICE ROLE client ile oku (RLS'yi bypass
//      eder) — boylece profiles tablosunun kendi RLS politikalarindan
//      bagimsiz, guvenilir bir rol kontrolu yapilir.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from './admin'

export async function getSuperAdminFromRequest(
  req: Request
): Promise<{ id: string; email: string | null } | null> {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const anonClient = createSupabaseClient(url, anonKey)
  const { data: { user }, error } = await anonClient.auth.getUser(token)
  if (error || !user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, approval_status, is_active')
    .eq('id', user.id)
    .single()

  if (
    !profile ||
    profile.approval_status !== 'approved' ||
    !profile.is_active ||
    profile.role !== 'super_admin'
  ) {
    return null
  }

  return { id: user.id, email: user.email ?? null }
}
