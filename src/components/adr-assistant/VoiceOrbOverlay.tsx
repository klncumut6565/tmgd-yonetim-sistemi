"use client";

// src/components/adr-assistant/VoiceOrbOverlay.tsx
//
// Canlı Konuşma açıkken TÜM EKRANI kaplayan, yarı saydam "enerji küresi"
// animasyonu. ADRAssistantWidget AppShell'de bir kez mount edildiği için
// sayfalar arası gezinirken kesilmeden devam eder.
//
// • pointer-events: none — sayfa normal kullanılmaya devam eder (yalnızca
//   üstteki "Durdur" hapı tıklanabilir).
// • Ses verisi her karede getter'lardan OKUNUR (React render'ı yok):
//     asistan konuşurken → AudioPlaybackQueue'daki AnalyserNode (GERÇEK ses)
//     dinlerken / kullanıcı konuşurken → gürültü kapısından geçen mikrofon seviyesi
// • Görsel durum doğrudan VoiceState'ten türetilir; ayrı durum makinesi yok.
// • prefers-reduced-motion: dönme/parçacık hareketi durur, yalnızca parlaklık
//   sese tepki verir.
// • Performans: shadowBlur kullanılmaz (mobilde pahalı); parıltı katmanlı
//   çizgi + "lighter" karıştırma ile yapılır, çözünürlük DPR ≤ 1.5 ile sınırlı.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { VoiceState } from "@/lib/voice/types";
import { AnalizOkuyucu, yumusat } from "@/lib/voice/sesAnalizi";

export interface VoiceOrbOverlayProps {
  durum: VoiceState;
  asistanAnalyser: () => AnalyserNode | null;
  kullaniciSeviyesi: () => number;
  /** Sağdaki asistan paneli açıksa kapladığı genişlik (px); küre kalan alanda ortalanır. */
  sagBosluk?: number;
  onDurdur?: () => void;
}

/** Küre katmanının genel saydamlığı (0..1). Düşük = sayfa daha net görünür.
 *  Durdur hapı ve alt etiket bu değerden etkilenmez (okunaklı kalsın). */
const KURE_OPAKLIK = 0.6;

const ETIKET: Record<VoiceState, string> = {
  idle: "",
  connecting: "BAĞLANIYOR",
  listening: "DİNLİYOR",
  user_speaking: "SENİ DUYUYOR",
  processing: "DÜŞÜNÜYOR",
  tool_calling: "VERİYE BAKIYOR",
  speaking: "KONUŞUYOR",
  reconnecting: "YENİDEN BAĞLANIYOR",
  error: "BAĞLANTI HATASI",
};

/** Durum → [ton (hue), doygunluk %, yoğunluk 0..1] */
const PALET: Record<VoiceState, [number, number, number]> = {
  idle: [275, 80, 0],
  connecting: [265, 25, 0.5],
  listening: [272, 82, 0.72],
  user_speaking: [188, 80, 0.95], // turkuaz: kullanıcı sesi asistandan ayrışır
  processing: [38, 85, 0.85],
  tool_calling: [215, 85, 0.85],
  speaking: [282, 88, 1],
  reconnecting: [265, 25, 0.5],
  error: [0, 80, 0.6],
};

type Halka = { rx: number; oran: number; egim: number; hiz: number; f1: number; f2: number; k1: number; k2: number; bant: 0 | 1 | 2 };
type Parcacik = { r: number; a: number; w: number; boy: number; ph: number };
type Kivilcim = { x: number; y: number; vx: number; vy: number; omur: number; maks: number };

