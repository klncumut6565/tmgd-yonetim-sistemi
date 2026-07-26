-- ============================================================================
-- Migration 030: Audit/Workflow RLS'yi sadece super_admin'e kısıtla
-- ----------------------------------------------------------------------------
-- Talep: Buzz entegrasyonunun tum parcalari (audit_log, workflow_rules,
-- workflow_rule_log) artik SADECE super_admin'e gorunmeli — admin rolu
-- DAHIL diger hicbir rol bu verileri okuyamamali/yazamamali.
--
-- Daha once (027, 029) bu politikalar role IN ('super_admin','admin')
-- seklindeydi. Bu migration onlari role = 'super_admin' olarak siki-
-- lastirir.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) audit_log — sadece super_admin okuyabilir
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "audit_log_admin_read" ON public.audit_log;

CREATE POLICY "audit_log_admin_read"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
        AND p.approval_status = 'approved'
        AND p.is_active = true
    )
  );


-- ----------------------------------------------------------------------------
-- 2) workflow_rules — sadece super_admin yonetebilir
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "workflow_rules_admin_all" ON public.workflow_rules;

CREATE POLICY "workflow_rules_admin_all"
  ON public.workflow_rules FOR ALL
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
-- 3) workflow_rule_log — sadece super_admin okuyabilir
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "workflow_rule_log_admin_read" ON public.workflow_rule_log;

CREATE POLICY "workflow_rule_log_admin_read"
  ON public.workflow_rule_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
        AND p.approval_status = 'approved'
        AND p.is_active = true
    )
  );


-- ----------------------------------------------------------------------------
-- 4) DOGRULAMA — kendi rolunle kac satir gorebiliyorsun?
-- ----------------------------------------------------------------------------
-- super_admin isen: audit_log_kayit_sayisi > 0 donmeli
-- admin veya baska bir rol isen: 0 donmeli (RLS artik engelliyor)

SELECT COUNT(*) AS audit_log_gorebildigim FROM public.audit_log;
SELECT COUNT(*) AS workflow_rules_gorebildigim FROM public.workflow_rules;


-- ----------------------------------------------------------------------------
-- 5) MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('030_super_admin_only_rls')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
