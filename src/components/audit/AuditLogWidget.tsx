"use client";

// Dashboard'da admin/super_admin icin gosterilen son sistem degisiklikleri widget'i.
// Migration 024 (database/migrations/024_audit_log.sql) calistirilmadiysa
// tablo yoktur ve widget sessizce gizlenir.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/supabase/authFetch";
import { useUser } from "@/hooks/useUser";

type AuditRow = {
  id: number;
  ts: string;
  actor_email: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  record_id: string;
};

const TABLE_TR: Record<string, string> = {
  firms: "Firma",
  tasks: "Görev",
  documents: "Belge",
  files: "Dosya",
  vehicles: "Araç",
  drivers: "Sürücü",
  employees: "Personel",
  visits: "Ziyaret",
  notifications: "Bildirim",
  user_roles: "Rol",
  firm_belgeleri: "Belge Takip",
  firm_belge_dosyalari: "Belge Takip Dosyası",
  firm_arac_evraklari: "Araç Evrakı",
  firm_surucu_listesi: "Sürücü Listesi",
  firm_gorevli_listesi: "Görevli Listesi",
  firm_chemicals: "Kimyasal Envanter",
  firm_consignees: "Alıcı Firma",
  firm_notes: "Firma Notu",
  transport_documents: "Taşıma Evrakı",
  transport_document_items: "Taşıma Evrakı Kalemi",
  kayit_dosyalari: "Kayıt Dosyası",
};

const ACTION_TR: Record<string, string> = {
  INSERT: "Ekledi",
  UPDATE: "Güncelledi",
  DELETE: "Sildi",
};

const ACTION_COLOR: Record<string, string> = {
  INSERT: "text-green-700",
  UPDATE: "text-blue-700",
  DELETE: "text-red-700",
};

function timeAgo(ts: string): string {
  const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (seconds < 60) return "az önce";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dk önce`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} sa önce`;
  return `${Math.floor(seconds / 86400)} gün önce`;
}

export default function AuditLogWidget() {
  const { isSuperAdmin } = useUser();
  const canSee = isSuperAdmin;

  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [chainOk, setChainOk] = useState<boolean | null>(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canSee) return;

    async function load() {
      // Son 5 kayıt (__genesis__ hariç)
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, ts, actor_email, action, table_name, record_id")
        .neq("table_name", "__genesis__")
        .order("id", { ascending: false })
        .limit(5);

      if (error) {
        // Migration çalıştırılmamışsa tablo yoktur — sessizce gizle
        setAvailable(false);
        setLoading(false);
        return;
      }

      setRows((data ?? []) as AuditRow[]);

      // Zincir bütünlüğü — /api/audit/verify çağrısı
      try {
        const res = await authFetch("/api/audit/verify");
        if (res.ok) {
          const json = await res.json();
          setChainOk(Boolean(json.chain_intact));
        }
      } catch {
        // sessiz
      }

      setLoading(false);
    }

    load();
  }, [canSee]);

  if (!canSee) return null;
  if (!available) return null; // Migration yoksa görünmez

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🔒 Son Sistem Değişiklikleri
          {chainOk === true && (
            <span
              title="Zincir sağlam"
              className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded"
            >
              ✅ Zincir sağlam
            </span>
          )}
          {chainOk === false && (
            <span
              title="Zincir kırılmış"
              className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded"
            >
              ⚠️ Zincir kırılmış
            </span>
          )}
        </h2>
        <Link
          href="/audit-log"
          className="text-sm text-indigo-600 hover:underline"
        >
          Tümünü Gör →
        </Link>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium text-gray-600">Zaman</th>
              <th className="text-left p-3 font-medium text-gray-600">Kullanıcı</th>
              <th className="text-left p-3 font-medium text-gray-600">İşlem</th>
              <th className="text-left p-3 font-medium text-gray-600">Nesne</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="p-4 text-gray-500">Yükleniyor...</td></tr>
            )}
            {!loading && (rows === null || rows.length === 0) && (
              <tr><td colSpan={4} className="p-4 text-gray-500">Henüz kayıt yok.</td></tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 text-gray-500 whitespace-nowrap">{timeAgo(r.ts)}</td>
                <td className="p-3 text-xs">{r.actor_email ?? "—"}</td>
                <td className={"p-3 font-medium " + (ACTION_COLOR[r.action] ?? "")}>
                  {ACTION_TR[r.action] ?? r.action}
                </td>
                <td className="p-3 text-xs font-mono text-gray-600">
                  {TABLE_TR[r.table_name] ?? r.table_name} / {r.record_id.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
