"use client";

// GÖREVLER — Kanban görünümü
//  - Görev oluşturma (mevcut)
//  - YENİ: ✓ Tamamla (hızlı aksiyon, completed_at damgası atar)
//  - YENİ: ✎ Düzenle (başlık, açıklama, öncelik, termin, durum)
//  - YENİ: 🗑 Sil (onaylı)
//  - YENİ: Durum değiştir (kolonlar arası taşımak için select)

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  firm_id: string;
};

type Firm = {
  id: string;
  name: string;
};

const columns = ["todo", "in_progress", "review", "completed"] as const;

const columnLabels: Record<string, string> = {
  todo: "Yapılacaklar",
  in_progress: "Devam Edenler",
  review: "Kontrol Bekleyenler",
  completed: "Tamamlananlar",
  cancelled: "İptal Edilenler",
};

const priorityLabels: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
};

const priorityColor: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  critical: "bg-red-50 text-red-700",
};

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === "completed" || task.status === "cancelled") return false;
  return new Date(task.due_date) < new Date(new Date().toDateString());
}

export default function TasksPage() {
  const { canWrite } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [title, setTitle] = useState("");
  const [firmId, setFirmId] = useState("");
  const [error, setError] = useState("");

  // Düzenleme modalı
  const [editing, setEditing] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Firma adına hızlı erişim (kart üstünde göstermek için)
  const firmName = useMemo(() => {
    const map: Record<string, string> = {};
    firms.forEach((f) => (map[f.id] = f.name));
    return map;
  }, [firms]);

  async function loadTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError("Görevler yüklenemedi: " + hataCevir(error));
    setTasks((data as Task[]) || []);
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

  async function setStatus(task: Task, status: string) {
    const patch: Record<string, unknown> = { status };
    // Tamamlandı işaretlenince zaman damgası at; başka duruma dönülürse temizle
    patch.completed_at = status === "completed" ? new Date().toISOString() : null;

    const { error } = await supabase.from("tasks").update(patch).eq("id", task.id);
    if (error) {
      // TEŞHİS: "yetkin yok" hatası tekrarlıyorsa, sebebi tam olarak görmek için
      // is_super_admin()/is_admin() fonksiyonlarını ve profil satırını GEÇERLİ
      // OTURUMLA (SQL Editor'de mümkün olmayan şekilde) sorgula.
      let teshis = "";
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id;
        const [{ data: isSuper }, { data: isAdm }, { data: profil }, { data: uf }] = await Promise.all([
          supabase.rpc("is_super_admin"),
          supabase.rpc("is_admin"),
          uid ? supabase.from("profiles").select("id, role, approval_status, is_active").eq("id", uid).maybeSingle() : Promise.resolve({ data: null }),
          supabase.from("user_firms").select("firm_id").eq("firm_id", task.firm_id),
        ]);
        teshis = ` [TEŞHİS: is_super_admin()=${isSuper} is_admin()=${isAdm} profil.role=${profil?.role ?? "?"} onay=${profil?.approval_status ?? "?"} aktif=${profil?.is_active ?? "?"} bu_firmaya_atanma_sayısı=${uf?.length ?? "?"}]`;
      } catch {
        teshis = " [TEŞHİS: teşhis sorguları da başarısız oldu]";
      }
      setError("Durum güncellenemedi: " + hataCevir(error) + teshis);
      return;
    }
    loadTasks();
  }

  async function deleteTask(task: Task) {
    const ok = window.confirm(`"${task.title}" görevini silmek istediğine emin misin?`);
    if (!ok) return;

    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      setError("Silinemedi: " + hataCevir(error));
      return;
    }
    loadTasks();
  }

  function openEdit(task: Task) {
    setEditing(task);
    setEditForm(task);
    setError("");
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);

    const patch = {
      title: editForm.title,
      description: editForm.description || null,
      priority: editForm.priority,
      status: editForm.status,
      due_date: editForm.due_date || null,
      completed_at:
        editForm.status === "completed"
          ? editing.completed_at || new Date().toISOString()
          : null,
    };

    const { error } = await supabase.from("tasks").update(patch).eq("id", editing.id);
    setSavingEdit(false);

    if (error) {
      setError("Kaydedilemedi: " + hataCevir(error));
      return;
    }
    setEditing(null);
    loadTasks();
  }

  useEffect(() => {
    loadFirms();
    loadTasks();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Görevler</h1>

      {error && (
        <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          {error}
        </p>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column}>
            <h2 className="font-bold mb-3 flex items-center gap-2">
              {columnLabels[column]}
              <span className="text-xs font-normal text-gray-400">
                ({tasks.filter((t) => t.status === column).length})
              </span>
            </h2>

            <div className="space-y-2">
              {tasks
                .filter((t) => t.status === column)
                .map((task) => (
                  <div
                    key={task.id}
                    className={
                      "border rounded-lg p-3 bg-white " +
                      (isOverdue(task) ? "border-red-300" : "")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={
                          "text-sm font-medium " +
                          (column === "completed" ? "line-through text-gray-400" : "")
                        }
                      >
                        {task.title}
                      </p>
                      <span
                        className={
                          "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded " +
                          (priorityColor[task.priority] || "bg-gray-100")
                        }
                      >
                        {priorityLabels[task.priority] || task.priority}
                      </span>
                    </div>

                    {firmName[task.firm_id] && (
                      <p className="text-xs text-gray-400 mt-1">{firmName[task.firm_id]}</p>
                    )}

                    {task.due_date && (
                      <p className={"text-xs mt-1 " + (isOverdue(task) ? "text-red-500 font-medium" : "text-gray-400")}>
                        Termin: {new Date(task.due_date).toLocaleDateString("tr-TR")}
                        {isOverdue(task) && " — gecikti"}
                      </p>
                    )}

                    {task.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                    )}

                    {canWrite && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                        {column !== "completed" && (
                          <button
                            onClick={() => setStatus(task, "completed")}
                            title="Tamamlandı olarak işaretle"
                            className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            ✓ Tamamla
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(task)}
                          title="Düzenle"
                          className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                        >
                          ✎ Düzenle
                        </button>
                        <button
                          onClick={() => deleteTask(task)}
                          title="Sil"
                          className="text-xs px-2 py-1 rounded border text-red-500 hover:bg-red-50 ml-auto"
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                ))}

              {tasks.filter((t) => t.status === column).length === 0 && (
                <p className="text-xs text-gray-300 italic">Görev yok</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* DÜZENLEME MODALI */}
      {editing && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-lg">Görevi Düzenle</h2>

            <label className="block">
              <span className="text-sm text-gray-600">Başlık</span>
              <input
                className="border p-2 w-full rounded mt-1"
                value={editForm.title || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-600">Açıklama</span>
              <textarea
                className="border p-2 w-full rounded mt-1"
                rows={3}
                value={editForm.description || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-gray-600">Öncelik</span>
                <select
                  className="border p-2 w-full rounded mt-1"
                  value={editForm.priority || "medium"}
                  onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                >
                  {Object.entries(priorityLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">Durum</span>
                <select
                  className="border p-2 w-full rounded mt-1"
                  value={editForm.status || "todo"}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {[...columns, "cancelled"].map((c) => (
                    <option key={c} value={c}>
                      {columnLabels[c]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-gray-600">Termin Tarihi</span>
              <input
                type="date"
                className="border p-2 w-full rounded mt-1"
                value={editForm.due_date || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </label>

            <div className="flex gap-2 pt-2">
              <button
                onClick={saveEdit}
                disabled={savingEdit || !editForm.title?.trim()}
                className="flex-1 px-4 py-2 rounded bg-black text-white disabled:opacity-50"
              >
                {savingEdit ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded border"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
