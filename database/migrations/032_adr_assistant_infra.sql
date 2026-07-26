-- ============================================================================
-- Migration 032: ADR Asistani altyapisi
-- ----------------------------------------------------------------------------
-- Faz 4 — Buzz'un "agent kanalda oturur" konseptinden: Firma Notlari
-- sekmesine "@ADR <soru>" yazildiginda coklu-motor (Grok/Gemini/OpenRouter)
-- fallback ile cevap veren bir asistan.
--
-- Bu migration iki sey yapar:
--   1) ai_provider_keys tablosu — 3 saglayicinin API anahtarlarini kalici
--      olarak tutar (yeni anahtar girilene kadar sistemde kalir)
--   2) firm_notes.is_assistant kolonu — asistan cevaplarini insan
--      notlarindan ayirt etmek icin
--
-- SADECE super_admin erisebilir (Buzz entegrasyonu kapsaminda).
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) AI_PROVIDER_KEYS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_provider_keys (
  provider    TEXT PRIMARY KEY CHECK (provider IN ('grok', 'gemini', 'openrouter')),
  api_key     TEXT,
  model       TEXT NOT NULL,
  priority    INTEGER NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.ai_provider_keys IS
  'ADR Asistani icin coklu-motor fallback yapilandirmasi. api_key NULL ise o saglayici atlanir. priority kucuk olan once denenir.';

DROP TRIGGER IF EXISTS trg_ai_provider_keys_updated_at ON public.ai_provider_keys;
CREATE TRIGGER trg_ai_provider_keys_updated_at
BEFORE UPDATE ON public.ai_provider_keys
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Varsayilan 3 satir (anahtar bos, sonra admin panelinden girilecek)
INSERT INTO public.ai_provider_keys (provider, api_key, model, priority) VALUES
  ('grok',       NULL, 'grok-2-latest',              1),
  ('gemini',     NULL, 'gemini-1.5-flash',            2),
  ('openrouter', NULL, 'anthropic/claude-3.5-sonnet', 3)
ON CONFLICT (provider) DO NOTHING;

ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_provider_keys_super_admin_all" ON public.ai_provider_keys;
CREATE POLICY "ai_provider_keys_super_admin_all"
  ON public.ai_provider_keys FOR ALL
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
-- 2) firm_notes.is_assistant — asistan cevaplarini ayirt etmek icin
-- ----------------------------------------------------------------------------

ALTER TABLE public.firm_notes
  ADD COLUMN IF NOT EXISTS is_assistant BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.firm_notes.is_assistant IS
  'true ise bu not ADR Asistani tarafindan yazildi (author_id NULL olur).';


-- ----------------------------------------------------------------------------
-- 3) Dogrulama
-- ----------------------------------------------------------------------------

SELECT provider, model, priority, (api_key IS NOT NULL) AS anahtar_girilmis
FROM public.ai_provider_keys
ORDER BY priority;


-- ----------------------------------------------------------------------------
-- 4) Migration kaydi
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('032_adr_assistant_infra')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON — 3 satir donmeli (grok, gemini, openrouter), hepsinde
-- anahtar_girilmis = false (henuz anahtar girilmedi, admin panelinden girilecek)
-- ============================================================================
