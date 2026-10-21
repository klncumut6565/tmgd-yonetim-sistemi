"use client";

// src/components/adr-assistant/VoiceWaveform.tsx
//
// Sesli görüşme dalga görselleştirmesi. Tek bir <canvas> + requestAnimationFrame
// döngüsü; ses verisi her karede ref/getter'lardan OKUNUR — React state'i
// güncellenmez, ek render oluşmaz.
//
// VERİ KAYNAKLARI (hepsi salt okuma; ses akışına hiçbir şey eklenmez):
//   • Asistan (Canlı Konuşma): AudioPlaybackQueue'daki AnalyserNode — modelin
//     GERÇEKTEN çalınan sesi (jitter tamponu dahil, hoparlörle senkron).
//   • Kullanıcı (Canlı Konuşma): gürültü kapısından geçen mikrofon seviyesi —
//     ortam gürültüsü ve hoparlör yankısı 0 gelir, sesler karışmaz.
//   • Kullanıcı (klasik mod): useAudioRecorder'ın mevcut seviye ölçümü.
//   • Asistan (klasik mod / tarayıcı TTS): speechSynthesis sesi Web Audio'dan
//     geçmediği için ANALİZ EDİLEMEZ → `sentetikKonusma` ile temsili animasyon
//     çizilir ve bu durum erişilebilirlik etiketinde açıkça belirtilir.
//
// Durum yönetimi YOK: görsel durum doğrudan mevcut VoiceState'ten türetilir.

import { useEffect, useRef } from "react";
import type { VoiceState } from "@/lib/voice/types";
import { AnalizOkuyucu, yumusat } from "@/lib/voice/sesAnalizi";

export interface VoiceWaveformProps {
  /** Mevcut ses durum makinesinin durumu (useRealtimeVoice veya klasik moddan türetilmiş). */
  durum: VoiceState;
  /** Asistanın çalınan sesine ait analiz düğümü (Canlı Konuşma). Yoksa null. */
  asistanAnalyser?: () => AnalyserNode | null;
  /** Kullanıcı mikrofon seviyesi, 0..1 (gürültüden arındırılmış). */
  kullaniciSeviyesi: () => number;
  /** true: asistan sesi analiz edilemiyor (tarayıcı TTS) — temsili animasyon. */
  sentetikKonusma?: boolean;
  className?: string;
}

const RENK = {
  asistan: ["rgba(124,58,237,0.95)", "rgba(168,85,247,0.55)", "rgba(196,181,253,0.45)"], // mor — mevcut Canlı Konuşma rengi
  kullanici: ["rgba(13,148,136,0.95)", "rgba(45,212,191,0.5)", "rgba(153,246,228,0.45)"], // turkuaz — asistandan ayrışır
  isleniyor: ["rgba(217,119,6,0.9)", "rgba(251,191,36,0.45)", "rgba(253,230,138,0.4)"],
  arac: ["rgba(37,99,235,0.9)", "rgba(96,165,250,0.45)", "rgba(191,219,254,0.4)"],
  baglanti: ["rgba(156,163,175,0.9)", "rgba(209,213,219,0.5)", "rgba(229,231,235,0.4)"],
  hata: ["rgba(220,38,38,0.9)", "rgba(248,113,113,0.35)", "rgba(254,202,202,0.3)"],
} as const;

const ETIKET: Record<VoiceState, string> = {
  idle: "Sesli görüşme kapalı",
  connecting: "Bağlantı kuruluyor",
  listening: "Asistan dinliyor",
  user_speaking: "Kullanıcı konuşuyor",
  processing: "İstek işleniyor",
  tool_calling: "Veri sorgulanıyor",
  speaking: "Asistan konuşuyor",
  reconnecting: "Bağlantı yeniden kuruluyor",
  error: "Bağlantı hatası",
};

