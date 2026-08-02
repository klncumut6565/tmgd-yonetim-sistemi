"use client";

// src/hooks/useAudioRecorder.ts
//
// MediaRecorder tabanlı ses kaydı — ChatGPT'nin kullandığı yaklaşım.
//
// NEDEN: Web Speech API (SpeechRecognition) tarayıcının KENDİ konuşma
// servisine bağımlı (Chrome→Google, Edge→Microsoft, Opera→yok). Bu yüzden
// davranış tarayıcıdan tarayıcıya değişiyor, bazılarında hiç çalışmıyor,
// bazılarında sessizce cevapsız kalıyor.
//
// MediaRecorder ise sadece sesi KAYDEDER — metne çevirmeyi biz kendi
// sunucumuzda (/api/speech-to-text) yapıyoruz. Böylece davranış her
// tarayıcıda aynı olur.
//
// Sessizlik algılama: AnalyserNode ile ses seviyesi izlenir; kullanıcı
// konuşmayı bırakınca (belirlenen süre boyunca sessizlik) kayıt otomatik
// biter — kullanıcının "bitti" demesine gerek kalmaz.

import { useCallback, useRef, useState } from "react";

const SESSIZLIK_ESIGI = 0.02; // RMS eşiği (0-1) — altı "sessizlik" sayılır.
// NOT: Eşik bilinçli olarak yüksek tutuluyor. Düşük eşik = ortam gürültüsü
// "konuşma" sayılır = boş kayıt gönderilir = Whisper halüsinasyon üretir
// ("İzlediğiniz için teşekkür ederim" gibi uydurma metinler).
const MIN_KONUSMA_MS = 400; // bu süreden kısa "konuşma" gürültü sayılır
const SESSIZLIK_SURESI_MS = 1500; // bu kadar sessizlik = konuşma bitti
const MAKS_KAYIT_MS = 15000; // güvenlik: en fazla 15 sn kayıt.
// Not: Uzun kayıt = büyük dosya = yavaş yükleme + yavaş transkripsiyon.
// Sunucu fonksiyonunun zaman sınırı olduğu için kısa tutmak önemli;
// tek bir soru için 15 saniye fazlasıyla yeterli.

