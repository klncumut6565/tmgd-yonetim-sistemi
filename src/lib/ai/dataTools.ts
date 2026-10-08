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
import { checkPair, type UnRow } from '@/lib/adrMix'

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


// ---------------------------------------------------------------------------
// search_regulation — yüklü GERÇEK mevzuat belgelerinde arama (mevzuat_ara RPC).
// Metin asistanıyla AYNI RPC; sesli asistan mevzuatı hafızasından değil buradan söyler.
// ---------------------------------------------------------------------------

export type RegulationPart = {
  kaynak: string
  sayfa: number
  icerik: string
}

export async function searchRegulation(
  supabase: SupabaseClient,
  query: string
): Promise<{ ok: boolean; parts: RegulationPart[]; note?: string }> {
  const q = query.trim()
  if (!q) return { ok: false, parts: [], note: 'Arama metni boş.' }
  try {
    const { data, error } = await supabase.rpc('mevzuat_ara', { p_sorgu: q, p_limit: 4 })
    if (error) return { ok: false, parts: [], note: 'Mevzuat araması şu anda yapılamıyor.' }
    const parts = ((data ?? []) as {
      baslik: string
      sayi_no: string | null
      sayfa_no: number
      icerik: string
    }[]).map((p) => ({
      kaynak: p.sayi_no ? `${p.baslik} (${p.sayi_no})` : p.baslik,
      sayfa: p.sayfa_no,
      // Sesli cevap için çok uzun metin göndermeyelim.
      icerik: p.icerik.length > 1200 ? p.icerik.slice(0, 1200) + '…' : p.icerik,
    }))
    return parts.length
      ? { ok: true, parts }
      : { ok: true, parts: [], note: 'Yüklü mevzuat belgelerinde ilgili bölüm bulunamadı.' }
  } catch {
    return { ok: false, parts: [], note: 'Mevzuat araması şu anda yapılamıyor.' }
  }
}

// ---------------------------------------------------------------------------
// get_un_info — GERÇEK Tablo A (adr_un_numbers) kaydı.
// ---------------------------------------------------------------------------

function temizUnListesi(unNumbers: unknown): string[] {
  if (!Array.isArray(unNumbers)) return []
  const out = unNumbers
    .map((n) => String(n).replace(/\D/g, '').padStart(4, '0'))
    .filter((n) => /^\d{4}$/.test(n))
  return Array.from(new Set(out)).slice(0, 8)
}

export async function getUnInfo(supabase: SupabaseClient, unNumbers: unknown) {
  const list = temizUnListesi(unNumbers)
  if (list.length === 0) return { ok: false, error: 'Geçerli 4 haneli UN numarası verilmedi.' }
  const { data } = await supabase
    .from('adr_un_numbers')
    .select(
      'un_number, proper_shipping_name, class, packing_group, tunnel_code, hazard_no, labels, transport_category, limited_quantity, excepted_quantity'
    )
    .in('un_number', list)
  const found = data ?? []
  const foundSet = new Set(found.map((r: { un_number: string }) => r.un_number))
  return {
    ok: true,
    grounded: true,
    substances: found,
    not_found: list.filter((n) => !foundSet.has(n)),
  }
}

// ---------------------------------------------------------------------------
// check_mixed_loading — ADR 7.5.2 karışık yükleme: gerçek checkPair motoru.
// (LLM hüküm vermez; sonuç sistemin kendi hesaplamasından gelir.)
// ---------------------------------------------------------------------------

const MIX_DURUM_TR: Record<string, string> = {
  OK: 'Uyumlu — birlikte taşınabilir',
  NO: 'YASAK — birlikte taşınamaz',
  COND: 'Şartlı uyumlu',
  UNKNOWN: 'Belirsiz — manuel kontrol gerekir',
  EXPLOSIVE_SPECIAL: 'Patlayıcı — manuel kontrol gerekir',
  FOOD: 'Gıda tedbiri gerekir',
}

export async function checkMixedLoading(supabase: SupabaseClient, unNumbers: unknown) {
  const list = temizUnListesi(unNumbers)
  if (list.length < 2) return { ok: false, error: 'En az iki geçerli UN numarası gerekir.' }
  const { data } = await supabase.from('adr_un_numbers').select('*').in('un_number', list)
  const rows = (data ?? []) as UnRow[]
  const foundSet = new Set(rows.map((r) => r.un_number))
  const missing = list.filter((n) => !foundSet.has(n))
  if (rows.length < 2) {
    return { ok: false, error: "Tablo A'da yeterli kayıt bulunamadı.", not_found: missing }
  }
  const pairs = []
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const r = checkPair(rows[i], rows[j])
      pairs.push({
        un1: r.un1,
        un2: r.un2,
        status: r.status,
        sonuc: MIX_DURUM_TR[r.status] ?? r.status,
        adr_ref: r.adrRef,
        neden: r.reason,
      })
    }
  }
  return { ok: true, grounded: true, pairs, not_found: missing }
}
