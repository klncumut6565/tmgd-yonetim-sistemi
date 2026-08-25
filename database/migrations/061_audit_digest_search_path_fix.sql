-- ============================================================================
-- Migration 061: audit_row_change() — pgcrypto digest() "function does not
-- exist" hatası düzeltmesi
-- ----------------------------------------------------------------------------
-- SORUN: Firma bilgileri gibi izlenen (audited) tablolarda UPDATE/INSERT/
-- DELETE yapıldığında "function digest(text, unknown) does not exist" hatası
-- alınıyordu.
--
-- KÖK NEDEN: Supabase projelerinde pgcrypto extension'ı varsayılan olarak
-- "public" şemasına DEĞİL, "extensions" şemasına kurulur. audit_row_change()
-- fonksiyonu ise güvenlik amacıyla "SET search_path = public, auth" ile
-- çalışıyor — bu search_path içinde "extensions" şeması yer almadığından,
-- fonksiyonun içindeki digest(...) çağrısı hangi şemada arayacağını
-- bulamıyor ve "does not exist" hatası veriyor.
--
-- ÇÖZÜM: search_path'e "extensions" şemasını da ekliyoruz. pgcrypto zaten
-- public'e kuruluysa bu ek şema zararsızdır (bulunamazsa aramaya devam
-- eder); extensions'a kuruluysa artık bulunur.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
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
  'Kritik tablolara AFTER INSERT/UPDATE/DELETE trigger olarak takılır. pg_advisory_xact_lock ile tam sıralı, race-condition korumalı hash zinciri üretir; search_path artık extensions şemasını da kapsıyor (pgcrypto digest() çözümü — bkz. migration 061).';

-- ----------------------------------------------------------------------------
-- pgcrypto extension'ının kurulu olduğu şemayı da garanti altına alalım —
-- eğer "extensions" şemasında değilse (ör. eski kurulumlarda public'e
-- kurulmuş olabilir), CREATE EXTENSION IF NOT EXISTS zaten var olan
-- kurulumu bozmadan sorunsuz geçer.
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
