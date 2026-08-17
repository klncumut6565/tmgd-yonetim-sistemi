-- ============================================================================
-- Migration 051: Atık/Taşımacı Firmaları — TMFB Numarası + Geçerlilik Tarihi
-- ----------------------------------------------------------------------------
-- AMAC: Atık/Taşımacı Firmaları kütüphanesinde firma adına tıklanınca
-- gösterilecek firma bilgi paneli için iki yeni alan: TMFB Numarası ve
-- TMFB Geçerlilik Tarihi.
--
-- Idempotent — bir kaç kez çalıştırılabilir.
-- ============================================================================

ALTER TABLE public.atik_firmalari
  ADD COLUMN IF NOT EXISTS tmfb_numarasi TEXT;

ALTER TABLE public.atik_firmalari
  ADD COLUMN IF NOT EXISTS tmfb_gecerlilik_tarihi DATE;

COMMENT ON COLUMN public.atik_firmalari.tmfb_numarasi IS
  'Tehlikeli Madde Faaliyet Belgesi numarası (serbest metin).';
COMMENT ON COLUMN public.atik_firmalari.tmfb_gecerlilik_tarihi IS
  'TMFB belgesinin geçerlilik (son kullanma) tarihi.';

-- ----------------------------------------------------------------------------
-- DOĞRULAMA
-- ----------------------------------------------------------------------------

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'atik_firmalari'
  AND column_name IN ('tmfb_numarasi', 'tmfb_gecerlilik_tarihi');

-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('051_atik_firmalari_tmfb_detay')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SON
-- ============================================================================
