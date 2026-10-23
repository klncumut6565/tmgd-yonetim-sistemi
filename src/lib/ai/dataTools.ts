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
import { ayCoz } from '@/lib/ai/actions'
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

/** Firma Takvimi ile AYNI: firma tarafı kullanıcılar danışman sayılmaz. */
const DANISMAN_DISI_ROLLER = new Set(['company', 'viewer'])

function trNorm(t: string): string {
  return t
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/i̇/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** "Aylin", "aylinin", "Aylin Hanım", "Aylin Yılmaz" → ad soyadla eşleşir mi? */
function danismanEslesir(sorgu: string, adSoyad: string): boolean {
  const q = trNorm(sorgu).split(' ').filter((w) => w && !['hanim', 'bey', 'hoca', 'tmgd'].includes(w))
  const ad = trNorm(adSoyad).split(' ').filter(Boolean)
  if (!q.length || !ad.length) return false
  // Her sorgu kelimesi bir ad parçasıyla başlamalı ya da Türkçe ekle uzamış olmalı ("aylinin" ~ "aylin").
  return q.every((w) => ad.some((p) => p === w || (p.length >= 3 && w.startsWith(p) && w.length - p.length <= 4) || (w.length >= 3 && p.startsWith(w))))
}

/** getVisitOverview'in danışman verilmeden döndürdüğü genel görünüm. */
export type ZiyaretGenelOzeti = {
  ok: true
  month: string
  total_firms: number
  visited_count: number
  unvisited_count: number
  planned_count: number
  unvisited_firms: { id: string; name: string; danisman: string; planlanan_tarih?: string }[]
  danisman_kirilimi: { danisman: string; toplam_firma: number; ziyaret_edilen: number; ziyaret_edilmeyen: number; planlanan: number }[]
}

type DanismanOzeti = {
  danisman: string
  toplam_firma: number
  ziyaret_edilen: number
  ziyaret_edilmeyen: number
  ziyaret_edilen_firmalar: string[]
  ziyaret_edilmeyen_firmalar: string[]
  /** Ziyaret edilmeyenlerden ileri bir tarihe planlanmış olanlar (ziyaret_edilmeyen'e DAHİL). */
  planlanan: number
  planlanan_firmalar: string[]
}

/**
 * Firma Takvimi ile AYNI kural: tüm (görülebilen) firmalar; o ay
 * (visits.visit_date) en az bir ziyareti olmayan firma "ziyaret edilmeyen"dir.
 * Danışman = user_firms ataması (company/viewer rolleri hariç). Bir firmaya
 * birden çok danışman atanmışsa firma HER BİRİNİN listesinde sayılır.
 *
 * @param consultant Opsiyonel danışman adı ("Aylin") — yalnızca onun firmaları.
 */
export async function getVisitOverview(supabase: SupabaseClient, month?: string, consultant?: string) {
  const istanbulSimdi = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
  const ay = ayCoz(month, istanbulSimdi) ?? istanbulAyi()
  const [y, m] = ay.split('-').map(Number)
  const sonGun = new Date(y, m, 0).getDate()
  const bas = `${ay}-01`
  const son = `${ay}-${String(sonGun).padStart(2, '0')}`

  const [{ data: firmalar }, { data: ziyaretler }, { data: atamalar, error: atamaHata }] = await Promise.all([
    // Kapsamdışı firmalar takvim/ziyaret takibine dahil edilmez.
    supabase.from('firms').select('id, name').or('status.is.null,status.neq.tmfb_kapsamdisi').order('name'),
    supabase.from('visits').select('firm_id, visit_date').gte('visit_date', bas).lte('visit_date', son),
    supabase.from('user_firms').select('firm_id, user_id, profiles ( full_name, role )'),
  ])
  // GERÇEK ziyaret = tarihi BUGÜN (İstanbul) veya öncesi. İleri tarihe takvime
  // eklenen firma "planlandı" ama henüz ziyaret EDİLMEDİ sayılır.
  const bugun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date())
  const ziyaretEdilen = new Set<string>()
  const planlanan = new Map<string, string>() // firm_id → en yakın plan tarihi
  for (const z of (ziyaretler ?? []) as { firm_id: string; visit_date: string }[]) {
    const g = String(z.visit_date).slice(0, 10)
    if (g <= bugun) ziyaretEdilen.add(z.firm_id)
    else if (!planlanan.has(z.firm_id) || g < planlanan.get(z.firm_id)!) planlanan.set(z.firm_id, g)
  }
  for (const id of ziyaretEdilen) planlanan.delete(id)
  const hepsi = (firmalar ?? []) as { id: string; name: string }[]
  const firmaAdi = new Map(hepsi.map((f) => [f.id, f.name]))

  // Firma → danışman adları; danışman → firma id'leri
  const firmaDanisman = new Map<string, string[]>()
  const danismanFirmalari = new Map<string, Set<string>>()
  for (const a of (atamalar ?? []) as unknown as { firm_id: string; user_id: string; profiles: { full_name: string | null; role: string | null } | null }[]) {
    const p = a.profiles
    if (!p || DANISMAN_DISI_ROLLER.has(String(p.role || '')) || !firmaAdi.has(a.firm_id)) continue
    const ad = String(p.full_name || '').trim() || '(isim girilmemiş)'
    const liste = firmaDanisman.get(a.firm_id) ?? []
    if (!liste.includes(ad)) liste.push(ad)
    firmaDanisman.set(a.firm_id, liste)
    const set = danismanFirmalari.get(ad) ?? new Set<string>()
    set.add(a.firm_id)
    danismanFirmalari.set(ad, set)
  }

  const ozet = (ad: string, ids: Set<string>): DanismanOzeti => {
    const firmIds = [...ids].sort((x, z) => (firmaAdi.get(x) ?? '').localeCompare(firmaAdi.get(z) ?? '', 'tr'))
    const edilen = firmIds.filter((id) => ziyaretEdilen.has(id))
    const edilmeyen = firmIds.filter((id) => !ziyaretEdilen.has(id))
    return {
      danisman: ad,
      toplam_firma: firmIds.length,
      ziyaret_edilen: edilen.length,
      ziyaret_edilmeyen: edilmeyen.length,
      ziyaret_edilen_firmalar: edilen.map((id) => firmaAdi.get(id) ?? id).slice(0, 60),
      ziyaret_edilmeyen_firmalar: edilmeyen.map((id) => firmaAdi.get(id) ?? id).slice(0, 60),
      planlanan: edilmeyen.filter((id) => planlanan.has(id)).length,
      planlanan_firmalar: edilmeyen
        .filter((id) => planlanan.has(id))
        .map((id) => `${firmaAdi.get(id) ?? id} (${planlanan.get(id)})`)
        .slice(0, 60),
    }
  }

  // Belirli danışman istendiyse
  if (consultant && consultant.trim()) {
    const eslesen = [...danismanFirmalari.keys()].filter((ad) => danismanEslesir(consultant, ad))
    if (eslesen.length === 0) {
      return {
        ok: false,
        grounded: true,
        month: ay,
        error: `"${consultant}" adında firma atanmış bir danışman bulunamadı.`,
        danismanlar: [...danismanFirmalari.keys()].sort((x, z) => x.localeCompare(z, 'tr')),
        ...(atamaHata ? { note: 'Firma atamaları okunamadı (yetki).' } : {}),
      }
    }
    if (eslesen.length > 1) {
      return {
        ok: false,
        grounded: true,
        month: ay,
        ambiguous: true,
        error: 'Birden fazla danışman eşleşti; kullanıcıya hangisini kastettiğini sor.',
        adaylar: eslesen,
      }
    }
    return { ok: true, grounded: true, month: ay, ...ozet(eslesen[0], danismanFirmalari.get(eslesen[0])!) }
  }

  // Genel görünüm + danışman kırılımı
  const edilmeyen = hepsi.filter((f) => !ziyaretEdilen.has(f.id))
  const atanmamis = new Set(hepsi.filter((f) => !firmaDanisman.has(f.id)).map((f) => f.id))
  const kirilim = [...danismanFirmalari.entries()]
    .map(([ad, ids]) => {
      const o = ozet(ad, ids)
      return { danisman: o.danisman, toplam_firma: o.toplam_firma, ziyaret_edilen: o.ziyaret_edilen, ziyaret_edilmeyen: o.ziyaret_edilmeyen, planlanan: o.planlanan }
    })
    .sort((x, z) => x.danisman.localeCompare(z.danisman, 'tr'))
  if (atanmamis.size) {
    const o = ozet('(danışman atanmamış)', atanmamis)
    kirilim.push({ danisman: o.danisman, toplam_firma: o.toplam_firma, ziyaret_edilen: o.ziyaret_edilen, ziyaret_edilmeyen: o.ziyaret_edilmeyen, planlanan: o.planlanan })
  }
  return {
    ok: true,
    grounded: true,
    month: ay,
    total_firms: hepsi.length,
    visited_count: hepsi.length - edilmeyen.length,
    unvisited_count: edilmeyen.length,
    /** Ziyaret edilmeyenlerden ileri tarihe planlanmış olanlar (unvisited_count'a DAHİL). */
    planned_count: edilmeyen.filter((f) => planlanan.has(f.id)).length,
    today: bugun,
    rule: 'Ziyaret edilen = bu ay tarihi bugün veya öncesi olan kayıt. İleri tarihe eklenen firma planlanmıştır ama ziyaret EDİLMEMİŞ sayılır.',
    // Ziyaret edilmeyen firmalar + atandığı danışman(lar) + varsa plan tarihi
    unvisited_firms: edilmeyen.slice(0, 100).map((f) => ({
      id: f.id,
      name: f.name,
      danisman: (firmaDanisman.get(f.id) ?? []).join(', ') || '(atanmamış)',
      ...(planlanan.has(f.id) ? { planlanan_tarih: planlanan.get(f.id) } : {}),
    })),
    danisman_kirilimi: kirilim,
    ...(atamaHata ? { note: 'Firma atamaları okunamadı; danışman kırılımı eksik olabilir.' } : {}),
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
      icerik: p.icerik.length > 3000 ? p.icerik.slice(0, 3000) + ' […devamı var: metin kesildi, kesin hüküm için maddenin tamamına bakılmalı]' : p.icerik,
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
    const v = (await getVisitOverview(supabase)) as ZiyaretGenelOzeti
    parcalar.push(
      `ZİYARET DURUMU (${v.month}): toplam ${v.total_firms} firma, ziyaret edilen ${v.visited_count}, ziyaret EDİLMEYEN ${v.unvisited_count}` +
        (v.planned_count ? ` (bunların ${v.planned_count} tanesi ileri tarihe planlı).` : '.'),
      v.unvisited_count > 0
        ? `Ziyaret edilmeyen firmalar (danışmanıyla): ${v.unvisited_firms.map((f) => `${f.name} [${f.danisman}]${f.planlanan_tarih ? ` (planlı: ${f.planlanan_tarih})` : ''}`).join('; ')}`
        : 'Ziyaret edilmeyen firma kalmadı.',
      v.danisman_kirilimi.length
        ? `DANIŞMAN BAZINDA: ${v.danisman_kirilimi.map((d) => `${d.danisman}: ${d.toplam_firma} firma, ${d.ziyaret_edilen} ziyaret edildi, ${d.ziyaret_edilmeyen} edilmedi${d.planlanan ? ` (${d.planlanan} planlı)` : ''}`).join('; ')}`
        : ''
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


// ---------------------------------------------------------------------------
// get_dashboard_summary — Gösterge paneliyle AYNI kaynaklar ve eşikler.
// ---------------------------------------------------------------------------

function gunKaldi(tarih: string): number {
  const bugun = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()) + 'T00:00:00')
  const t = new Date(tarih.slice(0, 10) + 'T00:00:00')
  return Math.round((t.getTime() - bugun.getTime()) / 86400000)
}

type TmgdUyari = { id: string; kisi: string; firma?: string; valid_until: string; days_left: number }

/** Gösterge paneli + bildirim zili ile AYNI kural: kişi bazlı, 120 gün, Süper Yönetici hariç. */
async function tmgdSertifikaUyarilari(
  supabase: SupabaseClient,
  s2: Record<string, unknown>[]
): Promise<TmgdUyari[]> {
  const s2FirmaIds = Array.from(new Set(s2.map((r) => String(r.firm_id)).filter(Boolean)))
  const atanan = new Map<string, { userId: string; ad: string }>()
  if (s2FirmaIds.length) {
    const { data: at } = await supabase
      .from('user_firms')
      .select('firm_id, user_id, profiles ( full_name, role, is_active )')
      .in('firm_id', s2FirmaIds)
    const oncelik: Record<string, number> = { tmgd: 0, assistant: 1, admin: 2 }
    const secili = new Map<string, number>()
    for (const a of (at ?? []) as unknown as { firm_id: string; user_id: string; profiles: { full_name?: string; role?: string; is_active?: boolean | null } | null }[]) {
      const pr = a.profiles
      if (!pr || pr.is_active === false) continue
      const o = oncelik[String(pr.role)]
      if (o === undefined) continue
      const m = secili.get(a.firm_id)
      if (m === undefined || o < m) {
        atanan.set(a.firm_id, { userId: a.user_id, ad: String(pr.full_name || '').trim() || '(isim girilmemiş)' })
        secili.set(a.firm_id, o)
      }
    }
  }
  const kisiBazli = new Map<string, TmgdUyari>()
  for (const r of s2) {
    const gun = gunKaldi(String(r.valid_until))
    if (gun > 120) continue
    const at = atanan.get(String(r.firm_id))
    const anahtar = at ? `u:${at.userId}` : `f:${r.firm_id}`
    const mevcut = kisiBazli.get(anahtar)
    if (mevcut && mevcut.days_left <= gun) continue
    kisiBazli.set(anahtar, {
      id: `tmgd-${anahtar}`,
      kisi: at ? at.ad : 'TMGD atanmamış',
      ...(at ? {} : { firma: String((r.firms as { name?: string } | null)?.name ?? '') }),
      valid_until: String(r.valid_until),
      days_left: gun,
    })
  }
  return Array.from(kisiBazli.values()).sort((x, y) => x.days_left - y.days_left)
}

export async function getDashboardSummary(supabase: SupabaseClient) {
  const GENEL = 45 // GENEL_UYARI_GUN (uyariEsikleri.ts) ile aynı
  const [firmalar, gorev, belge, arac, surucuAdr, aracAdr, muayene, ehliyet, belgeler, tmfb, tmgdS2, son] =
    await Promise.all([
      supabase.from('firms').select('status'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['todo', 'in_progress', 'review']),
      supabase.from('firm_belge_dosyalari').select('*', { count: 'exact', head: true }),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }),
      supabase.from('adr_expiring_drivers').select('first_name, last_name, adr_valid_until, firm_name, days_left').lte('days_left', GENEL).order('days_left').limit(15),
      supabase.from('adr_expiring_vehicles').select('plate_number, adr_valid_until, firm_name, days_left').lte('days_left', GENEL).order('days_left').limit(15),
      supabase.from('expiring_vehicle_inspections').select('plate_number, inspection_valid_until, firm_name, days_left').lte('days_left', GENEL).order('days_left').limit(15),
      supabase.from('expiring_driver_licenses').select('first_name, last_name, driving_license_valid_until, firm_name, days_left').lte('days_left', GENEL).order('days_left').limit(15),
      supabase.from('expiring_documents').select('title, expiry_date, firm_name, days_left').lte('days_left', GENEL).order('days_left').limit(20),
      supabase.from('expiring_documents').select('title, expiry_date, firm_name, days_left').ilike('title', '%TMFB%').lte('days_left', 150).order('days_left').limit(15),
      supabase.from('firm_belgeleri').select('firm_id, valid_until, firms ( name )').eq('code', 'S2').not('valid_until', 'is', null).order('valid_until'),
      supabase.from('tasks').select('title, status, priority, due_date, firms ( name )').order('updated_at', { ascending: false }).limit(6),
    ])

  const durum: Record<string, number> = {}
  for (const f of (firmalar.data ?? []) as { status: string }[]) {
    const k = DURUM_TR[f.status] ?? f.status
    durum[k] = (durum[k] ?? 0) + 1
  }
  type R = Record<string, unknown>
  const rows = (r: { data: unknown }) => (r.data ?? []) as R[]

  const tmgdSertifika = (await tmgdSertifikaUyarilari(supabase, rows(tmgdS2))).slice(0, 15)

  return {
    ok: true,
    grounded: true,
    kartlar: {
      toplam_firma: (firmalar.data ?? []).length,
      firma_durum_dagilimi: durum,
      acik_gorev: gorev.count ?? 0,
      yuklenen_belge_dosyasi: belge.count ?? 0,
      arac_sayisi: arac.count ?? 0,
    },
    uyari_esigi_gun: GENEL,
    suresi_yaklasan_surucu_belgeleri: [
      ...rows(surucuAdr).map((d) => ({ tur: 'SRC-5 (ADR)', kisi: `${d.first_name} ${d.last_name}`, firma: d.firm_name, bitis: d.adr_valid_until, kalan_gun: d.days_left })),
      ...rows(ehliyet).map((d) => ({ tur: 'Ehliyet', kisi: `${d.first_name} ${d.last_name}`, firma: d.firm_name, bitis: d.driving_license_valid_until, kalan_gun: d.days_left })),
    ],
    suresi_yaklasan_arac_belgeleri: [
      ...rows(aracAdr).map((v) => ({ tur: 'ADR Belgesi', plaka: v.plate_number, firma: v.firm_name, bitis: v.adr_valid_until, kalan_gun: v.days_left })),
      ...rows(muayene).map((v) => ({ tur: 'Muayene', plaka: v.plate_number, firma: v.firm_name, bitis: v.inspection_valid_until, kalan_gun: v.days_left })),
    ],
    suresi_yaklasan_firma_belgeleri: rows(belgeler)
      .filter((b) => !/TMGD Sertifika/i.test(String(b.title)))
      .map((b) => ({ belge: String(b.title).replace(/^(Belge Takip|Araç Evrakı):\s*/, ''), firma: b.firm_name, bitis: b.expiry_date, kalan_gun: b.days_left })),
    tmfb_uyarilari_150_gun: rows(tmfb).map((b) => ({ belge: b.title, firma: b.firm_name, bitis: b.expiry_date, kalan_gun: b.days_left })),
    tmgd_sertifika_uyarilari_120_gun: tmgdSertifika,
    son_guncellenen_gorevler: rows(son).map((t) => ({
      baslik: t.title,
      durum: t.status,
      oncelik: t.priority,
      bitis: t.due_date,
      firma: (t.firms as { name?: string } | null)?.name ?? null,
    })),
  }
}

