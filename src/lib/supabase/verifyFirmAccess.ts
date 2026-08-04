// src/lib/supabase/verifyFirmAccess.ts
//
// Belirli bir firmaya YAZMA erişimi olan herhangi bir kullanıcıyı doğrular
// (super_admin/admin/tmgd/assistant + o firmaya atanmış olmak). Bu,
// `verifySuperAdmin.ts`'teki fonksiyonlardan farklı — Buzz entegrasyonu
// (audit/workflow/ADR asistanı) super_admin'e kilitliyken, dosya yükleme
// gibi GÜNLÜK OPERASYONEL işlemler mevcut yetki modeline (migration 004,
// 036) uymalı: normal TMGD/admin kullanıcıları da kendi firmalarında
// dosya yükleyebilmeli.
//
// NEDEN RLS'YE GÜVENİLMİYOR: Bu kontrol admin (service-role) client ile
// yapılır çünkü çağıran taraf (örn. tarama oturumu oluşturma) sonrasında
// başka bir admin-client işlemi yapacaktır; auth.uid() servis rolünde boş
// döner, bu yüzden yetki mantığı burada TypeScript'te tekrarlanır —
// public.is_admin() / public.yazabilir() SQL fonksiyonlarıyla AYNI kural.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from './admin'

const YAZMA_ROLLERI = ['super_admin', 'admin', 'tmgd', 'assistant']

export async function getFirmaYazmaYetkisiFromRequest(
  req: Request,
  firmId: string
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
    !YAZMA_ROLLERI.includes(profile.role)
  ) {
    return null
  }

  // super_admin/admin → tüm firmalarda yazma yetkisi (migration 036 ile aynı kural)
  if (profile.role === 'super_admin' || profile.role === 'admin') {
    return { id: user.id, email: user.email ?? null }
  }

  // tmgd/assistant → yalnızca atandığı firmalar
  const { data: atama } = await admin
    .from('user_firms')
    .select('id')
    .eq('user_id', user.id)
    .eq('firm_id', firmId)
    .maybeSingle()

  if (!atama) return null

  return { id: user.id, email: user.email ?? null }
}
