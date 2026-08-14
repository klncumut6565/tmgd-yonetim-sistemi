-- ============================================================================
-- Migration 047: Mobil Tarama Hedeflerini Genellestirme
-- ----------------------------------------------------------------------------
-- AMAC: "Mobilden Tara" (klncumut6565/tarayici_ios PWA) entegrasyonu simdiye
-- kadar yalnizca Belge Takip satirlarina (firm_belgeleri/firm_belge_dosyalari)
-- baglanabiliyordu. Bu migration, ayni koprüyü Arac Evraki Olustur (ortak
-- firma belgeleri TMFB/K1 + araca ozel Ek-3..Ek-10) ve Sürücü Listesi
-- (SRC5/Ehliyet) yukleme alanlarina da genisletir.
--
-- YAKLASIM: belge_tarama_oturumlari tablosuna hedef_tipi + hedef_veri (jsonb)
-- eklenir. Eski satirlar/cagrilar hedef_tipi='belge_takip' varsayilanina
-- duser ve MEVCUT DAVRANIS DEGISMEZ (geriye donuk uyumlu).
--
-- hedef_tipi degerleri ve callback'te beklenen hedef_veri sekli:
--   'belge_takip' -> {} (code/period zaten ayri kolonlarda, degismedi)
--   'arac_ortak'  -> { "tur": "tmfb" | "k1" }
--   'arac_ozel'   -> { "vehicleId": "<uuid>", "anahtar": "tasit_karti" | ... }
--   'surucu_belge'-> { "satirId": "<uuid>", "tur": "src5" | "ehliyet" }
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================

ALTER TABLE public.belge_tarama_oturumlari
  ADD COLUMN IF NOT EXISTS hedef_tipi TEXT NOT NULL DEFAULT 'belge_takip';

ALTER TABLE public.belge_tarama_oturumlari
  ADD COLUMN IF NOT EXISTS hedef_veri JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.belge_tarama_oturumlari.hedef_tipi IS
  'Tarama sonucunun nereye kaydedilecegini belirler: belge_takip | arac_ortak | arac_ozel | surucu_belge. Bkz. /api/belge-tarama/callback route.ts.';
COMMENT ON COLUMN public.belge_tarama_oturumlari.hedef_veri IS
  'hedef_tipi''e gore degisen serbest JSON govde (orn. arac_ozel icin {vehicleId, anahtar}).';


-- ----------------------------------------------------------------------------
-- DOGRULAMA
-- ----------------------------------------------------------------------------

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'belge_tarama_oturumlari'
  AND column_name IN ('hedef_tipi', 'hedef_veri');


-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('047_mobil_tarama_hedef_genelleme')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
