"use client";

// src/components/adr-assistant/AiCoreOrb.tsx
//
// ADR Asistanı'nın simgesi — "AI Core / Holografik Küre". Robot yüzü yerine
// cam bir kürenin içinde parlayan yapay zekâ çekirdeği ve etrafında dönen
// ince holografik halkalar. Köşedeki buton, panel başlığı ve sohbet avatarı
// AYNI bileşeni farklı boyutta kullanır.
//
// HAREKET (CSS — ucuz; ayrıntı globals.css "AI CORE" bölümü):
//   • boşta: halkalar çok yavaş döner, çekirdek hafifçe nefes alır
//   • dinliyor / kullanıcı konuşuyor: biraz daha canlı
//   • düşünüyor / araç: halkalar hızlanır
//   • konuşuyor: halkalar hızlı + çekirdek GERÇEK ses seviyesine göre büyür
// Ses seviyesi `seviye` getter'ından rAF ile okunur ve yalnızca CSS
// değişkenine (--ai-lvl) yazılır — React render'ı tetiklenmez. Getter yoksa
// ya da durum "speaking" değilse döngü hiç çalışmaz.
//
// Tam ekran ses küresi (VoiceOrbOverlay) bundan BAĞIMSIZDIR.

import { useEffect, useId, useRef } from "react";
import type { VoiceState } from "@/lib/voice/types";

export interface AiCoreOrbProps {
  /** Piksel cinsinden çap. */
  boyut?: number;
  /** Canlı Konuşma durumu; verilmezse "boşta" animasyonu. */
  durum?: VoiceState | null;
  /** 0..1 ses seviyesi (asistan konuşurken). */
  seviye?: () => number;
  /** Halkalar gösterilsin mi (çok küçük boyutta sade görünüm için false). */
  halkalar?: boolean;
  className?: string;
}

function hiz(durum?: VoiceState | null): "bos" | "dinle" | "dusun" | "konus" | "hata" {
  switch (durum) {
    case "speaking":
      return "konus";
    case "processing":
    case "tool_calling":
    case "connecting":
    case "reconnecting":
      return "dusun";
    case "listening":
    case "user_speaking":
      return "dinle";
    case "error":
      return "hata";
    default:
      return "bos";
  }
}

export default function AiCoreOrb({ boyut = 40, durum, seviye, halkalar = true, className }: AiCoreOrbProps) {
  const kokRef = useRef<HTMLSpanElement>(null);
  const seviyeRef = useRef(seviye);
  seviyeRef.current = seviye;
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const mod = hiz(durum);

  // Gerçek ses → CSS değişkeni (yalnızca konuşurken).
  useEffect(() => {
    const el = kokRef.current;
    if (!el) return;
    if (mod !== "konus" || !seviyeRef.current) {
      el.style.setProperty("--ai-lvl", "0");
      return;
    }
    let raf = 0;
    let deger = 0;
    let onceki = performance.now();
    const dongu = (t: number) => {
      raf = requestAnimationFrame(dongu);
      const dt = Math.min(0.1, (t - onceki) / 1000);
      onceki = t;
      const hedef = Math.max(0, Math.min(1, seviyeRef.current?.() ?? 0));
      const tau = hedef > deger ? 0.05 : 0.18; // hızlı yüksel, yavaş sön
      deger += (hedef - deger) * (1 - Math.exp(-dt / tau));
      el.style.setProperty("--ai-lvl", deger.toFixed(3));
    };
    raf = requestAnimationFrame(dongu);
    return () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--ai-lvl", "0");
    };
  }, [mod]);

  const g1 = `aiR1${id}`;
  const g2 = `aiR2${id}`;

  return (
    <span
      ref={kokRef}
      aria-hidden="true"
      data-ai-mod={mod}
      className={"ai-core relative inline-block shrink-0 rounded-full " + (className ?? "")}
      style={{ width: boyut, height: boyut }}
    >
      {/* Cam küre gövdesi */}
      <span className="ai-core-govde absolute inset-0 rounded-full" />
      {/* Çekirdek (sese göre ölçeklenir) */}
      <span className="ai-core-cekirdek absolute rounded-full" />
      {/* Cam yansıması */}
      <span className="absolute rounded-full pointer-events-none" style={{ inset: "8% 30% 58% 18%", background: "radial-gradient(ellipse at 40% 40%, rgba(255,255,255,.45), rgba(255,255,255,0) 70%)" }} />
      {halkalar && (
        <svg className="absolute inset-0 overflow-visible" viewBox="0 0 100 100" width={boyut} height={boyut}>
          <defs>
            <linearGradient id={g1} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#e879f9" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id={g2} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f0abfc" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <g className="ai-core-halka1" style={{ transformOrigin: "50px 50px" }}>
            <ellipse cx="50" cy="50" rx="47" ry="16" fill="none" stroke={`url(#${g1})`} strokeWidth="1.6" transform="rotate(-24 50 50)" />
          </g>
          <g className="ai-core-halka2" style={{ transformOrigin: "50px 50px" }}>
            <ellipse cx="50" cy="50" rx="40" ry="27" fill="none" stroke={`url(#${g2})`} strokeWidth="1.1" transform="rotate(38 50 50)" />
          </g>
        </svg>
      )}
    </span>
  );
}
