// src/lib/ai/toolExec.ts
//
// SUNUCU tarafı araç yürütücüsü — sesli (Gemini Live → /api/assistant/tools)
// ve yazılı (/api/adr-assistant araç döngüsü) asistan BURAYI ortak kullanır.
// Tanımlar: src/lib/ai/toolDefs.ts. Navigasyon araçları (open_firm, go_to_page)
// burada çalışmaz; uygulama tarafında (tarayıcı) yürütülür.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  searchFirm,
  getFirmTaskSummary,
  getFirmMissingDocuments,
  searchRegulation,
  getUnInfo,
  checkMixedLoading,
  getFirmProgress,
  listFirms,
  getVisitOverview,
  getDashboardSummary,
  listTmgd,
  getNotifications,
  type TaskScope,
} from '@/lib/ai/dataTools'

const GECERLI_SCOPE: readonly TaskScope[] = ['overdue', 'today', 'upcoming', 'all']

export type ToolResult = { status: number; body: unknown }

const FIRM_ID_GEREKLI = {
  status: 400,
  body: { error: "firm_id zorunlu — önce search_firm ile gerçek firma ID'si bulunmalı." },
}

export async function executeDataTool(
  supabase: SupabaseClient,
  tool: string,
  args: Record<string, unknown>,
  ctx?: { userId?: string }
): Promise<ToolResult> {
  const str = (k: string) => (typeof args[k] === 'string' ? (args[k] as string) : '')

  switch (tool) {
    case 'search_firm': {
      const { matches } = await searchFirm(supabase, str('query'))
      return { status: 200, body: { ok: true, grounded: true, matches } }
    }
    case 'get_task_summary': {
      const firmId = str('firm_id')
      if (!firmId) return FIRM_ID_GEREKLI
      const scope = GECERLI_SCOPE.includes(str('scope') as TaskScope) ? (str('scope') as TaskScope) : 'all'
      return { status: 200, body: await getFirmTaskSummary(supabase, firmId, scope) }
    }
    case 'get_missing_documents': {
      const firmId = str('firm_id')
      if (!firmId) return FIRM_ID_GEREKLI
      return { status: 200, body: await getFirmMissingDocuments(supabase, firmId) }
    }
    case 'list_firms':
      return { status: 200, body: await listFirms(supabase, str('status') || undefined) }
    case 'get_dashboard_summary':
      return { status: 200, body: await getDashboardSummary(supabase) }
    case 'get_notifications':
      // Asistan yalnızca Süper Yönetici tarafından kullanılır → zilde onay bekleyenler de görünür.
      return { status: 200, body: await getNotifications(supabase, ctx?.userId, true) }
    case 'list_tmgd':
      return { status: 200, body: await listTmgd(supabase, args.include_inactive === true) }
    case 'get_visit_overview':
      return { status: 200, body: await getVisitOverview(supabase, str('month') || undefined) }
    case 'get_firm_progress':
      return { status: 200, body: await getFirmProgress(supabase, str('firm_id') || undefined) }
    case 'search_regulation':
      return { status: 200, body: await searchRegulation(supabase, str('query')) }
    case 'get_un_info':
      return { status: 200, body: await getUnInfo(supabase, args.un_numbers) }
    case 'check_mixed_loading':
      return { status: 200, body: await checkMixedLoading(supabase, args.un_numbers) }
    default:
      return { status: 400, body: { error: `Bilinmeyen araç: ${tool}` } }
  }
}