// ---------------------------------------------------------------------------
// list_tmgd — Roller bölümündeki TMGD (danışman) personeli: sayı, kişi bilgisi,
// atandığı firma sayısı ve S2 (TMGD Sertifikası) geçerlilik tarihi.
// ---------------------------------------------------------------------------

const ROL_TR: Record<string, string> = {
  super_admin: 'Süper Yönetici',
  admin: 'Yönetici',
  tmgd: 'TMGD',
  assistant: 'Asistan',
  viewer: 'İzleyici',
  company: 'Firma Kullanıcısı',
}

const DANISMAN_ROLLER = new Set(['tmgd', 'admin', 'assistant'])

export async function listTmgd(supabase: SupabaseClient, includeInactive = false, superGoster = false) {
  const { data: profiller } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, is_active, approval_status')
    .order('full_name')
  const hepsi = ((profiller ?? []) as {
    id: string; full_name: string; email: string | null; phone: string | null
    role: string; is_active: boolean | null; approval_status: string | null
  }[])
  const aktifMi = (p: { is_active: boolean | null; approval_status: string | null }) =>
    p.is_active !== false && (p.approval_status == null || p.approval_status === 'approved')

  const rolSayim: Record<string, number> = {}
  for (const p of hepsi.filter(aktifMi)) {
    // Süper Yönetici rolünün varlığı, süper yönetici olmayan kullanıcıya hiçbir zaman gösterilmez.
    if (p.role === 'super_admin' && !superGoster) continue
    const k = ROL_TR[p.role] ?? p.role
    rolSayim[k] = (rolSayim[k] ?? 0) + 1
  }

  // Danışman personel = TMGD + Yönetici + Asistan (süper yönetici, firma kullanıcısı ve izleyici HARİÇ).
  const tmgdler = hepsi.filter((p) => DANISMAN_ROLLER.has(p.role) && (includeInactive || aktifMi(p)))
  const ids = tmgdler.map((p) => p.id)

  const atamalar: Record<string, string[]> = {}
  if (ids.length) {
    const { data } = await supabase.from('user_firms').select('user_id, firm_id').in('user_id', ids)
    for (const a of (data ?? []) as { user_id: string; firm_id: string }[]) (atamalar[a.user_id] ??= []).push(a.firm_id)
  }
  const tumFirmaIds = Array.from(new Set(Object.values(atamalar).flat()))
  const sertifika: Record<string, string> = {}
  if (tumFirmaIds.length) {
    const { data } = await supabase
      .from('firm_belgeleri')
      .select('firm_id, valid_until')
      .eq('code', 'S2')
      .not('valid_until', 'is', null)
      .in('firm_id', tumFirmaIds)
    for (const r of (data ?? []) as { firm_id: string; valid_until: string }[]) sertifika[r.firm_id] = r.valid_until
  }

  return {
    ok: true,
    grounded: true,
    aktif_tmgd_sayisi: hepsi.filter((p) => DANISMAN_ROLLER.has(p.role) && aktifMi(p)).length,
    aciklama: superGoster
      ? 'TMGD danışman sayısına rolü TMGD, Yönetici veya Asistan olan aktif kişiler dahildir; Süper Yönetici dahil değildir.'
      : 'TMGD danışman sayısına rolü TMGD, Yönetici veya Asistan olan aktif kişiler dahildir.',
    pasif_veya_onaysiz_tmgd_sayisi: hepsi.filter((p) => DANISMAN_ROLLER.has(p.role) && !aktifMi(p)).length,
    aktif_personel_rol_dagilimi: rolSayim,
    tmgd_listesi: tmgdler.map((p) => {
      const firmalar = atamalar[p.id] ?? []
      const tarihler = firmalar.map((f) => sertifika[f]).filter(Boolean).sort()
      const enErken = tarihler[0]
      return {
        ad: p.full_name,
        rol: ROL_TR[p.role] ?? p.role,
        e_posta: p.email,
        telefon: p.phone,
        durum: aktifMi(p) ? 'Aktif' : 'Pasif/Onaysız',
        atanan_firma_sayisi: firmalar.length,
        sertifika_gecerlilik: enErken ?? null,
        sertifika_kalan_gun: enErken ? gunKaldi(enErken) : null,
      }
    }),
  }
}


