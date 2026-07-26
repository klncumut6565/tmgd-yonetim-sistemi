"use client";

// src/hooks/useSpeechToText.ts
// Web Speech API sarmalayıcısı. Tarayıcı destekliyorsa (Chrome/Edge) mikrofon
// ile konuşulanı Türkçe metne çevirir. Desteklemiyorsa (Safari, Firefox)
// `desteklenir = false` döner — çağıran taraf mikrofon butonunu gizler.

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechToText() {
  const [dinliyor, setDinliyor] = useState(false);
  const [desteklenir, setDesteklenir] = useState(false);
  const [hata, setHata] = useState("");
  const recognitionRef = useRef<InstanceType<NonNullable<Window["SpeechRecognition"]>> | null>(null);
  const onResultRef = useRef<((metin: string) => void) | null>(null);

  useEffect(() => {
    const Ctor =
      typeof window !== "undefined"
        ? window.SpeechRecognition ?? window.webkitSpeechRecognition
        : undefined;

    if (!Ctor) {
      setDesteklenir(false);
      return;
    }
    setDesteklenir(true);

    const recognition = new Ctor();
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      let finalMetin = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalMetin += result[0].transcript;
        }
      }
      if (finalMetin.trim() && onResultRef.current) {
        onResultRef.current(finalMetin.trim());
      }
    };

    recognition.onerror = () => {
      setHata("Ses tanıma sırasında bir hata oluştu.");
      setDinliyor(false);
    };

    recognition.onend = () => {
      setDinliyor(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const baslat = useCallback((onSonuc: (metin: string) => void) => {
    if (!recognitionRef.current) return;
    setHata("");
    onResultRef.current = onSonuc;
    setDinliyor(true);
    try {
      recognitionRef.current.start();
    } catch {
      // Zaten calisiyor olabilir — yut
    }
  }, []);

  const durdur = useCallback(() => {
    recognitionRef.current?.stop();
    setDinliyor(false);
  }, []);

  return { desteklenir, dinliyor, hata, baslat, durdur };
}
