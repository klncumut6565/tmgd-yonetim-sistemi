-- DURUM: HAZIR, HENÜZ UYGULANMADI (2026-10-28 — onay bekliyor).
--
-- 029 — RLS PERFORMANS DÜZELTMESİ (2026-10-28)
--
-- Supabase performans danışmanı uyarıları:
--   * multiple_permissive_policies (42): aynı tablo + rol + işlem için birden
--     fazla permissive politika → her satırda hepsi ayrı ayrı çalışıyordu.
--   * auth_rls_initplan (147): auth.uid() her SATIR için yeniden
--     hesaplanıyordu. (select auth.uid()) yazımı ile sorgu başına BİR KEZ
--     hesaplanır (initplan).
--
-- YETKİ MANTIĞI DEĞİŞMEZ. Birleştirmeler, Postgres'in permissive
-- politikaları zaten OR ile birleştirmesinin birebir karşılığıdır:
--   - "ALL" yazma politikası INSERT/UPDATE/DELETE olarak bölündü, SELECT
--     politikası (okuma_kosulu OR yazma_kosulu) oldu.
--   - user_firms_admin_all: her işlem politikası zaten "is_admin() OR ..."
--     içerdiği için tamamen gereksizdi → kaldırıldı.
--
-- Geri alma: önce bu dosyada OLUŞTURULAN *_insert/_update/_delete
-- politikaları DROP edilir, sonra 028_YEDEK_rls_politikalari_once.sql çalıştırılır.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) user_firms — gereksiz admin_all politikası
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_firms_admin_all ON public.user_firms;

-- ---------------------------------------------------------------------------
-- 2) adr_un_numbers — okuma herkese açık (true), yazma yalnızca admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS adr_un_write ON public.adr_un_numbers;
CREATE POLICY adr_un_insert ON public.adr_un_numbers FOR INSERT TO public WITH CHECK (is_admin());
CREATE POLICY adr_un_update ON public.adr_un_numbers FOR UPDATE TO public USING (is_admin());
CREATE POLICY adr_un_delete ON public.adr_un_numbers FOR DELETE TO public USING (is_admin());
-- adr_un_select: USING (true) — "true OR is_admin()" = true, değişiklik yok.

-- ---------------------------------------------------------------------------
-- 3) atik_firmalari — okuma ve yazma koşulu aynı
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS atik_firmalari_write ON public.atik_firmalari;
CREATE POLICY atik_firmalari_insert ON public.atik_firmalari FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved' AND p.is_active = true AND p.role = ANY (ARRAY['super_admin','admin','tmgd'])));
CREATE POLICY atik_firmalari_update ON public.atik_firmalari FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved' AND p.is_active = true AND p.role = ANY (ARRAY['super_admin','admin','tmgd'])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved' AND p.is_active = true AND p.role = ANY (ARRAY['super_admin','admin','tmgd'])));
CREATE POLICY atik_firmalari_delete ON public.atik_firmalari FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved' AND p.is_active = true AND p.role = ANY (ARRAY['super_admin','admin','tmgd'])));

-- ---------------------------------------------------------------------------
-- 4) firm_carriers
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS firm_carriers_write ON public.firm_carriers;
ALTER POLICY firm_carriers_read ON public.firm_carriers
  USING (is_admin() OR is_assigned(firm_id)
         OR ((yazabilir() OR firma_kullanicisi()) AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = firm_carriers.firm_id AND uf.user_id = auth.uid())));
CREATE POLICY firm_carriers_insert ON public.firm_carriers FOR INSERT TO public
  WITH CHECK (is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = firm_carriers.firm_id AND uf.user_id = auth.uid())));
CREATE POLICY firm_carriers_update ON public.firm_carriers FOR UPDATE TO public
  USING (is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = firm_carriers.firm_id AND uf.user_id = auth.uid())))
  WITH CHECK (is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = firm_carriers.firm_id AND uf.user_id = auth.uid())));
CREATE POLICY firm_carriers_delete ON public.firm_carriers FOR DELETE TO public
  USING (is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = firm_carriers.firm_id AND uf.user_id = auth.uid())));

-- ---------------------------------------------------------------------------
-- 5) transport_document_items
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS transport_document_items_write ON public.transport_document_items;
ALTER POLICY transport_document_items_select ON public.transport_document_items
  USING (EXISTS (SELECT 1 FROM transport_documents td WHERE td.id = transport_document_items.document_id
         AND (is_admin() OR is_assigned(td.firm_id)
              OR ((yazabilir() OR firma_kullanicisi()) AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = td.firm_id AND uf.user_id = auth.uid())))));
CREATE POLICY transport_document_items_insert ON public.transport_document_items FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM transport_documents td WHERE td.id = transport_document_items.document_id
         AND (is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = td.firm_id AND uf.user_id = auth.uid())))));