// ---------------------------------------------------------------------------
// get_notifications — Bildirim zilindeki GERÇEK liste (NotificationBell.tsx ile aynı kurallar):
// onay bekleyen kullanıcılar, belge uyarıları (45 gün; TMFB 150; TMGD sertifikası 120),
// sürücü/araç uyarıları. Kullanıcının zilden "kaldırdığı" bildirimler elenir.
// ---------------------------------------------------------------------------

export async function getNotifications(supabase: SupabaseClient, userId?: string, onayBekleyenGoster = true) {
  const GENEL = 45
  const [kaldirilan, bekleyen, belgeler, tmfb, s2, surucuAdr, aracAdr, muayene, ehliyet] = await Promise.all([
    userId ? supabase.from('dismissed_notifications').select('notification_key').eq('user_id', userId) : Promise.resolve({ data: [] }),
    onayBekleyenGoster ? supabase.from('profiles').select('full_name, email').eq('approval_status', 'pending').limit(10) : Promise.resolve({ data: [] }),
    supabase.from('expiring_documents').select('id, title, firm_name, days_left, expiry_date').lte('days_left', GENEL).order('days_left'),
    supabase.from('expiring_documents').select('id, title, firm_name, days_left, expiry_date').ilike('title', '%TMFB%').lte('days_left', 150).order('days_left'),
    supabase.from('firm_belgeleri').select('id, firm_id, valid_until, firms ( name )').eq('code', 'S2').not('valid_until', 'is', null).order('valid_until'),
    supabase.from('adr_expiring_drivers').select('id, first_name, last_name, firm_name, days_left, adr_valid_until').lte('days_left', GENEL).order('days_left'),
    supabase.from('adr_expiring_vehicles').select('id, plate_number, firm_name, days_left, adr_valid_until').lte('days_left', GENEL).order('days_left'),
    supabase.from('expiring_vehicle_inspections').select('id, plate_number, firm_name, days_left, inspection_valid_until').lte('days_left', GENEL).order('days_left'),
    supabase.from('expiring_driver_licenses').select('id, first_name, last_name, firm_name, days_left, driving_license_valid_until').lte('days_left', GENEL).order('days_left'),
  ])
  type R = Record<string, unknown>
  const rows = (r: { data: unknown }) => (r.data ?? []) as R[]
  const gizli = new Set(rows(kaldirilan).map((r) => String(r.notification_key)))

  type B = { id: string; baslik: string; firma: string; kalan_gun: number; bitis: string }
  const liste: B[] = []
  const gorulen = new Set<string>()
  for (const d of [...rows(belgeler), ...rows(tmfb)]) {
    const id = String(d.id)
    if (gorulen.has(id) || /TMGD Sertifika/i.test(String(d.title))) continue
    gorulen.add(id)
    liste.push({ id, baslik: String(d.title).replace(/^(Belge Takip|Araç Evrakı):\s*/, ''), firma: String(d.firm_name ?? ''), kalan_gun: Number(d.days_left), bitis: String(d.expiry_date) })
  }
  for (const t of await tmgdSertifikaUyarilari(supabase, rows(s2))) {
    liste.push({
      id: t.id,
      baslik: t.kisi === 'TMGD atanmamış' ? 'TMGD atanmamış' : `TMGD Sertifikası — ${t.kisi}`,
      firma: t.firma ? `${t.firma} — bu firmaya TMGD atanmamış` : '',
      kalan_gun: t.days_left,
      bitis: t.valid_until,
    })
  }
  for (const d of rows(surucuAdr)) liste.push({ id: `drv-adr-${d.id}`, baslik: `${d.first_name} ${d.last_name} — SRC-5`, firma: String(d.firm_name), kalan_gun: Number(d.days_left), bitis: String(d.adr_valid_until) })
  for (const v of rows(aracAdr)) liste.push({ id: `veh-adr-${v.id}`, baslik: `${v.plate_number} — ADR Belgesi`, firma: String(v.firm_name), kalan_gun: Number(v.days_left), bitis: String(v.adr_valid_until) })
  for (const v of rows(muayene)) liste.push({ id: `veh-insp-${v.id}`, baslik: `${v.plate_number} — Muayene`, firma: String(v.firm_name), kalan_gun: Number(v.days_left), bitis: String(v.inspection_valid_until) })
  for (const d of rows(ehliyet)) liste.push({ id: `drv-lic-${d.id}`, baslik: `${d.first_name} ${d.last_name} — Ehliyet`, firma: String(d.firm_name), kalan_gun: Number(d.days_left), bitis: String(d.driving_license_valid_until) })

  const gorunur = liste.filter((b) => !gizli.has(b.id)).sort((a, b) => a.kalan_gun - b.kalan_gun)
  const etiket = (g: number) => (g < 0 ? `${Math.abs(g)} gün geçti` : g === 0 ? 'Bugün doluyor' : `${g} gün kaldı`)
  const onay = rows(bekleyen)
  return {
    ok: true,
    grounded: true,
    toplam_bildirim: gorunur.length + onay.length,
    onay_bekleyen_kullanici_sayisi: onay.length,
    onay_bekleyen_kullanicilar: onay.map((u) => ({ ad: u.full_name, e_posta: u.email })),
    belge_ve_evrak_uyarisi_sayisi: gorunur.length,
    uyarilar: gorunur.slice(0, 60).map((b) => ({ baslik: b.baslik, firma: b.firma, bitis: b.bitis, kalan: etiket(b.kalan_gun), kalan_gun: b.kalan_gun })),
  }
}


