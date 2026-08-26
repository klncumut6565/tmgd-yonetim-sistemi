-- ============================================================================
-- Migration 063: Tablo A — UN 3077, 3291, 3549 Tünel Kodu Düzeltmesi
-- ----------------------------------------------------------------------------
-- SORUN: Migration 059, UN 3077/3291/3549 için hatalı V-kodu değerlerini
-- (V13/V1/V1) 'E' olarak "düzeltmişti" — tıpkı UN 3082'de olduğu gibi
-- (bkz. migration 062) bu yanlıştı. Kullanıcı ADR kitabından doğruladı:
-- bu üç UN numarasının da gerçek tünel kısıtlama kodu '(-)' yani tünel
-- kısıtlaması YOKTUR.
--
-- Idempotent — yalnızca hâlâ 'E' değerini taşıyan satırları günceller.
-- ============================================================================

UPDATE public.adr_un_numbers
SET tunnel_code = '-'
WHERE un_number IN ('3077', '3291', '3549') AND tunnel_code = 'E';

-- ----------------------------------------------------------------------------
-- DOĞRULAMA
-- ----------------------------------------------------------------------------
SELECT un_number, proper_shipping_name, class, packing_group, tunnel_code
FROM public.adr_un_numbers
WHERE un_number IN ('3077', '3082', '3291', '3549')
ORDER BY un_number;

-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------
INSERT INTO public._migrations (id) VALUES ('063_un3077_3291_3549_tunel_kodu_duzeltme')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