CREATE POLICY transport_document_items_update ON public.transport_document_items FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM transport_documents td WHERE td.id = transport_document_items.document_id
         AND (is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = td.firm_id AND uf.user_id = auth.uid())))))
  WITH CHECK (EXISTS (SELECT 1 FROM transport_documents td WHERE td.id = transport_document_items.document_id
         AND (is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = td.firm_id AND uf.user_id = auth.uid())))));
CREATE POLICY transport_document_items_delete ON public.transport_document_items FOR DELETE TO public
  USING (EXISTS (SELECT 1 FROM transport_documents td WHERE td.id = transport_document_items.document_id
         AND (is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = td.firm_id AND uf.user_id = auth.uid())))));

-- ---------------------------------------------------------------------------
-- 6) mevzuat + mevzuat_metin — okuma: onaylı kullanıcı, yazma: admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS mevzuat_write ON public.mevzuat;
ALTER POLICY mevzuat_select ON public.mevzuat
  USING (is_admin() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved' AND p.is_active = true));
CREATE POLICY mevzuat_insert ON public.mevzuat FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY mevzuat_update ON public.mevzuat FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY mevzuat_delete ON public.mevzuat FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS mevzuat_metin_write ON public.mevzuat_metin;
ALTER POLICY mevzuat_metin_select ON public.mevzuat_metin
  USING (is_admin() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved' AND p.is_active = true));
CREATE POLICY mevzuat_metin_insert ON public.mevzuat_metin FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY mevzuat_metin_update ON public.mevzuat_metin FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY mevzuat_metin_delete ON public.mevzuat_metin FOR DELETE TO authenticated USING (is_admin());

-- ---------------------------------------------------------------------------
-- 7) firm_notes — super_admin_all, danışman politikalarıyla işlem bazında birleşti
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS firm_notes_super_admin_all ON public.firm_notes;
ALTER POLICY firm_notes_danisman_select ON public.firm_notes
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved' AND p.is_active = true
         AND (p.role = 'super_admin' OR p.role = 'admin'
              OR (p.role = 'tmgd' AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = firm_notes.firm_id AND uf.user_id = auth.uid())))));
ALTER POLICY firm_notes_danisman_insert ON public.firm_notes
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin' AND p.approval_status = 'approved' AND p.is_active = true)
    OR (author_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.approval_status = 'approved' AND p.is_active = true
         AND (p.role = 'admin' OR (p.role = 'tmgd' AND EXISTS (SELECT 1 FROM user_firms uf WHERE uf.firm_id = firm_notes.firm_id AND uf.user_id = auth.uid()))))));
ALTER POLICY firm_notes_danisman_update ON public.firm_notes
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin' AND p.approval_status = 'approved' AND p.is_active = true)
    OR (author_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['admin','tmgd']) AND p.approval_status = 'approved' AND p.is_active = true)))
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin' AND p.approval_status = 'approved' AND p.is_active = true)
    OR author_id = auth.uid());
ALTER POLICY firm_notes_danisman_delete ON public.firm_notes
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin' AND p.approval_status = 'approved' AND p.is_active = true)
    OR (author_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['admin','tmgd']) AND p.approval_status = 'approved' AND p.is_active = true)));

-- ---------------------------------------------------------------------------
-- 8) TÜM public politikalarda auth.uid() → (select auth.uid())
--    Yalnızca sarmalanmamış çağrılar değiştirilir; mantık aynı kalır.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  yeni_using text;
  yeni_check text;
  sql text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ 'auth\.uid\(\)'
  LOOP
    -- Önce eski sarmalanmış biçim geçici işarete alınır, sonra çıplak
    -- çağrılar sarmalanır → iki kez sarma olmaz.
    yeni_using := regexp_replace(
      regexp_replace(r.qual, '\(\s*SELECT auth\.uid\(\)( AS uid)?\s*\)', '__SARILI_UID__', 'gi'),
      'auth\.uid\(\)', '(select auth.uid())', 'g');
    yeni_using := replace(yeni_using, '__SARILI_UID__', '(select auth.uid())');
    yeni_check := regexp_replace(
      regexp_replace(r.with_check, '\(\s*SELECT auth\.uid\(\)( AS uid)?\s*\)', '__SARILI_UID__', 'gi'),
      'auth\.uid\(\)', '(select auth.uid())', 'g');
    yeni_check := replace(yeni_check, '__SARILI_UID__', '(select auth.uid())');

    sql := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF yeni_using IS NOT NULL THEN
      sql := sql || ' USING (' || yeni_using || ')';
    END IF;
    IF yeni_check IS NOT NULL THEN
      sql := sql || ' WITH CHECK (' || yeni_check || ')';
    END IF;
    EXECUTE sql;
  END LOOP;
END $$;

COMMIT;
