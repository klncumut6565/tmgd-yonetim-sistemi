-- ============================================================================
-- Migration 044: Sürücü Listesi — SRC5 ve Ehliyet belgesi ekleri
-- ----------------------------------------------------------------------------
-- AMAÇ: Sürücü Listesi'ndeki (043_surucu_listesi.sql) her satıra, o sürücüye
-- ait SRC5 sertifikası ve ehliyet dosyasının yüklenebilmesini sağlar. Bu
-- dosyalar "firm-files" storage bucket'ına yüklenir (FirmScopedCrud'daki
-- dosyaEki ile AYNI bucket, ayrı bir yol altında); yol ve orijinal dosya adı
-- bu tabloda saklanır.
--
-- Yüklenen dosyalar, Sürücü Listesi'nin PDF çıktısına EK sayfalar olarak
-- eklenir (bkz. surucuListesiPdf.ts) — Excel çıktısını etkilemez.
--
-- Idempotent — bir kaç kez çalıştırılabilir.
-- ============================================================================

ALTER TABLE public.firm_surucu_listesi
  ADD COLUMN IF NOT EXISTS src5_dosya_yolu TEXT,
  ADD COLUMN IF NOT EXISTS src5_dosya_adi TEXT,
  ADD COLUMN IF NOT EXISTS ehliyet_dosya_yolu TEXT,
  ADD COLUMN IF NOT EXISTS ehliyet_dosya_adi TEXT;

NOTIFY pgrst, 'reload schema';
