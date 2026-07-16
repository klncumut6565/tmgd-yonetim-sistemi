-- =====================================================================
-- 013 — Belge Takip maddelerinde isteğe bağlı geçerlilik tarihi
-- =====================================================================
-- Belge Takip sekmesindeki bazı maddelerin (ADR sertifikası, sigorta
-- poliçesi, eğitim belgesi vb.) bir geçerlilik/son kullanma tarihi olur.
-- Bu tarih isteğe bağlıdır — girilmezse hiçbir uyarı üretilmez.
--
-- Girildiğinde, mevcut bildirim ziline (NotificationBell → public.
-- expiring_documents view'ı) otomatik olarak eklenir; ayrı bir bildirim
-- mekanizması gerekmez, kullanıcının Ayarlar → Bildirimler'de belirlediği
-- "belge geçerlilik" gün eşiği burada da geçerlidir.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN. Idempotent.
-- =====================================================================

alter table public.firm_belgeleri
    add column if not exists valid_until date;

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
