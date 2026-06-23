"use client";

// Bu sayfa TESLİMAT 015 (statik kart iskeleti) ile TESLİMAT 018'de
// verilen gerçek Supabase count() sorguları birleştirilerek oluşturuldu.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type DashboardCounts = {
  firmCount: number;
  taskCount: number;
  documentCount: number;
  vehicleCount: number;
};

export default function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>({
    firmCount: 0,
    taskCount: 0,
    documentCount: 0,
    vehicleCount: 0,
  });
  const [loading, setLoading] = useState(true);

  async function loadCounts() {
    const { count: firmCount } = await supabase
      .from("firms")
      .select("*", { count: "exact", head: true });

    const { count: taskCount } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true });

    const { count: documentCount } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true });

    const { count: vehicleCount } = await supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true });

    setCounts({
      firmCount: firmCount || 0,
      taskCount: taskCount || 0,
      documentCount: documentCount || 0,
      vehicleCount: vehicleCount || 0,
    });
    setLoading(false);
  }

  useEffect(() => {
    loadCounts();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-xl p-4">
          <h2>Firmalar</h2>
          <p className="text-3xl font-bold">
            {loading ? "..." : counts.firmCount}
          </p>
        </div>

        <div className="border rounded-xl p-4">
          <h2>Açık Görevler</h2>
          <p className="text-3xl font-bold">
            {loading ? "..." : counts.taskCount}
          </p>
        </div>

        <div className="border rounded-xl p-4">
          <h2>Belgeler</h2>
          <p className="text-3xl font-bold">
            {loading ? "..." : counts.documentCount}
          </p>
        </div>

        <div className="border rounded-xl p-4">
          <h2>Araçlar</h2>
          <p className="text-3xl font-bold">
            {loading ? "..." : counts.vehicleCount}
          </p>
        </div>
      </div>
    </div>
  );
}
