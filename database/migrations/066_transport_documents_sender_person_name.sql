-- ============================================================================
-- Migration 066: transport_documents'a sender_person_name kolonu
-- ----------------------------------------------------------------------------
-- SORUN: Taşıma Evrakı'nda "Kaydet ve Yazdır" şu hatayı veriyordu:
--   "Could not find the 'sender_person_name' column of 'transport_documents'
--    in the schema cache"
--
-- KÖK NEDEN: "Gönderen sorumlu personel adı soyadı" alanı (gonderenSorumlu)
-- uygulama koduna eklenmiş (TasimaEvraki.tsx — kaydetme ve okuma tarafı,
-- ayrıca PDF'te GÖNDEREN imza kutusu ve K3 formunun "5. Onay" bölümünde
-- kullanılıyor) ancak veritabanı tarafında bu kolonu ekleyen bir migration
-- hiç yazılmamıştı.
--
-- Idempotent — kolon zaten varsa hiçbir şey yapmaz.
-- ============================================================================

ALTER TABLE public.transport_documents
  ADD COLUMN IF NOT EXISTS sender_person_name text;

COMMENT ON COLUMN public.transport_documents.sender_person_name IS
  'Gönderen firmadaki sorumlu personelin adı soyadı. Taşıma Evrakı PDF''inde GÖNDEREN imza kutusuna ve K3 kontrol formunun "5. Onay" bölümüne yazılır. Opsiyonel.';

-- ----------------------------------------------------------------------------
-- DOĞRULAMA — kolonun eklendiğini teyit eder (bir satır dönmeli)
-- ----------------------------------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transport_documents'
  AND column_name = 'sender_person_name';

-- ============================================================================
-- SON
-- ============================================================================