export default function VoiceWaveform({ durum, asistanAnalyser, kullaniciSeviyesi, sentetikKonusma, className }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Prop'lar her render'da ref'e yazılır; döngü yeniden kurulmadan güncel değeri okur.
  const propsRef = useRef({ durum, asistanAnalyser, kullaniciSeviyesi, sentetikKonusma });
  propsRef.current = { durum, asistanAnalyser, kullaniciSeviyesi, sentetikKonusma };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ---- Boyut (HiDPI) ----
    let genislik = 0;
    let yukseklik = 0;
    const boyutla = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      genislik = r.width;
      yukseklik = r.height;
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    boyutla();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(boyutla) : null;
    ro?.observe(canvas);

    // ---- Hareket azaltma tercihi ----
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let azHareket = !!mq?.matches;
    const mqDegisti = (e: MediaQueryListEvent) => {
      azHareket = e.matches;
    };
    mq?.addEventListener?.("change", mqDegisti);

    const okuyucu = new AnalizOkuyucu();

    // ---- Animasyon durumu ----
    const genlik = [0, 0, 0]; // her katmanın yumuşatılmış genliği (0..1)
    let faz = 0;
    let oncekiZaman = performance.now();
    let rafId = 0;

    const ciz = (simdi: number) => {
      rafId = requestAnimationFrame(ciz);
      const dt = Math.min(0.1, Math.max(0.001, (simdi - oncekiZaman) / 1000));
      oncekiZaman = simdi;
      const { durum: d, asistanAnalyser: getAnaliz, kullaniciSeviyesi: getKullanici, sentetikKonusma: sentetik } = propsRef.current;
      const sn = simdi / 1000;

      // 1) Hedef genlikler + renk + hız: durum → görsel
      let hedef: [number, number, number] = [0, 0, 0];
      let renk: readonly string[] = RENK.kullanici;
      let hiz = 1.2; // faz hızı (rad/sn)
      let alfa = 1;
      let kesikli = false;

      if (d === "speaking") {
        renk = RENK.asistan;
        hiz = 5;
        const olcum = !sentetik ? okuyucu.oku(getAnaliz?.() ?? null) : null;
        if (olcum) {
          const { seviye, alcak, orta, yuksek } = olcum;
          hedef = [seviye * (0.55 + 0.45 * alcak), seviye * (0.4 + 0.6 * orta), seviye * (0.3 + 0.7 * yuksek)];
        } else if (sentetik) {
          // TEMSİLİ: tarayıcı TTS sesi okunamıyor; konuşma ritmini taklit eden
          // sınırlı, düzenli bir hareket (gerçek seviye iddiası yok).
          const r = 0.32 + 0.12 * Math.sin(sn * 6.1) + 0.08 * Math.sin(sn * 2.3 + 1);
          hedef = [r, r * 0.7, r * 0.45];
          alfa = 0.75;
        }
      } else if (d === "listening" || d === "user_speaking") {
        renk = RENK.kullanici;
        const s = Math.min(1, Math.max(0, getKullanici()));
        hedef = [s, s * 0.7, s * 0.45];
        hiz = 1.2 + s * 4;
        // Sessizlikte neredeyse düz, çok hafif "nefes" — gereksiz hareket yok.
        const taban = 0.025 + (azHareket ? 0 : 0.012 * Math.sin(sn * 1.6));
        hedef = hedef.map((h) => Math.max(h, taban)) as [number, number, number];
        alfa = d === "user_speaking" || s > 0.05 ? 1 : 0.7;
      } else if (d === "processing" || d === "tool_calling") {
        renk = d === "tool_calling" ? RENK.arac : RENK.isleniyor;
        hiz = 3.2;
        const nabiz = azHareket ? 0.14 : 0.12 + 0.05 * Math.sin(sn * 3.5);
        hedef = [nabiz, nabiz * 0.75, nabiz * 0.5];
      } else if (d === "connecting" || d === "reconnecting") {
        renk = RENK.baglanti;
        hiz = 2;
        kesikli = true;
        hedef = [0.06, 0.04, 0.02];
        alfa = azHareket ? 0.8 : 0.55 + 0.35 * Math.sin(sn * 3);
      } else if (d === "error") {
        renk = RENK.hata;
        hiz = 0;
        hedef = [0.015, 0, 0];
      }

      // 2) Yumuşatma (az hareket modunda daha yavaş tepki)
      const yuk = azHareket ? 0.25 : 0.045;
      const son = azHareket ? 0.45 : 0.16;
      for (let i = 0; i < 3; i++) genlik[i] = yumusat(genlik[i], hedef[i], dt, yuk, son);
      if (!azHareket) faz += hiz * dt;

      // 3) Çizim
      ctx.clearRect(0, 0, genislik, yukseklik);
      if (genislik <= 0 || yukseklik <= 0) return;
      const orta = yukseklik / 2;
      const maksA = orta - 2;
      ctx.globalAlpha = alfa;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash(kesikli ? [4, 6] : []);

      // Arkadan öne: soluk geniş katmanlar, en önde ana çizgi.
      const katmanlar = [
        { i: 2, frekans: 2.6, kayma: 2.1, kalinlik: 1.2 },
        { i: 1, frekans: 1.9, kayma: 1.0, kalinlik: 1.5 },
        { i: 0, frekans: 1.4, kayma: 0, kalinlik: 2 },
      ];
      const adim = 3; // px — yeterince pürüzsüz, mobilde hafif
      for (const k of katmanlar) {
        const A = genlik[k.i] * maksA;
        ctx.beginPath();
        for (let x = 0; x <= genislik; x += adim) {
          const u = x / genislik; // 0..1
          // Kenarlarda sıfıra inen zarf: dalga panelin ortasında toplanır.
          const zarf = Math.pow(Math.sin(Math.PI * u), 2);
          const y = orta + A * zarf * Math.sin(u * Math.PI * 2 * k.frekans + faz * (1 + k.i * 0.35) + k.kayma);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = renk[k.i];
        ctx.lineWidth = k.kalinlik;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    rafId = requestAnimationFrame(ciz);

    // Temizlik: döngü, gözlemci ve dinleyiciler. (Analiz düğümüne dokunulmaz —
    // onun yaşam döngüsü AudioPlaybackQueue'ya aittir.)
    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      mq?.removeEventListener?.("change", mqDegisti);
      okuyucu.birak();
    };
  }, []);

  const etiket = sentetikKonusma && durum === "speaking" ? "Asistan konuşuyor (temsili animasyon; tarayıcı sesi analiz edilemiyor)" : ETIKET[durum];

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={etiket}
      title={etiket}
      className={"block w-full h-10 " + (className ?? "")}
    />
  );
}
