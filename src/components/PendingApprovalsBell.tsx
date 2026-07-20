"use client";

// ONAY BİLDİRİM ZİLİ (sadece super_admin görür)
// - Onay bekleyen kullanıcı sayısını üst çubukta rozetle gösterir
// - Tıklayınca açılan küçük listede bekleyenlerin adı/e-postası görünür,
//   "Yönetim sayfasına git" ile /admin'e gidilir
// - 30 saniyede bir ve pencereye geri dönüldüğünde kendini yeniler

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Bekleyen = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

export default function PendingApprovalsBell() {
  const router = useRouter();
  const [bekleyenler, setBekleyenler] = useState<Bekleyen[]>([]);
  const [acik, setAcik] = useState(false);
  const kutuRef = useRef<HTMLDivElement>(null);

  const yukle = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    setBekleyenler((data as Bekleyen[]) || []);
  }, []);

  useEffect(() => {
    yukle();

    // 30 saniyede bir yenile
    const zamanlayici = setInterval(yukle, 30000);

    // Sekmeye geri dönülünce yenile. Mobilde ekran her açıldığında bu olay
    // tetiklendiği için 20 saniyelik bir bekleme sınırı uygulanır.
    let sonTazeleme = Date.now();
    const odak = () => {
      if (Date.now() - sonTazeleme < 20000) return;
      sonTazeleme = Date.now();
      yukle();
    };
    window.addEventListener("focus", odak);

    return () => {
      clearInterval(zamanlayici);
      window.removeEventListener("focus", odak);
    };
  }, [yukle]);

  // Dışarı tıklayınca menüyü kapat
  useEffect(() => {
    function disariTiklama(e: MouseEvent) {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node)) {
        setAcik(false);
      }
    }
    document.addEventListener("mousedown", disariTiklama);
    return () => document.removeEventListener("mousedown", disariTiklama);
  }, []);

  const sayi = bekleyenler.length;

  return (
    <div className="relative" ref={kutuRef}>
      <button
        onClick={() => setAcik((a) => !a)}
        className="relative p-2 rounded hover:bg-gray-100"
        title={sayi > 0 ? `${sayi} kullanıcı onay bekliyor` : "Bildirim yok"}
      >
        <span className="text-lg">🔔</span>
        {sayi > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
            {sayi > 9 ? "9+" : sayi}
          </span>
        )}
      </button>

      {acik && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b font-medium text-sm">
            {sayi > 0
              ? `Onay bekleyen ${sayi} kullanıcı`
              : "Bekleyen bildirim yok"}
          </div>

          {sayi > 0 && (
            <ul className="max-h-64 overflow-y-auto">
              {bekleyenler.map((b) => (
                <li key={b.id} className="px-3 py-2.5 border-b last:border-b-0 text-sm">
                  <div className="font-medium">
                    {b.full_name || "İsimsiz kullanıcı"}
                  </div>
                  <div className="text-gray-500 text-xs">{b.email}</div>
                </li>
              ))}
            </ul>
          )}

          {sayi > 0 && (
            <button
              onClick={() => {
                setAcik(false);
                router.push("/admin");
              }}
              className="w-full p-2.5 text-sm font-medium bg-black text-white hover:bg-gray-800"
            >
              Yönetim sayfasına git → Onayla
            </button>
          )}
        </div>
      )}
    </div>
  );
}
