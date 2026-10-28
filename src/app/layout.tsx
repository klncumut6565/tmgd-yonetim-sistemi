import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import UserProvider from "@/components/UserProvider";

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
        <UserProvider>
          <AppShell>{children}</AppShell>
        </UserProvider>
      </body>
    </html>
  );
}
