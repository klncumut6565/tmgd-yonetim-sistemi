-- ============================================================================
-- Migration 052: Taşıma Evrakı — Sürücü/Araç Manuel Metin Girişi
-- ----------------------------------------------------------------------------
-- SORUN: Taşıma Evrakı'nda Sürücü ve Araç alanları yalnızca sistemde
-- KAYITLI sürücü/araçlar arasından seçilebiliyordu (driver_id/vehicle_id
-- foreign key). Alt yükleniciye ait, henüz sisteme kaydedilmemiş bir
-- sürücü/araçla yapılan taşımalarda bu alanlar boş kalmak zorundaydı.
--
-- ÇÖZÜM: driver_id/vehicle_id (kayıtlı sürücü/araç seçimi, SRC-5/ADR
-- belge kontrolü bu alan doluyken çalışır) YANINDA, serbest metin
-- girişine izin veren iki yeni nullable sütun. Bir belgede ya driver_id
-- ya da driver_manual doludur (ikisi birlikte kullanılmaz) — uygulama
-- katmanında bu kural korunur.
--
-- Idempotent — bir kaç kez çalıştırılabilir.
-- ============================================================================

ALTER TABLE public.transport_documents
  ADD COLUMN IF NOT EXISTS driver_manual TEXT;

ALTER TABLE public.transport_documents
  ADD COLUMN IF NOT EXISTS vehicle_manual TEXT;

COMMENT ON COLUMN public.transport_documents.driver_manual IS
  'Sistemde kayıtlı olmayan sürücü için serbest metin (ad soyad). driver_id doluyken kullanılmaz.';
COMMENT ON COLUMN public.transport_documents.vehicle_manual IS
  'Sistemde kayıtlı olmayan araç için serbest metin (plaka vb.). vehicle_id doluyken kullanılmaz.';

-- ----------------------------------------------------------------------------
-- DOĞRULAMA
-- ----------------------------------------------------------------------------

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transport_documents'
  AND column_name IN ('driver_manual', 'vehicle_manual');

-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('052_tasima_evraki_manuel_surucu_arac')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SON
-- ============================================================================
