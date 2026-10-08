// src/lib/voice/config.ts
//
// Ses modu anahtarları.
//
// KLASIK_SES_AKTIF: Klasik sesli komut modu (MediaRecorder → STT → LLM →
// tarayıcı TTS) KOD SİLİNMEDEN devre dışı bırakıldı. Tek ses yolu Canlı
// Konuşma (Gemini Live). Geri açmak için true yapmak yeterli: 🎙️ butonu
// ve Canlı bağlantı kurulamazsa otomatik klasik moda düşme yeniden etkinleşir.
export const KLASIK_SES_AKTIF = false;
