-- ============================================================================
-- Migration 058: Tasiyici Firma Rehberi (firm_carriers)
-- ----------------------------------------------------------------------------
-- NEDEN: Tasima Evraki'nda "Alici" icin bir rehber vardi (035_firm_consignees)
-- ama "Tasiyici" alani hala serbest metindi — her evrakta elle yeniden
-- yaziliyordu. Ayni tasiyiciyla duzenli calisan firmalar icin bu hem zaman
-- kaybi hem yazim hatasi kaynagi.
--
-- COZUM: firm_consignees ile BIREBIR AYNI desende, her firma KENDI tasiyici
-- rehberini tutar. Bir kez kaydedilir, sonraki evraklarda listeden secilir.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.firm_carriers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id     UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,           -- Tasiyici firma unvani
  address     TEXT,                    -- Acik adres (opsiyonel)
  phone       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firm_carriers_firm
  ON public.firm_carriers(firm_id, title);

CREATE UNIQUE INDEX IF NOT EXISTS uq_firm_carriers_firm_title
  ON public.firm_carriers(firm_id, lower(title));

COMMENT ON TABLE public.firm_carriers IS
  'Her firmanin kendi tasiyici (carrier) rehberi. Tasima Evraki duzenlenirken listeden secilir.';

DROP TRIGGER IF EXISTS trg_firm_carriers_updated_at ON public.firm_carriers;
CREATE TRIGGER trg_firm_carriers_updated_at
BEFORE UPDATE ON public.firm_carriers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----------------------------------------------------------------------------
-- RLS — firm_consignees (035) ile BIREBIR AYNI model
-- ----------------------------------------------------------------------------

ALTER TABLE public.firm_carriers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_carriers_read" ON public.firm_carriers;
CREATE POLICY "firm_carriers_read"
  ON public.firm_carriers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approval_status = 'approved'
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "firm_carriers_write" ON public.firm_carriers;
CREATE POLICY "firm_carriers_write"
  ON public.firm_carriers FOR ALL
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
-- DENETIM IZI — migration 049'daki kapsam genisletme mantigiyla tutarli
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_audit_firm_carriers ON public.firm_carriers;
CREATE TRIGGER trg_audit_firm_carriers
AFTER INSERT OR UPDATE OR DELETE ON public.firm_carriers
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


-- ----------------------------------------------------------------------------
-- Dogrulama
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS firm_carriers_hazir FROM public.firm_carriers;


-- ----------------------------------------------------------------------------
-- Migration kaydi
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('058_firm_carriers')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SON
-- ============================================================================
