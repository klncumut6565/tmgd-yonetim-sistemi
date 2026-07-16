-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 011
-- =====================================================================
-- Belge Takip maddelerine BİRDEN FAZLA dosya eklenebilmesi için ayrı
-- bir ek (attachment) tablosu. Önceki tasarımda firm_belgeleri.file_path
-- tek dosyayla sınırlıydı (örn. GBF/SDS gibi çok dosyalı maddeler için
-- yetersizdi). Bu tablo maddeye sınırsız sayıda dosya eklenmesini sağlar.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- (010'dan SONRA. Idempotent.)
-- =====================================================================

create table if not exists public.firm_belge_dosyalari (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    code text not null,
    period text not null default '',
    file_path text not null,        -- firm-files bucket yolu
    file_name text not null,        -- orijinal dosya adı (ekranda göstermek için)
    uploaded_by uuid references public.profiles(id),
    uploaded_at timestamptz default now()
);

create index if not exists idx_firm_belge_dosyalari_item
    on public.firm_belge_dosyalari(firm_id, code, period);

alter table public.firm_belge_dosyalari enable row level security;

drop policy if exists firm_belge_dosyalari_select on public.firm_belge_dosyalari;
create policy firm_belge_dosyalari_select on public.firm_belge_dosyalari
for select using (
    public.is_admin()
    or public.is_assigned(firm_belge_dosyalari.firm_id)
);

drop policy if exists firm_belge_dosyalari_insert on public.firm_belge_dosyalari;
create policy firm_belge_dosyalari_insert on public.firm_belge_dosyalari
for insert with check (
    public.is_admin()
    or (public.yazabilir() and exists (
        select 1 from public.user_firms uf
        where uf.firm_id = firm_belge_dosyalari.firm_id
          and uf.user_id = auth.uid()
    ))
);

drop policy if exists firm_belge_dosyalari_delete on public.firm_belge_dosyalari;
create policy firm_belge_dosyalari_delete on public.firm_belge_dosyalari
for delete using (
    public.is_admin()
    or (public.yazabilir() and exists (
        select 1 from public.user_firms uf
        where uf.firm_id = firm_belge_dosyalari.firm_id
          and uf.user_id = auth.uid()
    ))
);
