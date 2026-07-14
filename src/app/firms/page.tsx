"use client";

// FİRMALAR — geliştirilmiş liste
//  - Arama kutusu (ad / şehir / ilçe içinde anlık filtre)
//  - Satıra tıklayınca firma detay sayfası açılır (/firms/[id])
//  - Yeni firma formu yan panelde (yan yana düzen)
//  - YENİ: faaliyet konuları (çoklu seçim) + sözleşme tarihi + logo
//  - Silme (onaylı) — sadece super_admin (RLS de ayrıca korur)

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";
import { ACTIVITIES, ACTIVITY_LABELS } from "@/lib/belgeKatalogu";

type Firm = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  phone: string | null;
  status: string;
  activities: string[] | null;
};

const STATUS_TR: Record<string, string> = {
  active: "Aktif",
  passive: "Pasif",
  archived: "Arşiv",
};

export default function FirmsPage() {
  const router = useRouter();
  const { isSuperAdmin, canWrite } = useUser();

  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // Yeni firma formu
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [activities, setActivities] = useState<string[]>([]);
  const [contractStart, setContractStart] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  async function loadFirms() {
    setError("");
    let { data, error } = await supabase
      .from("firms")
      .select("id, name, city, district, phone, status, activities")
      .order("name");

    // "activities" kolonu henüz eklenmemişse (migration 010 çalıştırılmadıysa)
    // firmaları yine de göster — kolon olmadan sorguyu tekrar dene.
    if (error && /column.*(activities).*does not exist|activities.*does not exist/i.test(error.message || "")) {
      const retry = await supabase
        .from("firms")
        .select("id, name, city, district, phone, status")
        .order("name");
      data = (retry.data || []).map((f) => ({ ...f, activities: [] })) as typeof data;
      error = retry.error;
      if (!retry.error) {
        setError(
          "Faaliyet konuları görünmüyor — veritabanı güncellemesi (migration 010) henüz çalıştırılmamış. " +
            "Supabase → SQL Editor'de database/010_faaliyet_ve_belge_takip.sql dosyasını çalıştır."
        );
      }
    } else if (error) {
      setError("Firmalar yüklenemedi: " + hataCevir(error));
    }

    setFirms((data as Firm[]) || []);
    setLoading(false);
  }

  function toggleActivity(key: string) {
    setActivities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  }

  async function createFirm() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");

    // 1) Firmayı ekle, id'yi al
    const { data: created, error } = await supabase
      .from("firms")
      .insert({
        name: name.trim(),
        city: city.trim() || null,
        district: district.trim() || null,
        activities,
        contract_start: contractStart || null, // boş = yıl başından
        status: "active",
      })
      .select("id")
      .single();

    if (error || !created) {
      setSaving(false);
      setError("Firma eklenemedi: " + hataCevir(error));
      return;
    }

    // 2) Logo seçildiyse Storage'a yükle ve logo_url'i güncelle
    if (logoFile) {
      const safeName = logoFile.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const path = `${created.id}/logo/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("firm-files")
        .upload(path, logoFile, { upsert: true });

      if (upErr) {
        setError("Firma eklendi ama logo yüklenemedi: " + hataCevir(upErr));
      } else {
        await supabase.from("firms").update({ logo_url: path }).eq("id", created.id);
      }
    }

    setSaving(false);
    setName("");
    setCity("");
    setDistrict("");
    setActivities([]);
    setContractStart("");
    setLogoFile(null);
    if (logoRef.current) logoRef.current.value = "";
    setShowAddForm(false);
    loadFirms();
  }

  async function deleteFirm(firm: Firm) {
    const ok = window.confirm(
      `"${firm.name}" firmasını silmek istediğine emin misin?\n` +
        "Firmaya bağlı görevler, belgeler, araçlar da silinir."
    );
    if (!ok) return;

    const { error } = await supabase.from("firms").delete().eq("id", firm.id);
    if (error) {
      setError("Silinemedi: " + hataCevir(error));
      return;
    }
    loadFirms();
  }

  useEffect(() => {
    loadFirms();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    if (!q) return firms;
    return firms.filter((f) =>
      [f.name, f.city, f.district]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("tr").includes(q))
    );
  }, [firms, search]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Firmalar</h1>
        {canWrite && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            ➕ Yeni Firma Ekle
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          {error}
        </p>
      )}

      {/* Yan yana: solda liste, sağda yeni firma (yalnızca panel açıkken) */}
      <div className={canWrite && showAddForm ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : ""}>
        <div className={canWrite && showAddForm ? "lg:col-span-2" : ""}>
          <input
            className="border p-2 w-full rounded mb-4"
            placeholder="Ara: firma adı, şehir, ilçe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Firma</th>
                  <th className="text-left p-3 font-medium text-gray-600">Faaliyet</th>
                  <th className="text-left p-3 font-medium text-gray-600">Şehir / İlçe</th>
                  <th className="text-left p-3 font-medium text-gray-600">Durum</th>
                  {isSuperAdmin && <th className="p-3" />}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="p-4 text-gray-500">Yükleniyor...</td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-gray-500">
                      {search ? "Aramaya uyan firma yok." : "Henüz firma eklenmemiş."}
                    </td>
                  </tr>
                )}
                {filtered.map((firm) => (
                  <tr
                    key={firm.id}
                    onClick={() => router.push(`/firms/${firm.id}`)}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="p-3 font-medium">{firm.name}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(firm.activities || []).length === 0 && (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                        {(firm.activities || []).map((a) => (
                          <span
                            key={a}
                            className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"
                          >
                            {ACTIVITY_LABELS[a] || a}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-gray-500">
                      {[firm.city, firm.district].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="p-3">{STATUS_TR[firm.status] || firm.status}</td>
                    {isSuperAdmin && (
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFirm(firm);
                          }}
                          className="px-2 py-1 rounded border text-xs hover:bg-gray-100"
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

          <p className="text-xs text-gray-400 mt-2">
            Detay ve düzenleme için firmaya tıkla.
          </p>
        </div>

        {canWrite && showAddForm && (
        <div>
          <div className="border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">➕ Yeni Firma Ekle</h2>
              <button
                onClick={() => setShowAddForm(false)}
                title="Kapat"
                className="text-gray-400 hover:text-gray-700 text-sm"
              >
                ✕
              </button>
            </div>

            <label className="block mb-3">
              <span className="text-sm text-gray-600">Firma adı *</span>
              <input
                className="border p-2 w-full rounded mt-1"
                placeholder="Firma adı girin..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                className="border p-2 w-full rounded"
                placeholder="Şehir"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <input
                className="border p-2 w-full rounded"
                placeholder="İlçe"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>

            {/* Faaliyet konuları — çoklu seçim */}
            <div className="mb-3">
              <span className="text-sm text-gray-600">
                Faaliyet konuları{" "}
                <span className="text-gray-400">(birden fazla seçebilirsiniz)</span>
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {ACTIVITIES.map((a) => {
                  const selected = activities.includes(a.key);
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => toggleActivity(a.key)}
                      className={
                        "border rounded px-2 py-1.5 text-sm text-center transition " +
                        (selected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "hover:bg-gray-50")
                      }
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sözleşme / başlangıç tarihi */}
            <label className="block mb-3">
              <span className="text-sm text-gray-600">
                Sözleşme / Başlangıç Tarihi
              </span>
              <input
                type="date"
                className="border p-2 w-full rounded mt-1"
                value={contractStart}
                onChange={(e) => setContractStart(e.target.value)}
              />
            </label>

            {/* Logo */}
            <label className="block mb-4">
              <span className="text-sm text-gray-600">
                Firma logosu <span className="text-gray-400">(isteğe bağlı)</span>
              </span>
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/jpeg"
                className="border p-2 w-full rounded mt-1 text-sm"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
            </label>

            <button
              onClick={createFirm}
              disabled={saving || !name.trim()}
              className="w-full px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "✓ Ekle"}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
