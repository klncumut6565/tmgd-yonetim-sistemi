-- ============================================================================
-- Migration 037: Mevzuat Kutuphanesi
-- ----------------------------------------------------------------------------
-- AMAC: ADR/TMGD mevzuatinin (kanun, yonetmelik, teblig, genelge, talimat...)
-- tek yerde toplanmasi. Belgeler NORMLAR HIYERARSISINE gore siralanir —
-- ust normdan alt norma dogru, ayni seviyede yayim tarihine gore.
--
-- Firma bazli DEGIL: mevzuat tum firmalar icin ortaktir, bu yuzden
-- firm_id kolonu yoktur (migration 036'nin dinamik politika ureticisi de
-- bu tabloya dokunmaz).
--
-- YETKI:
--   Okuma : onaylanmis + aktif tum kullanicilar
--   Yazma : yalnizca super_admin ve admin (kullanici talebi)
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mevzuat (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baslik        TEXT NOT NULL,
  tur           TEXT NOT NULL,          -- kanun / yonetmelik / teblig / genelge / talimat / diger
  -- Normlar hiyerarsisindeki sira: kucuk deger = ust norm.
  -- Tur secildiginde uygulama tarafinda otomatik atanir, ancak elle
  -- degistirilebilir olmasi icin ayri kolon tutulur.
  hiyerarsi     INTEGER NOT NULL DEFAULT 99,
  sayi_no       TEXT,                   -- Resmi Gazete sayisi / genelge no
  yayim_tarihi  DATE,
  aciklama      TEXT,
  file_path     TEXT NOT NULL,          -- Storage yolu (mevzuat bucket)
  file_name     TEXT NOT NULL,          -- orijinal dosya adi
  file_size     INTEGER,
  mime_type     TEXT,
  yukleyen      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mevzuat_siralama
  ON public.mevzuat(hiyerarsi, yayim_tarihi DESC NULLS LAST);

COMMENT ON TABLE public.mevzuat IS
  'ADR/TMGD mevzuat kutuphanesi. Normlar hiyerarsisine gore siralanir; tum firmalar icin ortaktir.';
COMMENT ON COLUMN public.mevzuat.hiyerarsi IS
  '1=Kanun, 2=Yonetmelik, 3=Teblig, 4=Genelge, 5=Talimat/Kilavuz, 9=Diger';

DROP TRIGGER IF EXISTS trg_mevzuat_updated_at ON public.mevzuat;
CREATE TRIGGER trg_mevzuat_updated_at
BEFORE UPDATE ON public.mevzuat
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.mevzuat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mevzuat_select ON public.mevzuat;
CREATE POLICY mevzuat_select ON public.mevzuat FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.approval_status = 'approved'
      AND p.is_active = true
  )
);

-- Yazma: yalnizca yonetici roller
DROP POLICY IF EXISTS mevzuat_write ON public.mevzuat;
CREATE POLICY mevzuat_write ON public.mevzuat FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- STORAGE BUCKET
-- ----------------------------------------------------------------------------
-- Bucket public DEGIL; dosyalara imzali URL ile erisilir (uygulama tarafinda
-- createSignedUrl). Boylece giris yapmamis kimse dosyalari goremez.

INSERT INTO storage.buckets (id, name, public)
VALUES ('mevzuat', 'mevzuat', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "mevzuat_dosya_okuma" ON storage.objects;
CREATE POLICY "mevzuat_dosya_okuma" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'mevzuat'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.approval_status = 'approved'
      AND p.is_active = true
  )
);

DROP POLICY IF EXISTS "mevzuat_dosya_yazma" ON storage.objects;
CREATE POLICY "mevzuat_dosya_yazma" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mevzuat' AND public.is_admin());

DROP POLICY IF EXISTS "mevzuat_dosya_silme" ON storage.objects;
CREATE POLICY "mevzuat_dosya_silme" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'mevzuat' AND public.is_admin());


-- ----------------------------------------------------------------------------
-- DOGRULAMA
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS mevzuat_kayit_sayisi FROM public.mevzuat;
SELECT id, public FROM storage.buckets WHERE id = 'mevzuat';


-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('037_mevzuat')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
