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
import type { VoiceSession, VoiceState, RealtimeSessionResponse } from "@/lib/voice/types";

const BOS_SESSION: VoiceSession = {
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

export function useRealtimeVoice() {
  const router = useRouter();
  const [session, setSession] = useState<VoiceSession>(BOS_SESSION);

  const providerRef = useRef<GeminiLiveProvider | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playbackRef = useRef<AudioPlaybackQueue | null>(null);
  const mutedRef = useRef(false);
  // Gemini transkripti parça parça gönderir; konuşmacı başına biriktirilir.
  const kullaniciMetinRef = useRef("");
  const asistanMetinRef = useRef("");

  const guncelle = useCallback((patch: Partial<VoiceSession>) => {
    setSession((prev) => ({ ...prev, ...patch }));
  }, []);

  /** Gemini'nin çağırdığı bir tool'u gerçek veriyle karşılar. Navigasyon
   *  eylemleri (open_firm) client-side yönlendirme yapar; diğerleri
   *  /api/assistant/tools üzerinden GERÇEK Supabase verisini getirir —
   *  hiçbir sayı/isim burada uydurulmaz (bkz. dataTools.ts). */
  const araciCalistir = useCallback(
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

  const connect = useCallback(async () => {
    // Önceki (hatalı/yarım kalmış) bağlantıdan artık kaynak bırakma.
    await kaynaklariKapat();
    kullaniciMetinRef.current = "";
    asistanMetinRef.current = "";
    guncelle({
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

      playback.onSpeaking((speaking) => guncelle({ isSpeaking: speaking, state: speaking ? "speaking" : "listening" }));

      provider.onTranscript((event) => {
        if (event.type === "error") return;
        if (event.speaker === "user") {
          if (event.type === "partial") {
            // Yeni kullanıcı konuşması başladıysa önceki asistan turu kapanmıştır.
            if (asistanMetinRef.current) {
              asistanMetinRef.current = "";
              kullaniciMetinRef.current = "";
              guncelle({ assistantTranscript: "" });
            }
            kullaniciMetinRef.current += event.text;
            guncelle({ partialTranscript: kullaniciMetinRef.current });
          }
        } else if (event.type === "partial") {
          // Asistan cevap vermeye başladı → kullanıcının cümlesi tamamlandı.
          if (kullaniciMetinRef.current) {
            guncelle({ transcript: kullaniciMetinRef.current, partialTranscript: "" });
            kullaniciMetinRef.current = "";
          }
          asistanMetinRef.current += event.text;
          guncelle({ assistantTranscript: asistanMetinRef.current });
        }
      });
      provider.onTurnComplete(() => {
        // Model üretimi bitirdi; kullanıcı henüz konuşmadıysa bekleyen metni sabitle.
        if (kullaniciMetinRef.current) {
          guncelle({ transcript: kullaniciMetinRef.current, partialTranscript: "" });
          kullaniciMetinRef.current = "";
        }
      });
      provider.onAudio((chunk) => {
        if (!mutedRef.current) playback.enqueue(chunk);
      });
      provider.onInterrupted(() => {
        playback.clear();
        guncelle({ isSpeaking: false, state: "listening" });
      });
      provider.onError((message) => guncelle({ state: "error", error: message }));
      provider.onToolCall(araciCalistir);

      await provider.connect(sessionData);
      providerRef.current = provider;
      playbackRef.current = playback;

      const mic = await startMicCapture((pcm) => {
        if (!mutedRef.current) provider.sendAudio(pcm);
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
  }, [araciCalistir, guncelle, kaynaklariKapat]);

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
