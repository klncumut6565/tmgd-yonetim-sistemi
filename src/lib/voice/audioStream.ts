"use client";

// src/lib/voice/audioStream.ts
//
// Web Audio API ile ham PCM ses yakalama/çalma. Gemini Live sabit format
// bekliyor (bkz. geminiLive.ts): giriş 16-bit PCM/16kHz/mono, çıkış 16-bit
// PCM/24kHz/mono. Tarayıcının getUserMedia'sı genelde 44.1/48kHz yakalar,
// bu yüzden manuel downsampling gerekiyor.
//
// MİKROFON YAKALAMA: AudioWorklet (ses işleme ayrı thread'de, ana thread'i
// bloklamaz) + durumlu (stateful) resampler + sabit ~20 ms'lik çıkış
// parçaları (Google Live API önerisi 20-40 ms). AudioWorklet desteklenmezse
// (eski tarayıcılar) aynı resampler ile ScriptProcessorNode'a düşülür.
//
// RESAMPLER: alan-ortalamalı (box filter) — her 16 kHz çıkış örneği, giriş
// akışındaki ilgili aralığın kesirli ağırlıklı ortalamasıdır. Bu hem
// anti-aliasing (alçak geçiren) görevi görür hem de 44.1 kHz gibi tam katı
// olmayan oranlarda çalışır. Durum parçalar arasında korunur, böylece
// chunk sınırlarında süreksizlik oluşmaz.

const HEDEF_ORNEKLEME = 16000; // Gemini Live giriş gereksinimi
const CIKIS_ORNEKLEME = 24000; // Gemini Live çıkış formatı
const CIKIS_PARCA_MS = 20; // gönderilen her PCM parçasının süresi
const CIKIS_PARCA_ORNEK = (HEDEF_ORNEKLEME * CIKIS_PARCA_MS) / 1000; // 320
const FALLBACK_BUFFER_BOYUTU = 2048; // yalnızca ScriptProcessor yedeği için

/** Durumlu alan-ortalamalı resampler + sabit boyutlu Int16 parçalayıcı. */
class PcmResampler {
  private oran: number;
  private acc = 0;
  private gerekli: number;
  private cikis = new Int16Array(CIKIS_PARCA_ORNEK);
  private doluluk = 0;

  constructor(girisOrnekleme: number, private onChunk: (pcm: ArrayBuffer) => void) {
    this.oran = girisOrnekleme / HEDEF_ORNEKLEME;
    this.gerekli = this.oran;
  }

  push(input: Float32Array) {
    for (let i = 0; i < input.length; i++) {
      const x = input[i];
      let kalan = 1;
      while (kalan > 1e-9) {
        const al = kalan < this.gerekli ? kalan : this.gerekli;
        this.acc += x * al;
        this.gerekli -= al;
        kalan -= al;
        if (this.gerekli <= 1e-9) {
          const v = Math.max(-1, Math.min(1, this.acc / this.oran));
          this.cikis[this.doluluk++] = v < 0 ? v * 0x8000 : v * 0x7fff;
          this.acc = 0;
          this.gerekli = this.oran;
          if (this.doluluk === CIKIS_PARCA_ORNEK) {
            this.onChunk(this.cikis.slice().buffer as ArrayBuffer);
            this.doluluk = 0;
          }
        }
      }
    }
  }
}

/** AudioWorklet kaynak kodu (Blob URL ile yüklenir — ayrı dosya gerekmez).
 *  Yukarıdaki PcmResampler ile AYNI algoritma; thread sınırı yüzünden kopya. */
const WORKLET_KAYNAK = `
class MikrofonIsleyici extends AudioWorkletProcessor {
  constructor() {
    super();
    this.oran = sampleRate / ${HEDEF_ORNEKLEME};
    this.gerekli = this.oran;
    this.acc = 0;
    this.cikis = new Int16Array(${CIKIS_PARCA_ORNEK});
    this.doluluk = 0;
  }
  process(inputs) {
    const kanal = inputs[0] && inputs[0][0];
    if (!kanal) return true;
    for (let i = 0; i < kanal.length; i++) {
      const x = kanal[i];
      let kalan = 1;
      while (kalan > 1e-9) {
        const al = kalan < this.gerekli ? kalan : this.gerekli;
        this.acc += x * al;
        this.gerekli -= al;
        kalan -= al;
        if (this.gerekli <= 1e-9) {
          let v = this.acc / this.oran;
          v = v > 1 ? 1 : v < -1 ? -1 : v;
          this.cikis[this.doluluk++] = v < 0 ? v * 0x8000 : v * 0x7fff;
          this.acc = 0;
          this.gerekli = this.oran;
          if (this.doluluk === ${CIKIS_PARCA_ORNEK}) {
            const kopya = this.cikis.slice();
            this.port.postMessage(kopya.buffer, [kopya.buffer]);
            this.doluluk = 0;
          }
        }
      }
    }
    return true;
  }
}
registerProcessor("mikrofon-isleyici", MikrofonIsleyici);
`;

