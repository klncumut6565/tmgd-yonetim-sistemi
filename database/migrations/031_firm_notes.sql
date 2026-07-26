-- ============================================================================
-- Migration 031: Firma Notlari (Faz 3 — Buzz "kanal = firma" konseptinden)
-- ----------------------------------------------------------------------------
-- Amac: Her firma icin kronolojik, serbest metin not/yorum akisi.
-- Musteri gorusmesi notlari, hatirlatmalar, gozlemler buraya yazilir.
--
-- ONEMLI: Bu ozellik de Buzz entegrasyonunun bir parcasi sayildigi icin
-- SADECE super_admin gorebilir/yazabilir/silebilir — admin dahil diger
-- roller icin tamamen gizli (RLS + UI cift katman).
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.firm_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id     UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firm_notes_firm_id
  ON public.firm_notes(firm_id, created_at DESC);

COMMENT ON TABLE public.firm_notes IS
  'Firma bazli kronolojik not/yorum akisi. Sadece super_admin erisebilir (Buzz entegrasyonu kapsaminda).';

DROP TRIGGER IF EXISTS trg_firm_notes_updated_at ON public.firm_notes;
CREATE TRIGGER trg_firm_notes_updated_at
BEFORE UPDATE ON public.firm_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----------------------------------------------------------------------------
-- RLS — sadece super_admin (admin DAHIL diger roller goremez/yazamaz)
-- ----------------------------------------------------------------------------

ALTER TABLE public.firm_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_notes_super_admin_all" ON public.firm_notes;

CREATE POLICY "firm_notes_super_admin_all"
  ON public.firm_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
        AND p.approval_status = 'approved'
        AND p.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
        AND p.approval_status = 'approved'
        AND p.is_active = true
    )
  );


-- ----------------------------------------------------------------------------
-- Dogrulama
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS firm_notes_tablosu_hazir FROM public.firm_notes;
-- Beklenti: 0 (tablo bos ama sorgu hatasiz calismali)


-- ----------------------------------------------------------------------------
-- Migration kaydi
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('031_firm_notes')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
