"use client";

// Firma (role="company") kullanıcılarının erişemeyeceği sayfalarda kullanılır.
// Sayfanın en üstünde `if (profile?.role === "company") return <CompanyBlockGuard />;`
// şeklinde çağrılır; kullanıcıyı Gösterge Paneli'ne yönlendirir.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CompanyBlockGuard() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Bu sayfaya erişim yetkiniz yok, yönlendiriliyorsunuz...
    </div>
  );
}
