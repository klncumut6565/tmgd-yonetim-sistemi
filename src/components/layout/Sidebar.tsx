import Link from "next/link";

// TESLİMAT 019'daki menü dizisi ile TESLİMAT 078'de listelenen
// sidebar öğeleri birleştirilerek tek bir menü haline getirildi.

const menu = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Firmalar", href: "/firms" },
  { title: "Görevler", href: "/tasks" },
  { title: "Belgeler", href: "/documents" },
  { title: "Araçlar", href: "/vehicles" },
  { title: "Sürücüler", href: "/drivers" },
  { title: "Personeller", href: "/employees" },
  { title: "Ziyaretler", href: "/visits" },
  { title: "Raporlar", href: "/reports" },
  { title: "Ayarlar", href: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-60 border-r min-h-screen p-4">
      <div className="font-bold text-lg mb-6">TMGD Yönetim Sistemi</div>

      <nav className="space-y-1">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-3 py-2 rounded hover:bg-gray-100"
          >
            {item.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
