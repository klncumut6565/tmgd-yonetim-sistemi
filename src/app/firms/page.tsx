"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Firm = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  status: string;
};

export default function FirmsPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");

  async function loadFirms() {
    const { data } = await supabase
      .from("firms")
      .select("*")
      .order("name");

    setFirms(data || []);
    setLoading(false);
  }

  async function createFirm() {
    if (!name) return;

    const { error } = await supabase.from("firms").insert({
      name,
      city,
      district,
      status: "active",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setCity("");
    setDistrict("");

    loadFirms();
  }

  useEffect(() => {
    loadFirms();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Firmalar</h1>

      <div className="border rounded-xl p-4 mb-8">
        <h2 className="font-bold mb-4">Yeni Firma</h2>

        <input
          className="border p-2 w-full mb-3"
          placeholder="Firma Adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-3"
          placeholder="Şehir"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-3"
          placeholder="İlçe"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        />

        <button
          onClick={createFirm}
          className="px-4 py-2 rounded bg-black text-white"
        >
          Kaydet
        </button>
      </div>

      <div className="border rounded-xl">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3">Firma</th>
              <th className="text-left p-3">Şehir</th>
              <th className="text-left p-3">İlçe</th>
              <th className="text-left p-3">Durum</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="p-3">
                  Yükleniyor...
                </td>
              </tr>
            )}

            {firms.map((firm) => (
              <tr key={firm.id}>
                <td className="p-3">{firm.name}</td>
                <td className="p-3">{firm.city}</td>
                <td className="p-3">{firm.district}</td>
                <td className="p-3">{firm.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
