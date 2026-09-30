import { supabase } from "@/lib/supabase/client";

// "TMFB Kapsamdışı" firma durumu (migration 072).
// Bu durumdaki firmalar Firmalar listesinde normal listeye karışmaz, ayrı
// renkli bölümde gösterilir ve YALNIZCA o firmaya atanmış (user_firms)
// kullanıcılar tarafından görülür. İstisna: süper yönetici (Yönetim menüsü
// sahibi) hepsini görür — böylece kimseye atanmadan kapsamdışı yapılan bir
// firma kaybolmaz; Yönetim → Firma Atamaları'ndan sonradan atanabilir.
export const TMFB_KAPSAMDISI = "tmfb_kapsamdisi";

/** Oturumdaki kullanıcının atandığı firma id'leri. */
export async function atananFirmaIdleri(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data } = await supabase.from("user_firms").select("firm_id").eq("user_id", userId);
  return new Set(((data as { firm_id: string }[]) || []).map((r) => r.firm_id));
}