/**
 * Firma Notları'na (Notlar sekmesi) yeni not ekler. Yetkiyi RLS belirler
 * (super_admin / admin / atandığı firmada tmgd — 073_firm_notes_admin_tmgd.sql). Asistan eklediği için is_assistant=true.
 */
export async function addFirmNote(
  supabase: SupabaseClient,
  userId: string | undefined,
  firmId: string,
  content: string
) {
  const metin = content.trim()
  if (!metin) return { ok: false, error: 'Not metni boş.' }
  const { data: firma } = await supabase.from('firms').select('id, name').eq('id', firmId).maybeSingle()
  if (!firma) return { ok: false, error: 'Bu ID ile bir firma bulunamadı. Önce search_firm ile firmayı ara.' }
  const { error } = await supabase.from('firm_notes').insert({
    firm_id: firmId,
    author_id: userId ?? null,
    is_assistant: true,
    content: metin.slice(0, 4000),
  })
  if (error) {
    // RLS reddi (yetki yok) → rol bilgisi vermeden genel mesaj.
    if (error.code === '42501' || /row-level security/i.test(error.message)) {
      return { ok: false, error: 'Bu işlem için yetkin bulunmuyor, not eklenemedi. Yetki konusunda rol veya başka bir kullanıcı ADI VERME.' }
    }
    return { ok: false, error: 'Not kaydedilemedi.' }
  }
  return { ok: true, firm: (firma as { name: string }).name, saved: metin.slice(0, 4000) }
}


