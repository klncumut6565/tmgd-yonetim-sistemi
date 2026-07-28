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
  const [hataKodu, setHataKodu] = useState("");
  const [tarayiciUyarisi, setTarayiciUyarisi] = useState("");
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

    // Opera, Chromium tabanlı olmasına rağmen Web Speech API'yi tam
    // desteklemiyor — nesne var gibi görünüyor ama ses tanıma çoğu zaman
    // hiç sonuç üretmiyor. Kullanıcıyı boşuna uğraştırmamak için uyar.
    const ua = navigator.userAgent;
    if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
      setTarayiciUyarisi(
        "Opera tarayıcısı ses tanımayı tam desteklemiyor. Sesli komut için Chrome veya Edge kullanmanı öneririm."
      );
    }

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
      setHataKodu(kod);
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

  const baslat = useCallback(async (onSonuc: (metin: string) => void, surekliDinleme: boolean = true) => {
    if (!recognitionRef.current) return;
    setHata("");
    setHataKodu("");

    // ÖNEMLİ (masaüstü hata düzeltmesi):
    // Önceki sürüm HER SEFERİNDE getUserMedia ile mikrofonu açıp HEMEN
    // kapatıyor, sonra SpeechRecognition.start() çağırıyordu. Bu bir yarış
    // durumu yaratıyor: cihaz daha yeni serbest bırakılmışken tanıyıcı
    // başlatılınca bazı masaüstü tarayıcılar (özellikle Opera) mikrofonu
    // yeniden yakalayamıyor ve hiç ses algılamıyordu (mobil tolere ediyordu).
    //
    // Yeni yaklaşım: izin DURUMUNU sor.
    //   - "granted" ise getUserMedia'ya hiç dokunma, doğrudan start() —
    //     mikrofonu tanıyıcının kendisi açsın, araya girme.
    //   - "prompt" ise (izin henüz sorulmamış) getUserMedia ile izin
    //     penceresini tetikle; stream'i kapat ama ardından tanıyıcıyı
    //     hemen değil, cihazın serbest kalması için kısa bir bekleme
    //     sonrası başlat.
    //   - "denied" ise kullanıcıya net talimat ver.
    let izinDurumu: PermissionState | "unknown" = "unknown";
    try {
      const sonuc = await navigator.permissions.query({ name: "microphone" as PermissionName });
      izinDurumu = sonuc.state;
    } catch {
      // Permissions API mikrofonu desteklemiyor olabilir (Firefox/Safari) — bilinmiyor kabul et
      izinDurumu = "unknown";
    }

    if (izinDurumu === "denied") {
      setHata(
        "Mikrofon izni tarayıcıda engellenmiş. Adres çubuğundaki kilit/site bilgisi simgesine tıklayıp " +
          "\"Mikrofon\" iznini \"İzin Ver\" yap, sonra sayfayı yenile."
      );
      setHataKodu("not-allowed");
      return;
    }

    if (izinDurumu !== "granted") {
      // İzin henüz verilmemiş (veya durum bilinmiyor): izin penceresini tetikle
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        // Cihazın tamamen serbest kalması için kısa bir nefes — bu olmadan
        // start() bazı tarayıcılarda sessizce başarısız oluyor.
        await new Promise((r) => setTimeout(r, 250));
      } catch {
        setHata(
          "Mikrofona erişilemedi — izin penceresi çıkmadıysa tarayıcının adres çubuğundaki " +
            "kilit/site bilgisi simgesine tıklayıp \"Mikrofon\" iznini \"İzin Ver\" yap, sonra sayfayı yenile."
        );
        setHataKodu("not-allowed");
        return;
      }
    }

    // Sesli Mod: surekliDinleme=false verilirse, tek cümle bitince
    // (konuşma sessizliği algılanınca) tarayıcı kendisi durur — kullanıcı
    // mikrofona tekrar basmadan otomatik "gönder" akışı kurulabilir.
    recognitionRef.current.continuous = surekliDinleme;

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

  return { desteklenir, dinliyor, hata, hataKodu, tarayiciUyarisi, baslat, durdur };
}
