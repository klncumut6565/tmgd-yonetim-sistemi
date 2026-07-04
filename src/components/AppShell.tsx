"use client";

// Uygulama kabuğu: hangi sayfada hangi çerçevenin görüneceğine karar verir.
// - /login → sadece içerik (sidebar/header yok), AuthGuard yine de login'i serbest bırakır
// - Diğer sayfalar → AuthGuard + Sidebar + Header + içerik

import { usePathname, useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/layout/Sidebar";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase/client";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isApproved } = useUser();

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
        {isApproved && <Sidebar />}

        <div className="flex-1 min-h-screen">
          {isApproved && (
            <header className="border-b p-4 flex items-center justify-between">
              <span className="font-medium">TMGD Yönetim Sistemi</span>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-600">
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
    </AuthGuard>
  );
}
