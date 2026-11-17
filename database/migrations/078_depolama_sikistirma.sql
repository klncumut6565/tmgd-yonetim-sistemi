-- 078_depolama_sikistirma.sql
--
-- Mevcut firm-files dosyalarını sıkıştırma altyapısı (Yönetim → Depolama).
--  • firm-files-yedek: sıkıştırmadan ÖNCE her dosyanın orijinali buraya
--    AYNI YOLLA kopyalanır. Hiçbir dosya silinmez.
--  • depolama_sikistirma_kayitlari: hangi dosya işlendi, ne kadar küçüldü
--    (iş yarıda kalırsa kaldığı yerden devam eder).
--  • depolama_sikistirma_adaylari(): işlenmemiş PDF/JPEG/PNG listesi.
-- Tablo ve fonksiyon yalnızca service_role (API route) tarafından kullanılır.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('firm-files-yedek', 'firm-files-yedek', false, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.depolama_sikistirma_kayitlari (
  yol         text PRIMARY KEY,
  eski_boyut  bigint NOT NULL,
  yeni_boyut  bigint NOT NULL,
  durum       text   NOT NULL CHECK (durum IN ('sikistirildi', 'degismedi', 'hata')),
  hata        text,
  islenme     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.depolama_sikistirma_kayitlari ENABLE ROW LEVEL SECURITY;
-- Politika yok: istemciden erişilemez, sadece service_role.

CREATE OR REPLACE FUNCTION public.depolama_sikistirma_adaylari()
RETURNS TABLE (yol text, boyut bigint, mime text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT o.name, (o.metadata->>'size')::bigint, o.metadata->>'mimetype'
  FROM storage.objects o
  WHERE o.bucket_id = 'firm-files'
    AND o.metadata->>'mimetype' IN ('application/pdf', 'image/jpeg', 'image/png')
    AND (o.metadata->>'size')::bigint >= 307200
    AND NOT EXISTS (
      SELECT 1 FROM public.depolama_sikistirma_kayitlari k
      WHERE k.yol = o.name AND k.durum <> 'hata'
    )
  ORDER BY (o.metadata->>'size')::bigint DESC;
$$;

REVOKE ALL ON FUNCTION public.depolama_sikistirma_adaylari() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.depolama_sikistirma_adaylari() TO service_role;

CREATE OR REPLACE FUNCTION public.depolama_ozeti()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT json_build_object(
    'firm_files_bayt', (SELECT coalesce(sum((metadata->>'size')::bigint), 0) FROM storage.objects WHERE bucket_id = 'firm-files'),
    'yedek_bayt',      (SELECT coalesce(sum((metadata->>'size')::bigint), 0) FROM storage.objects WHERE bucket_id = 'firm-files-yedek'),
    'toplam_bayt',     (SELECT coalesce(sum((metadata->>'size')::bigint), 0) FROM storage.objects),
    'sikistirilan',    (SELECT count(*) FROM public.depolama_sikistirma_kayitlari WHERE durum = 'sikistirildi'),
    'degismeyen',      (SELECT count(*) FROM public.depolama_sikistirma_kayitlari WHERE durum = 'degismedi'),
    'hatali',          (SELECT count(*) FROM public.depolama_sikistirma_kayitlari WHERE durum = 'hata'),
    'kazanc_bayt',     (SELECT coalesce(sum(eski_boyut - yeni_boyut), 0) FROM public.depolama_sikistirma_kayitlari WHERE durum = 'sikistirildi')
  );
$$;

REVOKE ALL ON FUNCTION public.depolama_ozeti() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.depolama_ozeti() TO service_role;
