-- ============================================================================
-- Migration 024: Hash-Chain Audit Log
-- ----------------------------------------------------------------------------
-- Amaç: Kritik tablolardaki tüm INSERT/UPDATE/DELETE işlemlerini SHA-256
-- hash zinciri ile kaydeder. Zincir kırılırsa veri manipülasyonu tespit
-- edilebilir. UBGM veya müşteri denetimi için kriptografik denetim izi sağlar.
--
-- Kavramsal kaynak: block/buzz projesinin `buzz-audit` bileşeni
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) AUDIT LOG TABLOSU
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
  id            BIGSERIAL PRIMARY KEY,
  ts            TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email   TEXT,
  actor_role    TEXT,
  action        TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  table_name    TEXT NOT NULL,
  record_id     TEXT NOT NULL,
  firm_id       UUID,
  old_data      JSONB,
  new_data      JSONB,
  prev_hash     TEXT NOT NULL,
  row_hash      TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_ts           ON public.audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_firm         ON public.audit_log(firm_id) WHERE firm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_actor        ON public.audit_log(actor_id);

COMMENT ON TABLE public.audit_log IS
  'Hash-chain audit log — kritik tablolarda yapılan tüm değişikliklerin kriptografik denetim izi. Doğrudan yazılamaz, yalnızca trigger ile eklenir.';

-- ----------------------------------------------------------------------------
-- 2) GENESIS SATIRI (zincirin başlangıcı)
-- ----------------------------------------------------------------------------

INSERT INTO public.audit_log (
  actor_email, actor_role, action, table_name, record_id, prev_hash, row_hash
) 
SELECT 
  'system', 'system', 'INSERT', '__genesis__', 'genesis',
  repeat('0', 64),
  encode(digest('tmgd_audit_genesis', 'sha256'), 'hex')
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_log WHERE table_name = '__genesis__'
);

-- ----------------------------------------------------------------------------
-- 3) TRIGGER FONKSİYONU
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER + owner = postgres → RLS'yi bypass ederek yazabilir.
-- FOR UPDATE lock: concurrent yazımlarda zincir sırasının bozulmasını önler.
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
  -- Aktör bilgisi (auth.uid() RLS context'inden gelir)
  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL THEN
    SELECT email, COALESCE(raw_user_meta_data->>'role', 'unknown')
      INTO v_actor_email, v_actor_role
      FROM auth.users WHERE id = v_actor_id;
  ELSE
    v_actor_email := 'system';
    v_actor_role  := 'system';
  END IF;

  -- Kayıt ID + firm_id çıkarımı
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
  ELSE -- INSERT
    v_record_id := COALESCE((to_jsonb(NEW)->>'id'), 'unknown');
    v_old_data  := NULL;
    v_new_data  := to_jsonb(NEW);
    v_firm_id   := NULLIF(to_jsonb(NEW)->>'firm_id', '')::UUID;
  END IF;

  -- Zincirin son halkasını al (LOCK ile concurrent güvenli)
  SELECT row_hash INTO v_prev_hash
    FROM public.audit_log
    ORDER BY id DESC
    LIMIT 1
    FOR UPDATE;

  -- SHA-256 hash girdisi
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
  'Kritik tablolara AFTER INSERT/UPDATE/DELETE trigger olarak takılır. Her değişikliği SHA-256 hash zinciriyle audit_log tablosuna yazar.';

-- ----------------------------------------------------------------------------
-- 4) TRIGGER'LARI KRİTİK TABLOLARA UYGULA
-- ----------------------------------------------------------------------------
-- Sadece bu repoda MEVCUT olan tablolara uyguluyoruz. Tablo yoksa atlar.
-- İleride yeni kritik tablolar eklendiğinde ayrı bir migration ile eklenir.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
  audited_tables TEXT[] := ARRAY[
    'firms',
    'tasks',
    'documents',
    'files',
    'vehicles',
    'drivers',
    'employees',
    'visits',
    'notifications',
    'user_roles'
  ];
BEGIN
  FOREACH t IN ARRAY audited_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;', t, t);
      EXECUTE format('
        CREATE TRIGGER trg_audit_%I
        AFTER INSERT OR UPDATE OR DELETE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
      ', t, t);
      RAISE NOTICE 'Audit trigger eklendi: %', t;
    ELSE
      RAISE NOTICE 'Tablo bulunamadı, atlandı: %', t;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5) ZİNCİR BÜTÜNLÜK DOĞRULAMA FONKSİYONU
-- ----------------------------------------------------------------------------
-- Kullanım: SELECT * FROM public.audit_verify_chain();
-- Boş dönerse zincir sağlam. Satır dönerse o ID'de zincir kırılmış.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_verify_chain(
  p_start_id BIGINT DEFAULT NULL,
  p_end_id   BIGINT DEFAULT NULL
)
RETURNS TABLE (
  broken_at_id       BIGINT,
  expected_prev_hash TEXT,
  actual_prev_hash   TEXT,
  ts                 TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ordered AS (
    SELECT
      id, ts, prev_hash, row_hash,
      LAG(row_hash) OVER (ORDER BY id) AS calc_prev
    FROM public.audit_log
    WHERE (p_start_id IS NULL OR id >= p_start_id)
      AND (p_end_id   IS NULL OR id <= p_end_id)
  )
  SELECT id, calc_prev, prev_hash, ts
  FROM ordered
  WHERE calc_prev IS NOT NULL
    AND calc_prev <> prev_hash;
$$;

COMMENT ON FUNCTION public.audit_verify_chain(BIGINT, BIGINT) IS
  'Audit log hash zincirinin bütünlüğünü kontrol eder. Boş dönerse zincir sağlamdır.';

-- ----------------------------------------------------------------------------
-- 6) ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- - SELECT: sadece admin/super_admin
-- - INSERT/UPDATE/DELETE: kimse doğrudan yazamaz (trigger SECURITY DEFINER ile bypass eder)
-- ----------------------------------------------------------------------------

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_admin_read"       ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_no_direct_insert" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_no_update"        ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_no_delete"        ON public.audit_log;

CREATE POLICY "audit_log_admin_read"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_user_meta_data->>'role') IN ('super_admin','admin')
    )
  );

CREATE POLICY "audit_log_no_direct_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "audit_log_no_update"        ON public.audit_log FOR UPDATE TO authenticated USING (false);
CREATE POLICY "audit_log_no_delete"        ON public.audit_log FOR DELETE TO authenticated USING (false);

-- ----------------------------------------------------------------------------
-- 7) MIGRATION İZLEME TABLOSU (yeni konvansiyon)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public._migrations (
  id         TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public._migrations (id) VALUES ('024_audit_log')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION SONU
-- ============================================================================
-- Doğrulama komutları (migration bittikten sonra manuel çalıştır):
--
--   SELECT * FROM public.audit_log WHERE table_name = '__genesis__';
--     → 1 satır dönmeli (genesis)
--
--   -- Herhangi bir firmayı güncelle:
--   UPDATE public.firms SET name = name WHERE id = (SELECT id FROM firms LIMIT 1);
--
--   SELECT id, action, table_name, actor_email, ts 
--     FROM public.audit_log ORDER BY id DESC LIMIT 5;
--     → UPDATE satırı görünmeli
--
--   SELECT * FROM public.audit_verify_chain();
--     → boş dönmeli (zincir sağlam)
-- ============================================================================
