-- 079_r2_aktarim.sql
--
-- firm-files → Cloudflare R2 taşıma takibi (Yönetim → Depolama → R2'ye Taşı).
-- Dosyalar R2'ye AYNI YOLLA kopyalanır; Supabase'deki dosyalar SİLİNMEZ.
-- Bir dosya taşındıktan sonra Supabase'de değişirse (örn. sıkıştırma) boyut
-- farkından anlaşılır ve tekrar aday olur.

CREATE TABLE IF NOT EXISTS public.depolama_r2_aktarim (
  yol      text PRIMARY KEY,
  boyut    bigint NOT NULL,
  durum    text   NOT NULL CHECK (durum IN ('tamam', 'hata')),
  hata     text,
  islenme  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.depolama_r2_aktarim ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.depolama_r2_adaylari()
RETURNS TABLE (yol text, boyut bigint, mime text)
LANGUAGE sql SECURITY DEFINER SET search_path = public, storage
AS $$
  SELECT o.name, coalesce((o.metadata->>'size')::bigint, 0), o.metadata->>'mimetype'
  FROM storage.objects o
  WHERE o.bucket_id = 'firm-files'
    AND NOT EXISTS (
      SELECT 1 FROM public.depolama_r2_aktarim a
      WHERE a.yol = o.name AND a.durum = 'tamam'
        AND a.boyut = coalesce((o.metadata->>'size')::bigint, 0)
    )
  ORDER BY o.name;
$$;
REVOKE ALL ON FUNCTION public.depolama_r2_adaylari() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.depolama_r2_adaylari() TO service_role;

CREATE OR REPLACE FUNCTION public.depolama_r2_ozeti()
RETURNS json
LANGUAGE sql SECURITY DEFINER SET search_path = public, storage
AS $$
  SELECT json_build_object(
    'toplam_dosya', (SELECT count(*) FROM storage.objects WHERE bucket_id = 'firm-files'),
    'toplam_bayt',  (SELECT coalesce(sum((metadata->>'size')::bigint), 0) FROM storage.objects WHERE bucket_id = 'firm-files'),
    'tasinan',      (SELECT count(*) FROM public.depolama_r2_aktarim WHERE durum = 'tamam'),
    'tasinan_bayt', (SELECT coalesce(sum(boyut), 0) FROM public.depolama_r2_aktarim WHERE durum = 'tamam'),
    'hatali',       (SELECT count(*) FROM public.depolama_r2_aktarim WHERE durum = 'hata')
  );
$$;
REVOKE ALL ON FUNCTION public.depolama_r2_ozeti() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.depolama_r2_ozeti() TO service_role;
