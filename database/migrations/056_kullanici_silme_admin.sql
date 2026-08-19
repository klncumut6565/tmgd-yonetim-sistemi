-- ============================================================================
-- Migration 056: Kullanıcı Silme Yetkisi — Admin'e de Açıldı
-- ----------------------------------------------------------------------------
-- SORUN: Yönetim panelindeki "Sil" butonu hem UI'da (isSuperAdmin şartı)
-- hem de RLS'de (014_profiles_delete_policy.sql — yalnızca is_super_admin())
-- sadece super_admin'e açıktı. admin rolündeki kullanıcılar "Sil" butonunu
-- hiç görmüyordu.
--
-- ÇÖZÜM: RLS politikası admin'i de kapsayacak şekilde genişletildi — ANCAK
-- güvenlik amacıyla bir admin, super_admin rolündeki bir profili SİLEMEZ
-- (yetki taşması / sistemin en yetkili hesabına zarar verme riskine karşı).
-- Bu zaten UI'da da (admin, super_admin profillerini listede hiç görmüyor —
-- bkz. admin/page.tsx satır ~199) dolaylı olarak sağlanıyordu; burada ayrıca
-- RLS seviyesinde de (asıl güvenlik katmanı) garanti altına alınıyor.
--
-- Kendi profilini kimse silemez kuralı (super_admin dahil) korunuyor.
--
-- Idempotent — bir kaç kez çalıştırılabilir.
-- ============================================================================

DROP POLICY IF EXISTS profiles_delete ON public.profiles;
CREATE POLICY profiles_delete ON public.profiles
FOR DELETE USING (
    id <> auth.uid()  -- kimse kendi profilini silemez
    AND (
      public.is_super_admin()
      OR (public.is_admin() AND role <> 'super_admin')  -- admin, super_admin'i silemez
    )
);

-- ----------------------------------------------------------------------------
-- DOĞRULAMA
-- ----------------------------------------------------------------------------

SELECT polname, pg_get_expr(polqual, polrelid) AS kural
FROM pg_policy
WHERE polrelid = 'public.profiles'::regclass AND polname = 'profiles_delete';

-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('056_kullanici_silme_admin')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
