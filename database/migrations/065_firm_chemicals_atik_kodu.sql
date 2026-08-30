-- ============================================================================
-- Migration 065: firm_chemicals'a atik_kodu kolonu (Atık Kodu Kütüphanesi
-- ile eklenen kalemlerin firma envanterinde kalıcı görünmesi için)
-- ----------------------------------------------------------------------------
-- Taşıma Evrakı'nda bir atık kodu üzerinden ürün eklendiğinde (migration
-- 064 → atik_kodlari_katalogu), bu madde firmanın envanterinde (firm_
-- chemicals) YOKSA otomatik olarak kalıcı bir kayıt olarak eklenir —
-- böylece bir sonraki seferde "Envanterden Seç" listesinde doğrudan
-- görünür, atık kodu tekrar aranmaz.
-- ============================================================================

ALTER TABLE public.firm_chemicals
  ADD COLUMN IF NOT EXISTS atik_kodu text;

COMMENT ON COLUMN public.firm_chemicals.atik_kodu IS
  'Bu envanter kaydı bir Atık Kodu Kütüphanesi (atik_kodlari_katalogu) seçiminden otomatik eklendiyse, ilgili atık kodu (örn. "04 02 19*"). Elle eklenen envanter kayıtlarında NULL.';

-- ============================================================================
-- SON
-- ============================================================================
