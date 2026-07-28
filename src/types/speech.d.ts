// src/types/speech.d.ts
// Web Speech API icin minimal tip tanimlari. Standart TypeScript lib'inde
// yok (henuz resmi bir W3C standardi degil, sadece webkit-prefixli olarak
// Chrome/Edge'de mevcut). Bu dosya sadece derlemenin gecmesi icin gereken
// minimum alanlari tanimlar.

export {};

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
  length: number;
}

interface SpeechRecognitionEventLike extends Event {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
  resultIndex: number;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string; // 'not-allowed' | 'no-speech' | 'audio-capture' | 'network' | 'service-not-allowed' | 'aborted' | ...
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start(): void;
  stop(): void;
  abort?(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  // Teşhis için: bu olaylar mikrofon->ses->konuşma zincirinin
  // hangi adımında takıldığını gösterir.
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onsoundend: (() => void) | null;
  onaudioend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}
