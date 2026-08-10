// src/app/api/assistant/tools/route.ts
//
// Realtime (Gemini Live) sesli asistan için ARAÇ ÇALIŞTIRMA endpoint'i.
//
// NEDEN GEREKLİ: Gemini Live WebSocket bağlantısı tarayıcıdan doğrudan
// Google'a gider (bkz. /api/assistant/realtime/session) — bizim backend'imiz
// her turda araya girmez. Gemini bir tool çağırmak istediğinde (örn.
// "get_task_summary"), bunu WebSocket üzerinden tarayıcıya bildirir;
// tarayıcı bu isteği BU endpoint'e (kullanıcının GERÇEK Supabase oturum
// token'ıyla, Gemini token'ıyla DEĞİL) iletir, biz gerçek veriyi
// döndürürüz, tarayıcı sonucu Gemini'ye "toolResponse" olarak geri yollar.
//
// Böylece ses akışında da AYNI halüsinasyon önleme ilkesi geçerli olur:
// AI veri kaynağı değildir, sayı/tarih/firma HER ZAMAN buradan gelir
// (bkz. src/lib/ai/dataTools.ts — metin asistanıyla AYNI fonksiyonlar,
// tek bir yerden yönetilir, iki farklı mantık olmasın diye).
//
// Yalnızca super_admin çağırabilir — /api/adr-assistant ve
// /api/speech-to-text ile AYNI yetkilendirme deseni.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperAdminFromRequest } from '@/lib/supabase/verifySuperAdmin'
import { searchFirm, getFirmTaskSummary, getFirmMissingDocuments, type TaskScope } from '@/lib/ai/dataTools'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const GECERLI_SCOPE: readonly TaskScope[] = ['overdue', 'today', 'upcoming', 'all']

export async function POST(req: NextRequest) {
  const admin = await getSuperAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const tool = body?.tool as string | undefined
  const args = (body?.args ?? {}) as Record<string, unknown>

  if (!tool) {
    return NextResponse.json({ error: '"tool" alanı zorunlu.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // ---- search_firm: firma adını gerçek firm_id'ye çözer -------------------
  if (tool === 'search_firm') {
    const query = typeof args.query === 'string' ? args.query : ''
    const { matches } = await searchFirm(supabase, query)
    return NextResponse.json({ ok: true, grounded: true, matches })
  }

  // ---- get_task_summary ----------------------------------------------------
  if (tool === 'get_task_summary') {
    const firmId = typeof args.firm_id === 'string' ? args.firm_id : ''
    const scope = typeof args.scope === 'string' && GECERLI_SCOPE.includes(args.scope as TaskScope)
      ? (args.scope as TaskScope)
      : 'all'
    if (!firmId) {
      return NextResponse.json(
        { error: 'firm_id zorunlu — önce search_firm ile gerçek firma ID\'si bulunmalı.' },
        { status: 400 }
      )
    }
    const sonuc = await getFirmTaskSummary(supabase, firmId, scope)
    return NextResponse.json(sonuc)
  }

  // ---- get_missing_documents ------------------------------------------------
  if (tool === 'get_missing_documents') {
    const firmId = typeof args.firm_id === 'string' ? args.firm_id : ''
    if (!firmId) {
      return NextResponse.json(
        { error: 'firm_id zorunlu — önce search_firm ile gerçek firma ID\'si bulunmalı.' },
        { status: 400 }
      )
    }
    const sonuc = await getFirmMissingDocuments(supabase, firmId)
    return NextResponse.json(sonuc)
  }

  return NextResponse.json({ error: `Bilinmeyen araç: ${tool}` }, { status: 400 })
}
