"use client";

// ⚠️ NOT: Bu dosya kaynak metinde (anaproje.txt) TANIMLANMAMIŞTI.
// TESLİMAT 077, "@/hooks/useUser" içe aktarımına dayanıyordu ama
// hiçbir teslimatta bu hook'un kendisi verilmedi. Import'un kırık
// kalmaması için burada minimal bir TASLAK eklendi — gerçek auth/yetki
// mantığını bağlamanız gerekir.
//
// Önerilen gerçek akış (database/schema.sql'deki tablolarla):
//   1) supabase.auth.getUser() ile oturum açan kullanıcıyı al
//   2) profiles tablosundan role bilgisini çek
//   3) role_permissions + permissions tablolarını join'leyip
//      o role'e ait permission "code" listesini döndür

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type UseUserResult = {
  permissions: string[];
  loading: boolean;
};

export function useUser(): UseUserResult {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;

      if (!authUser) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .single();

      if (!profile) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      const { data: rolePerms } = await supabase
        .from("role_permissions")
        .select("permissions ( code )")
        .eq("role_name", profile.role);

      const codes =
        (rolePerms as unknown as { permissions: { code: string } | null }[])
          ?.map((row) => row.permissions?.code)
          .filter((code): code is string => Boolean(code)) || [];

      setPermissions(codes);
      setLoading(false);
    }

    load();
  }, []);

  return { permissions, loading };
}
