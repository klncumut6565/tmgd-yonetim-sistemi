"use client";

// DASHBOARD V2 (ROADMAP T-025 / T-026 / T-079)
//  - KPI kartları: Firma, Açık Görev, Belge, Araç
//  - Yaklaşan ADR Süreleri: schema.sql'deki hazır view'lar
//    (adr_expiring_drivers / adr_expiring_vehicles) kullanılır
//  - Son Görevler listesi
// Not: view'ların RLS'e saygı duyması için database/003_view_guvenligi.sql
// çalıştırılmış olmalı (security_invoker).

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Counts = {
  firms: number;
  openTasks: number;
  documents: number;
  vehicles: number;
};

type ExpiringDriver = {
  id: string;
  first_name: string;
  last_name: string;
  adr_valid_until: string;
  firm_name: string;
};

type ExpiringVehicle = {
  id: string;
  plate_number: string;
  adr_valid_until: string;
  firm_name: string;
};

type RecentTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  firms: { name: string } | null;
};

const STATUS_TR: Record<string, string> = {
  todo: "Yapılacak",
  in_progress: "Devam Ediyor",
  review: "Kontrolde",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const PRIORITY_TR: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
};

function daysLeft(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function DaysBadge({ date }: { date: string }) {
  const d = daysLeft(date);
  const label = d < 0 ? `${Math.abs(d)} gün geçti` : d === 0 ? "Bugün" : `${d} gün kaldı`;
  const cls =
    d < 0
      ? "bg-gray-800 text-white"
      : d <= 7
        ? "bg-amber-100 text-amber-800"
        : "bg-gray-100 text-gray-700";
  return <span className={"px-2 py-0.5 rounded text-xs whitespace-nowrap " + cls}>{label}</span>;
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts>({ firms: 0, openTasks: 0, documents: 0, vehicles: 0 });
  const [drivers, setDrivers] = useState<ExpiringDriver[]>([]);
  const [vehicles, setVehicles] = useState<ExpiringVehicle[]>([]);
  const [tasks, setTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [firmRes, taskRes, docRes, vehRes, expDrvRes, expVehRes, recentRes] =
        await Promise.all([
          supabase.from("firms").select("*", { count: "exact", head: true }),
          supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .in("status", ["todo", "in_progress", "review"]),
          supabase.from("documents").select("*", { count: "exact", head: true }),
          supabase.from("vehicles").select("*", { count: "exact", head: true }),
          supabase
            .from("adr_expiring_drivers")
            .select("*")
            .order("adr_valid_until")
            .limit(8),
          supabase
            .from("adr_expiring_vehicles")
            .select("*")
            .order("adr_valid_until")
            .limit(8),
          supabase
            .from("tasks")
            .select("id, title, status, priority, due_date, firms ( name )")
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

      setCounts({
        firms: firmRes.count || 0,
        openTasks: taskRes.count || 0,
        documents: docRes.count || 0,
        vehicles: vehRes.count || 0,
      });
      setDrivers((expDrvRes.data as ExpiringDriver[]) || []);
      setVehicles((expVehRes.data as ExpiringVehicle[]) || []);
      setTasks((recentRes.data as unknown as RecentTask[]) || []);
      setLoading(false);
    }

    load();
  }, []);

  const kpis = [
    { label: "Firmalar", value: counts.firms, href: "/firms" },
    { label: "Açık Görevler", value: counts.openTasks, href: "/tasks" },
    { label: "Belgeler", value: counts.documents, href: "/documents" },
    { label: "Araçlar", value: counts.vehicles, href: "/vehicles" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* KPI kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="border rounded-xl p-4 hover:shadow-sm hover:border-gray-400 transition"
          >
            <h2 className="text-sm text-gray-500">{k.label}</h2>
            <p className="text-3xl font-bold mt-1">{loading ? "…" : k.value}</p>
          </Link>
        ))}
      </div>

      {/* Yaklaşan ADR süreleri — yan yana iki kolon */}
      <h2 className="text-xl font-bold mb-3">Yaklaşan ADR Süreleri (30 gün)</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="border rounded-xl p-4">
          <h3 className="font-medium text-gray-600 mb-3">Sürücü Sertifikaları</h3>
          {loading && <p className="text-sm text-gray-500">Yükleniyor...</p>}
          {!loading && drivers.length === 0 && (
            <p className="text-sm text-gray-500">30 gün içinde süresi dolan sürücü sertifikası yok. ✓</p>
          )}
          <ul className="space-y-2">
            {drivers.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {d.first_name} {d.last_name}
                  <span className="text-gray-400"> · {d.firm_name}</span>
                </span>
                <DaysBadge date={d.adr_valid_until} />
              </li>
            ))}
          </ul>
        </div>

        <div className="border rounded-xl p-4">
          <h3 className="font-medium text-gray-600 mb-3">Araç ADR Belgeleri</h3>
          {loading && <p className="text-sm text-gray-500">Yükleniyor...</p>}
          {!loading && vehicles.length === 0 && (
            <p className="text-sm text-gray-500">30 gün içinde süresi dolan araç belgesi yok. ✓</p>
          )}
          <ul className="space-y-2">
            {vehicles.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {v.plate_number}
                  <span className="text-gray-400"> · {v.firm_name}</span>
                </span>
                <DaysBadge date={v.adr_valid_until} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Son görevler */}
      <h2 className="text-xl font-bold mb-3">Son Görevler</h2>
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium text-gray-600">Görev</th>
              <th className="text-left p-3 font-medium text-gray-600">Firma</th>
              <th className="text-left p-3 font-medium text-gray-600">Durum</th>
              <th className="text-left p-3 font-medium text-gray-600">Öncelik</th>
              <th className="text-left p-3 font-medium text-gray-600">Termin</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-4 text-gray-500">Yükleniyor...</td>
              </tr>
            )}
            {!loading && tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-gray-500">Henüz görev yok.</td>
              </tr>
            )}
            {tasks.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{t.title}</td>
                <td className="p-3 text-gray-500">{t.firms?.name || "—"}</td>
                <td className="p-3">{STATUS_TR[t.status] || t.status}</td>
                <td className="p-3">{PRIORITY_TR[t.priority] || t.priority}</td>
                <td className="p-3">{t.due_date || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
