-- ============================================================================
-- Migration 057: Firma Silme Yetkisi — Admin'e de Açıldı
-- ----------------------------------------------------------------------------
-- SORUN: Firmalar sayfasındaki "Sil" butonu hem UI'da (isSuperAdmin şartı)
-- hem de RLS'de (004_rol_yetkileri.sql — firms_delete politikası yalnızca
-- is_super_admin()) sadece super_admin'e açıktı. admin rolündeki
-- kullanıcılar bu butonu hiç görmüyordu (056_kullanici_silme_admin.sql'deki
-- AYNI eksiklik, bu kez firms tablosunda).
--
-- ÇÖZÜM: firms_delete RLS politikası is_admin()'i de kapsayacak şekilde
-- genişletildi. Firma silmenin bağlı TÜM kayıtları (görevler, belgeler,
-- sürücüler, araçlar, taşıma evrakları vb. — cascade) sildiğini not ediyoruz;
-- bu, kullanıcı silmeye göre daha riskli bir işlemdir ama kullanıcı rolü
-- gibi bir "üstünlük" kavramı firma nesnesinde olmadığı için (firma silmede
-- admin'in bir üst yetkiliye zarar verme riski yok — kullanıcı silmedeki
-- 'admin, super_admin'i silemez' kısıtına burada gerek yoktur), ek bir
-- kısıtlama eklenmedi.
--
-- Idempotent — bir kaç kez çalıştırılabilir.
-- ============================================================================

DROP POLICY IF EXISTS firms_delete ON public.firms;
CREATE POLICY firms_delete ON public.firms FOR DELETE USING (
    public.is_admin()  -- is_admin() zaten super_admin VE admin'i kapsar
);

-- ----------------------------------------------------------------------------
-- DOĞRULAMA
-- ----------------------------------------------------------------------------

SELECT polname, pg_get_expr(polqual, polrelid) AS kural
FROM pg_policy
WHERE polrelid = 'public.firms'::regclass AND polname = 'firms_delete';

-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('057_firma_silme_admin')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
