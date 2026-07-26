// src/app/audit-log/page.tsx
// Yonetim -> Denetim Izi
// Hash-chain audit log goruntuleyicisi. Sadece super_admin.

'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'

type AuditRow = {
  id: number
  ts: string
  actor_email: string | null
  actor_role: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id: string
  firm_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  prev_hash: string
  row_hash: string
}

type VerifyResult = {
  chain_intact: boolean
  broken_count: number
  broken_entries: unknown[]
  checked_at: string
}

const PAGE_SIZE = 100

export default function AuditLogPage() {
  const { isSuperAdmin, loading: userLoading } = useUser()

  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState<number | null>(null)

  const [filterTable, setFilterTable] = useState('')
  const [filterFirm, setFilterFirm] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null)
  const [verifying, setVerifying] = useState(false)

  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    async function loadRows() {
      setLoading(true)
      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('id', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filterTable) query = query.eq('table_name', filterTable)
      if (filterFirm) query = query.eq('firm_id', filterFirm)
      if (filterFrom) query = query.gte('ts', filterFrom)
      if (filterTo) query = query.lte('ts', filterTo)

      const { data, count, error } = await query
      if (error) {
        console.error('Audit log yukleme hatasi:', error)
        setRows([])
      } else {
        setRows((data ?? []) as AuditRow[])
        setTotalCount(count ?? null)
      }
      setLoading(false)
    }
    loadRows()
  }, [page, filterTable, filterFirm, filterFrom, filterTo])

  async function runVerify() {
    setVerifying(true)
    try {
      const res = await fetch('/api/audit/verify')
      const json = (await res.json()) as VerifyResult | { error: string }
      if ('error' in json) {
        console.error('Verify hatasi:', json.error)
        setVerifyResult(null)
      } else {
        setVerifyResult(json)
      }
    } finally {
      setVerifying(false)
    }
  }

  function exportCsv() {
    const params = new URLSearchParams({ format: 'csv' })
    if (filterTable) params.set('table', filterTable)
    if (filterFirm) params.set('firm_id', filterFirm)
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)
    window.location.href = `/api/audit/export?${params.toString()}`
  }

  const actionColor = (a: string) =>
    a === 'INSERT' ? 'text-green-700 bg-green-50'
      : a === 'UPDATE' ? 'text-blue-700 bg-blue-50'
        : 'text-red-700 bg-red-50'

  const totalPages = useMemo(
    () => (totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 1),
    [totalCount]
  )

  if (userLoading) {
    return <div className="p-6 text-gray-500">Yükleniyor...</div>
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Bu sayfaya erişim yetkin yok.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Denetim İzi (Audit Log)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kritik tablolarda yapılan tüm değişikliklerin kriptografik zinciri
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runVerify}
            disabled={verifying}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {verifying ? 'Doğrulanıyor…' : 'Zincir Bütünlüğünü Doğrula'}
          </button>
          <button
            onClick={exportCsv}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
          >
            CSV İndir
          </button>
        </div>
      </div>

      {verifyResult && (
        <div
          className={
            'mb-4 p-4 rounded border ' +
            (verifyResult.chain_intact
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900')
          }
        >
          {verifyResult.chain_intact ? (
            <div>
              <strong>✅ Zincir sağlam.</strong> Denetim izinde manipülasyon
              tespit edilmedi. ({new Date(verifyResult.checked_at).toLocaleString('tr-TR')})
            </div>
          ) : (
            <div>
              <strong>⚠️ Zincir kırılmış!</strong> {verifyResult.broken_count} noktada
              hash uyumsuzluğu var. Detaylar için sistem yöneticisiyle iletişime geçin.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 rounded">
        <input
          type="text"
          placeholder="Tablo (örn. firms)"
          value={filterTable}
          onChange={(e) => { setPage(0); setFilterTable(e.target.value) }}
          className="px-3 py-2 border rounded text-sm"
        />
        <input
          type="text"
          placeholder="Firma ID"
          value={filterFirm}
          onChange={(e) => { setPage(0); setFilterFirm(e.target.value) }}
          className="px-3 py-2 border rounded text-sm"
        />
        <input
          type="datetime-local"
          value={filterFrom}
          onChange={(e) => { setPage(0); setFilterFrom(e.target.value) }}
          className="px-3 py-2 border rounded text-sm"
        />
        <input
          type="datetime-local"
          value={filterTo}
          onChange={(e) => { setPage(0); setFilterTo(e.target.value) }}
          className="px-3 py-2 border rounded text-sm"
        />
      </div>

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2 w-16">#</th>
              <th className="px-3 py-2 w-40">Zaman</th>
              <th className="px-3 py-2 w-24">İşlem</th>
              <th className="px-3 py-2">Tablo / Kayıt</th>
              <th className="px-3 py-2">Kullanıcı</th>
              <th className="px-3 py-2 w-24">Detay</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">Kayıt yok.</td></tr>
            ) : (
              rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(r.ts).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-3 py-2">
                      <span className={'px-2 py-0.5 rounded text-xs font-medium ' + actionColor(r.action)}>
                        {r.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.table_name} / {r.record_id}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.actor_email ?? '—'}{' '}
                      <span className="text-gray-400">({r.actor_role ?? '—'})</span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        className="text-indigo-600 hover:underline text-xs"
                      >
                        {expandedId === r.id ? 'Gizle' : 'Diff'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-3 py-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="font-semibold mb-1 text-gray-600">Eski:</div>
                            <pre className="bg-white p-2 rounded border overflow-auto max-h-64">
                              {r.old_data ? JSON.stringify(r.old_data, null, 2) : '—'}
                            </pre>
                          </div>
                          <div>
                            <div className="font-semibold mb-1 text-gray-600">Yeni:</div>
                            <pre className="bg-white p-2 rounded border overflow-auto max-h-64">
                              {r.new_data ? JSON.stringify(r.new_data, null, 2) : '—'}
                            </pre>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 font-mono break-all">
                          <div>prev_hash: {r.prev_hash}</div>
                          <div>row_hash: {r.row_hash}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="text-gray-500">
          {totalCount !== null && `Toplam ${totalCount.toLocaleString('tr-TR')} kayıt`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            ← Önceki
          </button>
          <span className="px-3 py-1">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) >= totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Sonraki →
          </button>
        </div>
      </div>
    </div>
  )
}
