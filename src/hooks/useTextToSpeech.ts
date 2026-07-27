"use client";

// src/hooks/useTextToSpeech.ts
// Tarayıcı yerleşik SpeechSynthesis API sarmalayıcısı — ücretsiz, sunucu
// gerektirmez. Türkçe ses varsa onu kullanır, yoksa varsayılan sese düşer.

import { useCallback, useEffect, useRef, useState } from "react";

function turkceSesiSec(): SpeechSynthesisVoice | null {
  const sesler = window.speechSynthesis.getVoices();
  return (
    sesler.find((s) => s.lang.toLowerCase().startsWith("tr")) ??
    sesler.find((s) => s.lang.toLowerCase().startsWith("tr-tr")) ??
    null
  );
}

// Konuşma öncesi metni temizler: markdown işaretleri, madde imleri,
// emoji'ler sesli okumada garip durur — sadeleştirilir.
function seslendirmeIcinTemizle(metin: string): string {
  return metin
    .replace(/```[\s\S]*?```/g, "") // kod/eylem blokları
    .replace(/[*_#`]/g, "")
    .replace(/^•\s*/gm, "")
    .replace(/[✓✗⚠️🤖📊⚠🔴🟢🎤🔊🔇📄]/gu, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

export function useTextToSpeech() {
  const [konusuyor, setKonusuyor] = useState(false);
  const [desteklenir, setDesteklenir] = useState(false);
  const sesRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setDesteklenir(false);
      return;
    }
    setDesteklenir(true);

    function sesleriYukle() {
      sesRef.current = turkceSesiSec();
    }
    sesleriYukle();
    window.speechSynthesis.addEventListener("voiceschanged", sesleriYukle);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", sesleriYukle);
  }, []);

  const konus = useCallback((metin: string, onBitince?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // önceki konuşmayı kes

    const temiz = seslendirmeIcinTemizle(metin);
    if (!temiz) {
      onBitince?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(temiz);
    utterance.lang = "tr-TR";
    if (sesRef.current) utterance.voice = sesRef.current;
    utterance.rate = 1.02;
    utterance.pitch = 1;

    utterance.onstart = () => setKonusuyor(true);
    utterance.onend = () => {
      setKonusuyor(false);
      onBitince?.();
    };
    utterance.onerror = () => {
      setKonusuyor(false);
      onBitince?.();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const durdur = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setKonusuyor(false);
  }, []);

  return { desteklenir, konusuyor, konus, durdur };
}
