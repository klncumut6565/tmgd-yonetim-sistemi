-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 017
-- =====================================================================
-- 1) BUG DÜZELTMESİ: adr_expiring_drivers / adr_expiring_vehicles view'ları
--    "days_left" kolonu OLMADAN tanımlıydı, ama NotificationBell.tsx
--    sorguda .lte("days_left", ...) kullanıyordu — bu, view'lar her
--    sorgulandığında "column days_left does not exist" hatası veriyordu
--    ve sessizce yutuluyordu (uyarılar hiç görünmüyordu). Ayrıca view'lar
--    sabit "current_date + 30 gün" filtresiyle sınırlıydı; kullanıcının
--    Ayarlar'dan seçtiği eşik (örn. 45 gün) bu yüzden hiçbir zaman tam
--    çalışmıyordu.
--
-- 2) YENİ: Araç için MUAYENE tarihi (inspection_valid_until — kolon zaten
--    vardı, sadece hiçbir yerde uyarıya dahil edilmiyordu) ve Sürücü için
--    EHLİYET geçerlilik tarihi (driving_license_valid_until — yeni kolon)
--    eklendi, ikisi için de expiring_* view'ları oluşturuldu.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- (016'dan SONRA. Idempotent.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Mevcut ADR view'larını days_left ile düzelt, sabit 30 gün sınırını kaldır
--    (eşik artık tamamen istemci tarafındaki ayardan kontrol edilir).
-- ---------------------------------------------------------------------
create or replace view public.adr_expiring_drivers
with (security_invoker = true) as
select
    d.id,
    d.first_name,
    d.last_name,
    d.adr_valid_until,
    f.name as firm_name,
    (d.adr_valid_until - current_date) as days_left
from public.drivers d
join public.firms f on f.id = d.firm_id
where d.adr_valid_until is not null
  and d.status = 'active';

create or replace view public.adr_expiring_vehicles
with (security_invoker = true) as
select
    v.id,
    v.plate_number,
    v.adr_valid_until,
    f.name as firm_name,
    (v.adr_valid_until - current_date) as days_left
from public.vehicles v
join public.firms f on f.id = v.firm_id
where v.adr_valid_until is not null
  and v.status = 'active';

-- ---------------------------------------------------------------------
-- 2) YENİ: Araç muayene tarihi uyarısı
-- ---------------------------------------------------------------------
create or replace view public.expiring_vehicle_inspections
with (security_invoker = true) as
select
    v.id,
    v.plate_number,
    v.inspection_valid_until,
    f.name as firm_name,
    (v.inspection_valid_until - current_date) as days_left
from public.vehicles v
join public.firms f on f.id = v.firm_id
where v.inspection_valid_until is not null
  and v.status = 'active';

-- ---------------------------------------------------------------------
-- 3) YENİ: Sürücü ehliyet geçerlilik tarihi (kolon + uyarı view'ı)
-- ---------------------------------------------------------------------
alter table public.drivers
    add column if not exists driving_license_valid_until date;

create or replace view public.expiring_driver_licenses
with (security_invoker = true) as
select
    d.id,
    d.first_name,
    d.last_name,
    d.driving_license_valid_until,
    f.name as firm_name,
    (d.driving_license_valid_until - current_date) as days_left
from public.drivers d
join public.firms f on f.id = d.firm_id
where d.driving_license_valid_until is not null
  and d.status = 'active';
