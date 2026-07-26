-- ============================================================================
-- Migration 025: audit_row_change() pgcrypto schema fix
-- ----------------------------------------------------------------------------
-- Sorun: Migration 024'teki trigger fonksiyonu digest() cagrisini bulamiyor.
--   ERROR: 42883: function digest(text, unknown) does not exist
--   CONTEXT: PL/pgSQL function audit_row_change() line 61 at assignment
--
-- Sebep: Supabase'de pgcrypto extension'i 'extensions' schema'sinda kurulu,
--        'public'te degil. Fonksiyonun search_path'inda 'extensions' yoktu.
--
-- Fix:
--   1) SET search_path = public, auth, extensions
--   2) extensions.digest() diye schema-qualified cagri (belt + suspenders)
--   3) Genesis satirini garanti et (eger 024'te olusmadiysa)
--
-- Bu migration guvenle bir kac kez calistirilabilir — hepsi idempotent.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) TRIGGER FONKSIYONUNU YENIDEN OLUSTUR
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
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

  -- Schema-qualified: pgcrypto Supabase'de 'extensions' schema'sinda
  v_row_hash := extensions.encode(extensions.digest(v_hash_input, 'sha256'), 'hex');

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


-- ----------------------------------------------------------------------------
-- 2) GENESIS SATIRINI GARANTI ET (eger 024'te olusmadiysa)
-- ----------------------------------------------------------------------------

INSERT INTO public.audit_log (
  actor_email, actor_role, action, table_name, record_id, prev_hash, row_hash
)
SELECT
  'system', 'system', 'INSERT', '__genesis__', 'genesis',
  repeat('0', 64),
  extensions.encode(extensions.digest('tmgd_audit_genesis', 'sha256'), 'hex')
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_log WHERE table_name = '__genesis__'
);


-- ----------------------------------------------------------------------------
-- 3) DOGRULAMA CIKTISI (Supabase Results paneline gelir)
-- ----------------------------------------------------------------------------
-- Migration bitince asagidaki 3 sorgu sirasiyla calisir. Sonuclara bak:
--   * audit_log_kayit_sayisi >= 1 (genesis) olmali
--   * trigger_sayisi 10+ olmali (audited_tables x 3)
--   * digest_calisiyor = 'ok' donmeli
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS audit_log_kayit_sayisi FROM public.audit_log;

SELECT COUNT(*) AS trigger_sayisi
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_audit_%';

SELECT
  CASE
    WHEN extensions.encode(extensions.digest('test', 'sha256'), 'hex') IS NOT NULL
    THEN 'ok'
    ELSE 'fail'
  END AS digest_calisiyor;


-- ----------------------------------------------------------------------------
-- 4) MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('025_audit_pgcrypto_fix')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION 025 SONU
-- ============================================================================
