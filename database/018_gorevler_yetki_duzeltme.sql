-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 018
-- =====================================================================
-- BUG: Süper yönetici hesabıyla bile "Görevler" sayfasında bir görevi
-- Tamamla/Düzenle/Sil yapmaya çalışınca "Bu işlem için yetkin yok" hatası
-- alınıyordu.
--
-- KÖK SEBEP: is_super_admin() fonksiyonu birden fazla dosyada tanımlı:
--   - 002_onay_yetki.sql'deki versiyon: security definer (DOĞRU — RLS'i
--     iç sorguda es geçer, döngüsel kilitlenme riski olmaz)
--   - schema.sql'deki versiyon: security definer YOK (SORUNLU)
-- "create or replace function" komutları dosya SIRASINA değil, veritabanında
-- ÇALIŞTIRILMA sırasına göre birbirinin üstüne yazar. schema.sql herhangi
-- bir sebeple 002'den SONRA (örn. bir şeyi test ederken yeniden) çalıştırılmış
-- olabilir — bu durumda security definer'sız versiyon kalıcı olarak aktif
-- kalır ve tüm is_super_admin()/is_admin()/yazabilir() tabanlı yetki
-- kontrolleri (yalnızca tasks değil, TÜM tablolar) güvenilmez hale gelir.
--
-- Bu migration, bu üç fonksiyonu ve tasks tablosunun RLS politikalarını
-- KESİN/OTORİTER olarak (dosya sırasına bakılmaksızın en son ve doğru
-- hallerine) yeniden tanımlar. Idempotent — güvenle tekrar çalıştırılabilir.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Yetki fonksiyonlarını security definer ile KESİN olarak yeniden tanımla
-- ---------------------------------------------------------------------
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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('super_admin', 'admin')
    );
$$;

create or replace function public.yazabilir()
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
          and role in ('super_admin', 'admin', 'tmgd', 'assistant')
    );
$$;

-- ---------------------------------------------------------------------
-- 2) tasks RLS politikalarını KESİN olarak yeniden oluştur
--    (schema.sql'deki mantıkla birebir aynı, sadece garanti altına alınıyor)
-- ---------------------------------------------------------------------
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select using (
    public.is_super_admin()
    or exists (
        select 1 from public.user_firms uf
        where uf.firm_id = tasks.firm_id
        and uf.user_id = auth.uid()
    )
);

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert with check (
    public.is_super_admin()
    or exists (
        select 1 from public.user_firms uf
        where uf.firm_id = tasks.firm_id
        and uf.user_id = auth.uid()
    )
);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update using (
    public.is_super_admin()
    or exists (
        select 1 from public.user_firms uf
        where uf.firm_id = tasks.firm_id
        and uf.user_id = auth.uid()
    )
) with check (
    public.is_super_admin()
    or exists (
        select 1 from public.user_firms uf
        where uf.firm_id = tasks.firm_id
        and uf.user_id = auth.uid()
    )
);

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete using (
    public.is_super_admin()
    or exists (
        select 1 from public.user_firms uf
        where uf.firm_id = tasks.firm_id
        and uf.user_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------
-- 3) Hızlı doğrulama (isteğe bağlı): kendi hesabının süper yönetici
--    olarak doğru tanındığını buradan kontrol edebilirsin — "true" dönmeli.
--    select public.is_super_admin();
-- ---------------------------------------------------------------------
