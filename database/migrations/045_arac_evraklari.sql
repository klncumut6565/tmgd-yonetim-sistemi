-- ============================================================================
-- Migration 045: Araç Evrakı Oluşturma
-- ----------------------------------------------------------------------------
-- AMAÇ: Araçlar menüsüne yeni bir alt sekme eklenir: "Araç Evrakı Oluştur".
-- Kullanıcının paylaştığı örnek belge ("59 AJR 395 PLAKALI ARAÇ EVRAKLARI",
-- Ek-1..Ek-10) formatında, her araç plakası için tek bir PDF'te birleştirilmiş
-- araç evrakı üretilebilmesini sağlar.
--
-- İKİ FARKLI BELGE KATEGORİSİ:
--   1) FİRMA ORTAK BELGELERİ (bir kez yüklenir, TÜM araçlarda kullanılır):
--      TMFB (Tehlikeli Madde Faaliyet Belgesi) ve K1 (Taşıma Yetki Belgesi) —
--      bunlar firmaya ait tek belgedir, araç bazlı değildir. Bu yüzden
--      firms tablosuna eklenir, ayrı bir tabloya gerek yok.
--   2) ARAÇ BAZLI BELGELER (her araç için ayrı yüklenir): Taşıt Kartı, Araç
--      Muayenesi, Araç Ruhsatı, Sigorta-Kasko, SRC5 Belgeli Şoför
--      Sertifikası, Taşıma Evrakları.
--
-- NOT: "Yazılı Talimat" ve "ADR Çantası İçeriği" (Ek-6, Ek-8) TÜM araçlarda
-- ORTAK, jenerik ADR referans içeriğidir — hiçbir firmaya/araca özel veri
-- İÇERMEZ, bu yüzden veritabanında hiç saklanmaz; PDF üretiminde doğrudan
-- public/arac-evrak-statik/ altındaki statik varlıklardan eklenir (bkz.
-- src/lib/aracEvrakStatik.ts).
--
-- Idempotent — bir kaç kez çalıştırılabilir.
-- ============================================================================

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS tmfb_dosya_yolu TEXT,
  ADD COLUMN IF NOT EXISTS tmfb_dosya_adi TEXT,
  ADD COLUMN IF NOT EXISTS k1_dosya_yolu TEXT,
  ADD COLUMN IF NOT EXISTS k1_dosya_adi TEXT;

CREATE TABLE IF NOT EXISTS public.firm_arac_evraklari (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  vehicle_id            UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tasit_karti_yolu      TEXT,
  tasit_karti_adi       TEXT,
  arac_muayene_yolu     TEXT,
  arac_muayene_adi      TEXT,
  arac_ruhsat_yolu      TEXT,
  arac_ruhsat_adi       TEXT,
  sigorta_kasko_yolu    TEXT,
  sigorta_kasko_adi     TEXT,
  src5_belgesi_yolu     TEXT,
  src5_belgesi_adi      TEXT,
  tasima_evraklari_yolu TEXT,
  tasima_evraklari_adi  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_firm_arac_evraklari_firm
  ON public.firm_arac_evraklari(firm_id);

COMMENT ON TABLE public.firm_arac_evraklari IS
  'Araç Evrakı Oluşturma: her araca ait (Taşıt Kartı, Muayene, Ruhsat, Sigorta-Kasko, SRC5, Taşıma Evrakları) belge dosya yolları.';

DROP TRIGGER IF EXISTS trg_firm_arac_evraklari_updated_at ON public.firm_arac_evraklari;
CREATE TRIGGER trg_firm_arac_evraklari_updated_at
BEFORE UPDATE ON public.firm_arac_evraklari
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.firm_arac_evraklari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS firm_arac_evraklari_select ON public.firm_arac_evraklari;
CREATE POLICY firm_arac_evraklari_select ON public.firm_arac_evraklari FOR SELECT USING (
    public.is_admin()
    OR public.is_assigned(firm_arac_evraklari.firm_id)
);

DROP POLICY IF EXISTS firm_arac_evraklari_insert ON public.firm_arac_evraklari;
CREATE POLICY firm_arac_evraklari_insert ON public.firm_arac_evraklari FOR INSERT WITH CHECK (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_arac_evraklari.firm_id AND uf.user_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS firm_arac_evraklari_update ON public.firm_arac_evraklari;
CREATE POLICY firm_arac_evraklari_update ON public.firm_arac_evraklari FOR UPDATE USING (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_arac_evraklari.firm_id AND uf.user_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS firm_arac_evraklari_delete ON public.firm_arac_evraklari;
CREATE POLICY firm_arac_evraklari_delete ON public.firm_arac_evraklari FOR DELETE USING (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_arac_evraklari.firm_id AND uf.user_id = auth.uid()
    ))
);

NOTIFY pgrst, 'reload schema';
