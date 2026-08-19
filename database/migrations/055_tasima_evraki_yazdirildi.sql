-- ============================================================================
-- Migration 055: Taşıma Evrakı — Yazdırıldı Zaman Damgası
-- ----------------------------------------------------------------------------
-- AMAC: "Sevkiyatlar" ekranı yalnızca fiilen YAZDIRILMIŞ (şoföre teslim
-- edilmeye hazır) taşıma evraklarını listeler — sadece kaydedilmiş ama hiç
-- yazdırılmamış taslak evraklar orada görünmez. Bu ayrımı yapabilmek için
-- transport_documents tablosuna printed_at eklenir.
--
-- printed_at NULL  = evrak kaydedildi ama henüz hiç yazdırılmadı (taslak)
-- printed_at dolu  = en son ne zaman yazdırıldığı (yeniden yazdırılırsa
--                    güncellenir, "ilk yazdırma" değil "son yazdırma"dır)
--
-- Idempotent — bir kaç kez çalıştırılabilir.
-- ============================================================================

ALTER TABLE public.transport_documents
  ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.transport_documents.printed_at IS
  'Evrağın en son yazdırıldığı zaman. NULL ise hiç yazdırılmamış (taslak) — Sevkiyatlar ekranı yalnızca bu alanı dolu olan kayıtları listeler.';

CREATE INDEX IF NOT EXISTS idx_transport_documents_printed_at
  ON public.transport_documents(firm_id, printed_at DESC)
  WHERE printed_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- DOĞRULAMA
-- ----------------------------------------------------------------------------

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transport_documents'
  AND column_name = 'printed_at';

-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('055_tasima_evraki_yazdirildi')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SON
-- ============================================================================
