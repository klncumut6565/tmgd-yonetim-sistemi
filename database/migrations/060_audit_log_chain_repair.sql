-- ============================================================================
-- Migration 060: Audit Log Hash Zinciri Onarımı + Race Condition Düzeltmesi
-- ----------------------------------------------------------------------------
-- SORUN: id=798 ve id=799 aynı anda (2ms fark) eklendi, ikisi de aynı
-- prev_hash'i okudu (audit_row_change() içindeki "SELECT ... FOR UPDATE"
-- kilidi, REPEATABLE READ/istemci snapshot koşullarında yeni INSERT edilen
-- satırı göremeyebiliyor — bu bilinen bir Postgres davranışı, veri
-- manipülasyonu DEĞİL).
--
-- ÇÖZÜM:
--   1) Trigger'a pg_advisory_xact_lock eklenir — transaction isolation
--      seviyesinden bağımsız, gerçek bir sıralı erişim garantisi sağlar.
--   2) Kırık noktadan (799) itibaren zincir, orijinal veriler (ts, actor_id,
--      old_data, new_data vb. hiçbiri değişmedi) kullanılarak yeniden
--      hesaplanır ve doğru şekilde birbirine bağlanır.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) TRIGGER FONKSİYONUNU GÜÇLENDİR — pg_advisory_xact_lock ile
-- ----------------------------------------------------------------------------
-- Advisory lock, transaction sonunda otomatik serbest kalır ve TÜM
-- concurrent audit yazımlarını gerçek bir kritik bölgeye (critical section)
-- sokar — isolation seviyesinden bağımsız çalışır.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_prev_hash   TEXT;
  v_actor_id    UUID;
  v_actor_email TEXT;
  v_actor_role  TEXT;
  v_firm_id     UUID;
  v_record_id   TEXT;
  v_old_data    JSONB;
  v_new_data    JSONB;
  v_hash_input  TEXT;
  v_row_hash    TEXT;
BEGIN
  -- KRİTİK BÖLGE KİLİDİ: Tüm audit yazımlarını gerçek anlamda sıralar.
  -- Sabit key (42, 424242) — sadece bu fonksiyon içinde kullanılıyor.
  PERFORM pg_advisory_xact_lock(42, 424242);

  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL THEN
    SELECT email, COALESCE(raw_user_meta_data->>'role', 'unknown')
      INTO v_actor_email, v_actor_role
      FROM auth.users WHERE id = v_actor_id;
  ELSE
    v_actor_email := 'system';
    v_actor_role  := 'system';
  END IF;

  IF (TG_OP = 'DELETE') THEN
    v_record_id := COALESCE((to_jsonb(OLD)->>'id'), 'unknown');
    v_old_data  := to_jsonb(OLD);
    v_new_data  := NULL;
    v_firm_id   := NULLIF(to_jsonb(OLD)->>'firm_id', '')::UUID;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_record_id := COALESCE((to_jsonb(NEW)->>'id'), 'unknown');
    v_old_data  := to_jsonb(OLD);
    v_new_data  := to_jsonb(NEW);
    v_firm_id   := NULLIF(to_jsonb(NEW)->>'firm_id', '')::UUID;
  ELSE
    v_record_id := COALESCE((to_jsonb(NEW)->>'id'), 'unknown');
    v_old_data  := NULL;
    v_new_data  := to_jsonb(NEW);
    v_firm_id   := NULLIF(to_jsonb(NEW)->>'firm_id', '')::UUID;
  END IF;

  -- Artık advisory lock sayesinde bu SELECT'in FOR UPDATE'e ihtiyacı yok,
  -- ama zararı da yok — çift güvence olarak bırakıldı.
  SELECT row_hash INTO v_prev_hash
    FROM public.audit_log
    ORDER BY id DESC
    LIMIT 1
    FOR UPDATE;

  v_hash_input :=
       v_prev_hash
    || COALESCE(v_actor_id::TEXT, 'anonymous')
    || TG_OP
    || TG_TABLE_NAME
    || v_record_id
    || COALESCE(v_old_data::TEXT, '')
    || COALESCE(v_new_data::TEXT, '')
    || now()::TEXT;

  v_row_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

  INSERT INTO public.audit_log (
    actor_id, actor_email, actor_role,
    action, table_name, record_id, firm_id,
    old_data, new_data, prev_hash, row_hash
  ) VALUES (
    v_actor_id, v_actor_email, v_actor_role,
    TG_OP, TG_TABLE_NAME, v_record_id, v_firm_id,
    v_old_data, v_new_data, v_prev_hash, v_row_hash
  );

  IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

COMMENT ON FUNCTION public.audit_row_change() IS
  'Kritik tablolara AFTER INSERT/UPDATE/DELETE trigger olarak takılır. pg_advisory_xact_lock ile tam sıralı, race-condition korumalı hash zinciri üretir (bkz. migration 060).';

-- ----------------------------------------------------------------------------
-- 2) ZİNCİR ONARIMI — id=799'dan itibaren yeniden hesapla ve bağla
-- ----------------------------------------------------------------------------
-- Orijinal veriler (ts, actor_id, action, table_name, record_id, old_data,
-- new_data) DEĞİŞMEDEN kalır — sadece prev_hash/row_hash zinciri, doğru
-- sırayla yeniden kurulur. Bu bir veri düzeltmesi değil, sadece linkleme
-- onarımıdır: içerik aynı, zincir bağlantısı düzeltiliyor.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  rec RECORD;
  v_prev_hash  TEXT;
  v_hash_input TEXT;
  v_row_hash   TEXT;
BEGIN
  -- Kırılmadan önceki son sağlam halka (798) referans alınır.
  SELECT row_hash INTO v_prev_hash
    FROM public.audit_log
    WHERE id = 798;

  IF v_prev_hash IS NULL THEN
    RAISE EXCEPTION 'id=798 bulunamadı — onarım referans noktası eksik, migration durduruldu.';
  END IF;

  FOR rec IN
    SELECT id, ts, actor_id, action, table_name, record_id, old_data, new_data
    FROM public.audit_log
    WHERE id >= 799
    ORDER BY id ASC
  LOOP
    v_hash_input :=
         v_prev_hash
      || COALESCE(rec.actor_id::TEXT, 'anonymous')
      || rec.action
      || rec.table_name
      || rec.record_id
      || COALESCE(rec.old_data::TEXT, '')
      || COALESCE(rec.new_data::TEXT, '')
      || rec.ts::TEXT;

    v_row_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

    UPDATE public.audit_log
      SET prev_hash = v_prev_hash,
          row_hash  = v_row_hash
      WHERE id = rec.id;

    v_prev_hash := v_row_hash;
  END LOOP;

  RAISE NOTICE 'Audit log zinciri id=799''dan itibaren yeniden bağlandı.';
END $$;

-- ----------------------------------------------------------------------------
-- 3) DOĞRULAMA — bu SELECT boş dönmelidir
-- ----------------------------------------------------------------------------
-- SELECT * FROM public.audit_verify_chain();
