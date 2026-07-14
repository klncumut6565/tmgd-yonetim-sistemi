"use client";

// Firmaya bağlı kayıtları yöneten ortak bileşen.
// Araçlar / Sürücüler / Personeller / Ziyaretler sayfaları bunu kullanır.
//
// Özellikler:
//  - Firma seçimi (önce firma seçilir, sonra o firmanın kayıtları gelir)
//  - Arama (girilen metne göre listeyi anlık filtreler)
//  - Ekleme + Düzenleme (aynı form, "düzenle" tıklanınca alanlar dolar)
//  - Silme (onaylı)
//
// Her sayfa kendi alan tanımlarını (FieldDef[]) ve tablo adını verir.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";

export type FieldType = "text" | "number" | "date" | "select" | "textarea";

export type FieldDef = {
  key: string;                 // veritabanı sütun adı
  label: string;               // ekranda görünen etiket
  type?: FieldType;            // varsayılan: text
  required?: boolean;          // zorunlu alan mı
  options?: { value: string; label: string }[]; // type=select için
  inTable?: boolean;           // listede sütun olarak gösterilsin mi (varsayılan true)
  defaultValue?: string;       // yeni kayıt formu açıldığında alanın ön dolu geleceği metin (örn. rapor şablonu)
  textareaRows?: number;       // type=textarea için satır sayısı (varsayılan 4)
};

type Firm = { id: string; name: string; activities?: string[] | null };
type Row = Record<string, unknown> & { id: string };

type Props = {
  table: string;               // supabase tablo adı (örn. "vehicles")
  title: string;               // sayfa başlığı
  fields: FieldDef[];          // form + tablo alanları
  searchKeys: string[];        // arama hangi alanlarda yapılsın
  orderBy?: string;            // sıralama alanı (varsayılan created_at)
  requireActivity?: string;    // yalnızca bu faaliyet konusuna sahip firmalar listelenir (örn. "tasimaci")
  fixedFirmId?: string;        // verilirse firma seçici gizlenir, kayıtlar sabit bu firmaya bağlanır
                                // (firma detay sayfasındaki sekmelerden gömülü kullanım için)
  compact?: boolean;           // true ise başlık (h1) ve firma seçici satırı gizlenir — üst düzey
                                // sayfa (örn. firma detay) kendi başlığını zaten gösteriyorsa kullan
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  inactive: "Pasif",
  sold: "Satıldı",
};

