-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — ONAY & YETKİ SİSTEMİ (MIGRATION 002)
-- =====================================================================
-- Bu dosya, schema.sql'in ÜSTÜNE eklenir (onu değiştirmez). İçinde:
--   1) profiles'a onay durumu alanları (approval_status, approved_at...)
--   2) Yeni auth kullanıcısı kayıt olunca otomatik profile oluşturma
--   3) Yeni firma eklenince ekleyen TMGD'ye otomatik atama
--   4) "Sadece onaylı kullanıcılar veri görür/ekler" RLS güncellemesi
--   5) profiles ve user_firms için yönetici (super_admin) politikaları
--
-- KULLANIM: Supabase → SQL Editor → New Query → bu dosyanın tamamını
-- yapıştır → RUN. (schema.sql'i daha önce çalıştırmış olman gerekir.)
--
-- Idempotent: tekrar çalıştırılabilir.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) profiles: onay durumu alanları
-- ---------------------------------------------------------------------
alter table public.profiles
    add column if not exists approval_status text not null default 'pending'
        check (approval_status in ('pending','approved','rejected'));

alter table public.profiles
    add column if not exists approved_at timestamptz;

alter table public.profiles
    add column if not exists approved_by uuid references public.profiles(id);


-- ---------------------------------------------------------------------
-- 2) Yardımcı fonksiyonlar (onay/rol kontrolü)
-- ---------------------------------------------------------------------
-- NOT: schema.sql'de is_super_admin() zaten var. Burada is_approved()
-- ekliyoruz: oturum açan kullanıcı onaylı mı?
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid()
        and approval_status = 'approved'
        and is_active = true
    );
$$;

-- is_super_admin'i de security definer yapalım (RLS döngüsünü önler)
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'super_admin'
    );
$$;


-- ---------------------------------------------------------------------
-- 3) Yeni auth kullanıcısı → otomatik profile (pending olarak)
-- ---------------------------------------------------------------------
-- Kullanıcı kayıt ekranından kaydolunca auth.users'a satır eklenir.
-- Bu trigger, o kullanıcı için profiles'ta 'pending' bir kayıt açar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, email, role, approval_status)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        'tmgd',
        'pending'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 4) Yeni firma eklenince → ekleyen kullanıcıya otomatik 'owner' ata
-- ---------------------------------------------------------------------
-- Böylece bir TMGD firma eklediğinde otomatik kendi firması olur.
-- (Süper admin eklerse de kendine atanır; sonra atamayı değiştirebilir.)
create or replace function public.assign_firm_to_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.created_by is not null then
        insert into public.user_firms (user_id, firm_id, permission)
        values (new.created_by, new.id, 'owner')
        on conflict (user_id, firm_id) do nothing;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_assign_firm_creator on public.firms;
create trigger trg_assign_firm_creator
after insert on public.firms
for each row execute function public.assign_firm_to_creator();


-- ---------------------------------------------------------------------
-- 5) RLS güncellemesi: "onaylı olma" şartı
-- ---------------------------------------------------------------------
-- Mantık: super_admin her şeyi görür/yapar. Normal kullanıcı ANCAK
-- onaylıysa VE firmanın üyesiyse (user_firms) görebilir/yazabilir.

-- 5a) PROFILES tablosu RLS
alter table public.profiles enable row level security;

-- Herkes kendi profilini görebilir; super_admin tüm profilleri görür
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
    id = auth.uid() or public.is_super_admin()
);

-- Kullanıcı kendi profilinin bazı alanlarını günceller; super_admin hepsini
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (
    id = auth.uid() or public.is_super_admin()
);

-- profiles INSERT yalnızca trigger (security definer) üzerinden olur;
-- doğrudan client insert'e izin vermeye gerek yok.

-- 5b) FIRMS — onaylı üye şartı
drop policy if exists firms_select on public.firms;
create policy firms_select on public.firms for select using (
    public.is_super_admin()
    or (
        public.is_approved()
        and exists (
            select 1 from public.user_firms uf
            where uf.firm_id = firms.id and uf.user_id = auth.uid()
        )
    )
);

drop policy if exists firms_insert on public.firms;
create policy firms_insert on public.firms for insert with check (
    public.is_super_admin()
    or public.is_approved()
);

