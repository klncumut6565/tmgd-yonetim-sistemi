"use client";

// FİRMALAR — geliştirilmiş liste
//  - Arama kutusu (ad / şehir / ilçe içinde anlık filtre)
//  - Satıra tıklayınca firma detay sayfası açılır (/firms/[id])
//  - Yeni firma formu yan panelde (yan yana düzen)
//  - Silme (onaylı) — sadece super_admin (RLS de ayrıca korur)

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";

type Firm = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  phone: string | null;
  status: string;
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

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadFirms() {
    setError("");
    const { data, error } = await supabase
      .from("firms")
      .select("id, name, city, district, phone, status")
      .order("name");

    if (error) setError("Firmalar yüklenemedi: " + hataCevir(error));
    setFirms((data as Firm[]) || []);
    setLoading(false);
  }

  async function createFirm() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");

    const { error } = await supabase.from("firms").insert({
      name: name.trim(),
      city: city.trim() || null,
      district: district.trim() || null,
      status: "active",
    });

    setSaving(false);
    if (error) {
      setError("Firma eklenemedi: " + hataCevir(error));
      return;
    }

    setName("");
    setCity("");
    setDistrict("");
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
      <h1 className="text-3xl font-bold mb-6">Firmalar</h1>

      {error && (
        <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          {error}
        </p>
      )}

      {/* Yan yana: solda liste, sağda yeni firma */}
      <div className={canWrite ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : ""}>
        <div className={canWrite ? "lg:col-span-2" : ""}>
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
                  <th className="text-left p-3 font-medium text-gray-600">Şehir / İlçe</th>
                  <th className="text-left p-3 font-medium text-gray-600">Telefon</th>
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
                    <td className="p-3 text-gray-500">
                      {[firm.city, firm.district].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="p-3 text-gray-500">{firm.phone || "—"}</td>
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

        {canWrite && (
        <div>
          <div className="border rounded-xl p-4">
            <h2 className="font-bold mb-4">Yeni Firma</h2>

            <input
              className="border p-2 w-full rounded mb-3"
              placeholder="Firma Adı *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="border p-2 w-full rounded mb-3"
              placeholder="Şehir"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <input
              className="border p-2 w-full rounded mb-3"
              placeholder="İlçe"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />

            <button
              onClick={createFirm}
              disabled={saving || !name.trim()}
              className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
