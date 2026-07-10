-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 010
-- =====================================================================
-- 1) firms tablosuna faaliyet konuları + sözleşme başlangıç tarihi
-- 2) firm_belgeleri: firma bazlı belge/görev takip tablosu
--    (Belge Takip sekmesi + Belge Oluştur sayfası bunu kullanır)
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- (schema.sql → 002 → ... → 009'dan SONRA. Idempotent.)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) firms: faaliyet konuları + sözleşme tarihi
-- ---------------------------------------------------------------------
-- activities: metin dizisi. Geçerli değerler (uygulama tarafı doğrular):
--   alici, bosaltan, yukleyen, tasimaci, dolduran,
--   paketleyen, gonderen, tank_isletmecisi
alter table public.firms
    add column if not exists activities text[] not null default '{}';

-- contract_start: sözleşme / başlangıç tarihi (null = yıl başından)
alter table public.firms
    add column if not exists contract_start date;


-- ---------------------------------------------------------------------
-- 2) firm_belgeleri — firma bazlı belge/görev takibi
-- ---------------------------------------------------------------------
-- code   : katalog kodu (P1, T5, K3, L1, SA2, ZR, YFR, G1, S2, E1, D3 ...)
-- period : dönemli kayıtlar için (aylık ziyaret raporu: '2026-03').
--          Dönemsiz kayıtlarda boş string '' (unique kısıtı için).
-- done   : tamamlandı mı
create table if not exists public.firm_belgeleri (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    code text not null,
    period text not null default '',
    done boolean not null default false,
    note text,
    file_path text,                 -- firm-files bucket yolu (opsiyonel)
    created_by uuid references public.profiles(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (firm_id, code, period)
);

drop trigger if exists trg_firm_belgeleri_updated_at on public.firm_belgeleri;
create trigger trg_firm_belgeleri_updated_at
before update on public.firm_belgeleri
for each row execute function public.set_updated_at();

create index if not exists idx_firm_belgeleri_firm
    on public.firm_belgeleri(firm_id);


-- ---------------------------------------------------------------------
-- 3) RLS — mevcut desenle aynı:
--    SELECT: admin ya da firmaya atanmış herkes
--    INSERT/UPDATE/DELETE: admin ya da (yazabilir + firmaya atanmış)
-- ---------------------------------------------------------------------
alter table public.firm_belgeleri enable row level security;

drop policy if exists firm_belgeleri_select on public.firm_belgeleri;
create policy firm_belgeleri_select on public.firm_belgeleri
for select using (
    public.is_admin()
    or public.is_assigned(firm_belgeleri.firm_id)
);

drop policy if exists firm_belgeleri_insert on public.firm_belgeleri;
create policy firm_belgeleri_insert on public.firm_belgeleri
for insert with check (
    public.is_admin()
    or (public.yazabilir() and exists (
        select 1 from public.user_firms uf
        where uf.firm_id = firm_belgeleri.firm_id
          and uf.user_id = auth.uid()
    ))
);

drop policy if exists firm_belgeleri_update on public.firm_belgeleri;
create policy firm_belgeleri_update on public.firm_belgeleri
for update using (
    public.is_admin()
    or (public.yazabilir() and exists (
        select 1 from public.user_firms uf
        where uf.firm_id = firm_belgeleri.firm_id
          and uf.user_id = auth.uid()
    ))
);

drop policy if exists firm_belgeleri_delete on public.firm_belgeleri;
create policy firm_belgeleri_delete on public.firm_belgeleri
for delete using (
    public.is_admin()
    or (public.yazabilir() and exists (
        select 1 from public.user_firms uf
        where uf.firm_id = firm_belgeleri.firm_id
          and uf.user_id = auth.uid()
    ))
);
