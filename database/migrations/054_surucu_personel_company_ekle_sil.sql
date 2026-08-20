-- ============================================================================
-- Migration 054: Sürücü Kayıtları / Personel Listesi — 'company' rolüne
-- kendi firması için EKLEME + SİLME (düzenleme YOK)
-- ----------------------------------------------------------------------------
-- NEDEN: 004_rol_yetkileri.sql'deki genel kural drivers/employees tablolarında
-- INSERT/UPDATE/DELETE'i tamamen yazabilir() ekibine (super_admin, admin,
-- tmgd, assistant) bırakıyordu; 'company' (firma kullanıcısı) salt okunurdu.
--
-- ÖNEMLİ — DÜZELTME: Bu migration'ın ilk sürümü drivers_insert/delete ve
-- employees_insert/delete politikalarını is_super_admin() ile yeniden
-- yazmıştı. Ama 036_admin_yazma_yetkisi.sql, admin (yönetici) rolüne firm_id
-- kolonu olan TÜM tablolarda (vehicles, drivers, employees dahil) firma
-- ATANMADAN da tam yetki (is_admin()) vermişti. is_super_admin() kullanmak
-- bu iki tabloda admin'in o kazanımını farkında olmadan geri alıyordu —
-- admin tekrar yalnızca kendine ATANMIŞ firmalarda ekleyip silebilir hale
-- geliyordu. Aşağıdaki politikalar artık is_admin() kullanıyor, böylece:
--   * super_admin VE admin  -> firma atanmasa bile ekleyip silebilir (036'daki
--     kazanım korunuyor)
--   * tmgd/assistant/company -> yalnızca ATANDIĞI firmada (company: ekle+sil,
--     diğerleri: ekle+sil+düzenle)
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
-- (004_rol_yetkileri.sql VE 036_admin_yazma_yetkisi.sql'den SONRA
-- çalıştırılmalı. Idempotent.)
-- ============================================================================

-- ---------------------------------------------------------------------
-- drivers: INSERT — admin (firma atanmasa da) VEYA yazabilir()/company
-- (kendi ATANMIŞ firması)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS drivers_insert ON public.drivers;
CREATE POLICY drivers_insert ON public.drivers FOR INSERT WITH CHECK (
    public.is_admin()
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
    public.is_admin()
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
    public.is_admin()
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
    public.is_admin()
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
