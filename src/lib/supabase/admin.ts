// src/lib/supabase/admin.ts
// Service-role Supabase istemcisi. YALNIZCA server tarafinda kullanilir
// (API route, cron runner). ASLA client component'e import edilmemeli —
// bu istemci RLS'yi tamamen bypass eder.
//
// Gereksinim: Vercel'de SUPABASE_SERVICE_ROLE_KEY env variable'i tanimli
// olmali (Supabase Dashboard → Project Settings → API → service_role key).
// Bu deger asla NEXT_PUBLIC_ ile baslamamali ve asla istemciye sizmamalidir.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY veya NEXT_PUBLIC_SUPABASE_URL tanimli degil. ' +
      'Vercel → Project Settings → Environment Variables icinden ekleyin.'
    )
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
