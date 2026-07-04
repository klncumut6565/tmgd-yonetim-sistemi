"use client";

// Basit yetki yardımcıları. Şu an yetki modeli rol tabanlı:
//   - super_admin: her şeyi yapabilir
//   - onaylı tmgd: kendi firmalarında işlem yapabilir (asıl kontrol RLS'te)
// Daha ayrıntılı izin (permission code) gerekirse ileride genişletilir.

import { useUser } from "@/hooks/useUser";

export function useCanManageUsers(): boolean {
  const { isSuperAdmin } = useUser();
  return isSuperAdmin;
}

export function useCanWrite(): boolean {
  const { isSuperAdmin, isApproved } = useUser();
  return isSuperAdmin || isApproved;
}
