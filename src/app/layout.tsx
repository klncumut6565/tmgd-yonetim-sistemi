import type { Metadata } from "next";
import Sidebar from "@/components/layout/Sidebar";

// TESLİMAT 078'deki <AppLayout><Sidebar/><Header/><Content/></AppLayout>
// fikri burada Next.js App Router'ın kök layout'una uygulandı.
// Header için kaynak metinde kod verilmemişti; burada basit bir üst bar
// olarak eklendi.

export const metadata: Metadata = {
  title: "TMGD Yönetim Sistemi",
  description: "Tehlikeli Madde Güvenlik Danışmanlığı Yönetim Platformu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <div className="flex">
          <Sidebar />

          <div className="flex-1 min-h-screen">
            <header className="border-b p-4 flex items-center justify-between">
              <span className="font-medium">TMGD Yönetim Sistemi</span>
            </header>

            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
