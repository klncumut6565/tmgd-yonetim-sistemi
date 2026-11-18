-- 080_profil_yetki_korumasi.sql
-- KRİTİK GÜVENLİK DÜZELTMESİ (18.11.2026 denetimi)
--
-- Sorun: profiles_update_self politikası (id = auth.uid() OR is_admin()) kullanıcının
-- KENDİ satırındaki her kolonu güncellemesine izin veriyordu. Giriş yapmış herhangi bir
-- kullanıcı (company rolü dahil) tarayıcı konsolundan
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', <kendi id>)
-- çalıştırarak yönetici olabiliyor ve tüm firmaların verisine/dosyalarına erişebiliyordu.
--
-- Çözüm: yetki kolonlarını koruyan BEFORE UPDATE tetikleyicisi.
--   - Korunan kolonlar: role, approval_status, approved_at, approved_by, is_active,
--     company_user, email, id, olusturma_yontemi
--   - Bu kolonları yalnız ONAYLI ve AKTİF admin / super_admin değiştirebilir,
--     o da kendi satırında DEĞİL.
--   - role = 'super_admin' atamak veya bir super_admin satırını değiştirmek yalnız super_admin.
--   - auth.uid() NULL (service_role: /api/admin/create-user, SQL Editor) etkilenmez.
--   - full_name, phone, avatar_url gibi kişisel alanlar kullanıcı tarafından güncellenmeye devam eder.

CREATE OR REPLACE FUNCTION public.profil_yetki_korumasi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_rol   text;
  v_onay  text;
  v_aktif boolean;
BEGIN
  -- service_role / SQL Editor / sunucu işlemleri
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Korunan kolonlar değişmediyse serbest
  IF NEW.role              IS NOT DISTINCT FROM OLD.role
     AND NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status
     AND NEW.approved_at     IS NOT DISTINCT FROM OLD.approved_at
     AND NEW.approved_by     IS NOT DISTINCT FROM OLD.approved_by
     AND NEW.is_active       IS NOT DISTINCT FROM OLD.is_active
     AND NEW.company_user    IS NOT DISTINCT FROM OLD.company_user
     AND NEW.email           IS NOT DISTINCT FROM OLD.email
     AND NEW.id              IS NOT DISTINCT FROM OLD.id
     AND NEW.olusturma_yontemi IS NOT DISTINCT FROM OLD.olusturma_yontemi
  THEN
    RETURN NEW;
  END IF;

  SELECT role, approval_status, is_active INTO v_rol, v_onay, v_aktif
  FROM public.profiles WHERE id = v_uid;

  IF v_rol IS NULL OR v_rol NOT IN ('super_admin', 'admin')
     OR v_onay IS DISTINCT FROM 'approved' OR v_aktif IS NOT TRUE THEN
    RAISE EXCEPTION 'Yetki alanlarını yalnız yönetici değiştirebilir.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.id = v_uid THEN
    RAISE EXCEPTION 'Kendi rol/onay/aktiflik bilginizi değiştiremezsiniz.'
      USING ERRCODE = '42501';
  END IF;

  IF v_rol <> 'super_admin'
     AND (NEW.role = 'super_admin' OR OLD.role = 'super_admin') THEN
    RAISE EXCEPTION 'Süper yönetici atamasını yalnız süper yönetici yapabilir.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profil_yetki_korumasi() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profil_yetki_korumasi ON public.profiles;
CREATE TRIGGER trg_profil_yetki_korumasi
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profil_yetki_korumasi();

INSERT INTO public._migrations (id) VALUES ('080_profil_yetki_korumasi');
