-- ============================================================================
-- Migration 041: Gorevli Listesi (TMGDK-G1)
-- ----------------------------------------------------------------------------
-- AMAC: Personeller menusune yeni bir alt sekme eklenir: "Gorevli Listesi".
-- Firmada kayitli personellerden secilerek TMGDK-G1 formatinda (Tehlikeli
-- Madde Is ve Islemlerinde Gorevli Personel Listesi) bir tablo olusturulur.
-- Her satir bir "gorev basligi"na (Gonderen / Alici / Bosaltan / Paketleyen /
-- Dolduran / Yukleyen / serbest metin) karsilik gelir ve bu gorevden sorumlu
-- bir veya birden fazla personel atanabilir.
--
-- G1/G2/G3 kodlari belgeKatalogu.ts'de zaten "gecerlilik takip" satiri
-- olarak var (bkz. onceki oturum ozeti) ama gercek belge uretim semasi
-- yoktu — bu migration onu saglar.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.firm_gorevli_listesi (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                 UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  sira_no                 INTEGER NOT NULL DEFAULT 1,
  gorev_basligi           TEXT NOT NULL,
  yapilacak_gorevler      TEXT,
  bagli_oldugu_birim      TEXT,
  -- Sorumlu personel(ler): employees.id dizisi. Personel silinirse dizide
  -- yetim id kalabilir; UI tarafinda personel listesiyle join edilirken
  -- bulunamayan id'ler sessizce atlanir (FK zorunlu kilinmadi, cunku
  -- Postgres dizi uzerinde native FK desteklemiyor).
  sorumlu_personel_ids    UUID[] NOT NULL DEFAULT '{}',
  doldurulacak_dokuman_no TEXT,
  egitim_tarihi           DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firm_gorevli_listesi_firm
  ON public.firm_gorevli_listesi(firm_id);

COMMENT ON TABLE public.firm_gorevli_listesi IS
  'TMGDK-G1 Gorevli Listesi: firmanin tehlikeli madde is/islemlerinde gorevli personel ve gorev esleme kayitlari.';

DROP TRIGGER IF EXISTS trg_firm_gorevli_listesi_updated_at ON public.firm_gorevli_listesi;
CREATE TRIGGER trg_firm_gorevli_listesi_updated_at
BEFORE UPDATE ON public.firm_gorevli_listesi
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.firm_gorevli_listesi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS firm_gorevli_listesi_select ON public.firm_gorevli_listesi;
CREATE POLICY firm_gorevli_listesi_select ON public.firm_gorevli_listesi FOR SELECT USING (
    public.is_admin()
    OR public.is_assigned(firm_gorevli_listesi.firm_id)
);

DROP POLICY IF EXISTS firm_gorevli_listesi_insert ON public.firm_gorevli_listesi;
CREATE POLICY firm_gorevli_listesi_insert ON public.firm_gorevli_listesi FOR INSERT WITH CHECK (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_gorevli_listesi.firm_id AND uf.user_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS firm_gorevli_listesi_update ON public.firm_gorevli_listesi;
CREATE POLICY firm_gorevli_listesi_update ON public.firm_gorevli_listesi FOR UPDATE USING (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_gorevli_listesi.firm_id AND uf.user_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS firm_gorevli_listesi_delete ON public.firm_gorevli_listesi;
CREATE POLICY firm_gorevli_listesi_delete ON public.firm_gorevli_listesi FOR DELETE USING (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_gorevli_listesi.firm_id AND uf.user_id = auth.uid()
    ))
);
