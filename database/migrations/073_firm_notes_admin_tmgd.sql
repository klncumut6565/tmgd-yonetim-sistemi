-- ============================================================================
-- Migration 073: firm_notes — Yönetici (admin) ve TMGD rollerine not erişimi
-- ----------------------------------------------------------------------------
-- 031 ile Notlar yalnızca super_admin'e açıktı. Sesli/yazılı asistanın
-- "şunu not et" özelliği ve Notlar sekmesi artık admin ve tmgd için de açılıyor.
--
-- KURALLAR
--   * super_admin: eskisi gibi her şey (firm_notes_super_admin_all korunur).
--   * admin      : tüm firmaların notlarını görür, not ekler.
--   * tmgd       : yalnızca atandığı (user_firms) firmaların notlarını görür/ekler.
--   * admin/tmgd yalnızca KENDİ yazdığı notu düzenleyebilir/silebilir.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN. Idempotent.
-- ============================================================================

DROP POLICY IF EXISTS firm_notes_danisman_select ON public.firm_notes;
CREATE POLICY firm_notes_danisman_select ON public.firm_notes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.approval_status = 'approved' AND p.is_active = true
      AND (
        p.role = 'admin'
        OR (p.role = 'tmgd' AND EXISTS (
              SELECT 1 FROM public.user_firms uf
              WHERE uf.firm_id = firm_notes.firm_id AND uf.user_id = auth.uid()))
      )
  )
);

DROP POLICY IF EXISTS firm_notes_danisman_insert ON public.firm_notes;
CREATE POLICY firm_notes_danisman_insert ON public.firm_notes FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.approval_status = 'approved' AND p.is_active = true
      AND (
        p.role = 'admin'
        OR (p.role = 'tmgd' AND EXISTS (
              SELECT 1 FROM public.user_firms uf
              WHERE uf.firm_id = firm_notes.firm_id AND uf.user_id = auth.uid()))
      )
  )
);

DROP POLICY IF EXISTS firm_notes_danisman_update ON public.firm_notes;
CREATE POLICY firm_notes_danisman_update ON public.firm_notes FOR UPDATE TO authenticated
USING (
  author_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','tmgd')
              AND p.approval_status = 'approved' AND p.is_active = true)
)
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS firm_notes_danisman_delete ON public.firm_notes;
CREATE POLICY firm_notes_danisman_delete ON public.firm_notes FOR DELETE TO authenticated
USING (
  author_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','tmgd')
              AND p.approval_status = 'approved' AND p.is_active = true)
);

-- DOĞRULAMA
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'firm_notes' order by cmd;

INSERT INTO public._migrations (id) VALUES ('073_firm_notes_admin_tmgd')
ON CONFLICT DO NOTHING;
