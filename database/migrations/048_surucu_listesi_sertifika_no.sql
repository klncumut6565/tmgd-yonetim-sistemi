-- ============================================================================
-- Migration 048: Sürücü Listesi — Sertifika Numarası
-- ----------------------------------------------------------------------------
-- AMAC: Kullanıcının paylaştığı örnek belge (SRC5_Kayıtları.xlsx) ile
-- birebir uyum için "Sertifika Numarası" sütunu eklenir (İşe Giriş Tarihi
-- ile İşten/İşe Çıkış Tarihi arasında yer alır).
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

ALTER TABLE public.firm_surucu_listesi
  ADD COLUMN IF NOT EXISTS sertifika_numarasi TEXT;

COMMENT ON COLUMN public.firm_surucu_listesi.sertifika_numarasi IS
  'SRC5 sertifikasının belge/seri numarası (serbest metin).';

-- ----------------------------------------------------------------------------
-- DOGRULAMA
-- ----------------------------------------------------------------------------

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'firm_surucu_listesi'
  AND column_name = 'sertifika_numarasi';

-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('048_surucu_listesi_sertifika_no')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