export type MicCapture = {
  stop: () => void;
};

/**
 * Mikrofonu açar ve yakalanan sesi ~16kHz mono 16-bit PCM ArrayBuffer
 * parçaları hâlinde `onChunk`'a iletir. Mikrofon izni burada istenir —
 * kullanıcı reddederse Promise reddedilir.
 */
export async function startMicCapture(onChunk: (pcm: ArrayBuffer) => void): Promise<MicCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioCtx();
  // Tarayıcı otomatik oynatma politikası askıya almış olabilir.
  if (audioContext.state === "suspended") await audioContext.resume().catch(() => {});
  const source = audioContext.createMediaStreamSource(stream);
  const sessizCikis = audioContext.createGain();
  sessizCikis.gain.value = 0;
  sessizCikis.connect(audioContext.destination);

  let temizle: () => void;

  try {
    if (typeof AudioWorkletNode !== "undefined" && audioContext.audioWorklet) {
      const url = URL.createObjectURL(new Blob([WORKLET_KAYNAK], { type: "application/javascript" }));
      try {
        await audioContext.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      const node = new AudioWorkletNode(audioContext, "mikrofon-isleyici", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        channelCountMode: "explicit",
      });
      node.port.onmessage = (ev: MessageEvent<ArrayBuffer>) => onChunk(ev.data);
      source.connect(node);
      node.connect(sessizCikis);
      temizle = () => {
        node.port.onmessage = null;
        node.disconnect();
      };
    } else {
      // Yedek: ScriptProcessorNode (deprecated) + aynı durumlu resampler.
      const resampler = new PcmResampler(audioContext.sampleRate, onChunk);
      const processor = audioContext.createScriptProcessor(FALLBACK_BUFFER_BOYUTU, 1, 1);
      processor.onaudioprocess = (ev) => resampler.push(ev.inputBuffer.getChannelData(0));
      source.connect(processor);
      processor.connect(sessizCikis);
      temizle = () => {
        processor.onaudioprocess = null;
        processor.disconnect();
      };
    }
  } catch (e) {
    // Worklet yüklenemezse mikrofon açık kalmasın.
    stream.getTracks().forEach((t) => t.stop());
    audioContext.close();
    throw e;
  }

  return {
    stop: () => {
      temizle();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      audioContext.close();
    },
  };
}

/**
 * Gemini Live'dan gelen 24kHz mono 16-bit PCM parçalarını SIRAYLA çalan
 * kuyruk. `clear()` barge-in/interrupt anında henüz çalınmamış parçaları
 * anında iptal eder (bkz. useRealtimeVoice.ts).
 */
export class AudioPlaybackQueue {
  private audioContext: AudioContext;
  private kuyruk: AudioBufferSourceNode[] = [];
  private sonrakiBaslangicZamani = 0;
  private onSpeakingChange: ((speaking: boolean) => void) | null = null;

  constructor() {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioCtx();
    // Kullanıcı tıklamasıyla (Canlı Konuşma butonu) oluşturulur; yine de
    // askıdaysa devam ettir.
    void this.audioContext.resume().catch(() => {});
  }

  onSpeaking(handler: (speaking: boolean) => void) {
    this.onSpeakingChange = handler;
  }

  /** Ham 24kHz/16-bit/mono PCM parçasını kuyruğa ekler ve sırayla çalar. */
  enqueue(pcmChunk: ArrayBuffer) {
    const int16 = new Int16Array(pcmChunk);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;

    const buffer = this.audioContext.createBuffer(1, float32.length, CIKIS_ORNEKLEME);
    buffer.copyToChannel(float32, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const simdi = this.audioContext.currentTime;
    const baslangic = Math.max(simdi, this.sonrakiBaslangicZamani);
    source.start(baslangic);
    this.sonrakiBaslangicZamani = baslangic + buffer.duration;

    this.kuyruk.push(source);
    this.onSpeakingChange?.(true);
    source.onended = () => {
      this.kuyruk = this.kuyruk.filter((s) => s !== source);
      if (this.kuyruk.length === 0) this.onSpeakingChange?.(false);
    };
  }

  /** Barge-in: henüz çalınmamış/çalmakta olan tüm parçaları anında durdurur. */
  clear() {
    this.kuyruk.forEach((s) => {
      try {
        s.stop();
      } catch {
        // zaten durmuşsa hata verebilir, önemsiz
      }
    });
    this.kuyruk = [];
    this.sonrakiBaslangicZamani = this.audioContext.currentTime;
    this.onSpeakingChange?.(false);
  }

  close() {
    this.clear();
    this.audioContext.close();
  }
}
