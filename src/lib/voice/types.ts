// src/lib/voice/types.ts
//
// Gerçek zamanlı sesli asistan (Realtime Voice) için sağlayıcıdan bağımsız
// tip tanımları. Bkz. "TMGD Asistan — Gerçek Zamanlı Sesli Motor Geliştirme
// Planı" (Faz 2: Voice abstraction — VoiceProvider/STTProvider/TTSProvider/
// RealtimeProvider).
//
// TASARIM İLKESİ: Bu dosya HİÇBİR sağlayıcıya (Gemini, OpenAI, Deepgram...)
// bağımlı olmamalıdır — sadece arayüzleri tanımlar. Somut uygulama
// (şu an için Gemini Live API) src/lib/voice/providers/ altında olacaktır.
// Böylece ileride sağlayıcı değiştirmek/eklemek, bu arayüzü karşılayan yeni
// bir dosya eklemekten ibaret kalır; hook ve UI katmanları etkilenmez.
//
// GÜVENLİK: Kalıcı API anahtarları bu katmandan asla frontend'e geçmez.
// RealtimeProvider yalnızca kısa ömürlü (ephemeral) session token'larıyla
// çalışır — bkz. RealtimeSessionResponse.

// ---------------------------------------------------------------------------
// Genel ses oturumu durumu (frontend hook'un yöneteceği state)
// ---------------------------------------------------------------------------

export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

export interface VoiceSession {
  state: VoiceState;
  isMuted: boolean;
  isSpeaking: boolean;
  transcript: string;
  partialTranscript: string;
  assistantTranscript: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// STT (Speech-to-Text) — streaming
// ---------------------------------------------------------------------------

export type TranscriptEvent =
  | { type: "partial"; text: string }
  | { type: "final"; text: string }
  | { type: "error"; message: string };

export interface STTProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
  onTranscript(handler: (event: TranscriptEvent) => void): void;
}

// ---------------------------------------------------------------------------
// TTS (Text-to-Speech) — streaming
// ---------------------------------------------------------------------------

export interface TTSProvider {
  /** Metni (veya metin parçasını) seslendirmeye başlar; streaming
   *  destekleyen sağlayıcılarda parça parça çağrılabilir. */
  speak(textChunk: string): Promise<void>;
  /** Devam eden seslendirmeyi anında durdurur (barge-in/interrupt). */
  cancel(): void;
}

// ---------------------------------------------------------------------------
// Realtime session — sunucudan alınan kısa ömürlü bağlantı bilgisi
// ---------------------------------------------------------------------------

export interface RealtimeSessionResponse {
  sessionId: string;
  /** Sağlayıcıya bağlanmak için kullanılacak geçici (ephemeral) token.
   *  Kalıcı API anahtarı DEĞİLDİR; süresi dolar, tek/az sayıda kullanım
   *  için sınırlıdır. */
  token: string;
  /** ISO 8601 — token bu zamandan sonra geçersiz olur. */
  expiresAt: string;
}

export interface RealtimeProvider {
  connect(session: RealtimeSessionResponse): Promise<void>;
  disconnect(): Promise<void>;
  sendAudio(chunk: ArrayBuffer): void;
  interrupt(): void;
  onTranscript(handler: (event: TranscriptEvent) => void): void;
  onAudio(handler: (chunk: ArrayBuffer) => void): void;
  onError(handler: (message: string) => void): void;
}

// ---------------------------------------------------------------------------
// Voice metrics (Bölüm 32 — Logging)
// ---------------------------------------------------------------------------

export interface VoiceMetrics {
  sessionId: string;
  sttLatency: number;
  intentLatency: number;
  llmLatency: number;
  ttsLatency: number;
  totalLatency: number;
}
