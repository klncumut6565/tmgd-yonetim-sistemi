-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 016
-- =====================================================================
-- Belge Takip maddelerine (firm_belgeleri) isteğe bağlı "geçerlilik
-- tarihi" eklenir (örn. TMGD Sertifikası, TMFB, U-Net Yetkilendirme gibi
-- süreli belgeler için). Mevcut bildirim ziliyle (NotificationBell)
-- aynı desende — expiring_documents view'ı ile birebir aynı mantıkla —
-- bir view eklenir; bildirim ziline otomatik dahil olur, ayrı bir
-- cron/scheduled job gerekmez (her açılışta canlı hesaplanır).
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- (015'ten SONRA. Idempotent.)
-- =====================================================================

alter table public.firm_belgeleri
    add column if not exists expiry_date date;

-- expiring_documents view'ıyla birebir aynı desen (security_invoker=true
-- sayesinde view, sorguyu yapan kullanıcının kendi RLS izinlerine tabi
-- olur — firm_belgeleri'nin mevcut SELECT politikası zaten yalnızca
-- atanmış/admin olunan firmaları döndürür, view'da ayrıca RLS gerekmez).
create or replace view public.expiring_firm_belgeleri
with (security_invoker = true) as
select
    b.id,
    b.code,
    b.period,
    b.expiry_date,
    b.firm_id,
    f.name as firm_name,
    (b.expiry_date - current_date) as days_left
from public.firm_belgeleri b
join public.firms f on f.id = b.firm_id
where b.expiry_date is not null
order by b.expiry_date;
