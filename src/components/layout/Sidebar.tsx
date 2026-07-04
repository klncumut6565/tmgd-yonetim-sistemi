"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";

const menu = [
  { title: "Gösterge Paneli", href: "/dashboard" },
  { title: "Firmalar", href: "/firms" },
  { title: "Görevler", href: "/tasks" },
  { title: "Belgeler", href: "/documents" },
  { title: "Araçlar", href: "/vehicles" },
  { title: "Sürücüler", href: "/drivers" },
  { title: "Personeller", href: "/employees" },
  { title: "Ziyaretler", href: "/visits" },
  { title: "Ayarlar", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSuperAdmin } = useUser();

  return (
    <aside className="w-60 border-r min-h-screen p-4 shrink-0">
      <div className="font-bold text-lg mb-6">TMGD Sistemi</div>

      <nav className="space-y-1">
        {menu.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "block px-3 py-2 rounded " +
                (active ? "bg-black text-white" : "hover:bg-gray-100")
              }
            >
              {item.title}
            </Link>
          );
        })}

        {/* Sadece süper admin görür */}
        {isSuperAdmin && (
          <Link
            href="/admin"
            className={
              "block px-3 py-2 rounded mt-4 border-t pt-4 " +
              (pathname === "/admin"
                ? "bg-black text-white"
                : "hover:bg-gray-100")
            }
          >
            ⚙️ Yönetim
          </Link>
        )}
      </nav>
    </aside>
  );
}
