-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 015
-- =====================================================================
-- "Belge Türü *" dropdown'ı migration 013 çalıştırıldıktan SONRA bile
-- boş görünmeye devam ediyorsa en olası sebep şu: document_types (ve/veya
-- document_categories) tablosunda RLS bir şekilde açık ama HİÇ SELECT
-- politikası yok (örn. Supabase Dashboard → Security Advisor önerisiyle
-- manuel açılmış olabilir — bu tür değişiklikler migration dosyalarına
-- yansımaz, dashboard'da ayrı yapılır). RLS açıkken politika yoksa
-- Postgres o tabloyu HERKESE (super_admin dahil) kapatır — profiles
-- tablosunda DELETE için yaşadığımız sorunla birebir aynı hata deseni.
--
-- Bu migration RLS durumu ne olursa olsun (açık/kapalı, önceden politika
-- var/yok) document_types ve document_categories'i güvenli şekilde
-- okunabilir hale getirir. Bunlar hassas veri içermeyen referans/katalog
-- tablolarıdır (belge türü kodu + adı) — onaylı tüm kullanıcılar
-- okuyabilir, yalnızca admin/super_admin değiştirebilir.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- (013'ten SONRA. Idempotent.)
-- =====================================================================

alter table public.document_types enable row level security;
alter table public.document_categories enable row level security;

drop policy if exists document_types_select on public.document_types;
create policy document_types_select on public.document_types
for select using (true);

drop policy if exists document_types_write on public.document_types;
create policy document_types_write on public.document_types
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists document_categories_select on public.document_categories;
create policy document_categories_select on public.document_categories
for select using (true);

drop policy if exists document_categories_write on public.document_categories;
create policy document_categories_write on public.document_categories
for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Hızlı doğrulama: bu sorguyu ayrıca SQL Editor'de tek başına çalıştırıp
-- kaç aktif belge türü olduğunu görebilirsin (44 olmalı).
-- select count(*) from public.document_types where is_active = true;
-- ---------------------------------------------------------------------
