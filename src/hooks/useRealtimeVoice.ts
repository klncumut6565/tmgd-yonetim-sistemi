"use client";

// src/hooks/useRealtimeVoice.ts
//
// "Canlı Konuşma" modu için state machine hook'u — bkz. plan Bölüm 4 ve
// Bölüm 39 (Realtime Session Lifecycle). Mevcut src/hooks/useSpeechToText.ts
// ve useTextToSpeech.ts (turn-based "Hızlı Komut" modu) BUNLARA DOKUNULMADI,
// ayrı ve bağımsız bir yeni hook'tur (bkz. plan Bölüm 27 "Legacy Voice Mode").
//
// AKIŞ:
//   connect() -> /api/assistant/realtime/session'dan ephemeral token al
//             -> GeminiLiveProvider.connect()
//             -> mikrofon aç, sesi sürekli provider'a gönder
//   Gemini bir tool çağırmak isterse -> onToolCall -> gerçek veri getirilir
//             (navigasyon ise router.push, veri sorgusuysa /api/assistant/tools)
//   Kullanıcı konuşarak keserse -> onInterrupted -> ses kuyruğu temizlenir
//
// Bu hook ADRAssistantWidget içinde "Canlı Konuşma (Beta)" butonuna bağlıdır.

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/supabase/authFetch";
import { GeminiLiveProvider } from "@/lib/voice/providers/geminiLive";
import { startMicCapture, AudioPlaybackQueue, type MicCapture } from "@/lib/voice/audioStream";
import { buildLiveInstruction, type LiveContext } from "@/lib/voice/geminiTools";
import type { VoiceSession, VoiceState, LiveMetrics, RealtimeSessionResponse } from "@/lib/voice/types";

const BOS_METRIK: LiveMetrics = {
  sonYanitMs: null,
  sonCalmaMs: null,
  ortYanitMs: null,
  tur: 0,
  sonAracMs: null,
  kesinti: 0,
  yenidenBaglanma: 0,
};

/** Mikrofon parçasında "ses var" saymak için RMS eşiği (Int16 ölçeğinde). */
const SES_ESIGI_RMS = 500;

const BOS_SESSION: VoiceSession = {
  metrics: BOS_METRIK,
  state: "idle",
  isMuted: false,
  isSpeaking: false,
  transcript: "",
  partialTranscript: "",
  assistantTranscript: "",
};

/** Gemini function-call adı -> uygulama içi firma sekmesi eşleşmesi
 *  gerekmiyor; open_firm zaten tam "tab" parametresini iletir. */
async function firmTabUrl(firmId: string, tab?: string): Promise<string> {
  const params = tab ? `?tab=${encodeURIComponent(tab)}` : "";
  return `/firms/${firmId}${params}`;
}

export interface RealtimeVoiceOptions {
  /** Oturum her açıldığında/yenilendiğinde GÜNCEL bağlamı (firma + geçmiş) verir. */
  getContext?: () => LiveContext;
  /** Bir konuşma turu bittiğinde (kullanıcı + asistan metni) çağrılır;
   *  widget bunu panel sohbet geçmişine ekler. */
  onTurn?: (turn: { user: string; assistant: string }) => void;
}

