-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — ROL BAZLI YAZMA YETKİSİ (MIGRATION 004)
-- =====================================================================
-- Bu dosyaya kadar yetki ayrımı yalnızca super_admin / diğerleri
-- şeklindeydi: atanmış HERKES (İzleyici dahil) firmasına yazabiliyordu.
--
-- Bu migration ile roller veritabanı düzeyinde ayrışır:
--   YAZABİLEN roller : super_admin, admin, tmgd, assistant
--   SALT OKUNUR roller: viewer, company
--
-- Kurallar:
--   * super_admin  → tüm firmalarda okuma + yazma
--   * admin/tmgd/assistant → yalnızca ATANDIĞI firmalarda okuma + yazma
--   * viewer/company → yalnızca ATANDIĞI firmalarda okuma; yazma YOK
--   * Firma silme → yalnızca super_admin
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- (schema.sql → 002 → 003'ten SONRA çalıştırılmalı. Idempotent.)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Yardımcı fonksiyon: kullanıcının yazma yetkisi var mı?
-- ---------------------------------------------------------------------
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
          and is_active = true
          and role in ('super_admin','admin','tmgd','assistant')
    );
$$;


-- ---------------------------------------------------------------------
-- 2) Firma-bağlı tablolar: INSERT/UPDATE/DELETE artık yazabilir() ister
--    (SELECT politikaları değişmez: onaylı + atanmış herkes okur.)
-- ---------------------------------------------------------------------
do $$
declare
    t text;
    tbls text[] := array['vehicles','drivers','employees','visits','tasks','documents','files'];
begin
    foreach t in array tbls loop
        -- INSERT
        execute format('drop policy if exists %I_insert on public.%I', t, t);
        execute format($f$
            create policy %1$I_insert on public.%1$I for insert with check (
                public.is_super_admin()
                or (public.yazabilir() and exists (
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
                or (public.yazabilir() and exists (
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
                or (public.yazabilir() and exists (
                    select 1 from public.user_firms uf
                    where uf.firm_id = %1$I.firm_id and uf.user_id = auth.uid()
                ))
            )
        $f$, t);
    end loop;
end $$;

-- documents/files tablolarında RLS'in açık olduğundan emin ol
alter table public.documents enable row level security;
alter table public.files enable row level security;


-- ---------------------------------------------------------------------
-- 3) FIRMS: yazma yetkisi kuralları
-- ---------------------------------------------------------------------
-- Yeni firma: yazabilen roller ekleyebilir (trigger ekleyeni otomatik atar)
drop policy if exists firms_insert on public.firms;
create policy firms_insert on public.firms for insert with check (
    public.yazabilir()
);

-- Firma güncelleme: super_admin tümü; yazabilen roller atandığı firmayı
drop policy if exists firms_update on public.firms;
create policy firms_update on public.firms for update using (
    public.is_super_admin()
    or (public.yazabilir() and exists (
        select 1 from public.user_firms uf
        where uf.firm_id = firms.id and uf.user_id = auth.uid()
    ))
);

-- Firma silme: yalnızca super_admin (bağlı tüm kayıtlar cascade silinir)
drop policy if exists firms_delete on public.firms;
create policy firms_delete on public.firms for delete using (
    public.is_super_admin()
);
