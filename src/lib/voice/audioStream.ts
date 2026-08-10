"use client";

// src/lib/voice/audioStream.ts
//
// Web Audio API ile ham PCM ses yakalama/çalma. Gemini Live sabit format
// bekliyor (bkz. geminiLive.ts): giriş 16-bit PCM/16kHz/mono, çıkış 16-bit
// PCM/24kHz/mono. Tarayıcının getUserMedia'sı genelde 44.1/48kHz yakalar,
// bu yüzden manuel downsampling gerekiyor.
//
// NOT: ScriptProcessorNode kullanılıyor (AudioWorkletNode değil) — API
// deprecated olsa da hâlâ tüm güncel tarayıcılarda çalışıyor ve ayrı bir
// worklet modül dosyası yüklemeyi gerektirmiyor. Üretimde/ileride
// AudioWorkletNode'a taşınması önerilir (daha düşük gecikme, ana thread'i
// bloklamaz).

const HEDEF_ORNEKLEME = 16000; // Gemini Live giriş gereksinimi
const CIKIS_ORNEKLEME = 24000; // Gemini Live çıkış formatı
const CHUNK_BUFFER_BOYUTU = 4096; // ScriptProcessorNode buffer boyutu

function float32ToInt16PCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Basit doğrusal downsampling — orijinal örnekleme hızından 16kHz'e indirger. */
function downsampleTo16k(input: Float32Array, girisOrnekleme: number): Float32Array {
  if (girisOrnekleme === HEDEF_ORNEKLEME) return input;
  const oran = girisOrnekleme / HEDEF_ORNEKLEME;
  const yeniUzunluk = Math.floor(input.length / oran);
  const sonuc = new Float32Array(yeniUzunluk);
  for (let i = 0; i < yeniUzunluk; i++) {
    sonuc[i] = input[Math.floor(i * oran)];
  }
  return sonuc;
}

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
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioCtx();
  const source = audioContext.createMediaStreamSource(stream);
  // ScriptProcessorNode(bufferSize, girişKanalı, çıkışKanalı)
  const processor = audioContext.createScriptProcessor(CHUNK_BUFFER_BOYUTU, 1, 1);

  processor.onaudioprocess = (ev) => {
    const girisVerisi = ev.inputBuffer.getChannelData(0);
    const downsampled = downsampleTo16k(girisVerisi, audioContext.sampleRate);
    const pcm16 = float32ToInt16PCM(downsampled);
    onChunk(pcm16.buffer as ArrayBuffer);
  };

  source.connect(processor);
  // ScriptProcessorNode'un çalışması için bir çıkışa bağlı olması gerekir
  // (Web Audio API kısıtı) — burada sessiz bir gain node kullanılabilirdi,
  // ama processor.connect(destination) ile hoparlöre gürültü gitmemesi için
  // ayrıca bir GainNode(0) araya konur.
  const sessizCikis = audioContext.createGain();
  sessizCikis.gain.value = 0;
  processor.connect(sessizCikis);
  sessizCikis.connect(audioContext.destination);

  return {
    stop: () => {
      processor.disconnect();
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
