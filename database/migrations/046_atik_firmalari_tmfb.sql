-- ============================================================================
-- Migration 046: Atik Firmalari TMFB Kutuphanesi
-- ----------------------------------------------------------------------------
-- AMAC: Atik bertaraf/geri kazanim firmalarina ait vergi numaralari ve
-- Tehlikeli Madde Faaliyet Belgelerinin (TMFB) tek yerde toplanmasi.
-- "Raporlar" ana sayfasindaki alt menu olarak, Mevzuat kutuphanesiyle AYNI
-- desende (dosya yukleme + listeleme) calisir.
--
-- Firma bazli DEGIL: bu, sistemdeki TMGD firmalarindan (public.firms) FARKLI,
-- atiklarin gonderildigi DIS atik firmalarinin (bertaraf/geri kazanim
-- tesisi) kayitlarini tutan ayri, ortak bir kutuphanedir.
--
-- SIRALAMA: atik firmasi adina gore alfabetik (Turkce locale, uygulama
-- tarafinda .localeCompare('tr-TR') ile; burada da yardimci index var).
--
-- YETKI (kullanici talebi): yalnizca super_admin, admin ve tmgd rolleri
-- gorebilir/yukleyebilir/silebilir. assistant/viewer/company bu kutuphaneyi
-- goremez.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.atik_firmalari (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_adi     TEXT NOT NULL,          -- atik firmasinin unvani (alfabetik siralama bu alana gore)
  vergi_no      TEXT,                   -- atik firmasinin vergi numarasi
  aciklama      TEXT,
  file_path     TEXT NOT NULL,          -- Storage yolu (atik-firmalari-tmfb bucket)
  file_name     TEXT NOT NULL,          -- orijinal dosya adi
  file_size     INTEGER,
  mime_type     TEXT,
  yukleyen      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atik_firmalari_ad
  ON public.atik_firmalari(firma_adi);

COMMENT ON TABLE public.atik_firmalari IS
  'Atik firmalarina ait vergi numarasi + TMFB (Tehlikeli Madde Faaliyet Belgesi) kutuphanesi. Firma adina gore alfabetik siralanir; tum TMGD/admin/super_admin kullanicilar icin ortaktir.';
COMMENT ON COLUMN public.atik_firmalari.vergi_no IS
  'Atik firmasinin vergi numarasi (serbest metin — 10/11 hane haric karakter kisitlamasi yok, farkli formatlar olabilir).';

DROP TRIGGER IF EXISTS trg_atik_firmalari_updated_at ON public.atik_firmalari;
CREATE TRIGGER trg_atik_firmalari_updated_at
BEFORE UPDATE ON public.atik_firmalari
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----------------------------------------------------------------------------
-- RLS — yalnizca super_admin, admin, tmgd erisir (okuma + yazma)
-- ----------------------------------------------------------------------------

ALTER TABLE public.atik_firmalari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS atik_firmalari_select ON public.atik_firmalari;
CREATE POLICY atik_firmalari_select ON public.atik_firmalari FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.approval_status = 'approved'
      AND p.is_active = true
      AND p.role IN ('super_admin', 'admin', 'tmgd')
  )
);

DROP POLICY IF EXISTS atik_firmalari_write ON public.atik_firmalari;
CREATE POLICY atik_firmalari_write ON public.atik_firmalari FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.approval_status = 'approved'
      AND p.is_active = true
      AND p.role IN ('super_admin', 'admin', 'tmgd')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.approval_status = 'approved'
      AND p.is_active = true
      AND p.role IN ('super_admin', 'admin', 'tmgd')
  )
);


-- ----------------------------------------------------------------------------
-- STORAGE BUCKET
-- ----------------------------------------------------------------------------
-- Bucket public DEGIL; dosyalara imzali URL ile erisilir (uygulama
-- tarafinda createSignedUrl). Erisim yalnizca super_admin/admin/tmgd.

INSERT INTO storage.buckets (id, name, public)
VALUES ('atik-firmalari-tmfb', 'atik-firmalari-tmfb', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "atik_firmalari_dosya_okuma" ON storage.objects;
CREATE POLICY "atik_firmalari_dosya_okuma" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'atik-firmalari-tmfb'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.approval_status = 'approved'
      AND p.is_active = true
      AND p.role IN ('super_admin', 'admin', 'tmgd')
  )
);

DROP POLICY IF EXISTS "atik_firmalari_dosya_yazma" ON storage.objects;
CREATE POLICY "atik_firmalari_dosya_yazma" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'atik-firmalari-tmfb'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.approval_status = 'approved'
      AND p.is_active = true
      AND p.role IN ('super_admin', 'admin', 'tmgd')
  )
);

DROP POLICY IF EXISTS "atik_firmalari_dosya_silme" ON storage.objects;
CREATE POLICY "atik_firmalari_dosya_silme" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'atik-firmalari-tmfb'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.approval_status = 'approved'
      AND p.is_active = true
      AND p.role IN ('super_admin', 'admin', 'tmgd')
  )
);


-- ----------------------------------------------------------------------------
-- DOGRULAMA
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS atik_firmalari_kayit_sayisi FROM public.atik_firmalari;
SELECT id, public FROM storage.buckets WHERE id = 'atik-firmalari-tmfb';


-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('046_atik_firmalari_tmfb')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
