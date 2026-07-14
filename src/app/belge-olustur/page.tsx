"use client";

// BELGE OLUŞTUR — bağımsız sayfa (sol menüden erişilir)
// Asıl mantık src/components/BelgeOlusturForm.tsx içinde — bu sayfa yalnızca
// firma seçiciyi gösterir ve ?firm=<id> ile gelindiyse (firma detay
// sayfasındaki "Belge Oluştur" sekmesinden) firmayı ön seçili yapar.

import { useSearchParams } from "next/navigation";
import BelgeOlusturForm from "@/components/BelgeOlusturForm";

export default function BelgeOlusturPage() {
  const searchParams = useSearchParams();
  const preselectFirmId = searchParams.get("firm") || "";

  // Not: BelgeOlusturForm, fixedFirmId verilmediğinde kendi firma seçicisini
  // gösterir; bu sayfa yalnızca query param varsa ilk render'da o firmayı
  // seçili başlatmak için key kullanır (firm değişince component yeniden kurulur).
  return <BelgeOlusturForm key={preselectFirmId || "none"} initialFirmId={preselectFirmId} />;
}
