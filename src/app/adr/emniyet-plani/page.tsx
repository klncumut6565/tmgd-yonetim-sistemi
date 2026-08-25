"use client";

// EMNİYET PLANI KAPSAM TARAMASI — bağımsız sayfa (ADR Bilgi Motoru alt başlığı)
// Firma seçiciyi burada gösterir; asıl mantık EmniyetKapsamTaramasi.tsx'te.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import EmniyetKapsamTaramasi from "@/components/EmniyetKapsamTaramasi";

type Firm = { id: string; name: string };

export default function EmniyetPlaniSayfasi() {
  const searchParams = useSearchParams();
  const preselect = searchParams.get("firm") || "";
  const [firms, setFirms] = useState<Firm[]>([]);
  const [firmId, setFirmId] = useState(preselect);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("firms")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      setFirms((data as Firm[]) || []);
      setYukleniyor(false);
    })();
  }, []);

  const seciliFirma = firms.find((f) => f.id === firmId) || null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">Emniyet Planı Kapsam Taraması</h1>
        <p className="text-sm text-gray-500 mt-1">
          Firmanın L1 (ADR Envanter Listesi) kaydındaki kimyasalları ADR Tablo 1.10.3.1.2&apos;ye
          göre madde bazlı değerlendirir.
        </p>
      </div>

      <div className="max-w-md">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
          Firma
        </label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
          value={firmId}
          onChange={(e) => setFirmId(e.target.value)}
          disabled={yukleniyor}
        >
          <option value="">{yukleniyor ? "Yükleniyor..." : "Firma seçin..."}</option>
          {firms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {seciliFirma && (
        <EmniyetKapsamTaramasi
          key={seciliFirma.id}
          firmId={seciliFirma.id}
          firmaAdi={seciliFirma.name}
        />
      )}
    </div>
  );
}
