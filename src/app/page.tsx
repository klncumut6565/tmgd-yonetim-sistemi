"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";

export default function HomePage() {
  const router = useRouter();
  const { loading, authed, isApproved } = useUser();

  useEffect(() => {
    if (loading) return;
    if (!authed) router.replace("/login");
    else if (isApproved) router.replace("/firms");
    // onaylı değilse AuthGuard kilit ekranını gösterir
  }, [loading, authed, isApproved, router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Yönlendiriliyor...
    </div>
  );
}
