// src/app/api/workflow/run/route.ts
// Workflow kurallarini calistirir. Iki yoldan tetiklenebilir:
//
//   1) Vercel Cron (vercel.json'daki schedule) — her gun 08:00 (Istanbul).
//      Vercel, CRON_SECRET env var'i tanimliysa istegi otomatik olarak
//      `Authorization: Bearer <CRON_SECRET>` header'iyla gonderir.
//
//   2) Admin panelinden "Şimdi Çalıştır" butonu — normal oturum (cookie)
//      ile, super_admin/admin kontrolu yapilir.
//
// Her calistirmada: enabled kurallari sirayla isler, ilgili view'i sorgular,
// esigi gecen her kayit icin (rule_id, record_ref) bazinda son ne zaman
// bildirim gonderildigine bakar — repeat_interval_days gecmediyse atlar.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { WORKFLOW_SOURCES, renderTemplate, type WorkflowRuleJson } from '@/lib/workflow/sources'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RuleRow = {
  id: string
  name: string
  enabled: boolean
  rule_json: WorkflowRuleJson
  repeat_interval_days: number
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // Yol 1: Vercel Cron secret
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader === `Bearer ${cronSecret}`) return true
  }

  // Yol 2: oturum acmis admin/super_admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, approval_status, is_active')
    .eq('id', user.id)
    .single()

  return Boolean(
    profile &&
    profile.approval_status === 'approved' &&
    profile.is_active &&
    ['super_admin', 'admin'].includes(profile.role)
  )
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const ranAt = new Date().toISOString()

  const { data: rules, error: rulesError } = await admin
    .from('workflow_rules')
    .select('id, name, enabled, rule_json, repeat_interval_days')
    .eq('enabled', true)

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 })
  }

  const results: Array<{
    rule: string
    source: string
    matched: number
    notified: number
    skipped_repeat: number
    error?: string
  }> = []

  for (const rule of (rules ?? []) as RuleRow[]) {
    const rj = rule.rule_json
    const sourceDef = WORKFLOW_SOURCES[rj.source]

    if (!sourceDef) {
      results.push({
        rule: rule.name, source: String(rj.source),
        matched: 0, notified: 0, skipped_repeat: 0,
        error: `Bilinmeyen kaynak: ${rj.source}`,
      })
      continue
    }

    const { data: matchedRows, error: queryError } = await admin
      .from(rj.source)
      .select(sourceDef.columns.join(', '))
      .lte('days_left', rj.days_threshold)
      .order('days_left', { ascending: true })
      .limit(200)

    if (queryError) {
      results.push({
        rule: rule.name, source: rj.source,
        matched: 0, notified: 0, skipped_repeat: 0,
        error: queryError.message,
      })
      continue
    }

    const rows = (matchedRows ?? []) as unknown as Record<string, unknown>[]
    let notified = 0
    let skippedRepeat = 0

    if (rows.length > 0) {
      // Hedef roldeki aktif kullanicilari bir kere cek (tum satirlar icin ortak)
      const { data: targetUsers } = await admin
        .from('profiles')
        .select('id')
        .in('role', rj.target_roles)
        .eq('is_active', true)
        .eq('approval_status', 'approved')

      const userIds = (targetUsers ?? []).map((u) => u.id as string)

      for (const row of rows) {
        const recordRef = `${rj.source}:${row.id}`

        // Tekrar bildirim kontrolu
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - rule.repeat_interval_days)

        const { data: lastLog } = await admin
          .from('workflow_rule_log')
          .select('notified_at')
          .eq('rule_id', rule.id)
          .eq('record_ref', recordRef)
          .order('notified_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastLog && new Date(lastLog.notified_at) > cutoff) {
          skippedRepeat++
          continue
        }

        const title = renderTemplate(rj.title_template, row)
        const message = renderTemplate(rj.message_template, row)
        const firmId = sourceDef.hasFirmId ? (row.firm_id as string | null) : null

        if (userIds.length > 0) {
          const notifRows = userIds.map((userId) => ({
            user_id: userId,
            firm_id: firmId,
            title,
            message,
            notification_type: 'reminder' as const,
          }))
          await admin.from('notifications').insert(notifRows)
        }

        await admin.from('workflow_rule_log').insert({
          rule_id: rule.id,
          record_ref: recordRef,
        })

        notified++
      }
    }

    results.push({
      rule: rule.name,
      source: rj.source,
      matched: rows.length,
      notified,
      skipped_repeat: skippedRepeat,
    })
  }

  return NextResponse.json({ ok: true, ran_at: ranAt, rules: results })
}
