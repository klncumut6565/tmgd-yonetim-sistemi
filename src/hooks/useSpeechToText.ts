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
  const [gunluk, setGunluk] = useState<string[]>([]);
  const recognitionRef = useRef<InstanceType<NonNullable<Window["SpeechRecognition"]>> | null>(null);
  const onResultRef = useRef<((metin: string) => void) | null>(null);

  const kaydet = useCallback((satir: string) => {
    const zaman = new Date().toLocaleTimeString("tr-TR", { hour12: false });
    setGunluk((g) => [...g.slice(-14), `${zaman} ${satir}`]);
  }, []);

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

    // ---- TEŞHİS OLAYLARI ----
    // Bu zincir, sorunun tam olarak hangi adımda olduğunu gösterir:
    //   start yok            -> tanıyıcı hiç başlamıyor
    //   start var, audio yok -> mikrofon açılmıyor (izin/cihaz)
    //   audio var, sound yok -> mikrofon açık ama hiç ses gelmiyor (yanlış
    //                            giriş cihazı seçili / cihaz sessize alınmış)
    //   sound var, speech yok-> ses var ama konuşma olarak tanınmıyor
    //   speech var, result yok-> tanıma servisine ulaşılamıyor (ağ/dil)
    recognition.onstart = () => kaydet("▶ start (tanıyıcı başladı)");
    recognition.onaudiostart = () => kaydet("🎙 audiostart (mikrofon açıldı)");
    recognition.onsoundstart = () => kaydet("🔉 soundstart (ses algılandı)");
    recognition.onspeechstart = () => kaydet("🗣 speechstart (konuşma algılandı)");
    recognition.onspeechend = () => kaydet("🤐 speechend");
    recognition.onsoundend = () => kaydet("🔇 soundend");
    recognition.onaudioend = () => kaydet("📴 audioend (mikrofon kapandı)");

    recognition.onresult = (event) => {
      let finalMetin = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalMetin += result[0].transcript;
        }
      }
      kaydet(`✅ result: "${finalMetin.trim().slice(0, 40)}"`);
      if (finalMetin.trim() && onResultRef.current) {
        onResultRef.current(finalMetin.trim());
      }
    };

    recognition.onerror = (event) => {
      const kod = event.error;
      kaydet(`❌ error: ${kod}`);
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
      kaydet("⏹ end (tanıyıcı durdu)");
      setDinliyor(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [kaydet]);

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
    kaydet(`🔑 izin durumu: ${izinDurumu}`);

    // Teşhis: sistemde kaç mikrofon var, isimleri görünüyor mu?
    try {
      const cihazlar = await navigator.mediaDevices.enumerateDevices();
      const mikrofonlar = cihazlar.filter((c) => c.kind === "audioinput");
      const isimliOlan = mikrofonlar.filter((m) => m.label).length;
      kaydet(`🎚 mikrofon sayısı: ${mikrofonlar.length} (isimli: ${isimliOlan})`);
    } catch {
      kaydet("🎚 cihaz listesi alınamadı");
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
      kaydet("📞 start() çağrıldı");
    } catch (e) {
      kaydet(`⚠ start() istisna: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [kaydet]);

  const durdur = useCallback(() => {
    recognitionRef.current?.stop();
    setDinliyor(false);
  }, []);

  const gunluguTemizle = useCallback(() => setGunluk([]), []);

  return { desteklenir, dinliyor, hata, hataKodu, tarayiciUyarisi, gunluk, gunluguTemizle, baslat, durdur };
}
