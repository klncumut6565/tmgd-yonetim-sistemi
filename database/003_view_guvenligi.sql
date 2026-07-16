-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — VIEW GÜVENLİĞİ (MIGRATION 003)
-- =====================================================================
-- SORUN: schema.sql'deki adr_expiring_drivers / adr_expiring_vehicles
-- view'ları varsayılan ayarla (security definer davranışı) oluşturulmuştu.
-- Postgres'te böyle bir view, ALTINDAKİ TABLOLARIN RLS POLİTİKALARINI
-- BYPASS EDER: onaylı olsun olmasın her kullanıcı TÜM firmaların
-- süresi dolan sürücü/araç verisini görebilirdi.
--
-- ÇÖZÜM: security_invoker = true → view, sorgulayan kullanıcının
-- yetkileriyle çalışır; drivers/vehicles/firms RLS politikaları
-- aynen uygulanır (herkes yalnızca atandığı firmaları görür).
--
-- KULLANIM: Supabase → SQL Editor → New Query → tamamını yapıştır → RUN
-- (schema.sql ve 002_onay_yetki.sql'den SONRA çalıştırılmalı.)
-- Idempotent: tekrar çalıştırılabilir.
-- =====================================================================

create or replace view public.adr_expiring_drivers
with (security_invoker = true) as
select d.id, d.first_name, d.last_name, d.adr_valid_until, f.name as firm_name
from public.drivers d
join public.firms f on f.id = d.firm_id
where d.adr_valid_until <= current_date + interval '30 days'
  and d.status = 'active';

create or replace view public.adr_expiring_vehicles
with (security_invoker = true) as
select v.id, v.plate_number, v.adr_valid_until, f.name as firm_name
from public.vehicles v
join public.firms f on f.id = v.firm_id
where v.adr_valid_until <= current_date + interval '30 days'
  and v.status = 'active';
