"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";

const menu = [
  { title: "Gösterge Paneli", href: "/dashboard" },
  { title: "Firmalar", href: "/firms" },
  { title: "Görevler", href: "/tasks" },
  { title: "Belgeler", href: "/documents" },
  { title: "Belge Oluştur", href: "/belge-olustur" },
  { title: "Araçlar", href: "/vehicles" },
  { title: "Sürücüler", href: "/drivers" },
  { title: "Personeller", href: "/employees" },
  { title: "Ziyaretler", href: "/visits" },
  { title: "Raporlar", href: "/reports" },
  { title: "ADR Bilgi Motoru", href: "/adr" },
  { title: "Ayarlar", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSuperAdmin, profile } = useUser();
  const isAdmin = profile?.role === "admin";

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

        {/* Harici Uygulamalar */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Uygulamalar
          </p>
          {[
            { title: "Sefer Bildirim", href: "https://seferaktarimbosaltmakontroldestekli.streamlit.app", icon: "🚛" },
            { title: "Kimyasal Envanter", href: "https://kimyasal-envanter-xejzjdukscnznm6dgtmvp5.streamlit.app", icon: "🧪" },
            { title: "MSDS Özetleyici", href: "https://msds-ozetleyici-vzsrtfijrpnj9y5zqrupht.streamlit.app", icon: "📄" },
            { title: "Karışık Yükleme", href: "/adr?tab=karisik", icon: "⚠" },
          ].map((app) => (
            <a
              key={app.href}
              href={app.href}
              target={app.href.startsWith("http") ? "_blank" : undefined}
              rel={app.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            >
              <span>{app.icon}</span>
              <span>{app.title}</span>
              {app.href.startsWith("http") && <span className="ml-auto text-gray-300 text-xs">↗</span>}
            </a>
          ))}
        </div>

        {/* Süper admin veya yönetici görür */}
        {(isSuperAdmin || isAdmin) && (
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
