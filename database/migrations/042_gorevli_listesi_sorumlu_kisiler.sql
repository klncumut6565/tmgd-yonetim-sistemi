-- ============================================================================
-- Migration 042: firm_gorevli_listesi — sorumlu_kisiler serbest metin alani
-- ----------------------------------------------------------------------------
-- SORUN:
-- 041_gorevli_listesi.sql ilk yazildiginda "sorumlu_personel_ids UUID[]"
-- (employees tablosundan coklu secim) olarak tasarlanmis ve bu haliyle
-- Supabase'de calistirilmisti. Sonra kullanici "Sorumlu Kisi/ler elle
-- doldurulsun, secenek olmasin" talebiyle GorevliListesi.tsx serbest metin
-- alanina (sorumlu_kisiler TEXT) gecirildi ve 041 dosyasi da guncellendi —
-- ama CREATE TABLE IF NOT EXISTS zaten var olan tabloyu degistirmedigi icin
-- canli veritabani eski semada kaldi. Sonuc: PostgREST "Could not find the
-- 'sorumlu_kisiler' column ... in the schema cache" hatasi verdi.
--
-- COZUM:
-- Bu migration canli veritabanini kod ile senkronize eder:
--   1) sorumlu_kisiler TEXT sutunu yoksa ekler.
--   2) sorumlu_personel_ids hala varsa, employees tablosundan isimleri
--      cekip sorumlu_kisiler'e aktarir (veri kaybi olmasin) ve eski
--      sutunu siler.
--   3) PostgREST semasi cache'ini hemen yeniler (NOTIFY) — Supabase
--      genelde otomatik yeniler ama bazen birkac saniye/manuel tetikleme
--      gerekebiliyor.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'firm_gorevli_listesi'
      AND column_name = 'sorumlu_kisiler'
  ) THEN
    ALTER TABLE public.firm_gorevli_listesi ADD COLUMN sorumlu_kisiler TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'firm_gorevli_listesi'
      AND column_name = 'sorumlu_personel_ids'
  ) THEN
    -- Var olan satirlarda personel id dizisi doluysa, employees'ten
    -- isimleri cekip virgulle birlestirilmis metne cevir.
    UPDATE public.firm_gorevli_listesi g
    SET sorumlu_kisiler = alt.isimler
    FROM (
      SELECT g2.id, string_agg(e.first_name || ' ' || e.last_name, ', ') AS isimler
      FROM public.firm_gorevli_listesi g2
      CROSS JOIN LATERAL unnest(g2.sorumlu_personel_ids) AS pid(personel_id)
      JOIN public.employees e ON e.id = pid.personel_id
      GROUP BY g2.id
    ) alt
    WHERE g.id = alt.id AND (g.sorumlu_kisiler IS NULL OR g.sorumlu_kisiler = '');

    ALTER TABLE public.firm_gorevli_listesi DROP COLUMN sorumlu_personel_ids;
  END IF;
END $$;

-- PostgREST'in yeni semayi hemen gormesi icin cache'i yenile.
NOTIFY pgrst, 'reload schema';
