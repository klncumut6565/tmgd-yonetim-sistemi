-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 005
-- =====================================================================
-- DEĞİŞİKLİK 1: Onay bekleyen kullanıcılar, kendilerine ATANMIŞ firmaları
--   görebilir (okuma). Yazma yetkisi için hâlâ onay şartı aranır.
--   Böylece TMGD, yönetici onayını beklerken çalışmaya başlayabilir.
--
-- DEĞİŞİKLİK 2: user_notification_settings tablosu
--   Her kullanıcı bildirim tercihlerini (kaç gün öncesi uyarı,
--   hangi tür bildirimlerin açık olduğu) kendisi ayarlar.
--
-- KULLANIM: Supabase SQL Editor → tamamını yapıştır → RUN
-- (schema.sql → 002 → 003 → 004 → 005 sırası. Idempotent.)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) is_assigned(): kullanıcı bu firmaya atanmış mı? (onay şartı yok)
-- ---------------------------------------------------------------------
create or replace function public.is_assigned(p_firm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.user_firms
        where firm_id = p_firm_id
          and user_id  = auth.uid()
    );
$$;


-- ---------------------------------------------------------------------
-- 2) FIRMS SELECT — onay OLMADAN atanmış firmayı görebilir
-- ---------------------------------------------------------------------
drop policy if exists firms_select on public.firms;
create policy firms_select on public.firms for select using (
    public.is_super_admin()
    or public.is_assigned(firms.id)   -- onay beklese de atandığı firmayı görür
);


-- ---------------------------------------------------------------------
-- 3) Alt tablolar SELECT — aynı kural (onay olmadan, atanmışsa görür)
-- ---------------------------------------------------------------------
do $$
declare
    t text;
    tbls text[] := array[
        'vehicles','drivers','employees','visits',
        'tasks','documents','files'
    ];
begin
    foreach t in array tbls loop
        execute format('drop policy if exists %I_select on public.%I', t, t);
        execute format($f$
            create policy %1$I_select on public.%1$I for select using (
                public.is_super_admin()
                or public.is_assigned(%1$I.firm_id)
            )
        $f$, t);
    end loop;
end $$;


-- ---------------------------------------------------------------------
-- 4) user_notification_settings — kişisel bildirim ayarları
-- ---------------------------------------------------------------------
create table if not exists public.user_notification_settings (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references public.profiles(id) on delete cascade,

    -- Belge geçerlilik uyarısı: kaç gün öncesinden başlasın (0 = kapalı)
    doc_expiry_days     int  not null default 45
                            check (doc_expiry_days between 0 and 365),

    -- ADR sertifika uyarısı (sürücü + araç)
    adr_expiry_days     int  not null default 45
                            check (adr_expiry_days between 0 and 365),

    -- Görev yaklaşan termin uyarısı
    task_due_days       int  not null default 7
                            check (task_due_days between 0 and 365),

    -- Bildirim kanalları (ileride mail/WhatsApp için)
    notify_in_app       boolean not null default true,
    notify_email        boolean not null default false,

    -- Sessiz saatler (ileride push için)
    quiet_hours_enabled boolean not null default false,
    quiet_start         time    default '22:00',
    quiet_end           time    default '08:00',

    created_at          timestamptz default now(),
    updated_at          timestamptz default now(),

    unique (user_id)
);

-- Mevcut kullanıcılara varsayılan ayar satırı ekle
insert into public.user_notification_settings (user_id)
select id from public.profiles
where not exists (
    select 1 from public.user_notification_settings s where s.user_id = profiles.id
);

-- Yeni kullanıcı kayıt olunca otomatik varsayılan ayar oluştur
create or replace function public.create_default_notification_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.user_notification_settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_profile_created_notification_settings on public.profiles;
create trigger on_profile_created_notification_settings
    after insert on public.profiles
    for each row
    execute function public.create_default_notification_settings();

-- RLS
alter table public.user_notification_settings enable row level security;

drop policy if exists notif_settings_select on public.user_notification_settings;
create policy notif_settings_select on public.user_notification_settings
    for select using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists notif_settings_update on public.user_notification_settings;
create policy notif_settings_update on public.user_notification_settings
    for update using (user_id = auth.uid());

drop policy if exists notif_settings_insert on public.user_notification_settings;
create policy notif_settings_insert on public.user_notification_settings
    for insert with check (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- 5) notifications tablosuna RLS ekle (schema.sql'de eksikti)
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
    for select using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
    for insert with check (public.is_super_admin() or public.yazabilir());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
    for update using (user_id = auth.uid() or public.is_super_admin());


-- ---------------------------------------------------------------------
-- 6) Belge geçerlilik tarihi → notifications view'ı
--    Dashboard ve bildirim zili bu view'dan okur.
-- ---------------------------------------------------------------------
-- documents tablosuna geçerlilik tarihi kolonu ekle (yoksa)
alter table public.documents
    add column if not exists expiry_date date,
    add column if not exists valid_from  date;

create or replace view public.expiring_documents
with (security_invoker = true) as
select
    d.id,
    d.title,
    d.expiry_date,
    d.firm_id,
    f.name  as firm_name,
    (d.expiry_date - current_date) as days_left
from public.documents d
join public.firms     f on f.id = d.firm_id
where d.expiry_date is not null
  and d.status != 'archived'
order by d.expiry_date;