export function useRealtimeVoice(options: RealtimeVoiceOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const turKullaniciRef = useRef("");
  const router = useRouter();
  const [session, setSession] = useState<VoiceSession>(BOS_SESSION);

  const providerRef = useRef<GeminiLiveProvider | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playbackRef = useRef<AudioPlaybackQueue | null>(null);
  const mutedRef = useRef(false);
  const yenidenBaglaniyorRef = useRef(false);
  const yenidenBaglanRef = useRef<(() => Promise<void>) | null>(null);
  // Gemini transkripti parça parça gönderir; konuşmacı başına biriktirilir.
  const kullaniciMetinRef = useRef("");
  const asistanMetinRef = useRef("");

  const durumRef = useRef<VoiceState>("idle");
  // Gecikme ölçümü için zaman damgaları (performance.now ms).
  const sonSesZamaniRef = useRef<number | null>(null);
  const turSesAlindiRef = useRef(false); // bu turda ilk model sesi geldi mi
  const yanitToplamRef = useRef({ toplam: 0, adet: 0 });
  const dusunmeZamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guncelle = useCallback((patch: Partial<VoiceSession>) => {
    if (patch.state) durumRef.current = patch.state;
    setSession((prev) => ({ ...prev, ...patch }));
  }, []);

  const metrikGuncelle = useCallback((fn: (m: LiveMetrics) => LiveMetrics) => {
    setSession((prev) => ({ ...prev, metrics: fn(prev.metrics) }));
  }, []);

  /** Durum makinesi geçişi: bağlantı kurulmadan/hata/yeniden bağlanma
   *  sırasında gelen ses olayları durumu bozmasın diye yok sayılır. */
  const gec = useCallback(
    (yeni: VoiceState) => {
      const mevcut = durumRef.current;
      if (mevcut === "idle" || mevcut === "error" || mevcut === "connecting" || mevcut === "reconnecting") return;
      if (mevcut !== yeni) guncelle({ state: yeni });
    },
    [guncelle]
  );

  /** Gemini'nin çağırdığı bir tool'u gerçek veriyle karşılar. Navigasyon
   *  eylemleri (open_firm) client-side yönlendirme yapar; diğerleri
   *  /api/assistant/tools üzerinden GERÇEK Supabase verisini getirir —
   *  hiçbir sayı/isim burada uydurulmaz (bkz. dataTools.ts). */
  const araciCalistirIc = useCallback(
    async (name: string, args: Record<string, unknown>): Promise<unknown> => {
      if (name === "open_firm") {
        const firmId = typeof args.firm_id === "string" ? args.firm_id : "";
        if (!firmId) return { error: "firm_id eksik." };
        const tab = typeof args.tab === "string" ? args.tab : undefined;
        router.push(await firmTabUrl(firmId, tab));
        return { ok: true, navigated: true };
      }

      // search_firm / get_task_summary / get_missing_documents — hepsi
      // aynı endpoint üzerinden, gerçek yetkilendirilmiş kullanıcı
      // token'ıyla (Gemini'nin ephemeral token'ıyla DEĞİL) çağrılır.
      const res = await authFetch("/api/assistant/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: name, args }),
      });
      const json = await res.json().catch(() => ({ error: "Sunucu yanıtı ayrıştırılamadı." }));
      return json;
    },
    [router]
  );

  const araciCalistir = useCallback(
    async (name: string, args: Record<string, unknown>): Promise<unknown> => {
      gec("tool_calling");
      const t0 = performance.now();
      try {
        return await araciCalistirIc(name, args);
      } finally {
        const sure = Math.round(performance.now() - t0);
        metrikGuncelle((m) => ({ ...m, sonAracMs: sure }));
        console.info(`[canli-ses] araç ${name}: ${sure} ms`);
        gec("processing"); // sonuç modele gitti, cevap bekleniyor
      }
    },
    [gec, metrikGuncelle, araciCalistirIc]
  );

  /** Açık ne varsa (mikrofon, ses kuyruğu, WebSocket) kapatır; birden çok
   *  kez çağrılması güvenlidir. */
  const kaynaklariKapat = useCallback(async () => {
    micRef.current?.stop();
    micRef.current = null;
    playbackRef.current?.close();
    playbackRef.current = null;
    const p = providerRef.current;
    providerRef.current = null;
    try {
      await p?.disconnect();
    } catch {
      /* zaten kapalı */
    }
  }, []);

  /** Tamamlanan (veya kesilen) turu panel geçmişine bildirir ve tamponları sıfırlar. */
  const turuIsle = useCallback(() => {
    const asistan = asistanMetinRef.current.trim();
    const kullanici = turKullaniciRef.current.trim();
    if (asistan || kullanici) optionsRef.current.onTurn?.({ user: kullanici, assistant: asistan });
    asistanMetinRef.current = "";
    turKullaniciRef.current = "";
  }, []);

  /** Yeni bir provider'ı kurar: tüm olay dinleyicilerini bağlar. Hem ilk
   *  bağlantıda hem yeniden bağlanmada aynı şekilde kullanılır. */
  const saglayiciKur = useCallback(
    (provider: GeminiLiveProvider, playback: AudioPlaybackQueue) => {
      provider.onTranscript((event) => {
        if (event.type === "error") return;
        if (event.speaker === "user") {
          if (event.type === "partial") {
            // Yeni kullanıcı konuşması başlıyor: önceki asistan cevabını ekrandan temizle.
            if (!kullaniciMetinRef.current) {
              asistanMetinRef.current = "";
              guncelle({ assistantTranscript: "" });
            }
            kullaniciMetinRef.current += event.text;
            guncelle({ partialTranscript: kullaniciMetinRef.current });
            gec("user_speaking");
            // Yeni parça gelmezse kullanıcı sustu say → model "düşünüyor".
            if (dusunmeZamanlayiciRef.current) clearTimeout(dusunmeZamanlayiciRef.current);
            dusunmeZamanlayiciRef.current = setTimeout(() => {
              if (durumRef.current === "user_speaking") gec("processing");
            }, 900);
          }
        } else if (event.type === "partial") {
          // Asistan cevap vermeye başladı → kullanıcının cümlesi tamamlandı.
          if (kullaniciMetinRef.current) {
            guncelle({ transcript: kullaniciMetinRef.current, partialTranscript: "" });
            turKullaniciRef.current = kullaniciMetinRef.current;
            kullaniciMetinRef.current = "";
          }
          if (dusunmeZamanlayiciRef.current) clearTimeout(dusunmeZamanlayiciRef.current);
          asistanMetinRef.current += event.text;
          guncelle({ assistantTranscript: asistanMetinRef.current });
        }
      });
      provider.onTurnComplete(() => {
        // Model üretimi bitirdi; kullanıcı henüz konuşmadıysa bekleyen metni sabitle.
        if (kullaniciMetinRef.current) {
          guncelle({ transcript: kullaniciMetinRef.current, partialTranscript: "" });
          turKullaniciRef.current = kullaniciMetinRef.current;
          kullaniciMetinRef.current = "";
        }
        turuIsle();
        turSesAlindiRef.current = false; // sonraki tur için ölçümü sıfırla
        // Ses hâlâ çalıyorsa onSpeaking(false) "dinliyor"a geçirecek; çalmıyorsa şimdi geç.
        if (!playback.isPlaying()) gec("listening");
      });
      provider.onAudio((chunk) => {
        if (mutedRef.current) return;
        const ilkSes = !turSesAlindiRef.current;
        if (ilkSes) {
          // Bu turun İLK model sesi: kullanıcının son sesinden beri geçen süre.
          turSesAlindiRef.current = true;
          if (dusunmeZamanlayiciRef.current) clearTimeout(dusunmeZamanlayiciRef.current);
          const son = sonSesZamaniRef.current;
          if (son !== null) {
            const ms = Math.round(performance.now() - son);
            yanitToplamRef.current.toplam += ms;
            yanitToplamRef.current.adet += 1;
            const ort = Math.round(yanitToplamRef.current.toplam / yanitToplamRef.current.adet);
            metrikGuncelle((m) => ({ ...m, sonYanitMs: ms, ortYanitMs: ort, tur: m.tur + 1 }));
            console.info(`[canli-ses] ilk ses gecikmesi: ${ms} ms (ort. ${ort} ms)`);
          }
        }
        playback.enqueue(chunk);
        // Ölçüm bu tur için tamamlandı; model kendiliğinden konuşursa eski zamanı kullanma.
        if (ilkSes) sonSesZamaniRef.current = null;
      });
      provider.onInterrupted(() => {
        turuIsle(); // kesilen turda söylenen kısım da geçmişe girsin
        playback.clear();
        turSesAlindiRef.current = false;
        metrikGuncelle((m) => ({ ...m, kesinti: m.kesinti + 1 }));
        guncelle({ isSpeaking: false });
        gec("listening");
      });
      provider.onError((message) => guncelle({ state: "error", error: message }));
      provider.onToolCall(araciCalistir);
      // Oturum süresi doluyor → tutamaç varsa HEMEN kesintisiz yeniden bağlan.
      provider.onGoAway(() => {
        if (provider.getResumeHandle()) void yenidenBaglanRef.current?.();
      });
      // Beklenmeyen kopma → (varsa tutamaçla) yeniden bağlan.
      provider.onClose(() => void yenidenBaglanRef.current?.());
    },
    [araciCalistir, guncelle, turuIsle, gec, metrikGuncelle]
  );

  /** Mikrofon kesilmeden yeni bir WebSocket oturumu açar; tutamaç varsa
   *  konuşma kaldığı yerden devam eder. Üst üste en çok 3 deneme. */
  const yenidenBaglan = useCallback(async () => {
    if (yenidenBaglaniyorRef.current || !providerRef.current) return;
    yenidenBaglaniyorRef.current = true;
    const eski = providerRef.current;
    const tutamac = eski.getResumeHandle();
    const t0 = performance.now();
    guncelle({ state: "reconnecting" });
    try {
      for (let deneme = 1; deneme <= 3; deneme++) {
        try {
          const res = await authFetch("/api/assistant/realtime/session", { method: "POST" });
          const sessionData = (await res.json()) as RealtimeSessionResponse & { error?: string };
          if (!res.ok || !sessionData.token) throw new Error(sessionData.error || "Oturum yenilenemedi.");
          const yeni = new GeminiLiveProvider();
          const playback = playbackRef.current;
          if (!playback) return; // kullanıcı bu sırada kapattı
          saglayiciKur(yeni, playback);
          await yeni.connect(sessionData, tutamac, buildLiveInstruction(optionsRef.current.getContext?.()));
          providerRef.current = yeni; // mikrofon artık buna yazar
          await eski.disconnect().catch(() => {});
          metrikGuncelle((m) => ({ ...m, yenidenBaglanma: m.yenidenBaglanma + 1 }));
          console.info(`[canli-ses] yeniden bağlanma: ${Math.round(performance.now() - t0)} ms (tutamaç: ${tutamac ? "var" : "yok"})`);
          guncelle({ state: "listening", error: undefined });
          return;
        } catch {
          if (!providerRef.current) return; // kullanıcı kapattı
          await new Promise((r) => setTimeout(r, 500 * deneme));
        }
      }
      await kaynaklariKapat();
      guncelle({ state: "error", error: "Canlı bağlantı koptu ve yeniden kurulamadı. Tekrar başlatın." });
    } finally {
      yenidenBaglaniyorRef.current = false;
    }
  }, [guncelle, metrikGuncelle, kaynaklariKapat, saglayiciKur]);
  yenidenBaglanRef.current = yenidenBaglan;

  const connect = useCallback(async () => {
    // Önceki (hatalı/yarım kalmış) bağlantıdan artık kaynak bırakma.
    await kaynaklariKapat();
    kullaniciMetinRef.current = "";
    asistanMetinRef.current = "";
    turKullaniciRef.current = "";
    sonSesZamaniRef.current = null;
    turSesAlindiRef.current = false;
    yanitToplamRef.current = { toplam: 0, adet: 0 };
    guncelle({
      metrics: BOS_METRIK,
      state: "connecting",
      error: undefined,
      transcript: "",
      partialTranscript: "",
      assistantTranscript: "",
    });
    const provider = new GeminiLiveProvider();
    const playback = new AudioPlaybackQueue();
    try {
      const res = await authFetch("/api/assistant/realtime/session", { method: "POST" });
      const sessionData = (await res.json()) as RealtimeSessionResponse & { error?: string; details?: string };
      if (!res.ok || !sessionData.token) {
        const mesaj = [sessionData.error, sessionData.details].filter(Boolean).join(" — ");
        throw new Error(mesaj || "Oturum başlatılamadı.");
      }

      playback.onSpeaking((speaking) => {
        guncelle({ isSpeaking: speaking });
        if (speaking) {
          // İlk sesin gerçekten çalmaya başlaması (ağ + zamanlama dahil).
          if (sonSesZamaniRef.current !== null && durumRef.current !== "speaking") {
            const ms = Math.round(performance.now() - sonSesZamaniRef.current);
            metrikGuncelle((m) => ({ ...m, sonCalmaMs: ms }));
          }
          gec("speaking");
        } else if (durumRef.current === "speaking") {
          gec("listening");
        }
      });
      saglayiciKur(provider, playback);

      await provider.connect(sessionData, null, buildLiveInstruction(optionsRef.current.getContext?.()));
      providerRef.current = provider;
      playbackRef.current = playback;

      // Mikrofon her zaman GÜNCEL provider'a yazar (yeniden bağlanmada değişir).
      const mic = await startMicCapture((pcm) => {
        if (mutedRef.current) return;
        // Kullanıcının son "ses var" anı — gecikme ölçümünün başlangıcı.
        const v = new Int16Array(pcm);
        let toplam = 0;
        for (let i = 0; i < v.length; i++) toplam += v[i] * v[i];
        if (Math.sqrt(toplam / v.length) > SES_ESIGI_RMS) sonSesZamaniRef.current = performance.now();
        providerRef.current?.sendAudio(pcm);
      });
      micRef.current = mic;

      guncelle({ state: "listening" });
    } catch (e) {
      // Bağlantı kurulduktan sonra mikrofon izni reddedilirse vb. durumlarda
      // WebSocket/ses kuyruğu açık kalmasın.
      providerRef.current = providerRef.current ?? provider;
      playbackRef.current = playbackRef.current ?? playback;
      await kaynaklariKapat();
      guncelle({ state: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }, [guncelle, kaynaklariKapat, saglayiciKur]);

  const disconnect = useCallback(async () => {
    await kaynaklariKapat();
    kullaniciMetinRef.current = "";
    asistanMetinRef.current = "";
    setSession(BOS_SESSION);
  }, [kaynaklariKapat]);

  const interrupt = useCallback(() => {
    providerRef.current?.interrupt();
    playbackRef.current?.clear();
  }, []);

  const mute = useCallback(() => {
    mutedRef.current = true;
    guncelle({ isMuted: true });
  }, [guncelle]);

  const unmute = useCallback(() => {
    mutedRef.current = false;
    guncelle({ isMuted: false });
  }, [guncelle]);

  return {
    session,
    connect,
    disconnect,
    interrupt,
    mute,
    unmute,
  };
}

export type { VoiceState };
