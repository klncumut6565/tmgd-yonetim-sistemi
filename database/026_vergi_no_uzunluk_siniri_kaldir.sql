-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 026
-- =====================================================================
-- firms.tax_number alanındaki 20 karakter sınırı kaldırılıyor.
--
-- GEREKÇE: Uygulamada bu alana yalnızca vergi numarası değil, vergi
-- dairesiyle birlikte tam bilgi yazılıyor:
--     "Küçükköy Vergi Dairesi / 0790003218"
-- Bu 34 karakter olduğundan varchar(20) sınırına takılıp
-- "value too long" hatası veriyordu.
--
-- mersis_number da aynı nedenle serbest metne çevriliyor (MERSİS
-- numarası 16 hane olsa da yanına açıklama yazılabilsin diye).
--
-- Not: varchar -> text dönüşümü veri KAYBETMEZ; mevcut değerler aynen
-- kalır. Sütun daraltılmadığı için işlem güvenlidir.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN (idempotent)
-- =====================================================================

alter table public.firms
    alter column tax_number type text;

alter table public.firms
    alter column mersis_number type text;

comment on column public.firms.tax_number is
    'Vergi dairesi ve/veya vergi numarası. Serbest metin (örn. "Küçükköy Vergi Dairesi / 0790003218").';

-- PostgREST şema önbelleğini tazele
notify pgrst, 'reload schema';
