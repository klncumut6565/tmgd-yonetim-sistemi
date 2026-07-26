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

    recognition.onerror = (event) => {
      const kod = event.error;
      let mesaj = "Ses tanıma sırasında bir hata oluştu.";
      if (kod === "not-allowed" || kod === "service-not-allowed") {
        mesaj =
          "Mikrofon izni reddedilmiş görünüyor. Tarayıcının adres çubuğundaki kilit/site bilgisi simgesine tıklayıp " +
          "\"Mikrofon\" iznini \"İzin Ver\" yap, sonra sayfayı yenile.";
      } else if (kod === "no-speech") {
        mesaj = "Ses algılanamadı — mikrofon açık ama konuşma duyulmadı. Tekrar dene.";
      } else if (kod === "audio-capture") {
        mesaj = "Mikrofon bulunamadı. Cihazında bir mikrofon bağlı/etkin olduğundan emin ol.";
      } else if (kod === "network") {
        mesaj = "Ağ hatası — ses tanıma servisine ulaşılamadı.";
      } else if (kod === "aborted") {
        mesaj = ""; // kullanıcı kendi durdurduysa hata gösterme
      }
      if (mesaj) setHata(mesaj);
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

  const baslat = useCallback(async (onSonuc: (metin: string) => void) => {
    if (!recognitionRef.current) return;
    setHata("");

    // Bazı tarayıcılarda SpeechRecognition.start() tek başına izin
    // penceresini güvenilir şekilde açmıyor (özellikle site daha önce
    // "engelle" ile kapatıldıysa sessizce başarısız oluyor). getUserMedia
    // ile açıkça izin istemek, tarayıcının izin penceresini garanti
    // tetiklemesini sağlar.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop()); // sadece izin için açtık, hemen kapat
    } catch {
      setHata(
        "Mikrofona erişilemedi — izin penceresi çıkmadıysa tarayıcının adres çubuğundaki " +
          "kilit/site bilgisi simgesine tıklayıp \"Mikrofon\" iznini \"İzin Ver\" yap, sonra sayfayı yenile."
      );
      return;
    }

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
