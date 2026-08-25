"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";

const menu = [
  { title: "Gösterge Paneli", href: "/dashboard" },
  { title: "Firmalar", href: "/firms" },
  // NOT: "Görevler" (/tasks) menüde yalnızca firma (company) rolü DIŞINDAKİ
  // kullanıcılara gösterilir — aşağıdaki visibleMenu filtresine bakınız.
  { title: "Görevler", href: "/tasks", hideForCompany: true },
  // NOT: "Belgeler" (/documents) ve "Belge Oluştur" (/belge-olustur)
  // menüden kaldırıldı — firma bağlamı olmadan kullanışlı değillerdi
  // (her ikisinde de önce firma seçmek gerekiyordu). Aynı işlevler firma
  // detay sayfasında "Belgeler" ve "Belge Oluştur" sekmeleri olarak
  // kullanılmaya devam ediyor. Sayfalar silinmedi; doğrudan URL ile hâlâ
  // erişilebilir.
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
  const isCompany = profile?.role === "company";
  const visibleMenu = menu.filter((item) => !(isCompany && item.hideForCompany));

  return (
    <aside className="w-60 border-r min-h-screen p-4 shrink-0">
      <div className="font-bold text-lg mb-6">TMGD Sistemi</div>

      <nav className="space-y-1">
        {visibleMenu.map((item) => {
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
            { title: "MSDS Özetleyici", href: "https://msds-ozetleyici-pro.streamlit.app", icon: "📄" },
            { title: "Karışık Yükleme", href: "/adr?tab=karisik", icon: "⚠" },
            { title: "Emniyet Planı Kapsam Taraması", href: "/adr/emniyet-plani", icon: "🛡" },
          ]
            // Firma (company) kullanıcısı harici Streamlit uygulamalarını
            // görmez — bunlar TMGD'nin kendi çalışma araçları. Yalnızca
            // uygulama içi "Karışık Yükleme" kontrolü görünür kalır.
            .filter((app) => !isCompany || !app.href.startsWith("http"))
            .map((app) => (
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

        {/* Mevzuat — kanun/yönetmelik/genelge kütüphanesi.
            Herkes görüntüler; yükleme yetkisi sayfa içinde admin ve
            super_admin ile sınırlı. */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            href="/mevzuat"
            className={
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm " +
              (pathname === "/mevzuat"
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-100")
            }
          >
            <span>📚</span>
            <span>Mevzuat</span>
          </Link>
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

        {/* Yalnızca süper admin görür (audit log / workflow motoru) */}
        {isSuperAdmin && (
          <>
            <Link
              href="/audit-log"
              className={
                "block px-3 py-2 rounded " +
                (pathname === "/audit-log"
                  ? "bg-black text-white"
                  : "hover:bg-gray-100")
              }
            >
              🔒 Denetim İzi
            </Link>
            <Link
              href="/workflow-rules"
              className={
                "block px-3 py-2 rounded " +
                (pathname === "/workflow-rules"
                  ? "bg-black text-white"
                  : "hover:bg-gray-100")
              }
            >
              ⚙️ Workflow Kuralları
            </Link>
            <Link
              href="/ai-engine-keys"
              className={
                "block px-3 py-2 rounded " +
                (pathname === "/ai-engine-keys"
                  ? "bg-black text-white"
                  : "hover:bg-gray-100")
              }
            >
              🤖 AI Motor Anahtarları
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