export default function FirmScopedCrud({
  table,
  title,
  fields,
  searchKeys,
  orderBy = "created_at",
  requireActivity,
  fixedFirmId,
  compact = false,
}: Props) {
  const { canWrite } = useUser();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [firmId, setFirmId] = useState(fixedFirmId || "");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // Form durumu
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const tableFields = fields.filter((f) => f.inTable !== false);

  async function loadFirms() {
    let { data, error } = await supabase
      .from("firms")
      .select("id, name, activities")
      .order("name");

    // "activities" kolonu henüz eklenmemişse (migration 010 çalıştırılmadıysa)
    // filtre uygulanamaz — tüm firmaları göster, kullanıcıyı bilgilendir.
    if (error && /does not exist/i.test(error.message || "")) {
      const retry = await supabase.from("firms").select("id, name").order("name");
      data = (retry.data || []).map((f) => ({ ...f, activities: null })) as typeof data;
      error = retry.error;
      if (!retry.error && requireActivity) {
        setError(
          "Faaliyet filtresi uygulanamadı — veritabanı güncellemesi (migration 010) henüz çalıştırılmamış."
        );
      }
    } else if (error) {
      setError("Firmalar yüklenemedi: " + hataCevir(error));
      return;
    }

    const list = requireActivity
      ? (data || []).filter((f) => (f.activities || []).includes(requireActivity))
      : data || [];

    setFirms(list);
    if (list.length > 0) {
      setFirmId((prev) => (prev && list.some((f) => f.id === prev) ? prev : list[0].id));
    } else {
      setFirmId("");
    }
  }

  async function loadRows(targetFirmId: string) {
    if (!targetFirmId) return;
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("firm_id", targetFirmId)
      .order(orderBy, { ascending: false });

    if (error) {
      setError("Kayıtlar yüklenemedi: " + hataCevir(error));
      setRows([]);
    } else {
      setRows((data as Row[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!fixedFirmId) loadFirms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (firmId) loadRows(firmId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmId]);

  // Arama filtresi (anlık, istemci tarafında)
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [rows, search, searchKeys]);

  function openCreateForm() {
    setEditingId(null);
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.defaultValue) initial[f.key] = f.defaultValue;
    });
    setForm(initial);
    setShowForm(true);
  }

  function openEditForm(row: Row) {
    setEditingId(row.id);
    const filled: Record<string, string> = {};
    fields.forEach((f) => {
      const v = row[f.key];
      filled[f.key] = v == null ? "" : String(v);
    });
    setForm(filled);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({});
  }

  async function saveForm() {
    setError("");

    // Zorunlu alan kontrolü
    for (const f of fields) {
      if (f.required && !form[f.key]?.trim()) {
        setError(`"${f.label}" alanı zorunlu.`);
        return;
      }
    }

    // Boş stringleri null'a çevir, sayıları dönüştür
    const payload: Record<string, unknown> = { firm_id: firmId };
    for (const f of fields) {
      const raw = form[f.key];
      if (raw === undefined || raw === "") {
        payload[f.key] = null;
      } else if (f.type === "number") {
        payload[f.key] = Number(raw);
      } else {
        payload[f.key] = raw;
      }
    }

    if (editingId) {
      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq("id", editingId);
      if (error) {
        setError("Güncellenemedi: " + hataCevir(error));
        return;
      }
    } else {
      const { error } = await supabase.from(table).insert(payload);
      if (error) {
        setError("Kaydedilemedi: " + hataCevir(error));
        return;
      }
    }

    closeForm();
    loadRows(firmId);
  }

  async function deleteRow(row: Row) {
    const onay = window.confirm("Bu kaydı silmek istediğine emin misin?");
    if (!onay) return;

    const { error } = await supabase.from(table).delete().eq("id", row.id);
    if (error) {
      setError("Silinemedi: " + hataCevir(error));
      return;
    }
    loadRows(firmId);
  }

  function renderCell(row: Row, f: FieldDef) {
    const v = row[f.key];
    if (v == null || v === "") return "—";
    if (f.key === "status") return STATUS_LABELS[String(v)] || String(v);
    if (f.type === "select" && f.options) {
      const opt = f.options.find((o) => o.value === String(v));
      return opt ? opt.label : String(v);
    }
    return String(v);
  }

  return (
    <div className={compact ? "" : "p-6"}>
      <div className="flex items-center justify-between mb-4">
        {!compact && <h1 className="text-3xl font-bold">{title}</h1>}
        {canWrite && (
          <button
            onClick={openCreateForm}
            disabled={!firmId}
            className={
              "bg-black text-white px-4 py-2 rounded disabled:opacity-40" +
              (compact ? " ml-auto" : "")
            }
          >
            + Yeni Ekle
          </button>
        )}
      </div>

      {/* Firma seçimi (sabit firmaya gömülüyse gizli) + arama */}
      <div className="flex flex-wrap gap-3 mb-4">
        {!fixedFirmId && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Firma</label>
            <select
              value={firmId}
              onChange={(e) => setFirmId(e.target.value)}
              className="border p-2 rounded min-w-[220px]"
            >
              {firms.length === 0 && (
                <option value="">
                  {requireActivity ? "Uygun faaliyette firma yok" : "Firma yok"}
                </option>
              )}
              {firms.map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1 min-w-[220px]">
          {!compact && <label className="block text-sm text-gray-600 mb-1">Ara</label>}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Listede ara..."
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tablo */}
      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {tableFields.map((f) => (
                <th key={f.key} className="text-left p-3 font-medium">
                  {f.label}
                </th>
              ))}
              {canWrite && (
                <th className="text-right p-3 font-medium">İşlemler</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={tableFields.length + (canWrite ? 1 : 0)} className="p-4 text-gray-500">
                  Yükleniyor...
                </td>
              </tr>
            )}

            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={tableFields.length + (canWrite ? 1 : 0)} className="p-4 text-gray-500">
                  {!firmId
                    ? requireActivity && firms.length === 0
                      ? "Bu faaliyet konusuna sahip firma bulunamadı. Firma faaliyet konularını Firmalar sayfasından düzenleyebilirsin."
                      : "Önce bir firma seç."
                    : canWrite
                      ? "Kayıt bulunamadı. Sağ üstten yeni ekleyebilirsin."
                      : "Kayıt bulunamadı."}
                </td>
              </tr>
            )}

            {!loading &&
              filteredRows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  {tableFields.map((f) => (
                    <td key={f.key} className="p-3">
                      {renderCell(row, f)}
                    </td>
                  ))}
                  {canWrite && (
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEditForm(row)}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => deleteRow(row)}
                        className="text-red-600 hover:underline"
                      >
                        Sil
                      </button>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Ekle/Düzenle formu (basit modal) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? "Kaydı Düzenle" : "Yeni Kayıt"}
            </h2>

            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-600 mb-1">
                    {f.label}
                    {f.required && <span className="text-red-500"> *</span>}
                  </label>

                  {f.type === "select" ? (
                    <select
                      value={form[f.key] || ""}
                      onChange={(e) =>
                        setForm({ ...form, [f.key]: e.target.value })
                      }
                      className="border p-2 rounded w-full"
                    >
                      <option value="">Seçiniz</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      rows={f.textareaRows || 10}
                      value={form[f.key] || ""}
                      onChange={(e) =>
                        setForm({ ...form, [f.key]: e.target.value })
                      }
                      className="border p-2 rounded w-full font-mono text-xs"
                    />
                  ) : (
                    <input
                      type={
                        f.type === "date"
                          ? "date"
                          : f.type === "number"
                          ? "number"
                          : "text"
                      }
                      value={form[f.key] || ""}
                      onChange={(e) =>
                        setForm({ ...form, [f.key]: e.target.value })
                      }
                      className="border p-2 rounded w-full"
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-3 rounded bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded border"
              >
                Vazgeç
              </button>
              <button
                onClick={saveForm}
                className="px-4 py-2 rounded bg-black text-white"
              >
                {editingId ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
