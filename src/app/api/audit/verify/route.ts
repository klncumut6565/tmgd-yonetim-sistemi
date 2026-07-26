// src/app/api/audit/verify/route.ts
// Audit log hash zincirinin butunlugunu kontrol eder.
// GET /api/audit/verify?start_id=1&end_id=1000
//
// Yalnizca super_admin erisebilir. Bu uygulamada oturum cookie'de degil
// localStorage'da tutuldugu icin (client.ts duz supabase-js kullaniyor,
// @supabase/ssr degil), kimlik dogrulama "Authorization: Bearer
// <access_token>" header'i uzerinden yapilir (bkz. authFetch.ts).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperAdminFromRequest } from '@/lib/supabase/verifySuperAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await getSuperAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { searchParams } = new URL(req.url)
  const startId = searchParams.get('start_id')
  const endId = searchParams.get('end_id')

  const { data, error } = await supabase.rpc('audit_verify_chain', {
    p_start_id: startId ? Number(startId) : null,
    p_end_id: endId ? Number(endId) : null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const brokenEntries = data ?? []
  return NextResponse.json({
    chain_intact: brokenEntries.length === 0,
    broken_count: brokenEntries.length,
    broken_entries: brokenEntries,
    checked_at: new Date().toISOString(),
  })
}
