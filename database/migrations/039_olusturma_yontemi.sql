-- ============================================================================
-- Migration 039: Kullanici olusturma yontemi
-- ----------------------------------------------------------------------------
-- AMAC: Yonetim > Kullanicilar listesinde, hesabin NASIL olusturuldugunu
-- ayirt edebilmek:
--   'yonetici' -> Yonetim panelindeki "Kullanici Ekle" ile acildi
--   'kayit'    -> Kisi kendi kayit oldu (varsayilan)
--
-- Listede kendi kayit olanlar farkli renkte gosterilir; boylece yonetici
-- kimin denetimli sekilde eklendigini, kimin disaridan kayit oldugunu
-- bir bakista gorur.
--
-- MEVCUT KAYITLAR: Hepsi 'kayit' olarak isaretlenir. "Kullanici Ekle"
-- ozelligi yeni oldugu icin bu dogru varsayimdir.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS olusturma_yontemi TEXT NOT NULL DEFAULT 'kayit'
  CHECK (olusturma_yontemi IN ('yonetici', 'kayit'));

COMMENT ON COLUMN public.profiles.olusturma_yontemi IS
  'yonetici = Yonetim panelinden eklendi, kayit = kisi kendi kayit oldu';


-- ----------------------------------------------------------------------------
-- DOGRULAMA
-- ----------------------------------------------------------------------------

SELECT olusturma_yontemi, COUNT(*) AS kullanici_sayisi
FROM public.profiles
GROUP BY olusturma_yontemi;


-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('039_olusturma_yontemi')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
