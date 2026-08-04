-- ============================================================================
-- Migration 040: Mobil Tarama Oturumlari (tarayici_ios entegrasyonu)
-- ----------------------------------------------------------------------------
-- AMAC: Belge Takip'te bir satirin "Dosya Ekle" alanina tiklandiginda,
-- kullanici telefon kamerasiyla ayri bir PWA'ya (klncumut6565/tarayici_ios)
-- yonlendirilir, orada belgeyi tarar; tarama bitince PDF OTOMATIK olarak
-- bu sisteme geri gonderilir — kullanici manuel dosya secip yuklemek
-- zorunda kalmaz.
--
-- GUVENLIK MODELI:
-- Tarayici PWA ayri bir origin'de calisir ve geri gonderim (callback)
-- sirasinda normal Supabase oturumu (Bearer token) TASIMAZ — sadece URL'e
-- gomulen bir alani form verisi olarak geri yansitir. Bu yuzden guvenlik
-- SUPABASE RLS'E DEGIL bu tabloya ve asagidaki API route'a dayanir:
--   - Token tahmin edilemez (UUID v4)
--   - KISA OMURLU (varsayilan 30 dakika)
--   - TEK KULLANIMLIK (used_at dolunca bir daha kabul edilmez)
-- Oturum, TMGD tarafinda normal yetkili bir kullanici tarafindan (firma
-- yazma erisimi olan) olusturulur; callback ucu bu on-yetkilendirmeye
-- guvenir, kendisi ayrica Supabase oturumu istemez.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.belge_tarama_oturumlari (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id     UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  period      TEXT NOT NULL DEFAULT '',
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  used_at     TIMESTAMPTZ,
  file_name   TEXT
);

CREATE INDEX IF NOT EXISTS idx_belge_tarama_oturumlari_gecerli
  ON public.belge_tarama_oturumlari(id)
  WHERE used_at IS NULL;

COMMENT ON TABLE public.belge_tarama_oturumlari IS
  'Mobil tarama PWA (tarayici_ios) ile Belge Takip arasindaki tek kullanimlik, kisa omurlu koprü. RLS''e degil token''in kendisine guvenilir.';

-- Eski/kullanilmis oturumlari periyodik temizlemek icin yardimci fonksiyon.
-- Cagirmak istege baglidir (bir cron/workflow kuralindan tetiklenebilir);
-- calismasa da sistem bozulmaz, sadece tablo zamanla buyur.
CREATE OR REPLACE FUNCTION public.belge_tarama_oturumlarini_temizle()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH silinen AS (
    DELETE FROM public.belge_tarama_oturumlari
    WHERE expires_at < now() - interval '1 day'
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER FROM silinen;
$$;


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
-- Callback ucu SERVICE ROLE (admin client) kullanacagi icin RLS'yi zaten
-- bypass eder. Buradaki politika yalnizca normal oturumlu kullanicilarin
-- (orn. kendi olusturduklari oturumu debug etmek icin) erisimini duzenler.

ALTER TABLE public.belge_tarama_oturumlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS belge_tarama_oturumlari_select ON public.belge_tarama_oturumlari;
CREATE POLICY belge_tarama_oturumlari_select ON public.belge_tarama_oturumlari FOR SELECT
TO authenticated USING (created_by = auth.uid() OR public.is_admin());

-- INSERT/UPDATE yalniz service-role uzerinden (API route) yapilir; normal
-- kullanicilar icin acik bir yazma politikasi TANIMLANMAZ.


-- ----------------------------------------------------------------------------
-- DOGRULAMA
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS aktif_oturum_sayisi
FROM public.belge_tarama_oturumlari
WHERE used_at IS NULL AND expires_at > now();


-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('040_belge_tarama_oturumlari')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