export function useAudioRecorder() {
  const [kaydediyor, setKaydediyor] = useState(false);
  const [seviye, setSeviye] = useState(0); // 0-1, görsel gösterge için
  const [hata, setHata] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const parcalarRef = useRef<Blob[]>([]);
  const sessizlikBaslangicRef = useRef<number | null>(null);
  const animasyonRef = useRef<number | null>(null);
  const maksSureRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const konusmaAlgilandiRef = useRef(false);
  const konusmaSuresiRef = useRef(0);
  const sonOlcumRef = useRef(0);

  const desteklenir =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof MediaRecorder !== "undefined";

  const temizle = useCallback(() => {
    if (animasyonRef.current) cancelAnimationFrame(animasyonRef.current);
    if (maksSureRef.current) clearTimeout(maksSureRef.current);
    animasyonRef.current = null;
    maksSureRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    sessizlikBaslangicRef.current = null;
    setSeviye(0);
  }, []);

  const durdur = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop(); // onstop -> temizle + callback
    } else {
      temizle();
      setKaydediyor(false);
    }
  }, [temizle]);

  /**
   * Kaydı başlatır. Kullanıcı susunca (veya durdur() çağrılınca) kayıt
   * biter ve `onTamamlandi` ses verisiyle çağrılır.
   * Hiç konuşma algılanmadıysa onTamamlandi(null) döner.
   */
  const baslat = useCallback(
    async (
      onTamamlandi: (ses: Blob | null) => void,
      opsiyon?: {
        /**
         * Kullanıcı konuşmaya başladığı anda tetiklenir.
         *
         * "Barge-in" için: asistan konuşurken kayıt açık tutulur ve kullanıcı
         * araya girdiğinde bu geri çağırma ile asistanın sesi kesilir.
         */
        onKonusmaBasladi?: () => void;
        /**
         * onKonusmaBasladi tetiklenmeden önce sesin KESİNTİSİZ olarak bu
         * süre kadar eşik üstünde kalması gerekir (ms).
         *
         * Rüzgâr, kapı, araç gibi çevre sesleri anlıktır; konuşma
         * süreklidir. Bu koşul olmadan tek bir gürültü darbesi asistanın
         * sözünü kesiyordu.
         */
        minSesSuresiMs?: number;
        /**
         * Sessizlik eşiğini çarpar. Asistan konuşurken hoparlör sesinin
         * mikrofona sızma ihtimaline karşı eşik yükseltilir (örn. 2.5) —
         * böylece asistanın kendi sesi "kullanıcı konuşuyor" sanılmaz.
         */
        esikCarpani?: number;
      }
    ) => {
      if (!desteklenir) {
        setHata("Bu tarayıcı ses kaydını desteklemiyor.");
        return;
      }
      setHata("");
      const etkinEsik = SESSIZLIK_ESIGI * (opsiyon?.esikCarpani ?? 1);
      const minSesSuresi = opsiyon?.minSesSuresiMs ?? 0;
      // Kesintisiz ses başlangıcı ve barge-in'in bir kez tetiklenmesi için
      let sesBaslangic: number | null = null;
      let bargeInBildirildi = false;
      konusmaAlgilandiRef.current = false;
      konusmaSuresiRef.current = 0;
      sonOlcumRef.current = 0;
      parcalarRef.current = [];

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        setHata(
          "Mikrofona erişilemedi. Tarayıcının adres çubuğundaki kilit simgesinden " +
            "\"Mikrofon\" iznini \"İzin Ver\" yapıp sayfayı yenile."
        );
        return;
      }
      streamRef.current = stream;

      // Ses seviyesi analizi (sessizlik algılama + görsel gösterge)
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const kaynak = ctx.createMediaStreamSource(stream);
        const analiz = ctx.createAnalyser();
        analiz.fftSize = 512;
        kaynak.connect(analiz);
        const veri = new Uint8Array(analiz.frequencyBinCount);

        const olc = () => {
          analiz.getByteTimeDomainData(veri);
          // RMS hesabı (0-1 aralığına normalize)
          let toplam = 0;
          for (let i = 0; i < veri.length; i++) {
            const v = (veri[i] - 128) / 128;
            toplam += v * v;
          }
          const rms = Math.sqrt(toplam / veri.length);
          setSeviye(Math.min(1, rms * 6));

          const simdi = Date.now();
          if (rms > etkinEsik) {
            // Gerçek konuşma süresini biriktir — tek bir "tık" sesi değil,
            // anlamlı bir konuşma olduğundan emin olmak için.
            if (sonOlcumRef.current > 0) {
              konusmaSuresiRef.current += simdi - sonOlcumRef.current;
            }
            // Kesintisiz ses süresini takip et
            if (sesBaslangic === null) sesBaslangic = simdi;

            // Barge-in: yalnızca ses YETERİNCE UZUN sürdüyse haber ver.
            // Böylece anlık gürültüler (rüzgâr, araç, kapı) asistanın
            // sözünü kesmiyor.
            if (
              !bargeInBildirildi &&
              opsiyon?.onKonusmaBasladi &&
              simdi - sesBaslangic >= minSesSuresi
            ) {
              bargeInBildirildi = true;
              opsiyon.onKonusmaBasladi();
            }

            konusmaAlgilandiRef.current = true;
            sessizlikBaslangicRef.current = null;
          } else {
            // Ses eşiğin altına düştü — kesintisiz sayaç sıfırlanır, böylece
            // aralıklı gürültüler birikip barge-in'i tetikleyemez
            sesBaslangic = null;
          }

          if (rms <= etkinEsik && konusmaAlgilandiRef.current) {
            // Sadece bir kez konuşma algılandıktan SONRA sessizliği say
            if (sessizlikBaslangicRef.current === null) {
              sessizlikBaslangicRef.current = simdi;
            } else if (simdi - sessizlikBaslangicRef.current > SESSIZLIK_SURESI_MS) {
              durdur();
              return;
            }
          }
          sonOlcumRef.current = simdi;
          animasyonRef.current = requestAnimationFrame(olc);
        };
        animasyonRef.current = requestAnimationFrame(olc);
      } catch {
        // Analiz kurulamadıysa kayıt yine de çalışsın; sadece otomatik
        // durma özelliği olmaz (kullanıcı elle durdurur).
      }

      // Tarayıcının desteklediği ilk formatı seç
      const adaylar = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mimeType = adaylar.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) parcalarRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const yeterliKonusma =
          konusmaAlgilandiRef.current && konusmaSuresiRef.current >= MIN_KONUSMA_MS;
        temizle();
        setKaydediyor(false);
        const blob = new Blob(parcalarRef.current, { type: mimeType || "audio/webm" });
        // Yeterli konuşma yoksa hiç gönderme — boş/gürültülü kayıt
        // Whisper'da uydurma metne ("İzlediğiniz için teşekkür ederim")
        // yol açıyor ve sesli modda saçma bir döngü başlatıyor.
        onTamamlandi(yeterliKonusma && blob.size > 2000 ? blob : null);
      };

      recorder.start();
      setKaydediyor(true);

      maksSureRef.current = setTimeout(() => durdur(), MAKS_KAYIT_MS);
    },
    [desteklenir, durdur, temizle]
  );

  return { desteklenir, kaydediyor, seviye, hata, baslat, durdur };
}
