"use client";

// Uygulama kabuğu: hangi sayfada hangi çerçevenin görüneceğine karar verir.
// - /login → sadece içerik (sidebar/header yok), AuthGuard yine de login'i serbest bırakır
// - Diğer sayfalar → AuthGuard + Sidebar + Header + içerik

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/layout/Sidebar";
import GeriIleriButonlari from "@/components/layout/GeriIleriButonlari";
import NotificationBell from "@/components/NotificationBell";
import ADRAssistantWidget from "@/components/adr-assistant/ADRAssistantWidget";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase/client";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isApproved, isSuperAdmin } = useUser();

  const [menuAcik, setMenuAcik] = useState(false);
  useEffect(() => setMenuAcik(false), [pathname]);

  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  async function cikis() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <AuthGuard>
      <div className="flex">
        {/* Sidebar yalnızca onaylı kullanıcıya gösterilir;
            onaysızken AuthGuard zaten kilit ekranı basar. */}
        {isApproved && (
          <>
            {/* Mobilde menü gizli, hamburger ile çekmece olarak açılır */}
            {menuAcik && (
              <div
                className="fixed inset-0 bg-black/40 z-40 md:hidden"
                onClick={() => setMenuAcik(false)}
              />
            )}
            <div
              className={`${
                menuAcik ? "fixed inset-y-0 left-0 z-50 bg-white overflow-y-auto" : "hidden"
              } md:block md:static md:z-auto`}
            >
              <Sidebar />
            </div>
          </>
        )}

        <div className="flex-1 min-h-screen min-w-0">
          {isApproved && (
            <header className="border-b p-3 sm:p-4 flex items-center justify-between gap-2">
              {/* Sol üst köşe: geri / ileri gezinme + başlık */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMenuAcik(true)}
                  className="md:hidden px-2 py-1 rounded border"
                  aria-label="Menü"
                >
                  ☰
                </button>
                <GeriIleriButonlari />
                <span className="font-medium hidden sm:inline">TMGD Yönetim Sistemi</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <NotificationBell />
                <span className="text-gray-600 hidden sm:inline">
                  {profile?.full_name || profile?.email}
                  {profile?.role === "super_admin" && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-black text-white text-xs">
                      Yönetici
                    </span>
                  )}
                </span>
                <button
                  onClick={cikis}
                  className="px-3 py-1.5 rounded border hover:bg-gray-50"
                >
                  Çıkış
                </button>
              </div>
            </header>
          )}

          <main>{children}</main>
        </div>
      </div>

      {/* Kalıcı ADR Asistanı — sadece super_admin, sayfa/route değişse
          bile burada (AppShell seviyesinde) mount edildiği için hayatta
          kalır. Buzz entegrasyonu kapsamında sadece super_admin. */}
      {isApproved && isSuperAdmin && <ADRAssistantWidget />}
    </AuthGuard>
  );
}