// ---------------------------------------------------------------------------
// add_visit — Firma Takvimi'ne ziyaret ekler (takvimdeki "Takvime Ekle" ile
// AYNI kayıt: visits { firm_id, visit_date }). Yetki veritabanı RLS'inde:
// yönetici her firmaya, TMGD yalnızca kendine atanmış firmaya ekleyebilir.
// ---------------------------------------------------------------------------

const AY_TR = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik']
const AY_TR_GOSTER = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

function istanbulBugun(): { y: number; m: number; d: number } {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
    .split('-')
    .map(Number)
  return { y, m, d }
}

function gecerliTarih(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1) return null
  if (d > new Date(y, m, 0).getDate()) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** "23 ekim", "23 Ekim 2026", "2026-10-23", "23.10.2026", "23/10", "bugün", "yarın", "öbür gün"
 *  → YYYY-MM-DD (İstanbul saatine göre; yıl verilmezse bu yıl). */
export function tarihCoz(girdi: string): string | null {
  const b = istanbulBugun()
  const t = trNorm(girdi)
  if (!t) return null
  const kaydir = (gun: number) => {
    const dt = new Date(Date.UTC(b.y, b.m - 1, b.d + gun))
    return gecerliTarih(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
  }
  if (/^(bugun|bu gun)$/.test(t)) return kaydir(0)
  if (/^yarin$/.test(t)) return kaydir(1)
  if (/^(obur gun|obür gun|ertesi gun|yarindan sonra)$/.test(t)) return kaydir(2)
  let m = girdi.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return gecerliTarih(+m[1], +m[2], +m[3])
  m = girdi.trim().match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/)
  if (m) return gecerliTarih(m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : b.y, +m[2], +m[1])
  // "23 ekim [2026]"
  const k = t.split(' ')
  const gun = Number(k[0])
  const ayIdx = k[1] ? AY_TR.findIndex((a) => k[1].startsWith(a.slice(0, 3))) : -1
  if (Number.isInteger(gun) && ayIdx >= 0) {
    const yil = k[2] && /^\d{4}$/.test(k[2]) ? +k[2] : b.y
    return gecerliTarih(yil, ayIdx + 1, gun)
  }
  return null
}

