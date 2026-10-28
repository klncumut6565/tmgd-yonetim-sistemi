"use client";

// Kullanıcı oturumu/profili için tek kaynak. Kök layout'ta bir kez mount
// edilir; altındaki tüm useUser() çağrıları aynı state'i okur.

import { UserContext, useUserState } from "@/hooks/useUser";

export default function UserProvider({ children }: { children: React.ReactNode }) {
  const value = useUserState();
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
