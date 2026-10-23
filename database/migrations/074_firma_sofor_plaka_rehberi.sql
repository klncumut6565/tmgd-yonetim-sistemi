-- ============================================================================
-- Migration 074: Firma bazli Sofor ve Plaka rehberi
-- ----------------------------------------------------------------------------
-- NEDEN: Tasima Evraki'nda surucu/arac alanlari yalnizca faaliyetinde
-- "tasimaci" olan firmalarda gorunuyordu ve yalnizca Suruculer/Araclar
-- modulundeki kayitlardan secilebiliyordu. Tasimaci olmayan firmalar da
-- (yukleyen/gonderen) her evrakta sofor adi ve plaka yaziyor; ayni sofor ve
-- plakalar tekrar tekrar elle giriliyordu.
--
-- COZUM: Alici (035_firm_consignees) ve Tasiyici (058_firm_carriers)
-- rehberleriyle AYNI desende, her firma kendi sofor ve plaka rehberini tutar.
-- Bir kez kaydedilir, sonraki evraklarda listeden secilir.
--
-- YETKI: Tasima Evraki kurallariyla tutarli (bkz. 075) —
--   okuma : yonetici (is_admin) VEYA firmaya atanmis kullanici
--   yazma : yonetici VEYA ((yazabilir() VEYA firma_kullanicisi()) VE firmaya atanmis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.firm_saved_drivers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id     UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_firm_saved_drivers_firm_name
  ON public.firm_saved_drivers(firm_id, lower(full_name));

CREATE TABLE IF NOT EXISTS public.firm_saved_plates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id      UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Plaka benzersizligi bosluklar yok sayilarak ("34 ABC 123" = "34ABC123")
CREATE UNIQUE INDEX IF NOT EXISTS uq_firm_saved_plates_firm_plate
  ON public.firm_saved_plates(firm_id, upper(replace(plate_number, ' ', '')));

COMMENT ON TABLE public.firm_saved_drivers IS
  'Her firmanin Tasima Evraki sofor rehberi (bir kez kaydedilir, listeden secilir).';
COMMENT ON TABLE public.firm_saved_plates IS
  'Her firmanin Tasima Evraki plaka rehberi (bir kez kaydedilir, listeden secilir).';

DROP TRIGGER IF EXISTS trg_firm_saved_drivers_updated_at ON public.firm_saved_drivers;
CREATE TRIGGER trg_firm_saved_drivers_updated_at
BEFORE UPDATE ON public.firm_saved_drivers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_firm_saved_plates_updated_at ON public.firm_saved_plates;
CREATE TRIGGER trg_firm_saved_plates_updated_at
BEFORE UPDATE ON public.firm_saved_plates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.firm_saved_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_saved_plates  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS firm_saved_drivers_select ON public.firm_saved_drivers;
CREATE POLICY firm_saved_drivers_select ON public.firm_saved_drivers
FOR SELECT USING (public.is_admin() OR public.is_assigned(firm_id));

DROP POLICY IF EXISTS firm_saved_drivers_write ON public.firm_saved_drivers;
CREATE POLICY firm_saved_drivers_write ON public.firm_saved_drivers
FOR ALL USING (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = firm_saved_drivers.firm_id AND uf.user_id = auth.uid()))
)
WITH CHECK (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = firm_saved_drivers.firm_id AND uf.user_id = auth.uid()))
);

DROP POLICY IF EXISTS firm_saved_plates_select ON public.firm_saved_plates;
CREATE POLICY firm_saved_plates_select ON public.firm_saved_plates
FOR SELECT USING (public.is_admin() OR public.is_assigned(firm_id));

DROP POLICY IF EXISTS firm_saved_plates_write ON public.firm_saved_plates;
CREATE POLICY firm_saved_plates_write ON public.firm_saved_plates
FOR ALL USING (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = firm_saved_plates.firm_id AND uf.user_id = auth.uid()))
)
WITH CHECK (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = firm_saved_plates.firm_id AND uf.user_id = auth.uid()))
);

-- ----------------------------------------------------------------------------
-- Denetim izi
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_firm_saved_drivers ON public.firm_saved_drivers;
CREATE TRIGGER trg_audit_firm_saved_drivers
AFTER INSERT OR UPDATE OR DELETE ON public.firm_saved_drivers
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_firm_saved_plates ON public.firm_saved_plates;
CREATE TRIGGER trg_audit_firm_saved_plates
AFTER INSERT OR UPDATE OR DELETE ON public.firm_saved_plates
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

INSERT INTO public._migrations (id) VALUES ('074_firma_sofor_plaka_rehberi')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
