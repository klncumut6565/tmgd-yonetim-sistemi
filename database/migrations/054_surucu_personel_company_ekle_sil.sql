-- ============================================================================
-- Migration 054: Sürücü Kayıtları / Personel Listesi — 'company' rolüne
-- kendi firması için EKLEME + SİLME (düzenleme YOK)
-- ----------------------------------------------------------------------------
-- NEDEN: 004_rol_yetkileri.sql'deki genel kural drivers/employees tablolarında
-- INSERT/UPDATE/DELETE'i tamamen yazabilir() ekibine (super_admin, admin,
-- tmgd, assistant) bırakıyordu; 'company' (firma kullanıcısı) salt okunurdu.
--
-- Umut'un kararıyla bu değişti — SÜRÜCÜLER VE PERSONELLER menüsünde:
--   * "Sürücü Kayıtları" (drivers) ve "Personel Listesi" (employees)
--     menülerinde company kendi firmasına sürücü/personel EKLEYEBİLİR ve
--     SİLEBİLİR.
--   * Company bu tablolarda kayıt DÜZENLEYEMEZ (UPDATE politikası
--     004'teki gibi yalnızca yazabilir() ekibine kalır — burada dokunulmadı).
--   * "Sürücü Listesi" (firm_surucu_listesi) ve "Görevli Listesi"
--     (firm_gorevli_listesi) raporları, kayıt dosyaları (kayit_dosyalari) ve
--     Storage'daki dosyalar bu migration'ın DIŞINDA — orada company hâlâ
--     tamamen salt okunur (bkz. 041/043 no'lu migration'lardaki politikalar,
--     onlara dokunulmadı).
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- (004_rol_yetkileri.sql'den SONRA çalıştırılmalı. Idempotent.)
-- ============================================================================

-- ---------------------------------------------------------------------
-- drivers: INSERT — yazabilir() ekibi (kendi firması) VEYA company (kendi firması)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS drivers_insert ON public.drivers;
CREATE POLICY drivers_insert ON public.drivers FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR (
        (public.yazabilir() OR public.firma_kullanicisi())
        AND EXISTS (
            SELECT 1 FROM public.user_firms uf
            WHERE uf.firm_id = drivers.firm_id AND uf.user_id = auth.uid()
        )
    )
);

-- DELETE — aynı kural (company kendi firmasındaki sürücüyü silebilir)
DROP POLICY IF EXISTS drivers_delete ON public.drivers;
CREATE POLICY drivers_delete ON public.drivers FOR DELETE USING (
    public.is_super_admin()
    OR (
        (public.yazabilir() OR public.firma_kullanicisi())
        AND EXISTS (
            SELECT 1 FROM public.user_firms uf
            WHERE uf.firm_id = drivers.firm_id AND uf.user_id = auth.uid()
        )
    )
);

-- UPDATE politikasına DOKUNULMADI — company düzenleyemez, 004'teki
-- drivers_update (yalnızca yazabilir()) geçerliliğini korur.

-- ---------------------------------------------------------------------
-- employees: INSERT — aynı mantık
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS employees_insert ON public.employees;
CREATE POLICY employees_insert ON public.employees FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR (
        (public.yazabilir() OR public.firma_kullanicisi())
        AND EXISTS (
            SELECT 1 FROM public.user_firms uf
            WHERE uf.firm_id = employees.firm_id AND uf.user_id = auth.uid()
        )
    )
);

-- DELETE
DROP POLICY IF EXISTS employees_delete ON public.employees;
CREATE POLICY employees_delete ON public.employees FOR DELETE USING (
    public.is_super_admin()
    OR (
        (public.yazabilir() OR public.firma_kullanicisi())
        AND EXISTS (
            SELECT 1 FROM public.user_firms uf
            WHERE uf.firm_id = employees.firm_id AND uf.user_id = auth.uid()
        )
    )
);

-- UPDATE politikasına DOKUNULMADI — company düzenleyemez, 004'teki
-- employees_update (yalnızca yazabilir()) geçerliliğini korur.

-- PostgREST şema önbelleğini tazele
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- Migration kaydı
-- ----------------------------------------------------------------------------
INSERT INTO public._migrations (id) VALUES ('054_surucu_personel_company_ekle_sil')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
