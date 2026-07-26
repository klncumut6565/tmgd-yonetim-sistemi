-- ============================================================================
-- Migration 028: Guvenlik Bildirimleri (Silme + Rol Degisikligi)
-- ----------------------------------------------------------------------------
-- Amac: audit_log zaten her degisikligi kaydediyor ama kimse sayfayi surekli
-- izlemiyor. Bu migration iki KRITIK olayi anlik olarak tum super_admin'lere
-- bildirim olarak dusurur:
--
--   1) Kritik bir tabloda SILME islemi (firms, drivers, vehicles, documents,
--      tasks, visits, employees, files, user_roles)
--   2) Bir kullanicinin ROLU degisti (profiles.role) — ozellikle yetki
--      yukseltme denemelerini (privilege escalation) anlik yakalamak icin.
--      Bu sistemde daha once boyle bir guvenlik acigi tespit edilip
--      duzeltilmisti (firms.tmgd_assigned uzerinden yetki yukseltme) —
--      bu bildirim benzer bir seyin bir daha sessizce gecmemesini saglar.
--
-- Tasarim: audit_log zaten butun degisiklikleri old_data/new_data JSONB
-- olarak tutuyor. Her audited tabloya ayri trigger eklemek yerine, TEK bir
-- trigger audit_log uzerine kuruluyor — mantik tek yerde, tekrar yok.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) TRIGGER FONKSIYONU
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_security_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin          RECORD;
  v_title          TEXT;
  v_message        TEXT;
  v_should_notify  BOOLEAN := false;
  v_old_role       TEXT;
  v_new_role       TEXT;
BEGIN
  -- Genesis satirini yoksay
  IF NEW.table_name = '__genesis__' THEN
    RETURN NEW;
  END IF;

  -- Durum 1: kritik tabloda SILME
  IF NEW.action = 'DELETE' AND NEW.table_name IN (
    'firms', 'drivers', 'vehicles', 'documents',
    'tasks', 'visits', 'employees', 'files', 'user_roles'
  ) THEN
    v_should_notify := true;
    v_title   := '🗑️ Kayıt Silindi';
    v_message := format(
      '%s tablosunda bir kayıt silindi (ID: %s). İşlemi yapan: %s.',
      NEW.table_name, NEW.record_id, COALESCE(NEW.actor_email, 'sistem')
    );

  -- Durum 2: profiles.role degisti
  ELSIF NEW.table_name = 'profiles' AND NEW.action = 'UPDATE' THEN
    v_old_role := NEW.old_data->>'role';
    v_new_role := NEW.new_data->>'role';

    IF v_old_role IS DISTINCT FROM v_new_role THEN
      v_should_notify := true;
      v_title   := '⚠️ Kullanıcı Rolü Değişti';
      v_message := format(
        'Kullanıcı rolü "%s" → "%s" olarak değişti (kayıt ID: %s). İşlemi yapan: %s.',
        COALESCE(v_old_role, 'yok'), COALESCE(v_new_role, 'yok'),
        NEW.record_id, COALESCE(NEW.actor_email, 'sistem')
      );
    END IF;
  END IF;

  -- Bildirim gonder (tum aktif super_admin'lere)
  IF v_should_notify THEN
    FOR v_admin IN
      SELECT id FROM public.profiles
      WHERE role = 'super_admin' AND is_active = true
    LOOP
      INSERT INTO public.notifications (user_id, title, message, notification_type)
      VALUES (v_admin.id, v_title, v_message, 'warning');
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.audit_security_notify() IS
  'audit_log uzerine AFTER INSERT trigger. Kritik silme ve rol degisikligi olaylarinda tum super_admin''lere bildirim gonderir.';


-- ----------------------------------------------------------------------------
-- 2) TRIGGER'I audit_log'A UYGULA
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_audit_security_notify ON public.audit_log;

CREATE TRIGGER trg_audit_security_notify
  AFTER INSERT ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_security_notify();


-- ----------------------------------------------------------------------------
-- 3) DOGRULAMA
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS trigger_kuruldu_mu
FROM information_schema.triggers
WHERE trigger_name = 'trg_audit_security_notify';
-- Beklenti: 1


-- ----------------------------------------------------------------------------
-- 4) MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('028_audit_security_notify')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEST ETMEK ICIN (migration bittikten sonra, ISTEGE BAGLI):
--
--   -- Herhangi bir gorevi sil, sonra:
--   DELETE FROM public.tasks WHERE id = (SELECT id FROM public.tasks LIMIT 1);
--
--   -- Bildirimler tablosunda yeni bir satir gormelisin:
--   SELECT title, message, created_at FROM public.notifications
--   ORDER BY created_at DESC LIMIT 3;
--
--   -- Uygulamada: sag ustteki zil ikonunda okunmamis sayaci artmali.
-- ============================================================================
