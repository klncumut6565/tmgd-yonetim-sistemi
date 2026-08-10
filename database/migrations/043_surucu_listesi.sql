-- ============================================================================
-- Migration 043: Surucu Listesi (TMGDK-L3)
-- ----------------------------------------------------------------------------
-- AMAC: Sürücüler menüsüne yeni bir alt sekme eklenir: "Sürücü Listesi".
-- Kullanıcının paylaştığı örnek belge ("ARAÇ SÜRÜCÜ LİSTESİ / TAŞIMADA
-- GÖREV ALAN SÜRÜCÜLERE İLİŞKİN BİLGİLER", Doküman No: TMGDK-L3) formatında,
-- mevcut "drivers" tablosundan (genel sürücü/araç kaydı - ehliyet, telefon
-- vb.) BAĞIMSIZ, kendi başına bir kontrol/takip listesidir — tıpkı
-- "Görevli Listesi"nin (041_gorevli_listesi.sql, TMGDK-G1) "Personel
-- Listesi"nden (employees) bağımsız olması gibi aynı desen.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.firm_surucu_listesi (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                     UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  sira_no                     INTEGER NOT NULL DEFAULT 1,
  ad_soyad                    TEXT NOT NULL,
  tc_kimlik_no                TEXT,
  src5_sertifikasi            TEXT, -- 'Var' / 'Yok'
  ise_giris_tarihi            DATE,
  isten_cikis_tarihi          DATE,
  sertifika_gecerlilik_tarihi DATE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firm_surucu_listesi_firm
  ON public.firm_surucu_listesi(firm_id);

COMMENT ON TABLE public.firm_surucu_listesi IS
  'TMGDK-L3 Araç Sürücü Listesi: taşımada görev alan sürücülere ilişkin SRC5/kimlik/giriş-çıkış kayıtları.';

DROP TRIGGER IF EXISTS trg_firm_surucu_listesi_updated_at ON public.firm_surucu_listesi;
CREATE TRIGGER trg_firm_surucu_listesi_updated_at
BEFORE UPDATE ON public.firm_surucu_listesi
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.firm_surucu_listesi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS firm_surucu_listesi_select ON public.firm_surucu_listesi;
CREATE POLICY firm_surucu_listesi_select ON public.firm_surucu_listesi FOR SELECT USING (
    public.is_admin()
    OR public.is_assigned(firm_surucu_listesi.firm_id)
);

DROP POLICY IF EXISTS firm_surucu_listesi_insert ON public.firm_surucu_listesi;
CREATE POLICY firm_surucu_listesi_insert ON public.firm_surucu_listesi FOR INSERT WITH CHECK (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_surucu_listesi.firm_id AND uf.user_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS firm_surucu_listesi_update ON public.firm_surucu_listesi;
CREATE POLICY firm_surucu_listesi_update ON public.firm_surucu_listesi FOR UPDATE USING (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_surucu_listesi.firm_id AND uf.user_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS firm_surucu_listesi_delete ON public.firm_surucu_listesi;
CREATE POLICY firm_surucu_listesi_delete ON public.firm_surucu_listesi FOR DELETE USING (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_surucu_listesi.firm_id AND uf.user_id = auth.uid()
    ))
);
