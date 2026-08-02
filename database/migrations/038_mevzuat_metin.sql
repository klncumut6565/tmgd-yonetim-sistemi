-- ============================================================================
-- Migration 038: Mevzuat Metin Cikarma + Tam Metin Arama
-- ----------------------------------------------------------------------------
-- AMAC: ADR Asistani, kullanicinin yukledigi GERCEK mevzuat belgelerinden
-- cevap verebilsin. Su ana kadar asistan yalnizca kendi egitim bilgisine
-- dayaniyordu (uydurma riski); oysa resmi metinler sistemde duruyor.
--
-- YAKLASIM: Belgenin TAMAMINI modele gondermek yerine (100+ sayfalik bir
-- yonetmelik token sinirini asar), PostgreSQL'in kendi tam metin aramasi
-- ile YALNIZCA ILGILI BOLUMLER bulunup prompt'a ekleniyor. Ek servis,
-- vektor veritabani veya ek maliyet gerektirmez.
--
-- Metin sayfa sayfa ayri satirlarda tutulur — boylece cevabin altinda
-- "Kaynak: X Yonetmeligi, sayfa 12" gosterilebilir.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mevzuat_metin (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mevzuat_id  UUID NOT NULL REFERENCES public.mevzuat(id) ON DELETE CASCADE,
  sayfa_no    INTEGER NOT NULL,
  icerik      TEXT NOT NULL,
  -- Turkce sozluk PostgreSQL'de varsayilan olarak bulunmadigi icin
  -- 'simple' kullaniliyor: kok bulma yapmaz ama Turkce kelimeleri
  -- bozmadan indeksler. Pratikte mevzuat aramasi icin yeterli.
  arama       TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', icerik)) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mevzuat_metin_arama
  ON public.mevzuat_metin USING GIN(arama);
CREATE INDEX IF NOT EXISTS idx_mevzuat_metin_belge
  ON public.mevzuat_metin(mevzuat_id, sayfa_no);

COMMENT ON TABLE public.mevzuat_metin IS
  'Mevzuat belgelerinden cikarilan sayfa bazli metin. ADR Asistani ilgili bolumleri buradan bulup cevaplarina kaynak gosterir.';

-- Metin cikarma durumu (kullaniciya gosterilir)
ALTER TABLE public.mevzuat
  ADD COLUMN IF NOT EXISTS metin_durumu TEXT NOT NULL DEFAULT 'bekliyor'
  CHECK (metin_durumu IN ('bekliyor', 'tamam', 'hata', 'desteklenmiyor'));
ALTER TABLE public.mevzuat
  ADD COLUMN IF NOT EXISTS sayfa_sayisi INTEGER;

COMMENT ON COLUMN public.mevzuat.metin_durumu IS
  'bekliyor=henuz islenmedi, tamam=metin cikarildi, hata=cikarilamadi, desteklenmiyor=PDF disi format';


-- ----------------------------------------------------------------------------
-- RLS — mevzuat tablosuyla ayni kural
-- ----------------------------------------------------------------------------

ALTER TABLE public.mevzuat_metin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mevzuat_metin_select ON public.mevzuat_metin;
CREATE POLICY mevzuat_metin_select ON public.mevzuat_metin FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.approval_status = 'approved'
      AND p.is_active = true
  )
);

DROP POLICY IF EXISTS mevzuat_metin_write ON public.mevzuat_metin;
CREATE POLICY mevzuat_metin_write ON public.mevzuat_metin FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- ARAMA FONKSIYONU
-- ----------------------------------------------------------------------------
-- Asistan bu fonksiyonu cagirip ilgili mevzuat bolumlerini alir.
-- Sonuc, prompt'a eklenecek kadar kisa tutulur (varsayilan 5 parca).

CREATE OR REPLACE FUNCTION public.mevzuat_ara(
  p_sorgu TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  mevzuat_id   UUID,
  baslik       TEXT,
  tur          TEXT,
  sayi_no      TEXT,
  sayfa_no     INTEGER,
  icerik       TEXT,
  skor         REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.baslik,
    m.tur,
    m.sayi_no,
    mm.sayfa_no,
    -- Cok uzun sayfalarda prompt'u sismemek icin kirp
    LEFT(mm.icerik, 1500) AS icerik,
    ts_rank(mm.arama, plainto_tsquery('simple', p_sorgu)) AS skor
  FROM public.mevzuat_metin mm
  JOIN public.mevzuat m ON m.id = mm.mevzuat_id
  WHERE mm.arama @@ plainto_tsquery('simple', p_sorgu)
  ORDER BY skor DESC, m.hiyerarsi ASC
  LIMIT GREATEST(1, LEAST(p_limit, 10));
$$;

GRANT EXECUTE ON FUNCTION public.mevzuat_ara(TEXT, INTEGER) TO authenticated;


-- ----------------------------------------------------------------------------
-- DOGRULAMA
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS mevzuat_metin_satir_sayisi FROM public.mevzuat_metin;
SELECT COUNT(*) AS islenmemis_belge FROM public.mevzuat WHERE metin_durumu = 'bekliyor';


-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('038_mevzuat_metin')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
