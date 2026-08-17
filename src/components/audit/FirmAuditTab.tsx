"use client";

// Firma detay sayfasi icin firma-bazli Denetim Izi sekmesi.
// Global /audit-log sayfasinin ayni verisi ama sadece bu firma_id'ye
// filtrelenmis, sekme icine gomulu, kompakt hali.
//
// RLS zaten audit_log'u yalnizca super_admin/admin'e actigi icin bu
// bilesen digger roller icin bos gelir — ayrica bir yetki kontrolu
// gerekmez, ama gereksiz sorguyu onlemek icin ust bilesen (page.tsx)
// bu sekmeyi zaten sadece admin/super_admin'e gosterir.

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type AuditRow = {
  id: number;
  ts: string;
  actor_email: string | null;
  actor_role: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  record_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
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
  INSERT: "Eklendi",
  UPDATE: "Güncellendi",
  DELETE: "Silindi",
};

const ACTION_COLOR: Record<string, string> = {
  INSERT: "text-green-700 bg-green-50",
  UPDATE: "text-blue-700 bg-blue-50",
  DELETE: "text-red-700 bg-red-50",
};

export default function FirmAuditTab({ firmId }: { firmId: string }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, ts, actor_email, actor_role, action, table_name, record_id, old_data, new_data")
        .eq("firm_id", firmId)
        .order("id", { ascending: false })
        .limit(200);

      if (error) {
        // Migration calistirilmamissa veya RLS engelliyorsa sessizce gizle
        setAvailable(false);
        setLoading(false);
        return;
      }

      setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    }
    load();
  }, [firmId]);

  if (!available) {
    return (
      <p className="text-sm text-gray-400">
        Denetim izi bu firma için görüntülenemiyor (yetki veya sistem güncellemesi gerekebilir).
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">🔒 Denetim İzi</h2>
          <p className="text-sm text-gray-500">
            Bu firmaya ait kayıtlarda yapılan tüm değişiklikler
          </p>
        </div>
        <Link href="/audit-log" className="text-sm text-indigo-600 hover:underline">
          Genel Denetim İzi →
        </Link>
      </div>

      {loading && <p className="text-gray-500">Yükleniyor...</p>}

      {!loading && rows.length === 0 && (
        <div className="border rounded-xl p-8 text-center text-gray-400">
          Bu firmaya ait henüz kaydedilmiş bir değişiklik yok.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Zaman</th>
                <th className="text-left p-3 font-medium text-gray-600">İşlem</th>
                <th className="text-left p-3 font-medium text-gray-600">Nesne</th>
                <th className="text-left p-3 font-medium text-gray-600">Kullanıcı</th>
                <th className="text-left p-3 font-medium text-gray-600 w-20">Detay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-t hover:bg-gray-50">
                    <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(r.ts).toLocaleString("tr-TR")}
                    </td>
                    <td className="p-3">
                      <span className={"px-2 py-0.5 rounded text-xs font-medium " + (ACTION_COLOR[r.action] ?? "")}>
                        {ACTION_TR[r.action] ?? r.action}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono">
                      {TABLE_TR[r.table_name] ?? r.table_name} / {r.record_id.slice(0, 8)}
                    </td>
                    <td className="p-3 text-xs">{r.actor_email ?? "—"}</td>
                    <td className="p-3">
                      <button
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        className="text-indigo-600 hover:underline text-xs"
                      >
                        {expandedId === r.id ? "Gizle" : "Gör"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="p-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="font-semibold mb-1 text-gray-600">Eski:</div>
                            <pre className="bg-white p-2 rounded border overflow-auto max-h-48">
                              {r.old_data ? JSON.stringify(r.old_data, null, 2) : "—"}
                            </pre>
                          </div>
                          <div>
                            <div className="font-semibold mb-1 text-gray-600">Yeni:</div>
                            <pre className="bg-white p-2 rounded border overflow-auto max-h-48">
                              {r.new_data ? JSON.stringify(r.new_data, null, 2) : "—"}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
