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
import { executeDataTool } from '@/lib/ai/toolExec'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

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

  // Tüm araçlar ortak yürütücüde (yazılı asistanla AYNI) — bkz. toolExec.ts
  const sonuc = await executeDataTool(supabase, tool, args)
  return NextResponse.json(sonuc.body, { status: sonuc.status })
}
