-- 081_guvenlik_sertlestirme.sql
-- 18.11.2026 güvenlik denetiminin ORTA seviye bulguları. 080'den SONRA çalıştırılır.
--
-- 1) firm-files yükleme: yazma yetkili kullanıcı artık yalnız ATANDIĞI firmanın
--    klasörüne (<firm_id>/...) dosya ekleyebilir. Admin her yere ekler.
--    Uygulamadaki tüm yükleme yolları zaten <firm_id>/ ile başlıyor.
-- 2) user_firms: firma–kullanıcı ataması yalnız admin (Yönetim → Firma Atamaları).
--    Önceden firmaya atanmış yazma yetkili kullanıcı o firmaya başkalarını atayabiliyordu.
--    (Firma oluşturunca çalışan assign_firm_to_creator tetikleyicisi SECURITY DEFINER; etkilenmez.)
-- 3) dashboard_statistics görünümü: giriş yapmamış (anon) kullanıcıya kapatıldı ve
--    sorgulayanın yetkileriyle (security_invoker) çalışır; herkes yalnız görebildiği
--    kayıtların sayısını görür.
-- 4) Giriş yapmamış kullanıcı log_activity / audit_verify_chain /
--    belge_tarama_oturumlarini_temizle fonksiyonlarını çağıramaz.
-- 5) set_updated_at: search_path sabitlendi (Supabase uyarısı).
-- HİÇBİR VERİ VE DOSYA SİLİNMEZ.

-- 1) firm-files yükleme politikası
DROP POLICY IF EXISTS "firm-files yükleme" ON storage.objects;
CREATE POLICY "firm-files yükleme" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'firm-files'
    AND (
      public.is_admin()
      OR (
        public.yazabilir()
        -- CASE: geçersiz (uuid olmayan) yolda ::uuid dönüşümü hata vermesin
        AND CASE
              WHEN (string_to_array(name, '/'))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              THEN public.is_assigned(((string_to_array(name, '/'))[1])::uuid)
              ELSE false
            END
      )
    )
  );

-- 2) user_firms yazma yalnız admin (user_firms_admin_all politikası admin için ALL zaten veriyor)
DROP POLICY IF EXISTS user_firms_insert ON public.user_firms;
DROP POLICY IF EXISTS user_firms_update ON public.user_firms;
DROP POLICY IF EXISTS user_firms_delete ON public.user_firms;

-- 3) dashboard_statistics
ALTER VIEW public.dashboard_statistics SET (security_invoker = true);
REVOKE ALL ON public.dashboard_statistics FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.dashboard_statistics FROM authenticated;

-- 4) anon'a kapatılan fonksiyonlar (giriş yapmış kullanıcı için değişiklik yok)
REVOKE EXECUTE ON FUNCTION public.log_activity(uuid, uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.log_activity(uuid, uuid, text, text, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.audit_verify_chain(bigint, bigint) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.audit_verify_chain(bigint, bigint) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.belge_tarama_oturumlarini_temizle() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.belge_tarama_oturumlarini_temizle() TO authenticated, service_role;

-- 5) set_updated_at
ALTER FUNCTION public.set_updated_at() SET search_path = public;

INSERT INTO public._migrations (id) VALUES ('081_guvenlik_sertlestirme');
