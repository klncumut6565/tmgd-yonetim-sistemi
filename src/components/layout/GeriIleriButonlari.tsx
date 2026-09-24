"use client";

// src/components/layout/GeriIleriButonlari.tsx
//
// Tarayıcı geçmişinde bir önceki / bir sonraki sayfaya geçiş butonları.
// Next.js router.back() / router.forward() kullanır (tarayıcının kendi
// geri/ileri tuşlarıyla aynı davranış, sayfa yeniden yüklenmez).
//
// Butonların pasif/aktif durumu: Chrome/Edge'de desteklenen Navigation API
// (window.navigation.canGoBack / canGoForward) varsa ondan okunur; desteklemeyen
// tarayıcılarda (Safari/Firefox) butonlar her zaman aktif kalır. Geçmiş yokken
// "Geri"ye basılırsa (örn. sayfa doğrudan bir bağlantıyla açılmışsa) Gösterge
// Paneli'ne gidilir.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type NavApi = { canGoBack?: boolean; canGoForward?: boolean };

function navApi(): NavApi | null {
  if (typeof window === "undefined") return null;
  const n = (window as unknown as { navigation?: NavApi }).navigation;
  return n && typeof n.canGoBack === "boolean" ? n : null;
}

export default function GeriIleriButonlari() {
  const router = useRouter();
  const pathname = usePathname();
  const [geriVar, setGeriVar] = useState(true);
  const [ileriVar, setIleriVar] = useState(true);

  // Her sayfa değişiminde durum tazelenir.
  useEffect(() => {
    const n = navApi();
    if (n) {
      setGeriVar(!!n.canGoBack);
      setIleriVar(!!n.canGoForward);
    }
  }, [pathname]);

  function geri() {
    const n = navApi();
    const gecmisYok = n ? !n.canGoBack : window.history.length <= 1;
    if (gecmisYok) {
      router.push("/dashboard");
    } else {
      router.back();
    }
  }

  const btn =
    "w-8 h-8 flex items-center justify-center rounded border text-base " +
    "hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={geri} disabled={!geriVar && pathname === "/dashboard"}
        title="Geri (önceki sayfa)" aria-label="Geri" className={btn}>
        ←
      </button>
      <button type="button" onClick={() => router.forward()} disabled={!ileriVar}
        title="İleri (sonraki sayfa)" aria-label="İleri" className={btn}>
        →
      </button>
    </div>
  );
}