/** Tekrarlanabilir sözde rastgele (her mount'ta aynı desen). */
function rastgeleUret(tohum: number) {
  let s = tohum >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export default function VoiceOrbOverlay({ durum, asistanAnalyser, kullaniciSeviyesi, sagBosluk = 0, onDurdur }: VoiceOrbOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const noktaRef = useRef<HTMLSpanElement>(null);
  const [hazir, setHazir] = useState(false); // portal yalnızca istemcide
  const [gorunur, setGorunur] = useState(false); // yumuşak giriş
  const propsRef = useRef({ durum, asistanAnalyser, kullaniciSeviyesi, sagBosluk });
  propsRef.current = { durum, asistanAnalyser, kullaniciSeviyesi, sagBosluk };

  useEffect(() => {
    setHazir(true);
    const id = requestAnimationFrame(() => setGorunur(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!hazir) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ---- Boyut ----
    let W = 0;
    let H = 0;
    const boyutla = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    boyutla();
    window.addEventListener("resize", boyutla);

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let azHareket = !!mq?.matches;
    const mqDegisti = (e: MediaQueryListEvent) => {
      azHareket = e.matches;
    };
    mq?.addEventListener?.("change", mqDegisti);

    // ---- Sahne öğeleri (bir kez üretilir) ----
    const rnd = rastgeleUret(20261022);
    const halkalar: Halka[] = Array.from({ length: 7 }, (_, i) => ({
      rx: 1.4 + rnd() * 0.65,
      oran: 0.55 + rnd() * 0.4,
      egim: rnd() * Math.PI,
      hiz: (rnd() < 0.5 ? -1 : 1) * (0.05 + rnd() * 0.13),
      f1: rnd() * Math.PI * 2,
      f2: rnd() * Math.PI * 2,
      k1: 2 + Math.floor(rnd() * 2),
      k2: 4 + Math.floor(rnd() * 2),
      bant: (i % 3) as 0 | 1 | 2,
    }));
    const parcaciklar: Parcacik[] = Array.from({ length: 150 }, () => {
      // merkeze yoğunlaşan dağılım
      const u = rnd();
      return { r: Math.pow(u, 1.8), a: rnd() * Math.PI * 2, w: (rnd() - 0.5) * 0.6, boy: 0.6 + rnd() * 1.2, ph: rnd() * Math.PI * 2 };
    });
    const kivilcimlar: Kivilcim[] = [];

    const okuyucu = new AnalizOkuyucu();
    let enerji = 0;
    let ton = PALET.listening[0];
    let doyg = PALET.listening[1];
    let yogun = 0;
    let sahneZamani = 0; // azHareket'te donar
    let bantlar: [number, number, number] = [0, 0, 0];
    let onceki = performance.now();
    let rafId = 0;

    /** Ton farkını en kısa yoldan yumuşat (ör. 350° → 10°). */
    const tonYumusat = (mevcut: number, hedef: number, dt: number) => {
      let fark = ((hedef - mevcut + 540) % 360) - 180;
      fark *= 1 - Math.exp(-dt / 0.35);
      return (mevcut + fark + 360) % 360;
    };

    const ciz = (simdi: number) => {
      rafId = requestAnimationFrame(ciz);
      const dt = Math.min(0.1, Math.max(0.001, (simdi - onceki) / 1000));
      onceki = simdi;
      const { durum: d, asistanAnalyser: getAnaliz, kullaniciSeviyesi: getKullanici, sagBosluk: bosluk } = propsRef.current;
      if (!azHareket) sahneZamani += dt;
      const t = sahneZamani;
      const sn = simdi / 1000;

      // 1) Hedef enerji
      let hedefEnerji = 0.04;
      let hedefBant: [number, number, number] = [0.3, 0.3, 0.3];
      if (d === "speaking") {
        const o = okuyucu.oku(getAnaliz());
        if (o) {
          hedefEnerji = o.seviye;
          hedefBant = [o.alcak, o.orta, o.yuksek];
        }
      } else if (d === "listening" || d === "user_speaking") {
        hedefEnerji = Math.max(0.03, Math.min(1, getKullanici()));
      } else if (d === "processing" || d === "tool_calling") {
        hedefEnerji = azHareket ? 0.18 : 0.14 + 0.08 * Math.sin(sn * 3.2);
      } else if (d === "connecting" || d === "reconnecting") {
        hedefEnerji = azHareket ? 0.06 : 0.05 + 0.04 * Math.sin(sn * 2.5);
      }
      enerji = yumusat(enerji, hedefEnerji, dt, azHareket ? 0.2 : 0.05, azHareket ? 0.4 : 0.18);
      for (let i = 0; i < 3; i++) bantlar[i] = yumusat(bantlar[i], hedefBant[i], dt, 0.06, 0.2);
      const [hTon, hDoyg, hYogun] = PALET[d];
      ton = tonYumusat(ton, hTon, dt);
      doyg = yumusat(doyg, hDoyg, dt, 0.3, 0.3);
      yogun = yumusat(yogun, hYogun, dt, 0.4, 0.4);
      const e = enerji;
      const I = yogun;

      // Alt göstergedeki nokta (DOM, render yok)
      if (noktaRef.current) noktaRef.current.style.transform = `scale(${(1 + e * 1.4).toFixed(3)})`;

      // 2) Yerleşim: panel açıksa kalan alanda ortala (yeterince genişse)
      const kalan = W - (bosluk || 0);
      const alanW = bosluk && kalan >= 520 ? kalan : W;
      const cx = alanW / 2;
      const cy = H * 0.46;
      const R = Math.max(56, Math.min(210, Math.min(alanW, H) * 0.17));

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);
      if (I < 0.01) return;

      // 3) Pus / bulutsu (yarı saydam, kenarlara doğru tamamen şeffaf)
      const pus = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 3.6);
      pus.addColorStop(0, `hsla(${ton},${doyg}%,32%,${0.2 * I})`);
      pus.addColorStop(0.5, `hsla(${ton},${doyg}%,26%,${0.08 * I})`);
      pus.addColorStop(1, `hsla(${ton},${doyg}%,20%,0)`);
      ctx.fillStyle = pus;
      ctx.fillRect(0, 0, W, H);
      for (let b = 0; b < 3; b++) {
        const aci = t * 0.07 * (b + 1) + b * 2.1;
        const bx = cx + Math.cos(aci) * R * 1.7;
        const by = cy + Math.sin(aci * 1.3) * R * 1.2;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, R * 1.9);
        g.addColorStop(0, `hsla(${ton + 12},${doyg}%,48%,${0.08 * I})`);
        g.addColorStop(1, `hsla(${ton + 12},${doyg}%,40%,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(bx - R * 1.9, by - R * 1.9, R * 3.8, R * 3.8);
      }

      ctx.globalCompositeOperation = "lighter";

      // 4) Yanlardan küreye akan ışık iplikleri
      for (let s = 0; s < 4; s++) {
        const taraf = s < 2 ? -1 : 1;
        const kenarX = taraf < 0 ? 0 : W;
        const hedefX = cx + taraf * R * 1.25;
        const yOff = (s % 2 === 0 ? -1 : 1) * R * (0.25 + 0.1 * s);
        const dalga = Math.sin(t * 0.6 + s) * R * 0.5 * (1 + e);
        ctx.beginPath();
        ctx.moveTo(kenarX, cy + yOff * 2.2 + dalga);
        ctx.bezierCurveTo(
          (kenarX + hedefX) / 2, cy + yOff * 3 - dalga,
          (kenarX + hedefX * 2) / 3, cy + yOff - dalga * 0.5,
          hedefX, cy + yOff * 0.6
        );
        ctx.strokeStyle = `hsla(${ton + 15},${doyg}%,72%,${0.05 * I})`;
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.strokeStyle = `hsla(${ton + 15},${doyg}%,82%,${0.22 * I})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 5) Küre gövdesi (yarı saydam koyu disk)
      ctx.globalCompositeOperation = "source-over";
      const govde = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.25, R * 0.1, cx, cy, R);
      govde.addColorStop(0, `hsla(${ton - 12},70%,34%,${0.3 * I})`);
      govde.addColorStop(1, `hsla(${ton - 18},75%,16%,${0.38 * I})`);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = govde;
      ctx.fill();

      ctx.globalCompositeOperation = "lighter";
      // Kenar parıltısı
      ctx.strokeStyle = `hsla(${ton + 10},90%,78%,${0.07 * I})`;
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = `hsla(${ton + 10},90%,85%,${(0.45 + e * 0.3) * I})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 6) İç kesikli halka
      ctx.save();
      ctx.setLineDash([R * 0.22, R * 0.16]);
      ctx.lineDashOffset = -t * R * 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (0.62 + e * 0.05), 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${ton + 40},90%,72%,${0.5 * I})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 7) Parlak çekirdek + parçacık bulutu
      const Rc = R * (0.26 + 0.24 * e);
      const cekirdek = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rc);
      cekirdek.addColorStop(0, `rgba(255,255,255,${0.95 * I})`);
      cekirdek.addColorStop(0.35, `hsla(${ton + 40},100%,82%,${0.45 * I})`);
      cekirdek.addColorStop(1, `hsla(${ton + 40},100%,70%,0)`);
      ctx.fillStyle = cekirdek;
      ctx.fillRect(cx - Rc, cy - Rc, Rc * 2, Rc * 2);
      const bulutR = R * 0.48 * (1 + e * 0.45);
      ctx.fillStyle = `hsla(${ton + 50},100%,90%,${0.7 * I})`;
      for (const p of parcaciklar) {
        const a = p.a + t * p.w;
        const r = p.r * bulutR;
        const parla = 0.5 + 0.5 * Math.sin(t * 3 + p.ph);
        if (parla < 0.25) continue;
        const boy = p.boy * (0.6 + parla * 0.6);
        ctx.fillRect(cx + Math.cos(a) * r - boy / 2, cy + Math.sin(a) * r - boy / 2, boy, boy);
      }

      // 8) Yörünge halkaları — sese göre şekil değiştirir
      const N = 96;
      for (let i = 0; i < halkalar.length; i++) {
        const h = halkalar[i];
        const rot = h.egim + t * h.hiz;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const amp = 0.035 + e * (0.12 + 0.14 * bantlar[h.bant]);
        const rx = h.rx * R * (1 + e * 0.08);
        const ry = rx * h.oran;
        ctx.beginPath();
        for (let j = 0; j <= N; j++) {
          const th = (j / N) * Math.PI * 2;
          const dz = 1 + amp * (0.6 * Math.sin(h.k1 * th + t * 0.9 + h.f1) + 0.4 * Math.sin(h.k2 * th - t * 1.3 + h.f2));
          const ex = Math.cos(th) * rx * dz;
          const ey = Math.sin(th) * ry * dz;
          const x = cx + ex * cosR - ey * sinR;
          const y = cy + ex * sinR + ey * cosR;
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const hh = ton + i * 5;
        ctx.strokeStyle = `hsla(${hh},95%,70%,${0.045 * I})`;
        ctx.lineWidth = 9;
        ctx.stroke();
        ctx.strokeStyle = `hsla(${hh},95%,78%,${0.12 * I})`;
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.strokeStyle = `hsla(${hh + 10},100%,90%,${(0.55 + e * 0.35) * I})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 9) Uçuşan kıvılcımlar (ses arttıkça çoğalır)
      if (!azHareket) {
        const uret = 0.6 + e * 6;
        if (Math.random() < uret * dt * 10 && kivilcimlar.length < 70) {
          const a = Math.random() * Math.PI * 2;
          const r0 = R * (1 + Math.random() * 0.8);
          const v = R * (0.08 + Math.random() * 0.25);
          kivilcimlar.push({ x: cx + Math.cos(a) * r0, y: cy + Math.sin(a) * r0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, omur: 0, maks: 1.5 + Math.random() * 2 });
        }
      }
      for (let k = kivilcimlar.length - 1; k >= 0; k--) {
        const s = kivilcimlar[k];
        s.omur += dt;
        if (s.omur > s.maks) {
          kivilcimlar.splice(k, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const a = Math.sin((s.omur / s.maks) * Math.PI) * 0.8 * I;
        ctx.fillStyle = `hsla(${ton + 30},100%,88%,${a})`;
        ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
      }
      ctx.globalCompositeOperation = "source-over";
    };
    rafId = requestAnimationFrame(ciz);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", boyutla);
      mq?.removeEventListener?.("change", mqDegisti);
      okuyucu.birak();
    };
  }, [hazir]);

  if (!hazir) return null;

  const etiket = ETIKET[durum];
  // Panel açık ve yanında yeterli alan varsa üst/alt öğeler de kalan alanda ortalanır.
  const kaydir = sagBosluk > 0 && window.innerWidth - sagBosluk >= 520 ? sagBosluk : 0;
  return createPortal(
    <div className={"fixed inset-0 z-[45] pointer-events-none transition-opacity duration-500 " + (gorunur ? "opacity-100" : "opacity-0")}>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ opacity: KURE_OPAKLIK }} />

      {onDurdur && (
        <div className="absolute top-3 inset-x-0 flex justify-center" style={{ paddingRight: kaydir }}>
          <button
            type="button"
            onClick={onDurdur}
            aria-label="Canlı konuşmayı durdur"
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-purple-300/60 bg-purple-950/40 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-purple-100 backdrop-blur-sm hover:bg-purple-900/60"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-200 animate-pulse motion-reduce:animate-none" />
            CANLI · DURDURMAK İÇİN DOKUN
          </button>
        </div>
      )}

      {etiket && (
        <div aria-hidden="true" className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-1.5" style={{ paddingRight: kaydir }}>
          <div className="flex items-center gap-2">
            <span className="h-px w-16 sm:w-24 [background-image:radial-gradient(circle,rgba(233,213,255,.8)_1px,transparent_1.5px)] [background-size:6px_1px]" />
            <span ref={noktaRef} className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_10px_3px_rgba(216,180,254,.8)] will-change-transform" />
            <span className="h-px w-16 sm:w-24 [background-image:radial-gradient(circle,rgba(233,213,255,.8)_1px,transparent_1.5px)] [background-size:6px_1px]" />
          </div>
          <span className="rounded-full bg-purple-950/35 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.3em] text-purple-100 backdrop-blur-sm">{etiket}</span>
        </div>
      )}
    </div>,
    document.body
  );
}
