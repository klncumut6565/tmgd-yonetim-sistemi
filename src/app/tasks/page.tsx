"use client";

// TESLİMAT 021 (liste + görev oluşturma) ile TESLİMAT 022'de verilen
// Kanban kolon yapısı burada birleştirildi.
//
// ⚠️ DÜZELTME: Kaynaktaki orijinal createTask() hiçbir zaman firm_id
// göndermiyordu. database/schema.sql'de tasks.firm_id `not null` olduğu
// için bu insert HER ZAMAN hata verirdi. Burada bir firma seçimi
// eklenerek gerçek bir foreign key gönderilmesi sağlandı.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  firm_id: string;
};

type Firm = {
  id: string;
  name: string;
};

const columns = ["todo", "in_progress", "review", "completed"];

const columnLabels: Record<string, string> = {
  todo: "Yapılacaklar",
  in_progress: "Devam Edenler",
  review: "Kontrol Bekleyenler",
  completed: "Tamamlananlar",
};

export default function TasksPage() {
  const { canWrite } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [title, setTitle] = useState("");
  const [firmId, setFirmId] = useState("");

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    setTasks(data || []);
  }

  async function loadFirms() {
    const { data } = await supabase.from("firms").select("id, name").order("name");
    setFirms(data || []);
    if (data && data.length > 0 && !firmId) {
      setFirmId(data[0].id);
    }
  }

  async function createTask() {
    if (!title) return;

    if (!firmId) {
      alert("Görev oluşturmak için önce bir firma seçmelisin.");
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      title,
      status: "todo",
      priority: "medium",
      firm_id: firmId,
    });

    if (error) {
      alert(hataCevir(error));
      return;
    }

    setTitle("");
    loadTasks();
  }

  useEffect(() => {
    loadFirms();
    loadTasks();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Görevler</h1>

      <div className="mb-8 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Firma</label>
          <select
            value={firmId}
            onChange={(e) => setFirmId(e.target.value)}
            className="border p-2 rounded min-w-[200px]"
          >
            {firms.length === 0 && <option value="">Firma yok</option>}
            {firms.map((firm) => (
              <option key={firm.id} value={firm.id}>
                {firm.name}
              </option>
            ))}
          </select>
        </div>

        {canWrite && (
          <>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-600 mb-1">Yeni Görev</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border p-2 rounded w-full"
                placeholder="Görev adı..."
                onKeyDown={(e) => e.key === "Enter" && createTask()}
              />
            </div>
            <button
              onClick={createTask}
              disabled={!title.trim() || !firmId}
              className="bg-black text-white px-4 py-2 rounded disabled:opacity-40"
            >
              + Oluştur
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column}>
            <h2 className="font-bold mb-3">{columnLabels[column]}</h2>

            <div className="space-y-2">
              {tasks
                .filter((t) => t.status === column)
                .map((task) => (
                  <div
                    key={task.id}
                    className="border rounded-lg p-3 bg-white"
                  >
                    {task.title}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
