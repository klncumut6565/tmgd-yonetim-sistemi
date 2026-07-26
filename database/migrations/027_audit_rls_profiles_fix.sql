-- ============================================================================
-- Migration 027: audit_log RLS fix — profiles tablosuna gore
-- ----------------------------------------------------------------------------
-- Sorun: audit_log_admin_read policy'si auth.users.raw_user_meta_data->>'role'
-- alanina bakiyordu. Ama bu sistemde rol public.profiles tablosunda tutuluyor
-- (bkz. src/hooks/useUser.ts, database/004_rol_yetkileri.sql). Sonuc: tabloda
-- veri olsa bile HIC KIMSE (super_admin dahil) audit_log'u okuyamiyordu —
-- policy her zaman false donuyordu.
--
-- Fix: policy'yi public.profiles.role kontrolune cevir. Mevcut konvansiyonla
-- (is_super_admin(), yazabilir()) tutarli olsun diye ayni pattern kullanilir.
-- ============================================================================

DROP POLICY IF EXISTS "audit_log_admin_read" ON public.audit_log;

CREATE POLICY "audit_log_admin_read"
  ON public.audit_log FOR SELECT
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

-- ----------------------------------------------------------------------------
-- Dogrulama: kendi kullanicinla audit_log'u kac satir gorebiliyorsun?
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS gorebildigim_kayit_sayisi FROM public.audit_log;

-- ----------------------------------------------------------------------------
-- Migration kaydi
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('027_audit_rls_profiles_fix')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON — gorebildigim_kayit_sayisi artik >= 2 donmeli (senin profil rolun
-- super_admin veya admin ise). Hala 0 donerse: profiles tablonda kendi
-- satirinin role/approval_status/is_active alanlarini kontrol et:
--
--   SELECT id, email, role, approval_status, is_active
--   FROM public.profiles WHERE id = auth.uid();
-- ============================================================================
