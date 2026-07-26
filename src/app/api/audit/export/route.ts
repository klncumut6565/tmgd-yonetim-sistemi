// src/app/api/audit/export/route.ts
// Denetim icin audit log ihraci. JSON veya CSV.
// GET /api/audit/export?firm_id=xxx&from=2026-01-01&to=2026-07-25&format=csv
//
// Yalnizca super_admin erisebilir. Bearer token ile dogrulanir (bkz.
// verifySuperAdmin.ts) — bu uygulamada oturum cookie'de degil
// localStorage'da tutuldugu icin cookie-tabanli kontrol calismaz.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperAdminFromRequest } from '@/lib/supabase/verifySuperAdmin'

export const dynamic = 'force-dynamic'

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(req: NextRequest) {
  const admin = await getSuperAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { searchParams } = new URL(req.url)
  const firmId = searchParams.get('firm_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const format = (searchParams.get('format') ?? 'json').toLowerCase()
  const tableName = searchParams.get('table')

  let query = supabase
    .from('audit_log')
    .select('*')
    .order('id', { ascending: true })
    .limit(50000)

  if (firmId) query = query.eq('firm_id', firmId)
  if (from) query = query.gte('ts', from)
  if (to) query = query.lte('ts', to)
  if (tableName) query = query.eq('table_name', tableName)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []

  if (format === 'csv') {
    const headers = [
      'id', 'ts', 'actor_email', 'actor_role', 'action',
      'table_name', 'record_id', 'firm_id', 'prev_hash', 'row_hash',
    ]
    const headerLine = headers.join(',')
    const bodyLines = rows.map((r) =>
      headers.map((h) => csvEscape((r as Record<string, unknown>)[h])).join(',')
    )
    const csv = '\uFEFF' + [headerLine, ...bodyLines].join('\n')

    const filename = `audit_log_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json({
    count: rows.length,
    exported_at: new Date().toISOString(),
    filters: { firm_id: firmId, from, to, table: tableName },
    entries: rows,
  })
}
