"use client";

// Oturum + onay bekçisi.
// - /login sayfasında hiçbir şey yapmaz (herkese açık)
// - Oturum yoksa → /login'e yönlendirir
// - Oturum var ama onaylı değilse → "onay bekleniyor" kilit ekranı
// - Onaylıysa → sayfayı normal gösterir

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase/client";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, authed, profile, isApproved } = useUser();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (loading) return;
    if (!authed && !isLoginPage) {
      router.replace("/login");
    }
  }, [loading, authed, isLoginPage, router]);

  // Login sayfası: bekçi devreye girmez
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Yükleniyor...
      </div>
    );
  }

  if (!authed) {
    // yönlendirme efekti çalışana kadar boş ekran
    return null;
  }

  // Oturum var ama onaylı değil → kilit ekranı
  if (!isApproved) {
    const durum = profile?.approval_status;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white border rounded-xl p-7 text-center shadow-sm">
          <div className="text-4xl mb-3">⏳</div>
          <h1 className="text-xl font-bold mb-2">
            {durum === "rejected"
              ? "Hesabın reddedildi"
              : "Hesabın onay bekliyor"}
          </h1>
          <p className="text-gray-600 text-sm mb-6">
            {durum === "rejected"
              ? "Hesabın bir yönetici tarafından reddedildi. Bilgi için sistem yöneticinle iletişime geç."
              : "Kaydın alındı. Bir yönetici hesabını onayladıktan sonra firmalarını yönetmeye başlayabilirsin. Onaylandığında tekrar giriş yapman yeterli."}
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
            className="px-4 py-2 rounded border"
          >
            Çıkış yap
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
