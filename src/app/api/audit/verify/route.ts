// src/app/api/audit/verify/route.ts
// Audit log hash zincirinin butunlugunu kontrol eder.
// GET /api/audit/verify?start_id=1&end_id=1000
//
// Yalnizca super_admin/admin erisebilir.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const role = (user.user_metadata as { role?: string } | null)?.role
  if (!role || !['super_admin', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

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