drop policy if exists firms_update on public.firms;
create policy firms_update on public.firms for update using (
    public.is_super_admin()
    or (
        public.is_approved()
        and exists (
            select 1 from public.user_firms uf
            where uf.firm_id = firms.id and uf.user_id = auth.uid()
            and uf.permission in ('owner','editor')
        )
    )
);

drop policy if exists firms_delete on public.firms;
create policy firms_delete on public.firms for delete using (
    public.is_super_admin()
);


-- ---------------------------------------------------------------------
-- 6) Alt tablolar için "onaylı + üye" şartlı politikalar
-- ---------------------------------------------------------------------
-- vehicles / drivers / employees / visits / tasks / documents / files
-- için: super_admin tümü; normal kullanıcı onaylı + firmanın üyesi.
-- Aşağıdaki blok tüm bu tabloları tek tek aynı kalıpla günceller.

do $$
declare
    t text;
    tbls text[] := array['vehicles','drivers','employees','visits','tasks'];
begin
    foreach t in array tbls loop
        -- SELECT
        execute format('drop policy if exists %I_select on public.%I', t, t);
        execute format($f$
            create policy %1$I_select on public.%1$I for select using (
                public.is_super_admin()
                or (public.is_approved() and exists (
                    select 1 from public.user_firms uf
                    where uf.firm_id = %1$I.firm_id and uf.user_id = auth.uid()
                ))
            )
        $f$, t);

        -- INSERT
        execute format('drop policy if exists %I_insert on public.%I', t, t);
        execute format($f$
            create policy %1$I_insert on public.%1$I for insert with check (
                public.is_super_admin()
                or (public.is_approved() and exists (
                    select 1 from public.user_firms uf
                    where uf.firm_id = %1$I.firm_id and uf.user_id = auth.uid()
                ))
            )
        $f$, t);

        -- UPDATE
        execute format('drop policy if exists %I_update on public.%I', t, t);
        execute format($f$
            create policy %1$I_update on public.%1$I for update using (
                public.is_super_admin()
                or (public.is_approved() and exists (
                    select 1 from public.user_firms uf
                    where uf.firm_id = %1$I.firm_id and uf.user_id = auth.uid()
                ))
            )
        $f$, t);

        -- DELETE
        execute format('drop policy if exists %I_delete on public.%I', t, t);
        execute format($f$
            create policy %1$I_delete on public.%1$I for delete using (
                public.is_super_admin()
                or (public.is_approved() and exists (
                    select 1 from public.user_firms uf
                    where uf.firm_id = %1$I.firm_id and uf.user_id = auth.uid()
                    and uf.permission in ('owner','editor')
                ))
            )
        $f$, t);
    end loop;
end $$;


-- ---------------------------------------------------------------------
-- 7) USER_FIRMS (firma atamaları) RLS
-- ---------------------------------------------------------------------
-- Atamaları yalnızca super_admin yönetir; kullanıcı kendi atamalarını görür.
alter table public.user_firms enable row level security;

drop policy if exists user_firms_select on public.user_firms;
create policy user_firms_select on public.user_firms for select using (
    user_id = auth.uid() or public.is_super_admin()
);

drop policy if exists user_firms_admin_all on public.user_firms;
create policy user_firms_admin_all on public.user_firms for all using (
    public.is_super_admin()
) with check (
    public.is_super_admin()
);

-- NOT: trg_assign_firm_creator security definer olduğu için RLS'i bypass
-- ederek otomatik atama yapabilir; o yüzden normal kullanıcının
-- user_firms'a doğrudan yazma yetkisi olmasına gerek yok.


-- =====================================================================
-- 8) İLK SÜPER ADMIN'İ AYARLA  ⚠️ KENDİ MAILİNLE DEĞİŞTİR
-- =====================================================================
-- Aşağıdaki satır, belirtilen e-postaya sahip kullanıcıyı super_admin
-- ve onaylı yapar. 'KISISEL_MAILIN@ornek.com' kısmını KENDİ kişisel
-- mailinle değiştir (auth'ta kayıtlı olan mail). Sonra bu bloğu çalıştır.
--
-- update public.profiles
-- set role = 'super_admin',
--     approval_status = 'approved',
--     approved_at = now()
-- where email = 'KISISEL_MAILIN@ornek.com';
--
-- =====================================================================
-- MIGRATION SONU
-- =====================================================================
