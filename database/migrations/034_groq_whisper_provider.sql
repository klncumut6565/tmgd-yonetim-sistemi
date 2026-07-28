-- ============================================================================
-- Migration 034: Groq (Whisper) saglayicisi — sesli komut icin
-- ----------------------------------------------------------------------------
-- NEDEN: Sesli komutta ses->metin donusumu su ana kadar Gemini'ye
-- yaptiriliyordu. Gemini genel amacli COK MODLU bir model; transkripsiyon
-- icin ozellesmis degil. Sonuc: yavas, kotayi hizli tuketiyor, yogunlukta
-- 503 veriyor.
--
-- Groq, Whisper'i ozel donanimda (LPU) calistiriyor: gercek zamanin ~228
-- kati hiz, UCRETSIZ katmanda gunde 2.000 ses istegi, kredi karti
-- gerektirmiyor. Ses icin dogru arac.
--
-- !!! DIKKAT — KARISTIRILMASI KOLAY IKI FARKLI SIRKET !!!
--   'grok'  = xAI (Elon Musk) — SOHBET modeli, metin uretir
--   'groq'  = Groq Inc. (LPU donanim sirketi) — WHISPER, ses yazar
-- Tek harf fark var ama tamamen farkli servisler ve ayri anahtarlar.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) CHECK kisitini genislet ('groq' eklenebilsin)
-- ----------------------------------------------------------------------------

ALTER TABLE public.ai_provider_keys
  DROP CONSTRAINT IF EXISTS ai_provider_keys_provider_check;

ALTER TABLE public.ai_provider_keys
  ADD CONSTRAINT ai_provider_keys_provider_check
  CHECK (provider IN ('grok', 'groq', 'gemini', 'openrouter'));


-- ----------------------------------------------------------------------------
-- 2) Groq satirini ekle (anahtar bos — admin panelinden girilecek)
-- ----------------------------------------------------------------------------
-- priority = 0: sesli komutta ILK denenen olsun. Metin sohbetinde bu
-- saglayici KULLANILMAZ (sadece /api/speech-to-text okur), o yuzden
-- metin fallback zincirini etkilemez.

INSERT INTO public.ai_provider_keys (provider, api_key, model, priority)
VALUES ('groq', NULL, 'whisper-large-v3-turbo', 0)
ON CONFLICT (provider) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 3) Dogrulama
-- ----------------------------------------------------------------------------

SELECT provider, model, priority, (api_key IS NOT NULL) AS anahtar_girilmis
FROM public.ai_provider_keys
ORDER BY priority;
-- Beklenti: 4 satir (groq, grok, gemini, openrouter)


-- ----------------------------------------------------------------------------
-- 4) Migration kaydi
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('034_groq_whisper_provider')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON — Bu migration sonrasi:
--   /ai-engine-keys sayfasinda yeni bir "Groq (Whisper — Ses)" karti gorunur.
--   console.groq.com/keys adresinden UCRETSIZ anahtar alip oraya girince
--   sesli komut Gemini yerine Groq Whisper kullanmaya baslar.
-- ============================================================================
