-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 006
-- =====================================================================
-- Yönetici (admin) rolüne şu yetkiler ekleniyor:
--   ✓ Kullanıcı onaylama / reddetme / pasife alma
--   ✓ Firma ataması yapma / kaldırma
--   ✗ Kullanıcı rolü değiştirme → hâlâ yalnızca super_admin
--   ✗ Kullanıcı silme → hâlâ yalnızca super_admin
--   ✗ super_admin profillerini görme → sadece super_admin kendini görür
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- (schema.sql → 002 → 003 → 004 → 005'ten SONRA. Idempotent.)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Yardımcı fonksiyon: kullanıcı admin mi?
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role in ('super_admin', 'admin')
          and is_active = true
    );
$$;


-- ---------------------------------------------------------------------
-- 2) PROFILES — admin onay/güncelleme yapabilir ama rol değiştiremez
-- ---------------------------------------------------------------------

-- SELECT: super_admin tümünü görür; admin super_admin HARİÇ tümünü görür
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
    id = auth.uid()                        -- herkes kendini görür
    or public.is_super_admin()             -- super_admin hepsini görür
    or (                                   -- admin: super_admin hariç hepsini görür
        public.is_admin()
        and role != 'super_admin'
    )
);

-- UPDATE: admin approval_status, is_active güncelleyebilir;
--         rol (role) alanını yalnızca super_admin değiştirebilir
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (
    id = auth.uid() or public.is_admin()
);


-- ---------------------------------------------------------------------
-- 3) USER_FIRMS — admin firma ataması yapabilir/kaldırabilir
-- ---------------------------------------------------------------------
drop policy if exists user_firms_select on public.user_firms;
create policy user_firms_select on public.user_firms for select using (
    user_id = auth.uid() or public.is_admin()
);

drop policy if exists user_firms_admin_all on public.user_firms;
create policy user_firms_admin_all on public.user_firms for all using (
    public.is_admin()
);


-- ---------------------------------------------------------------------
-- 4) FIRMS + alt tablolar SELECT — admin tümünü görür
-- ---------------------------------------------------------------------

-- Firms: super_admin ve admin tüm firmaları görür;
--        diğerleri yalnızca atandıkları firmaları görür
drop policy if exists firms_select on public.firms;
create policy firms_select on public.firms for select using (
    public.is_admin()           -- super_admin + admin → tümünü görür
    or public.is_assigned(firms.id)  -- diğerleri → yalnızca atandığı firma
);

-- Alt tablolar: admin tüm firmalardaki kayıtları görür
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
                public.is_admin()
                or public.is_assigned(%1$I.firm_id)
            )
        $f$, t);
    end loop;
end $$;
