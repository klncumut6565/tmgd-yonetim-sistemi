-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 027
-- =====================================================================
-- ADR Transport modülü, Aşama 1: firma bazlı KİMYASAL ENVANTER.
--
-- Her firmanın kendi kimyasal envanteri olur; Taşıma Evrakı ekranında
-- ürün araması YALNIZCA o firmanın envanterinden yapılır. Tablo A
-- (adr_un_numbers, 2.939 satır) tüm firmalar için ortak referanstır.
--
-- YETKİ MODELİ (Umut'un kararı):
--   • TMGD/asistan/admin (yazabilir()): tam yönetim (ekle/düzenle/sil).
--   • 'company' rolü (firma kullanıcısı): kendi firmasına YALNIZCA
--     TEKLİ KAYIT EKLEYEBİLİR — şablona bağlı: UN No Tablo A'da
--     bulunmak zorundadır (aşağıdaki trigger doğrular), ADR alanları
--     Tablo A'dan doldurulur. Düzenleme ve silme yapamaz; L1/L2
--     envanter DOSYALARINA (Belge Takip) zaten yazamaz.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN (idempotent)
-- =====================================================================

create table if not exists public.firm_chemicals (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,

    -- Tablo A bağlantısı: UN numarası metin olarak da saklanır (varyant
    -- seçimi PSN üzerinden yapılır; UN 1950 gibi 12 varyantlı numaralar
    -- için adr_un_id kesin kaydı tutar).
    adr_un_id uuid references public.adr_un_numbers(id) on delete set null,
    un_number text not null,
    proper_shipping_name text not null,

    -- Tablo A'dan kopyalanan ADR alanları (evrak üretiminde tek sorguda
    -- kullanılabilsin diye envanterde de tutulur):
    adr_class text,
    classification_code text,
    packing_group text,
    tunnel_code text,
    transport_category text,
    labels text,
    limited_quantity text,
    excepted_quantity text,

    -- Firmaya özgü alanlar:
    trade_name text,          -- ticari ad (firmanın kendi kullandığı isim)
    physical_state text,      -- katı/sıvı/gaz (serbest)
    packaging_info text,      -- tipik ambalaj bilgisi
    annual_amount text,       -- yıllık işlem miktarı (serbest metin)
    notes text,

    created_by uuid references public.profiles(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_firm_chemicals_firm
    on public.firm_chemicals(firm_id);
create index if not exists idx_firm_chemicals_un
    on public.firm_chemicals(firm_id, un_number);

drop trigger if exists trg_firm_chemicals_updated_at on public.firm_chemicals;
create trigger trg_firm_chemicals_updated_at
before update on public.firm_chemicals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- ŞABLON DOĞRULAMA: UN numarası Tablo A'da yoksa kayıt reddedilir.
-- Bu, 'company' kullanıcısının şablon dışına çıkmasını veritabanı
-- seviyesinde engeller (arayüz atlatılsa bile).
-- ---------------------------------------------------------------------
create or replace function public.firm_chemicals_un_dogrula()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if not exists (
        select 1 from public.adr_un_numbers a
        where a.un_number = new.un_number
    ) then
        raise exception
            'UN % Tablo A''da bulunamadı. Envantere yalnızca ADR Tablo A''da kayıtlı maddeler eklenebilir.',
            new.un_number;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_firm_chemicals_un_dogrula on public.firm_chemicals;
create trigger trg_firm_chemicals_un_dogrula
before insert or update on public.firm_chemicals
for each row execute function public.firm_chemicals_un_dogrula();

-- ---------------------------------------------------------------------
-- 'company' rolü yardımcısı: onaylı-aktif bir firma kullanıcısı mı?
-- (yazabilir() bilinçli olarak company'yi DIŞLAR; bu fonksiyon yalnızca
-- envanter ekleme gibi dar izinler için kullanılır.)
-- ---------------------------------------------------------------------
create or replace function public.firma_kullanicisi()
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
          and role = 'company'
    );
$$;

alter table public.firm_chemicals enable row level security;

-- Görme: admin + atanmış kullanıcılar (company dahil; company kullanıcıları
-- da user_firms üzerinden firmalarına atanır)
drop policy if exists firm_chemicals_select on public.firm_chemicals;
create policy firm_chemicals_select on public.firm_chemicals
for select using (
    public.is_admin()
    or public.is_assigned(firm_chemicals.firm_id)
);

-- Ekleme: yazabilir() olan atanmışlar + kendi firmasına 'company' kullanıcısı
drop policy if exists firm_chemicals_insert on public.firm_chemicals;
create policy firm_chemicals_insert on public.firm_chemicals
for insert with check (
    public.is_admin()
    or (
        (public.yazabilir() or public.firma_kullanicisi())
        and exists (
            select 1 from public.user_firms uf
            where uf.firm_id = firm_chemicals.firm_id
              and uf.user_id = auth.uid()
        )
    )
);

-- Düzenleme/Silme: YALNIZCA yazabilir() (TMGD ekibi) — company yapamaz
drop policy if exists firm_chemicals_update on public.firm_chemicals;
create policy firm_chemicals_update on public.firm_chemicals
for update using (
    public.is_admin()
    or (public.yazabilir() and exists (
        select 1 from public.user_firms uf
        where uf.firm_id = firm_chemicals.firm_id
          and uf.user_id = auth.uid()
    ))
);

drop policy if exists firm_chemicals_delete on public.firm_chemicals;
create policy firm_chemicals_delete on public.firm_chemicals
for delete using (
    public.is_admin()
    or (public.yazabilir() and exists (
        select 1 from public.user_firms uf
        where uf.firm_id = firm_chemicals.firm_id
          and uf.user_id = auth.uid()
    ))
);

-- ---------------------------------------------------------------------
-- Taşıma evrakı tablolarını Aşama 3 için genişlet (şu an boş iskeleti
-- vardı; sürücü/araç/motor sonuç alanları eklenir). Kolonlar idempotent.
-- ---------------------------------------------------------------------
alter table public.transport_documents
    add column if not exists driver_id uuid references public.drivers(id) on delete set null,
    add column if not exists vehicle_id uuid references public.vehicles(id) on delete set null,
    add column if not exists status text default 'Taslak',
    add column if not exists total_points numeric,
    add column if not exists orange_plate_required boolean,
    add column if not exists tunnel_restriction_code text,
    add column if not exists exemption_type text,
    add column if not exists notes text,
    add column if not exists created_by uuid references public.profiles(id),
    add column if not exists updated_at timestamptz default now();

alter table public.transport_document_items
    add column if not exists firm_chemical_id uuid references public.firm_chemicals(id) on delete set null,
    add column if not exists tunnel_code text,
    add column if not exists transport_category text,
    add column if not exists packaging_type text,
    add column if not exists packaging_count integer,
    add column if not exists unit text,
    add column if not exists is_lq boolean default false,
    add column if not exists is_eq boolean default false;

-- transport_documents RLS (belge takip ile aynı desen; company salt okur)
alter table public.transport_documents enable row level security;
alter table public.transport_document_items enable row level security;

drop policy if exists transport_documents_select on public.transport_documents;
create policy transport_documents_select on public.transport_documents
for select using (
    public.is_admin() or public.is_assigned(transport_documents.firm_id)
);

drop policy if exists transport_documents_write on public.transport_documents;
create policy transport_documents_write on public.transport_documents
for all using (
    public.is_admin()
    or (public.yazabilir() and exists (
        select 1 from public.user_firms uf
        where uf.firm_id = transport_documents.firm_id
          and uf.user_id = auth.uid()
    ))
);

drop policy if exists transport_document_items_select on public.transport_document_items;
create policy transport_document_items_select on public.transport_document_items
for select using (
    exists (
        select 1 from public.transport_documents td
        where td.id = transport_document_items.document_id
          and (public.is_admin() or public.is_assigned(td.firm_id))
    )
);

drop policy if exists transport_document_items_write on public.transport_document_items;
create policy transport_document_items_write on public.transport_document_items
for all using (
    exists (
        select 1 from public.transport_documents td
        where td.id = transport_document_items.document_id
          and (public.is_admin() or (public.yazabilir() and exists (
              select 1 from public.user_firms uf
              where uf.firm_id = td.firm_id and uf.user_id = auth.uid()
          )))
    )
);

-- PostgREST şema önbelleğini tazele
notify pgrst, 'reload schema';
