-- ============================================================================
-- Migration 035: Alici Firma Rehberi (firm_consignees)
-- ----------------------------------------------------------------------------
-- NEDEN: Tasima Evraki'nda "Alici" alani serbest metindi — her evrakta
-- firma unvani ve adresi elle yeniden yaziliyordu. Ayni aliciya duzenli
-- sevkiyat yapan firmalar icin bu hem zaman kaybi hem yazim hatasi
-- kaynagi (ADR evraginda alici bilgisi resmi bir alan).
--
-- COZUM: Her firma KENDI alici rehberini tutar. Bir kez kaydedilir,
-- sonraki evraklarda listeden secilir.
--
-- KAPSAM NOTU: Bu tablo Buzz entegrasyonunun bir parcasi DEGIL — gunluk
-- TMGD isinin dogal bir parcasi. Bu yuzden super_admin kisitlamasi
-- uygulanmiyor; firmaya erisebilen herkes (mevcut yetki modeline gore)
-- kullanabilir.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.firm_consignees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id     UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,           -- Firma unvani
  address     TEXT,                    -- Acik adres
  tax_office  TEXT,                    -- Vergi dairesi (opsiyonel)
  tax_number  TEXT,                    -- Vergi/TCKN (opsiyonel)
  phone       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firm_consignees_firm
  ON public.firm_consignees(firm_id, title);

-- Ayni firma icinde ayni unvanin iki kez kaydedilmesini onle
CREATE UNIQUE INDEX IF NOT EXISTS uq_firm_consignees_firm_title
  ON public.firm_consignees(firm_id, lower(title));

COMMENT ON TABLE public.firm_consignees IS
  'Her firmanin kendi alici (consignee) rehberi. Tasima Evraki duzenlenirken listeden secilir.';

DROP TRIGGER IF EXISTS trg_firm_consignees_updated_at ON public.firm_consignees;
CREATE TRIGGER trg_firm_consignees_updated_at
BEFORE UPDATE ON public.firm_consignees
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----------------------------------------------------------------------------
-- RLS — mevcut yetki modeliyle tutarli
-- ----------------------------------------------------------------------------
-- Okuma: onaylanmis ve aktif her kullanici (firma verilerine erisebilenler)
-- Yazma: yazma yetkisi olanlar (yazabilir() fonksiyonu 004_rol_yetkileri'nde
--        tanimli; yoksa role bazli kontrole dusuluyor)

ALTER TABLE public.firm_consignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_consignees_read" ON public.firm_consignees;
CREATE POLICY "firm_consignees_read"
  ON public.firm_consignees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approval_status = 'approved'
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "firm_consignees_write" ON public.firm_consignees;
CREATE POLICY "firm_consignees_write"
  ON public.firm_consignees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approval_status = 'approved'
        AND p.is_active = true
        AND p.role IN ('super_admin', 'admin', 'tmgd')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approval_status = 'approved'
        AND p.is_active = true
        AND p.role IN ('super_admin', 'admin', 'tmgd')
    )
  );


-- ----------------------------------------------------------------------------
-- Dogrulama
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS firm_consignees_hazir FROM public.firm_consignees;
-- Beklenti: 0 (tablo bos ama sorgu hatasiz calismali)


-- ----------------------------------------------------------------------------
-- Migration kaydi
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('035_firm_consignees')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
