-- ============================================================================
-- Migration 077: Firmalara TMFB No + TMFB Geçerlilik Tarihi
-- ----------------------------------------------------------------------------
-- AMAÇ: Firma Bilgileri → Düzenle ekranından firmanın Tehlikeli Madde
-- Faaliyet Belgesi (TMFB) numarası ve geçerlilik tarihi girilebilsin.
-- Girilen değerler Emniyet Planı "3. İşletme ve Faaliyet Bilgileri"
-- tablosundaki "TMFB No / Geçerlilik" satırına otomatik basılır
-- (örn. "İST.U-NET.TMFB.59.2703 - 26/02/2028").
--
-- Sütun adları atik_firmalari tablosuyla (migration 051) aynıdır.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN. Idempotent.
-- ============================================================================

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS tmfb_numarasi TEXT,
  ADD COLUMN IF NOT EXISTS tmfb_gecerlilik_tarihi DATE;

COMMENT ON COLUMN public.firms.tmfb_numarasi IS
  'Tehlikeli Madde Faaliyet Belgesi numarası (örn. İST.U-NET.TMFB.59.2703).';
COMMENT ON COLUMN public.firms.tmfb_gecerlilik_tarihi IS
  'TMFB son geçerlilik tarihi.';

-- DOĞRULAMA
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'firms'
  AND column_name IN ('tmfb_numarasi', 'tmfb_gecerlilik_tarihi');
