// src/lib/ai/dataTools.ts
//
// HALÜSİNASYON ÖNLEME — "AI veri kaynağı değildir" (bkz. TMGD Asistan
// Halüsinasyon Önleme ve Güvenilir Yanıt Mimarisi, Bölüm 2).
//
// SORUN (Faz 1 analizinde tespit edildi): mevcut asistan sisteminde
// (actions.ts) yalnızca NAVİGASYON eylemleri var (open_firm, open_firm_tab
// vb.) — "ABC firmasının kaç gecikmiş görevi var?" gibi bir soruya cevap
// verecek HİÇBİR gerçek veri aracı YOKTU. Bu, modelin ya "bilmiyorum"
// demesine ya da (kötü ihtimalde) tahmin etmesine yol açıyordu.
//
// ÇÖZÜM: Bu dosya, gerçek Supabase sorgularıyla YAPISAL (structured) sonuç
// döndüren salt-okunur veri araçlarını tanımlar (Bölüm 23 "Structured Tool
// Output"). Sayılar/tarihler/durumlar HER ZAMAN buradan gelir, modelin
// hafızasından değil (Bölüm 11 "TOOL RESULT > MODEL MEMORY").
//
// "Gecikmiş görev" tanımı, tasks sayfasındaki (src/app/tasks/page.tsx)
// isOverdue() mantığıyla BİREBİR aynı tutulur — UI ile asistan farklı
// sayı söylerse bu da bir tür halüsinasyon/tutarsızlıktır.
//
// SADECE server tarafında kullanılır (service-role Supabase client alır).

import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// search_firm — firma adını gerçek firm_id'ye çözer.
// (AI firma ID'si UYDURAMAZ — bkz. Bölüm 18 "Firma ID Güvenliği".)
// ---------------------------------------------------------------------------

export type FirmMatch = { id: string; name: string }

export async function searchFirm(
  supabase: SupabaseClient,
  query: string
): Promise<{ matches: FirmMatch[] }> {
  const q = query.trim()
  if (!q) return { matches: [] }
  const { data } = await supabase.from('firms').select('id, name').ilike('name', `%${q}%`).limit(6)
  return { matches: (data ?? []) as FirmMatch[] }
}

// ---------------------------------------------------------------------------
// get_firm_task_summary — gerçek görev sayıları ve listesi.
// ---------------------------------------------------------------------------

export type TaskScope = 'overdue' | 'today' | 'upcoming' | 'all'

export type TaskSummaryItem = {
  id: string
  title: string
  due_date: string | null
  status: string
  priority: string
}

export type TaskSummaryResult = {
  ok: true
  grounded: true
  firm_id: string
  scope: TaskScope
  count: number
  tasks: TaskSummaryItem[]
}

/** tasks sayfasındaki isOverdue() ile BİREBİR aynı tanım. */
function gorevGecikmisMi(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false
  const bugunBaslangici = new Date(new Date().toDateString())
  return new Date(dueDate) < bugunBaslangici
}

export async function getFirmTaskSummary(
  supabase: SupabaseClient,
  firmId: string,
  scope: TaskScope
): Promise<TaskSummaryResult> {
  const { data } = await supabase
    .from('tasks')
    .select('id, title, due_date, status, priority')
    .eq('firm_id', firmId)
    .order('due_date', { ascending: true })

  const tumGorevler = (data ?? []) as TaskSummaryItem[]
  const bugun = new Date().toDateString()

  let filtreli: TaskSummaryItem[]
  switch (scope) {
    case 'overdue':
      filtreli = tumGorevler.filter((t) => gorevGecikmisMi(t.due_date, t.status))
      break
    case 'today':
      filtreli = tumGorevler.filter(
        (t) => t.due_date && new Date(t.due_date).toDateString() === bugun && t.status !== 'completed' && t.status !== 'cancelled'
      )
      break
    case 'upcoming':
      filtreli = tumGorevler.filter(
        (t) =>
          t.due_date &&
          new Date(t.due_date) >= new Date(new Date().toDateString()) &&
          t.status !== 'completed' &&
          t.status !== 'cancelled'
      )
      break
    case 'all':
    default:
      filtreli = tumGorevler.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
  }

  return {
    ok: true,
    grounded: true,
    firm_id: firmId,
    scope,
    count: filtreli.length,
    tasks: filtreli.slice(0, 20), // asistan cevabı şişirmesin diye üst sınır
  }
}

// ---------------------------------------------------------------------------
// get_firm_missing_documents — eksik/tamamlanmamış belge kontrol kalemleri.
// ---------------------------------------------------------------------------

export type MissingDocumentItem = {
  code: string
  period: string
  note: string | null
}

export type MissingDocumentsResult = {
  ok: true
  grounded: true
  firm_id: string
  count: number
  documents: MissingDocumentItem[]
}

export async function getFirmMissingDocuments(
  supabase: SupabaseClient,
  firmId: string
): Promise<MissingDocumentsResult> {
  const { data } = await supabase
    .from('firm_belgeleri')
    .select('code, period, note')
    .eq('firm_id', firmId)
    .eq('done', false)
    .order('code', { ascending: true })

  const eksikler = (data ?? []) as MissingDocumentItem[]

  return {
    ok: true,
    grounded: true,
    firm_id: firmId,
    count: eksikler.length,
    documents: eksikler.slice(0, 30),
  }
}