function tarihGoster(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${AY_TR_GOSTER[m - 1]} ${y}`
}

export async function addVisit(
  supabase: SupabaseClient,
  args: { firm_id?: string; firm_name?: string; date?: string }
) {
  const tarih = args.date ? tarihCoz(args.date) : null
  if (!tarih) {
    return { ok: false, error: `Tarih anlaşılamadı ("${args.date ?? ''}"). Kullanıcıya hangi gün olduğunu sor (ör. "23 Ekim").` }
  }

  // Firmayı bul: ID varsa doğrula; yoksa isimle ara.
  let firma: { id: string; name: string } | null = null
  if (args.firm_id) {
    const { data } = await supabase.from('firms').select('id, name').eq('id', args.firm_id).maybeSingle()
    firma = (data as { id: string; name: string } | null) ?? null
    if (!firma) return { ok: false, error: 'Bu ID ile erişilebilir bir firma yok. firm_name ile tekrar dene.' }
  } else if (args.firm_name && args.firm_name.trim()) {
    const { matches } = await searchFirm(supabase, args.firm_name)
    const tam = matches.filter((f) => normAd(f.name) === normAd(args.firm_name!))
    if (tam.length === 1) firma = tam[0]
    else if (matches.length === 1) firma = matches[0]
    else if (matches.length === 0) {
      return { ok: false, error: `"${args.firm_name}" adında erişebildiğin bir firma bulunamadı. Kullanıcıya firma adını tekrar sor.` }
    } else {
      return {
        ok: false,
        ambiguous: true,
        error: 'Birden fazla firma eşleşti; kullanıcıya hangisini kastettiğini sor, sonra firm_id ile tekrar çağır.',
        candidates: matches.map((f) => ({ id: f.id, name: f.name })),
      }
    }
  } else {
    return { ok: false, error: 'Firma belirtilmedi (firm_name ya da firm_id gerekli).' }
  }

  // Kapsamdışı firmalar takvime eklenmez.
  {
    const { data: durum } = await supabase.from('firms').select('status').eq('id', firma!.id).maybeSingle()
    if ((durum as { status?: string } | null)?.status === 'tmfb_kapsamdisi') {
      return { ok: false, error: `"${firma!.name}" kapsamdışı bir firma; kapsamdışı firmalar takvime eklenmez. Kullanıcıya bunu bildir.` }
    }
  }

  // Aynı gün aynı firma zaten takvimdeyse tekrar ekleme.
  const { data: mevcut } = await supabase
    .from('visits')
    .select('id')
    .eq('firm_id', firma!.id)
    .eq('visit_date', tarih)
    .limit(1)
  if (mevcut && mevcut.length) {
    return { ok: true, already_exists: true, firm: firma!.name, date: tarih, date_spoken: tarihGoster(tarih) }
  }

  const { error } = await supabase.from('visits').insert([{ firm_id: firma!.id, visit_date: tarih }])
  if (error) {
    if (error.code === '42501' || /row-level security/i.test(error.message)) {
      return { ok: false, error: 'Bu firma için takvime ekleme yetkin bulunmuyor. Yetki konusunda rol veya başka bir kullanıcı ADI VERME.' }
    }
    return { ok: false, error: 'Ziyaret takvime eklenemedi.' }
  }
  return { ok: true, firm: firma!.name, firm_id: firma!.id, date: tarih, date_spoken: tarihGoster(tarih) }
}


/**
 * get_firm_documents — bir firmanın Belge Takip'teki belgeleri ve YÜKLÜ
 * belgelere ait tarihler (geçerlilik/bitiş tarihi, kalan gün, dosya sayısı).
 * `query` verilirse belge adına göre süzülür (ör. "TMFB", "muayene").
 */
export async function getFirmDocuments(supabase: SupabaseClient, firmId: string, query?: string) {
  const { data: firma } = await supabase
    .from('firms')
    .select('id, name, status, activities, contract_start')
    .eq('id', firmId)
    .maybeSingle()
  if (!firma) return { ok: false, error: 'Firma bulunamadı.' }
  const f = firma as FirmaBelgeSatiri

  const [{ data: satirlar }, { data: dosyalar }] = await Promise.all([
    supabase.from('firm_belgeleri').select('code, period, done, valid_until').eq('firm_id', firmId).limit(5000),
    supabase.from('firm_belge_dosyalari').select('code, period').eq('firm_id', firmId).limit(5000),
  ])
  const kayit = new Map<string, { done: boolean; valid_until: string | null }>()
  for (const r of (satirlar ?? []) as { code: string; period: string | null; done: boolean; valid_until: string | null }[]) {
    kayit.set(`${r.code}|${r.period ?? ''}`, { done: !!r.done, valid_until: r.valid_until })
  }
  const dosyaSayisi = new Map<string, number>()
  for (const r of (dosyalar ?? []) as { code: string; period: string | null }[]) {
    const k = `${r.code}|${r.period ?? ''}`
    dosyaSayisi.set(k, (dosyaSayisi.get(k) ?? 0) + 1)
  }

  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  const norm = (t: string) => normAd(t)
  const q = query ? norm(query) : ''
  const liste: {
    belge: string; bolum: string; tamamlandi: boolean; gecerlilik_tarihi: string | null;
    kalan_gun: number | null; yuklu_dosya_sayisi: number
  }[] = []

  for (const sec of buildChecklist(f.activities ?? [], f.contract_start)) {
    for (const it of sec.items) {
      if (!takipteSayilirMi(it.code)) continue
      const k = `${it.code}|${it.period}`
      const kr = kayit.get(k)
      const dosya = dosyaSayisi.get(k) ?? 0
      const belge = codeLabel(it.code, it.period)
      if (q && !norm(belge).includes(q) && !norm(codeSection(it.code)).includes(q)) continue
      const vu = kr?.valid_until ?? null
      let kalan: number | null = null
      if (vu) kalan = Math.round((new Date(vu).getTime() - bugun.getTime()) / 86400000)
      // Sorgu yoksa yalnızca tarihi olan ya da dosya yüklenmiş belgeler listelenir.
      if (!q && !vu && dosya === 0) continue
      liste.push({
        belge, bolum: codeSection(it.code), tamamlandi: !!kr?.done,
        gecerlilik_tarihi: vu, kalan_gun: kalan, yuklu_dosya_sayisi: dosya,
      })
    }
  }
  liste.sort((a, b) => (a.kalan_gun ?? 99999) - (b.kalan_gun ?? 99999))
  return {
    ok: true,
    grounded: true,
    firm_id: firmId,
    firm_name: f.name,
    sozlesme_baslangic: f.contract_start,
    count: liste.length,
    documents: liste.slice(0, 60),
    note: q ? undefined : 'Yalnızca geçerlilik tarihi girilmiş veya dosya yüklenmiş belgeler listelendi; belirli bir belge için query ver.',
  }
}

/**
 * get_firm_visits — bir firmanın ziyaret geçmişi (Ziyaretler / ziyaret raporu kayıtları).
 * Son ziyaret tarihi (bugün ve öncesi), kaç gün önce, kimin yaptığı; planlanmış (ileri tarihli)
 * ziyaretler ve "sonraki ziyaret" tarihi; son ziyaretlerin listesi. Tarihler veritabanından aynen döner.
 */
export async function getFirmVisits(supabase: SupabaseClient, firmId: string, userId?: string, limit = 10) {
  const { data: firma } = await supabase.from('firms').select('id, name').eq('id', firmId).maybeSingle()
  if (!firma) return { ok: false, error: 'Firma bulunamadı.' }
  const { data } = await supabase
    .from('visits')
    .select('visit_date, visit_type, summary, next_visit_date, visitor_id, period')
    .eq('firm_id', firmId)
    .order('visit_date', { ascending: false })
    .limit(500)
  type Z = { visit_date: string; visit_type: string | null; summary: string | null; next_visit_date: string | null; visitor_id: string | null; period: string | null }
  const hepsi = ((data ?? []) as Z[]).filter((z) => z.visit_date && z.visit_date >= '2000-01-01') // hatalı (ör. 0020 yılı) kayıtlar dışarıda
  const bugun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date())
  const gecmis = hepsi.filter((z) => z.visit_date <= bugun)
  const planli = hepsi.filter((z) => z.visit_date > bugun).sort((a, b) => a.visit_date.localeCompare(b.visit_date))

  const ids = [...new Set(hepsi.slice(0, limit + 5).map((z) => z.visitor_id).filter((x): x is string => !!x))]
  const adlar = new Map<string, string>()
  if (ids.length) {
    const { data: kisiler } = await supabase.from('profiles').select('id, full_name').in('id', ids)
    for (const k of (kisiler ?? []) as { id: string; full_name: string | null }[]) if (k.full_name) adlar.set(k.id, k.full_name)
  }
  const gunFarki = (d: string) => Math.round((Date.parse(bugun) - Date.parse(d)) / 86400000)
  const satir = (z: Z) => ({
    tarih: z.visit_date,
    tur: z.visit_type,
    donem: z.period,
    ziyaret_eden: z.visitor_id ? adlar.get(z.visitor_id) ?? null : null,
    ozet: z.summary ? z.summary.replace(/\s+/g, ' ').trim().slice(0, 200) : null,
    sonraki_ziyaret: z.next_visit_date,
  })
  const son = gecmis[0]
  const benimSon = userId ? gecmis.find((z) => z.visitor_id === userId) : undefined
  const yil = bugun.slice(0, 4)
  return {
    ok: true,
    grounded: true,
    firm_id: firmId,
    firm_name: (firma as { name: string }).name,
    today: bugun,
    toplam_ziyaret: gecmis.length,
    bu_yil_ziyaret: gecmis.filter((z) => z.visit_date.startsWith(yil)).length,
    son_ziyaret_tarihi: son?.visit_date ?? null,
    son_ziyaretten_bu_yana_gun: son ? gunFarki(son.visit_date) : null,
    son_ziyareti_yapan: son?.visitor_id ? adlar.get(son.visitor_id) ?? null : null,
    kullanicinin_son_ziyareti: benimSon?.visit_date ?? null,
    planlanan_ziyaretler: planli.slice(0, 5).map((z) => z.visit_date),
    sonraki_ziyaret: planli[0]?.visit_date ?? son?.next_visit_date ?? null,
    son_ziyaretler: gecmis.slice(0, Math.min(Math.max(limit, 1), 30)).map(satir),
  }
}

