"use client";

// FİRMA DETAY — Sekmeli yapı (ROADMAP T-027)
// ⚠️ DÜZELTME: Önceki sürüm server component içinde tarayıcı supabase
// client'ını kullanıyordu; oturum çerezi server'a taşınmadığı için RLS
// sorguyu anonim sayıyor ve firma detayı HER ZAMAN boş geliyordu.
// Sayfa client component'e çevrildi, sorgular artık oturumla çalışıyor.

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";

type Firm = {
  id: string;
  name: string;
  tax_number: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
};

type Row = Record<string, unknown> & { id: string };

const TABS = [
  { key: "genel", label: "Genel" },
  { key: "tasks", label: "Görevler" },
  { key: "documents", label: "Belgeler" },
  { key: "vehicles", label: "Araçlar" },
  { key: "drivers", label: "Sürücüler" },
  { key: "employees", label: "Personeller" },
  { key: "visits", label: "Ziyaretler" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// Her sekmenin listede göstereceği kolonlar
const TAB_COLUMNS: Record<string, { key: string; label: string }[]> = {
  tasks: [
    { key: "title", label: "Görev" },
    { key: "status", label: "Durum" },
    { key: "priority", label: "Öncelik" },
    { key: "due_date", label: "Termin" },
  ],
  documents: [
    { key: "title", label: "Belge" },
    { key: "status", label: "Durum" },
    { key: "current_version", label: "Versiyon" },
  ],
  vehicles: [
    { key: "plate_number", label: "Plaka" },
    { key: "brand", label: "Marka" },
    { key: "adr_valid_until", label: "ADR Geçerlilik" },
    { key: "status", label: "Durum" },
  ],
  drivers: [
    { key: "first_name", label: "Ad" },
    { key: "last_name", label: "Soyad" },
    { key: "adr_certificate_no", label: "ADR Belge No" },
    { key: "adr_valid_until", label: "ADR Geçerlilik" },
  ],
  employees: [
    { key: "first_name", label: "Ad" },
    { key: "last_name", label: "Soyad" },
    { key: "department", label: "Departman" },
    { key: "position", label: "Pozisyon" },
  ],
  visits: [
    { key: "visit_date", label: "Tarih" },
    { key: "visit_type", label: "Tür" },
    { key: "summary", label: "Özet" },
    { key: "next_visit_date", label: "Sonraki Ziyaret" },
  ],
};

const ORDER_BY: Record<string, string> = {
  tasks: "created_at",
  documents: "created_at",
  vehicles: "created_at",
  drivers: "created_at",
  employees: "created_at",
  visits: "visit_date",
};

const TR_VALUES: Record<string, string> = {
  todo: "Yapılacak",
  in_progress: "Devam Ediyor",
  review: "Kontrolde",
  completed: "Tamamlandı",
  cancelled: "İptal",
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
  draft: "Taslak",
  active: "Aktif",
  inactive: "Pasif",
  passive: "Pasif",
  archived: "Arşiv",
  sold: "Satıldı",
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const s = String(value);
  return TR_VALUES[s] || s;
}

export default function FirmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { canWrite } = useUser();

  const [firm, setFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("genel");

  // Genel sekmesi form durumu
  const [form, setForm] = useState<Partial<Firm>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Liste sekmeleri
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const loadFirm = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("firms")
      .select("*")
      .eq("id", id)
      .single();

    setFirm((data as Firm) || null);
    setForm((data as Firm) || {});
    setLoading(false);
  }, [id]);

  const loadRows = useCallback(
    async (table: string) => {
      setRowsLoading(true);
      const { data } = await supabase
        .from(table)
        .select("*")
        .eq("firm_id", id)
        .order(ORDER_BY[table] || "created_at", { ascending: false })
        .limit(100);

      setRows((data as Row[]) || []);
      setRowsLoading(false);
    },
    [id]
  );

  useEffect(() => {
    loadFirm();
  }, [loadFirm]);

  useEffect(() => {
    if (tab !== "genel") loadRows(tab);
  }, [tab, loadRows]);

  async function saveFirm() {
    setSaving(true);
    setSaveMsg("");

    const { error } = await supabase
      .from("firms")
      .update({
        name: form.name,
        tax_number: form.tax_number,
        city: form.city,
        district: form.district,
        address: form.address,
        phone: form.phone,
        email: form.email,
        notes: form.notes,
        status: form.status,
      })
      .eq("id", id);

    setSaving(false);
    setSaveMsg(error ? "Kaydedilemedi: " + hataCevir(error) : "✓ Kaydedildi");
    if (!error) loadFirm();
  }

  if (loading) {
    return <div className="p-8 text-gray-500">Yükleniyor...</div>;
  }

  if (!firm) {
    return (
      <div className="p-8">
        <p className="text-gray-600 mb-4">
          Firma bulunamadı ya da bu firmaya erişim yetkin yok.
        </p>
        <Link href="/firms" className="underline">
          ← Firmalar listesine dön
        </Link>
      </div>
    );
  }

  const set = (key: keyof Firm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold">{firm.name}</h1>
        <Link href="/firms" className="text-sm text-gray-500 hover:underline">
          ← Firmalar
        </Link>
      </div>
      <p className="text-gray-500 mb-6">
        {[firm.city, firm.district].filter(Boolean).join(" / ") || "Konum girilmemiş"}
        {" · "}
        <span className="text-gray-700">{display(firm.status)}</span>
      </p>

      {/* Sekmeler */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "px-4 py-2 rounded-t whitespace-nowrap " +
              (tab === t.key
                ? "bg-black text-white"
                : "hover:bg-gray-100 text-gray-600")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* GENEL — düzenlenebilir form */}
      {tab === "genel" && (
        <div className="max-w-3xl">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600">Firma Adı *</span>
              <input className="border p-2 w-full rounded mt-1" value={form.name || ""} onChange={set("name")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Vergi No</span>
              <input className="border p-2 w-full rounded mt-1" value={form.tax_number || ""} onChange={set("tax_number")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Şehir</span>
              <input className="border p-2 w-full rounded mt-1" value={form.city || ""} onChange={set("city")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">İlçe</span>
              <input className="border p-2 w-full rounded mt-1" value={form.district || ""} onChange={set("district")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Telefon</span>
              <input className="border p-2 w-full rounded mt-1" value={form.phone || ""} onChange={set("phone")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">E-posta</span>
              <input className="border p-2 w-full rounded mt-1" value={form.email || ""} onChange={set("email")} />
            </label>
            <label className="block col-span-2">
              <span className="text-sm text-gray-600">Adres</span>
              <input className="border p-2 w-full rounded mt-1" value={form.address || ""} onChange={set("address")} />
            </label>
            <label className="block col-span-2">
              <span className="text-sm text-gray-600">Notlar</span>
              <textarea className="border p-2 w-full rounded mt-1" rows={3} value={form.notes || ""} onChange={set("notes")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Durum</span>
              <select className="border p-2 w-full rounded mt-1" value={form.status || "active"} onChange={set("status")}>
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
                <option value="archived">Arşiv</option>
              </select>
            </label>
          </div>

          {canWrite ? (
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={saveFirm}
                disabled={saving}
                className="px-5 py-2 rounded bg-black text-white disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              {saveMsg && <span className="text-sm text-gray-600">{saveMsg}</span>}
            </div>
          ) : (
            <p className="mt-6 text-sm text-gray-400">
              Hesabın salt okunur — firma bilgilerini görüntüleyebilir ama değiştiremezsin.
            </p>
          )}
        </div>
      )}

      {/* LİSTE SEKMELERİ */}
      {tab !== "genel" && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {TAB_COLUMNS[tab].map((c) => (
                  <th key={c.key} className="text-left p-3 font-medium text-gray-600">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsLoading && (
                <tr>
                  <td colSpan={TAB_COLUMNS[tab].length} className="p-4 text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              )}
              {!rowsLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={TAB_COLUMNS[tab].length} className="p-4 text-gray-500">
                    Bu firmaya ait kayıt yok.
                  </td>
                </tr>
              )}
              {!rowsLoading &&
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    {TAB_COLUMNS[tab].map((c) => (
                      <td key={c.key} className="p-3">
                        {display(row[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
