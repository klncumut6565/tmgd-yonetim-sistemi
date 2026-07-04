"use client";

// Oturum açan kullanıcının prof: onay durumu, rolü, temel bilgileri.
// Tüm korumalı sayfalar ve Sidebar bunu kullanır.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  approval_status: "pending" | "approved" | "rejected";
  is_active: boolean;
};

export type UseUserResult = {
  loading: boolean;
  authed: boolean;          // oturum açık mı
  profile: Profile | null;
  isSuperAdmin: boolean;
  isApproved: boolean;
  canWrite: boolean;        // ekle/düzenle/sil yetkisi (rol bazlı)
};

// database/004_rol_yetkileri.sql'deki yazabilir() ile birebir aynı liste
const YAZABILEN_ROLLER = ["super_admin", "admin", "tmgd", "assistant"];

export function useUser(): UseUserResult {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        if (mounted) {
          setAuthed(false);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      if (mounted) setAuthed(true);

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, approval_status, is_active")
        .eq("id", user.id)
        .single();

      if (mounted) {
        setProfile((prof as Profile) || null);
        setLoading(false);
      }
    }

    load();

    // Oturum değişince (giriş/çıkış) yeniden yükle
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      load();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isApproved =
    profile?.approval_status === "approved" && !!profile?.is_active;

  return {
    loading,
    authed,
    profile,
    isSuperAdmin: profile?.role === "super_admin",
    isApproved,
    canWrite: isApproved && YAZABILEN_ROLLER.includes(profile?.role || ""),
  };
}
