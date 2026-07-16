-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 020
-- =====================================================================
-- Belge Takip'teki "Ziyaret Raporları (Aylık)" maddeleri (ZR, örn.
-- "Mayıs 2026 Ziyaret Raporu") artık ayrık/genel bir "geçerlilik tarihi"
-- yerine, sol menüdeki Ziyaretler özelliğiyle DOĞRUDAN bağlantılı çalışır.
--
-- Bunun için visits tablosuna "period" (YYYY-MM) kolonu eklenir. Bir ZR
-- maddesine tarih girildiğinde, o ay için gerçek bir visits satırı
-- oluşturulur/güncellenir — bu satır otomatik olarak:
--   - Ziyaretler sekmesinde görünür (düzenlenebilir: özet, sonraki ziyaret,
--     rapor içeriği şablonu vb.)
--   - Firmalar listesindeki "Son Ziyaret" rengini besler
--
-- period'u boş olan sıradan (ad-hoc) ziyaretler bu kısıttan etkilenmez —
-- yalnızca bir aya bağlanan ziyaretler için (firm_id, period) benzersizdir.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN. Idempotent.
-- =====================================================================

alter table public.visits
    add column if not exists period text not null default '';

-- period boş olmayan kayıtlarda (firm_id, period) benzersiz olsun —
-- böylece "bu ay için ziyaret kaydı" upsert ile tek satırda tutulabilir.
create unique index if not exists idx_visits_firm_period
    on public.visits (firm_id, period)
    where period <> '';
