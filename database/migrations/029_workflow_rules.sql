-- ============================================================================
-- Migration 029: Workflow Rules (YAML tabanli bildirim motoru altyapisi)
-- ----------------------------------------------------------------------------
-- Amac: Sabit kodlanmis bildirim esiklerini yapilandirilabilir kurallara
-- cevirmek. Kavramsal kaynak: block/buzz'un workflow trigger sistemi.
--
-- Kurallar admin arayuzunde YAML olarak yazilir/gorunur, ama veritabaninda
-- JSONB olarak saklanir (js-yaml ile UI tarafinda cevrilir) — Postgres'te
-- YAML parse etmeye gerek kalmaz, cron runner sadece JSONB okur.
--
-- Iki tablo:
--   workflow_rules      : kural tanimlari (admin duzenler)
--   workflow_rule_log   : hangi kayit icin ne zaman bildirim gonderildi
--                         (tekrar bildirim / spam onleme icin)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) WORKFLOW_RULES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  rule_json        JSONB NOT NULL,
  repeat_interval_days INTEGER NOT NULL DEFAULT 7,
  created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workflow_rules IS
  'YAML tabanli bildirim kurallari. rule_json yapisi: {source, days_threshold, target_roles, title_template, message_template}';
COMMENT ON COLUMN public.workflow_rules.repeat_interval_days IS
  'Ayni kayit icin tekrar bildirim gonderilmeden once beklenecek gun sayisi (spam onleme)';

DROP TRIGGER IF EXISTS trg_workflow_rules_updated_at ON public.workflow_rules;
CREATE TRIGGER trg_workflow_rules_updated_at
BEFORE UPDATE ON public.workflow_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----------------------------------------------------------------------------
-- 2) WORKFLOW_RULE_LOG — hangi kayit icin ne zaman bildirim gonderildi
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workflow_rule_log (
  id           BIGSERIAL PRIMARY KEY,
  rule_id      UUID NOT NULL REFERENCES public.workflow_rules(id) ON DELETE CASCADE,
  record_ref   TEXT NOT NULL,  -- 'source_key:record_id' formatinda, orn. 'adr_expiring_drivers:uuid'
  notified_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_rule_log_lookup
  ON public.workflow_rule_log(rule_id, record_ref, notified_at DESC);

COMMENT ON TABLE public.workflow_rule_log IS
  'Her calisan kural + eslesen kayit icin ne zaman bildirim gonderildigini tutar. Tekrar bildirim, repeat_interval_days gecmeden gonderilmez.';


-- ----------------------------------------------------------------------------
-- 3) RLS — sadece super_admin/admin yonetebilir
-- ----------------------------------------------------------------------------

ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_rule_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_rules_admin_all" ON public.workflow_rules;
CREATE POLICY "workflow_rules_admin_all"
  ON public.workflow_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
        AND p.approval_status = 'approved'
        AND p.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
        AND p.approval_status = 'approved'
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "workflow_rule_log_admin_read" ON public.workflow_rule_log;
CREATE POLICY "workflow_rule_log_admin_read"
  ON public.workflow_rule_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
        AND p.approval_status = 'approved'
        AND p.is_active = true
    )
  );

-- Not: workflow_rule_log'a yazma islemi yalnizca cron runner'in kullandigi
-- service_role anahtariyla yapilir (RLS'yi bypass eder) — bu yuzden
-- authenticated kullanicilar icin ayrica bir INSERT policy'si YOK.


-- ----------------------------------------------------------------------------
-- 4) ORNEK KURAL — SRC5/ADR belge suresi (mevcut esik davranisiyla ayni
--    mantik, ama artik duzenlenebilir bir kural olarak)
-- ----------------------------------------------------------------------------

INSERT INTO public.workflow_rules (name, description, enabled, rule_json, repeat_interval_days)
SELECT
  'Sürücü ADR/SRC5 Belge Süresi',
  'Sürücülerin ADR sertifikası süresi dolmadan önce TMGD ve yöneticilere bildirim gönderir.',
  true,
  jsonb_build_object(
    'source', 'adr_expiring_drivers',
    'days_threshold', 30,
    'target_roles', jsonb_build_array('super_admin', 'admin', 'tmgd'),
    'title_template', 'SRC-5 Belge Süresi Yaklaşıyor',
    'message_template', '{first_name} {last_name} ({firm_name}) sürücüsünün SRC-5 belgesi {adr_valid_until} tarihinde doluyor.'
  ),
  7
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_rules WHERE name = 'Sürücü ADR/SRC5 Belge Süresi'
);


-- ----------------------------------------------------------------------------
-- 5) DOGRULAMA
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS kural_sayisi FROM public.workflow_rules;
-- Beklenti: 1 (ornek kural)


-- ----------------------------------------------------------------------------
-- 6) MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('029_workflow_rules')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
