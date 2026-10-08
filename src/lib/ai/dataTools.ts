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
import { buildChecklist, codeLabel, codeSection } from '@/lib/belgeKatalogu'

// ---------------------------------------------------------------------------
// search_firm — firma adını gerçek firm_id'ye çözer.
// (AI firma ID'si UYDURAMAZ — bkz. Bölüm 18 "Firma ID Güvenliği".)
// ---------------------------------------------------------------------------

export type FirmMatch = { id: string; name: string }

// Türkçe-dayanıklı normalizasyon: büyük/küçük harf, İ/I/ı/i, aksan (ç ş ğ ü ö),
// noktalama ve ticari ekler ("A.Ş.", "LTD ŞTİ") farkı arama sonucunu etkilemez.
export function normAd(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const TICARI_EK = new Set(['as', 'a', 's', 'ltd', 'sti', 'san', 'tic', 've', 'sanayi', 'ticaret', 'limited', 'sirketi', 'anonim', 'inc'])

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

export async function searchFirm(
  supabase: SupabaseClient,
  query: string
): Promise<{ matches: FirmMatch[] }> {
  const q = normAd(query)
  if (!q) return { matches: [] }
  const { data } = await supabase.from('firms').select('id, name').limit(2000)
  const firmalar = (data ?? []) as FirmMatch[]
  const qTok = q.split(' ').filter((t) => t && !TICARI_EK.has(t))
  const puanli = firmalar
    .map((f) => {
      const n = normAd(f.name)
      const nTok = n.split(' ')
      let puan = 0
      if (n === q) puan = 100
      else if (n.startsWith(q)) puan = 90
      else if (n.includes(q)) puan = 80
      else if (qTok.length && qTok.every((t) => nTok.some((x) => x.startsWith(t)))) puan = 70
      else if (qTok.length) {
        // Yazım/ses hatası toleransı (sesli giriş): her sorgu kelimesi bir firma kelimesine ≤1-2 harf yakın
        const ok = qTok.every((t) =>
          nTok.some((x) => levenshtein(t, x.slice(0, Math.max(t.length, 1))) <= (t.length > 5 ? 2 : 1) || levenshtein(t, x) <= (t.length > 5 ? 2 : 1))
        )
        if (ok) puan = 50
      }
      return { f, puan }
    })
    .filter((x) => x.puan > 0)
    .sort((a, b) => b.puan - a.puan || a.f.name.length - b.f.name.length)
  return { matches: puanli.slice(0, 6).map((x) => x.f) }
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
// Belge Takip — ilerleme ve eksik belgeler.
// Firmalar sayfasındaki / firma detayındaki hesapla BİREBİR aynı kural:
// kontrol listesi buildChecklist(faaliyetler, sözleşme tarihi) ile kurulur,
// tamamlananlar firm_belgeleri(done=true)'dan gelir; D4 "Diğer", D5
// "Dilekçe" ve AS (Araç/Sürücü) maddeleri yüzdeye ve eksik listesine SAYILMAZ.
// ---------------------------------------------------------------------------

type FirmaBelgeSatiri = {
  id: string
  name: string
  status: string
  activities: string[] | null
  contract_start: string | null
}

function takipteSayilirMi(code: string): boolean {
  return !(code === 'D4' || code === 'D5' || code.startsWith('AS'))
}

/** Tamamlanmış (done=true) belge anahtarlarını firmaya göre toplar (sayfalı okuma). */
async function tamamlananBelgeler(
  supabase: SupabaseClient,
  firmIds?: string[]
): Promise<Map<string, Set<string>>> {
  const harita = new Map<string, Set<string>>()
  const SAYFA = 1000
  for (let bas = 0; ; bas += SAYFA) {
    let q = supabase.from('firm_belgeleri').select('firm_id, code, period').eq('done', true).range(bas, bas + SAYFA - 1)
    if (firmIds && firmIds.length === 1) q = q.eq('firm_id', firmIds[0])
    const { data, error } = await q
    if (error || !data) break
    for (const r of data as { firm_id: string; code: string; period: string | null }[]) {
      const set = harita.get(r.firm_id) ?? new Set<string>()
      set.add(`${r.code}|${r.period ?? ''}`)
      harita.set(r.firm_id, set)
    }
    if (data.length < SAYFA) break
  }
  return harita
}

function firmaIlerlemesi(firma: FirmaBelgeSatiri, tamam: Set<string>) {
  const bolumler = buildChecklist(firma.activities ?? [], firma.contract_start)
  let toplam = 0
  let yapilan = 0
  const eksikler: { code: string; period: string; belge: string; bolum: string }[] = []
  for (const sec of bolumler) {
    for (const it of sec.items) {
      if (!takipteSayilirMi(it.code)) continue
      toplam++
      if (tamam.has(`${it.code}|${it.period}`)) yapilan++
      else eksikler.push({ code: it.code, period: it.period, belge: codeLabel(it.code, it.period), bolum: codeSection(it.code) })
    }
  }
  return { toplam, yapilan, yuzde: toplam ? Math.round((yapilan / toplam) * 100) : 0, eksikler }
}

export type MissingDocumentsResult = {
  ok: true
  grounded: true
  firm_id: string
  firm_name: string
  count: number
  total: number
  done: number
  percent: number
  by_section: Record<string, number>
  documents: { code: string; period: string; belge: string; bolum: string }[]
}

export async function getFirmMissingDocuments(
  supabase: SupabaseClient,
  firmId: string
): Promise<MissingDocumentsResult | { ok: false; error: string }> {
  const { data: firma } = await supabase
    .from('firms')
    .select('id, name, status, activities, contract_start')
    .eq('id', firmId)
    .maybeSingle()
  if (!firma) return { ok: false, error: 'Firma bulunamadı.' }
  const tamam = (await tamamlananBelgeler(supabase, [firmId])).get(firmId) ?? new Set<string>()
  const ilerleme = firmaIlerlemesi(firma as FirmaBelgeSatiri, tamam)
  const bySection: Record<string, number> = {}
  for (const e of ilerleme.eksikler) bySection[e.bolum] = (bySection[e.bolum] ?? 0) + 1
  return {
    ok: true,
    grounded: true,
    firm_id: firmId,
    firm_name: (firma as FirmaBelgeSatiri).name,
    count: ilerleme.eksikler.length,
    total: ilerleme.toplam,
    done: ilerleme.yapilan,
    percent: ilerleme.yuzde,
    by_section: bySection,
    documents: ilerleme.eksikler.slice(0, 40),
  }
}

// get_firm_progress — tek firmanın ya da (firm_id verilmezse) tüm firmaların
// Belge Takip ilerleme yüzdesi.
export async function getFirmProgress(supabase: SupabaseClient, firmId?: string) {
  if (firmId) {
    const r = await getFirmMissingDocuments(supabase, firmId)
    if (!r.ok) return r
    return { ok: true, grounded: true, firm_id: r.firm_id, firm_name: r.firm_name, percent: r.percent, done: r.done, total: r.total, missing: r.count }
  }
  const { data } = await supabase.from('firms').select('id, name, status, activities, contract_start')
  const firmalar = (data ?? []) as FirmaBelgeSatiri[]
  const tamam = await tamamlananBelgeler(supabase)
  const liste = firmalar
    .filter((f) => f.status !== 'tmfb_kapsamdisi')
    .map((f) => {
      const r = firmaIlerlemesi(f, tamam.get(f.id) ?? new Set<string>())
      return { firm_id: f.id, firm_name: f.name, percent: r.yuzde, missing: r.eksikler.length }
    })
    .sort((a, b) => a.percent - b.percent)
  const ort = liste.length ? Math.round(liste.reduce((t, x) => t + x.percent, 0) / liste.length) : 0
  return { ok: true, grounded: true, firm_count: liste.length, average_percent: ort, lowest: liste.slice(0, 15) }
}

// ---------------------------------------------------------------------------
// list_firms — firma sayısı ve isimleri (duruma göre).
// ---------------------------------------------------------------------------

const DURUM_TR: Record<string, string> = {
  active: 'Aktif',
  passive: 'Pasif',
  archived: 'Arşiv',
  tmfb_kapsamdisi: 'TMFB Kapsamdışı',
}

const DURUM_ESLE: Record<string, string> = {
  aktif: 'active', active: 'active',
  pasif: 'passive', passive: 'passive',
  arsiv: 'archived', 'arşiv': 'archived', archived: 'archived',
  tmfb_kapsamdisi: 'tmfb_kapsamdisi', kapsamdisi: 'tmfb_kapsamdisi', 'kapsamdışı': 'tmfb_kapsamdisi',
  all: 'all', hepsi: 'all', tumu: 'all', 'tümü': 'all',
}

export async function listFirms(supabase: SupabaseClient, status?: string) {
  const { data } = await supabase.from('firms').select('id, name, status').order('name')
  const hepsi = (data ?? []) as { id: string; name: string; status: string }[]
  const sayim: Record<string, number> = {}
  const isimler: Record<string, string[]> = {}
  for (const f of hepsi) {
    const k = DURUM_TR[f.status] ?? f.status
    sayim[k] = (sayim[k] ?? 0) + 1
    ;(isimler[k] ??= []).push(f.name)
  }
  const st = status ? (DURUM_ESLE[status.toLocaleLowerCase('tr').trim()] ?? status) : 'all'
  const filtreli = st !== 'all' ? hepsi.filter((f) => f.status === st) : hepsi
  return {
    ok: true,
    grounded: true,
    total_all: hepsi.length,
    by_status: sayim,
    // Her durumun FİRMA İSİMLERİ — "hangi firma pasif/aktif" sorusu buradan cevaplanır.
    names_by_status: isimler,
    filter: st !== 'all' ? (DURUM_TR[st] ?? st) : 'tümü',
    count: filtreli.length,
    firms: filtreli.slice(0, 300).map((f) => ({ id: f.id, name: f.name, status: DURUM_TR[f.status] ?? f.status })),
  }
}

// ---------------------------------------------------------------------------
// get_visit_overview — belirli ayda ziyaret edilen / edilmeyen firmalar.
// Firma Takvimi sayfasıyla aynı kural: tüm firmalar, o ay (visits.visit_date)
// en az bir ziyareti olmayanlar "ziyaret edilmeyen"dir.
// ---------------------------------------------------------------------------

function istanbulAyi(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit' })
    .format(new Date())
    .slice(0, 7)
}

export async function getVisitOverview(supabase: SupabaseClient, month?: string) {
  const ay = month && /^\d{4}-\d{2}$/.test(month) ? month : istanbulAyi()
  const [y, m] = ay.split('-').map(Number)
  const sonGun = new Date(y, m, 0).getDate()
  const bas = `${ay}-01`
  const son = `${ay}-${String(sonGun).padStart(2, '0')}`

  const [{ data: firmalar }, { data: ziyaretler }] = await Promise.all([
    supabase.from('firms').select('id, name').order('name'),
    supabase.from('visits').select('firm_id').gte('visit_date', bas).lte('visit_date', son),
  ])
  const ziyaretEdilen = new Set(((ziyaretler ?? []) as { firm_id: string }[]).map((z) => z.firm_id))
  const hepsi = (firmalar ?? []) as { id: string; name: string }[]
  const edilmeyen = hepsi.filter((f) => !ziyaretEdilen.has(f.id))
  return {
    ok: true,
    grounded: true,
    month: ay,
    total_firms: hepsi.length,
    visited_count: hepsi.length - edilmeyen.length,
    unvisited_count: edilmeyen.length,
    unvisited_firms: edilmeyen.slice(0, 100).map((f) => ({ id: f.id, name: f.name })),
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

// ---------------------------------------------------------------------------
// Yazılı asistan için OPERASYONEL BAĞLAM (deterministik, anahtar kelime tabanlı)
// ---------------------------------------------------------------------------
// Sesli asistan araç çağırır; yazılı asistan (LLM) araç çağıramadığı için
// "erişemiyorum" diyebiliyordu. Soruda firma sayısı / ziyaret edilmeyen firma /
// ilerleme yüzdesi / eksik belge geçiyorsa gerçek veriyi sunucu hesaplar ve
// prompt'a "GERÇEK SİSTEM VERİSİ" olarak ekler — model sayıyı uydurmaz, "erişemem" demez.

function trKucuk(s: string): string {
  return s.toLocaleLowerCase('tr').replace(/\s+/g, ' ')
}

export async function buildOperationalContext(
  supabase: SupabaseClient,
  question: string,
  currentFirmId?: string
): Promise<string> {
  const q = trKucuk(question)
  const sayiSorusu0 = /kaç\s+(adet\s+)?firma|firma\s*say|toplam firma|firmalarım|firma listesi|firmaları listele|tüm firma/.test(q)
  const ziyaretSorusu =
    /ziyaret\s*(edilmeyen|edilmemiş|etmediğim|edilmeyecek|kalan)|ziyaret\s*et(me|medi)|kaç.*ziyaret|ziyaret.*(kaç|sayı)|ziyaret edilecek/.test(q)
  const sayiSorusu = sayiSorusu0 && !ziyaretSorusu
  const ilerlemeSorusu = /ilerleme|yüzde|tamamlanma|%/.test(q)
  const eksikSorusu = /eksik\s*belge|belge.*eksik|eksik.*belge|tamamlanmamış belge/.test(q)

  if (!sayiSorusu && !ziyaretSorusu && !ilerlemeSorusu && !eksikSorusu) return ''

  const parcalar: string[] = [
    '### GERÇEK SİSTEM VERİSİ (veritabanından AZ ÖNCE okundu — bu bilgilere ERİŞEBİLİYORSUN) ###',
    'Aşağıdaki sayı ve isimleri AYNEN kullan. "Veritabanına erişemiyorum", "manuel kontrol et" DEME. Yüzdeyi "yüzde 85" biçiminde söyle.',
  ]

  if (sayiSorusu) {
    const r = await listFirms(supabase)
    parcalar.push(
      `FİRMA SAYISI: toplam ${r.total_all}. Duruma göre: ${Object.entries(r.by_status).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
      `Firma isimleri: ${r.firms.map((f) => f.name).join('; ')}`
    )
  }

  if (ziyaretSorusu) {
    const v = await getVisitOverview(supabase)
    parcalar.push(
      `ZİYARET DURUMU (${v.month}): toplam ${v.total_firms} firma, ziyaret edilen ${v.visited_count}, ziyaret EDİLMEYEN ${v.unvisited_count}.`,
      v.unvisited_count > 0 ? `Ziyaret edilmeyen firmalar: ${v.unvisited_firms.map((f) => f.name).join('; ')}` : 'Ziyaret edilmeyen firma kalmadı.'
    )
  }

  if (ilerlemeSorusu || eksikSorusu) {
    // Sorudaki firma adlarını yakala; yoksa ve "bu firma" geçiyorsa mevcut firmayı kullan.
    const { data } = await supabase.from('firms').select('id, name')
    const firmalar = (data ?? []) as { id: string; name: string }[]
    let secilen = firmalar.filter((f) => f.name.length >= 3 && q.includes(trKucuk(f.name))).slice(0, 3)
    if (secilen.length === 0 && currentFirmId) {
      const f = firmalar.find((x) => x.id === currentFirmId)
      if (f) secilen = [f]
    }
    if (secilen.length === 0) {
      const g = await getFirmProgress(supabase)
      if ('average_percent' in g && g.lowest) {
        parcalar.push(
          `BELGE TAKİP GENEL: ${g.firm_count} firmanın ortalama ilerlemesi yüzde ${g.average_percent}. En düşük: ${g.lowest
            .slice(0, 10)
            .map((x) => `${x.firm_name} %${x.percent}`)
            .join('; ')}. (Belirli bir firma sorulacaksa firma adını söylemesini iste.)`
        )
      }
    }
    for (const f of secilen) {
      const m = await getFirmMissingDocuments(supabase, f.id)
      if (!m.ok) continue
      parcalar.push(
        `BELGE TAKİP — ${m.firm_name}: ilerleme yüzde ${m.percent} (${m.done}/${m.total} tamam), eksik ${m.count} belge.` +
          (eksikSorusu && m.count > 0
            ? ` Eksikler: ${m.documents.map((d) => d.belge).join('; ')}`
            : '')
      )
    }
  }

  return parcalar.join('\n')
}
