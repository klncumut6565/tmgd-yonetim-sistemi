"use client";

// Oturum açan kullanıcının profili: onay durumu, rolü, temel bilgileri.
// Tüm korumalı sayfalar ve Sidebar bunu kullanır.

import { useEffect, useRef, useState } from "react";
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
  authed: boolean; // oturum açık mı
  profile: Profile | null;
  isSuperAdmin: boolean;
  isApproved: boolean;
  canWrite: boolean; // ekle/düzenle/sil yetkisi (rol bazlı)
};

// database/004_rol_yetkileri.sql'deki yazabilir() ile birebir aynı liste
const YAZABILEN_ROLLER = ["super_admin", "admin", "tmgd", "assistant"];

export function useUser(): UseUserResult {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Hâlihazırda yüklü kullanıcının kimliği. Auth olayı geldiğinde
  // gerçekten başka bir kullanıcıya mı geçildiğini anlamak için tutulur.
  const mevcutKullaniciId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    /**
     * @param sessiz true ise "Yükleniyor..." ekranı gösterilmez; veriler
     * arka planda tazelenir. Sekmeye geri dönüldüğünde sayfanın sıfırlanmaması
     * için token yenilemelerinde bu mod kullanılır.
     */
    async function load(sessiz = false) {
      if (!sessiz && mounted) setLoading(true);

      // getSession() oturumu yerel depodan okur (ağ turu yok); getUser()
      // her çağrıda sunucuya gider ve mobilde gözle görülür gecikme yaratır.
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user ?? null;

      if (!user) {
        mevcutKullaniciId.current = null;
        if (mounted) {
          setAuthed(false);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      mevcutKullaniciId.current = user.id;
      if (mounted) setAuthed(true);

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, approval_status, is_active")
        .eq("id", user.id)
        .single();

      if (mounted) {
        // Sessiz tazelemede sorgu boş dönerse (geçici ağ hatası) eldeki
        // profil korunur; aksi halde sayfa boşuna kilit ekranına düşer.
        if (prof || !sessiz) setProfile((prof as Profile) || null);
        setLoading(false);
      }
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED ve INITIAL_SESSION olayları, kullanıcı sekmeye geri
      // döndüğünde (ekran kilidi açıldığında, başka siteden geri gelindiğinde)
      // supabase-js tarafından kendiliğinden tetiklenir. Bunlarda loading'i
      // true yapmak AuthGuard'ın tüm sayfa ağacını söküp yeniden kurmasına,
      // yani kullanıcının kaldığı yeri kaybetmesine yol açar.
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;

      if (event === "SIGNED_OUT") {
        mevcutKullaniciId.current = null;
        if (mounted) {
          setAuthed(false);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      // SIGNED_IN olayı da sekmeye dönüşte aynı kullanıcı için tekrar
      // gelebilir; yalnızca kimlik gerçekten değiştiyse tam yükleme yapılır.
      const yeniId = session?.user?.id ?? null;
      const kullaniciDegisti = yeniId !== mevcutKullaniciId.current;

      load(!kullaniciDegisti);
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
