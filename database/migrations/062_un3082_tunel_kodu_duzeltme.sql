-- ============================================================================
-- Migration 062: Tablo A — UN 3082 Tünel Kodu Düzeltmesi (059'un düzeltmesi)
-- ----------------------------------------------------------------------------
-- SORUN: Migration 059, UN 3082'nin (Sınıf 9, M6, PG III) hatalı 'V12'
-- değerini 'E' olarak "düzeltmişti". Bu yanlıştı — ADR 2025 Tablo A'ya göre
-- UN 3082'nin gerçek tünel kısıtlama kodu '(-)' yani tünel kısıtlaması
-- YOKTUR (kullanıcı tarafından ADR kitabından doğrulandı).
--
-- Idempotent — yalnızca hâlâ 'E' değerini taşıyorsa günceller.
-- ============================================================================

UPDATE public.adr_un_numbers
SET tunnel_code = '-'
WHERE un_number = '3082' AND tunnel_code = 'E';

-- ----------------------------------------------------------------------------
-- DOĞRULAMA
-- ----------------------------------------------------------------------------
SELECT un_number, proper_shipping_name, class, packing_group, tunnel_code
FROM public.adr_un_numbers
WHERE un_number = '3082';

-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------
INSERT INTO public._migrations (id) VALUES ('062_un3082_tunel_kodu_duzeltme')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
