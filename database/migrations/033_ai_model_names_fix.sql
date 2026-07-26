-- ============================================================================
-- Migration 033: ai_provider_keys varsayilan model isimlerini guncelle
-- ----------------------------------------------------------------------------
-- Sorun: Migration 032'deki varsayilan model isimleri (grok-2-latest,
-- gemini-1.5-flash, anthropic/claude-3.5-sonnet) artik gecerli degil —
-- her uc saglayici da bu isimleri "not found" hatasi ile reddetti.
--
-- Bu migration SADECE henuz kullanici tarafindan degistirilmemis (hala
-- eski varsayilan degerde duran) satirlari gunceller — eger admin panelinden
-- zaten manuel duzeltme yapildiysa o deger KORUNUR (WHERE kosulu bunu saglar).
--
-- Guncel dogru isimler (Temmuz 2026 itibariyla, resmi dokumantasyondan):
--   grok: grok-4.3
--   gemini: gemini-3.5-flash
--   openrouter: anthropic/claude-sonnet-5
--
-- Idempotent.
-- ============================================================================

UPDATE public.ai_provider_keys
SET model = 'grok-4.3'
WHERE provider = 'grok' AND model = 'grok-2-latest';

UPDATE public.ai_provider_keys
SET model = 'gemini-3.5-flash'
WHERE provider = 'gemini' AND model = 'gemini-1.5-flash';

UPDATE public.ai_provider_keys
SET model = 'anthropic/claude-sonnet-5'
WHERE provider = 'openrouter' AND model = 'anthropic/claude-3.5-sonnet';

-- Dogrulama
SELECT provider, model, priority, (api_key IS NOT NULL) AS anahtar_girilmis
FROM public.ai_provider_keys
ORDER BY priority;

INSERT INTO public._migrations (id) VALUES ('033_ai_model_names_fix')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON — model kolonlari guncel degerlerle gormelisin. Eger admin panelinden
-- zaten manuel duzelttiysen bu migration hicbir sey degistirmez (WHERE
-- kosulu sadece eski varsayilan degerdeki satirlari hedefler).
-- ============================================================================
