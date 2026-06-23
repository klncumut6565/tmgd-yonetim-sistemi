import { useUser } from "@/hooks/useUser";

export function usePermission(permission: string) {
  const { permissions } = useUser();

  return permissions.includes(permission);
}

// Kullanım örneği:
// const canCreateFirm = usePermission("firm.create");
