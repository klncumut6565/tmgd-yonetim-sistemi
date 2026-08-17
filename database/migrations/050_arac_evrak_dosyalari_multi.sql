-- ============================================================================
-- Migration 050: Araç Evrakı Oluştur — Çoklu Dosya Desteği
-- ----------------------------------------------------------------------------
-- SORUN: Araçlar > Araç Evrakı Oluştur'daki her belge alanı (Ek-1 TMFB,
-- Ek-2 K1, Ek-3..Ek-10 araca özel) yalnızca TEK bir dosya kabul ediyordu
-- (firms.tmfb_dosya_yolu, firm_arac_evraklari.tasit_karti_yolu vb. — sabit,
-- tekil sütunlar). İkinci bir dosya yüklemek için önce mevcut dosyanın
-- silinmesi gerekiyordu.
--
-- ÇÖZÜM: Her belge türü için SINIRSIZ dosya saklayabilen yeni bir çocuk
-- tablo: firm_arac_evrak_dosyalari. Eski tekil-sütun verisi bu tabloya
-- TAŞINIR (veri kaybı olmaz) — eski sütunlar SİLİNMEZ (geriye dönük
-- uyumluluk/güvenlik için), ama uygulama artık onları kullanmıyor.
--
-- belge_turu değerleri: 'tmfb' | 'k1' (firma ortak, vehicle_id NULL)
--   | 'tasit_karti' | 'arac_muayene' | 'arac_ruhsat' | 'sigorta_kasko'
--   | 'src5_belgesi' | 'tasima_evraklari' (araca özel, vehicle_id dolu)
--
-- Idempotent — bir kaç kez çalıştırılabilir.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.firm_arac_evrak_dosyalari (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id      UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  -- NULL = firma ortak belgesi (TMFB/K1, tüm araçlarda kullanılır)
  -- dolu = araca özel belge (o araca ait Ek-3..Ek-10)
  vehicle_id   UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  belge_turu   TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  yukleyen     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arac_evrak_dosyalari_firma_ortak
  ON public.firm_arac_evrak_dosyalari(firm_id, belge_turu)
  WHERE vehicle_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_arac_evrak_dosyalari_arac
  ON public.firm_arac_evrak_dosyalari(vehicle_id, belge_turu)
  WHERE vehicle_id IS NOT NULL;

COMMENT ON TABLE public.firm_arac_evrak_dosyalari IS
  'Araç Evrakı Oluştur — her belge türü (TMFB, K1, Taşıt Kartı, ...) için BİRDEN FAZLA dosya saklanabilir. vehicle_id NULL ise firma ortak belgesidir (tüm araçlarda kullanılır).';

-- ----------------------------------------------------------------------------
-- ESKİ VERİYİ TAŞI (tekil sütunlardan çocuk tabloya)
-- ----------------------------------------------------------------------------

-- Firma ortak belgeler (TMFB, K1)
INSERT INTO public.firm_arac_evrak_dosyalari (firm_id, vehicle_id, belge_turu, file_path, file_name)
SELECT id, NULL, 'tmfb', tmfb_dosya_yolu, COALESCE(tmfb_dosya_adi, 'TMFB')
FROM public.firms
WHERE tmfb_dosya_yolu IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.firm_arac_evrak_dosyalari d
    WHERE d.firm_id = firms.id AND d.vehicle_id IS NULL AND d.belge_turu = 'tmfb'
      AND d.file_path = firms.tmfb_dosya_yolu
  );

INSERT INTO public.firm_arac_evrak_dosyalari (firm_id, vehicle_id, belge_turu, file_path, file_name)
SELECT id, NULL, 'k1', k1_dosya_yolu, COALESCE(k1_dosya_adi, 'K1')
FROM public.firms
WHERE k1_dosya_yolu IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.firm_arac_evrak_dosyalari d
    WHERE d.firm_id = firms.id AND d.vehicle_id IS NULL AND d.belge_turu = 'k1'
      AND d.file_path = firms.k1_dosya_yolu
  );

-- Araca özel belgeler (firm_arac_evraklari'ndaki 6 sabit sütun)
DO $$
DECLARE
  kolon TEXT;
  kolonlar TEXT[] := ARRAY['tasit_karti','arac_muayene','arac_ruhsat','sigorta_kasko','src5_belgesi','tasima_evraklari'];
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='firm_arac_evraklari') THEN
    FOREACH kolon IN ARRAY kolonlar LOOP
      EXECUTE format($f$
        INSERT INTO public.firm_arac_evrak_dosyalari (firm_id, vehicle_id, belge_turu, file_path, file_name)
        SELECT firm_id, vehicle_id, %L, %I, COALESCE(%I, %L)
        FROM public.firm_arac_evraklari
        WHERE %I IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.firm_arac_evrak_dosyalari d
            WHERE d.vehicle_id = firm_arac_evraklari.vehicle_id
              AND d.belge_turu = %L
              AND d.file_path = firm_arac_evraklari.%I
          )
      $f$, kolon, kolon || '_yolu', kolon || '_adi', kolon, kolon || '_yolu', kolon, kolon || '_yolu');
    END LOOP;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY — firm_arac_evraklari ile AYNI erişim mantığı
-- ----------------------------------------------------------------------------

ALTER TABLE public.firm_arac_evrak_dosyalari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS firm_arac_evrak_dosyalari_select ON public.firm_arac_evrak_dosyalari;
CREATE POLICY firm_arac_evrak_dosyalari_select ON public.firm_arac_evrak_dosyalari FOR SELECT USING (
    public.is_admin()
    OR public.is_assigned(firm_arac_evrak_dosyalari.firm_id)
);

DROP POLICY IF EXISTS firm_arac_evrak_dosyalari_insert ON public.firm_arac_evrak_dosyalari;
CREATE POLICY firm_arac_evrak_dosyalari_insert ON public.firm_arac_evrak_dosyalari FOR INSERT WITH CHECK (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_arac_evrak_dosyalari.firm_id AND uf.user_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS firm_arac_evrak_dosyalari_delete ON public.firm_arac_evrak_dosyalari;
CREATE POLICY firm_arac_evrak_dosyalari_delete ON public.firm_arac_evrak_dosyalari FOR DELETE USING (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_arac_evrak_dosyalari.firm_id AND uf.user_id = auth.uid()
    ))
);

-- ----------------------------------------------------------------------------
-- DENETİM İZİ — migration 049'daki AYNI kapsam genişletme mantığı
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_audit_firm_arac_evrak_dosyalari ON public.firm_arac_evrak_dosyalari;
CREATE TRIGGER trg_audit_firm_arac_evrak_dosyalari
AFTER INSERT OR UPDATE OR DELETE ON public.firm_arac_evrak_dosyalari
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ----------------------------------------------------------------------------
-- DOĞRULAMA
-- ----------------------------------------------------------------------------

SELECT belge_turu, COUNT(*) AS dosya_sayisi
FROM public.firm_arac_evrak_dosyalari
GROUP BY belge_turu
ORDER BY belge_turu;

-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('050_arac_evrak_dosyalari_multi')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SON
-- ============================================================================
