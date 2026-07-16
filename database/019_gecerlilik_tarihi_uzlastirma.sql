-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 019
-- =====================================================================
-- UZLAŞTIRMA: Belge Takip geçerlilik tarihi özelliği paralel olarak İKİ
-- FARKLI şekilde geliştirildi:
--   - Migration 013 (belge_turleri_katalog_senkron): firm_belgeleri.
--     valid_until + expiring_documents view'ına UNION ile ekleme
--   - Migration 016 (belge_takip_gecerlilik_tarihi): firm_belgeleri.
--     expiry_date + ayrı bir expiring_firm_belgeleri view'ı
-- İki farklı kolon adı aynı anda var olduğu için uygulama "expiry_date"
-- sütununu bulamıyor hatası veriyordu (013 çalıştırılmış, 016 çalıştırılmamış
-- olabilir, ya da tam tersi — hangisi olursa olsun ikisi birbirinden
-- habersizdi).
--
-- Bu migration KESİN kaynak olarak "valid_until" ı seçer (mevcut,
-- kanıtlanmış expiring_documents view'ını genişleten yaklaşım — ayrı bir
-- view'a göre daha az kod, daha az bakım). "expiry_date" sütununda veri
-- varsa "valid_until"a taşınır, sonra "expiry_date" ve fazlalık
-- expiring_firm_belgeleri view'ı temizlenir.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN. Idempotent.
-- =====================================================================

-- 1) valid_until kolonunun var olduğundan emin ol
alter table public.firm_belgeleri
    add column if not exists valid_until date;

-- 2) Eğer eski "expiry_date" kolonu varsa, içindeki veriyi valid_until'a
--    taşı (valid_until boşsa doldur), sonra expiry_date'i kaldır.
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'firm_belgeleri'
          and column_name = 'expiry_date'
    ) then
        update public.firm_belgeleri
        set valid_until = expiry_date
        where expiry_date is not null
          and valid_until is null;

        alter table public.firm_belgeleri drop column expiry_date;
    end if;
end $$;

-- 3) expiring_documents view'ını KESİN olarak (013'teki mantıkla) yeniden
--    tanımla — bu, tüm bildirim sisteminin (NotificationBell) okuduğu
--    tek/otoriter view'dır.
create or replace view public.expiring_documents
with (security_invoker = true) as
select
    d.id,
    d.title,
    d.expiry_date,
    d.firm_id,
    f.name as firm_name,
    (d.expiry_date - current_date) as days_left
from public.documents d
join public.firms f on f.id = d.firm_id
where d.expiry_date is not null
  and d.status != 'archived'

union all

select
    fb.id,
    ('Belge Takip: ' || fb.code) as title,
    fb.valid_until as expiry_date,
    fb.firm_id,
    f.name as firm_name,
    (fb.valid_until - current_date) as days_left
from public.firm_belgeleri fb
join public.firms f on f.id = fb.firm_id
where fb.valid_until is not null

order by expiry_date;

-- 4) Artık kullanılmayan ayrı view'ı temizle (varsa)
drop view if exists public.expiring_firm_belgeleri;
