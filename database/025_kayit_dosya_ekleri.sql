-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 025
-- =====================================================================
-- Araç, sürücü ve personel kayıtlarına dosya eklenebilmesi için genel
-- amaçlı ek (attachment) tablosu. Örnek kullanım:
--   • araç  → ADR/Taşıt Uygunluk Belgesi, muayene raporu, ruhsat
--   • sürücü → SRC5 sertifikası, ehliyet, sağlık raporu
--   • personel → eğitim katılım belgesi, görev tanımı
--
-- Belge Takip'teki firm_belge_dosyalari tablosuyla AYNI desende kurulur;
-- fark, belirli bir katalog maddesine değil, herhangi bir tablodaki
-- herhangi bir kayda bağlanmasıdır (tablo_adi + kayit_id).
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN (idempotent)
-- =====================================================================

create table if not exists public.kayit_dosyalari (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    tablo_adi text not null,        -- 'vehicles' | 'drivers' | 'employees' | 'visits'
    kayit_id uuid not null,         -- ilgili kaydın id'si
    file_path text not null,        -- firm-files bucket yolu
    file_name text not null,        -- orijinal dosya adı (ekranda göstermek için)
    uploaded_by uuid references public.profiles(id),
    uploaded_at timestamptz default now()
);

create index if not exists idx_kayit_dosyalari_kayit
    on public.kayit_dosyalari(tablo_adi, kayit_id);

create index if not exists idx_kayit_dosyalari_firm
    on public.kayit_dosyalari(firm_id);

alter table public.kayit_dosyalari enable row level security;

-- Görme: admin herkesi, diğerleri yalnızca kendine atanmış firmaları
drop policy if exists kayit_dosyalari_select on public.kayit_dosyalari;
create policy kayit_dosyalari_select on public.kayit_dosyalari
for select using (
    public.is_admin()
    or public.is_assigned(kayit_dosyalari.firm_id)
);

-- Ekleme: yazma yetkisi olan ve o firmaya atanmış kullanıcılar
drop policy if exists kayit_dosyalari_insert on public.kayit_dosyalari;
create policy kayit_dosyalari_insert on public.kayit_dosyalari
for insert with check (
    public.is_admin()
    or (public.yazabilir() and exists (
        select 1 from public.user_firms uf
        where uf.firm_id = kayit_dosyalari.firm_id
          and uf.user_id = auth.uid()
    ))
);

-- Silme: aynı koşullar
drop policy if exists kayit_dosyalari_delete on public.kayit_dosyalari;
create policy kayit_dosyalari_delete on public.kayit_dosyalari
for delete using (
    public.is_admin()
    or (public.yazabilir() and exists (
        select 1 from public.user_firms uf
        where uf.firm_id = kayit_dosyalari.firm_id
          and uf.user_id = auth.uid()
    ))
);

-- PostgREST şema önbelleğini tazele
notify pgrst, 'reload schema';
