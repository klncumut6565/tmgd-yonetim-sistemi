-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 007
-- =====================================================================
-- Supabase Storage: firm-files bucket kurulumu + erişim politikaları
-- Belge türleri genişletildi (ADR'ye özel türler eklendi)
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- (schema.sql → 002 → 003 → 004 → 005 → 006'dan SONRA. Idempotent.)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) firm-files Storage bucket
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'firm-files',
    'firm-files',
    false,                          -- herkese açık değil, signed URL gerekir
    52428800,                       -- 50 MB limit
    array[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg',
        'image/jpg'
    ]
)
on conflict (id) do update set
    file_size_limit   = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;


-- ---------------------------------------------------------------------
-- 2) Storage politikaları — firm-files bucket
-- ---------------------------------------------------------------------

-- Yükleme: yazma yetkisi olan kullanıcılar (is_admin veya yazabilir())
drop policy if exists "firm-files yükleme" on storage.objects;
create policy "firm-files yükleme"
on storage.objects for insert
with check (
    bucket_id = 'firm-files'
    and (public.is_admin() or public.yazabilir())
);

-- İndirme: atanmış firmaya ait dosyayı okuyabilir
-- Dosya yolu: {firm_id}/{document_id}/{dosya}
drop policy if exists "firm-files indirme" on storage.objects;
create policy "firm-files indirme"
on storage.objects for select
using (
    bucket_id = 'firm-files'
    and (
        public.is_admin()
        or public.is_assigned(
            -- path'in ilk segmenti firm_id
            (string_to_array(name, '/'))[1]::uuid
        )
    )
);

-- Silme: sadece admin
drop policy if exists "firm-files silme" on storage.objects;
create policy "firm-files silme"
on storage.objects for delete
using (
    bucket_id = 'firm-files'
    and public.is_admin()
);


-- ---------------------------------------------------------------------
-- 3) Belge türleri genişlet (ADR'ye özel)
-- ---------------------------------------------------------------------
insert into public.document_categories (name, sort_order)
values
    ('ADR Belgeleri', 6),
    ('Araç Belgeleri', 7),
    ('Eğitim Belgeleri', 8)
on conflict (name) do nothing;

insert into public.document_types (code, name, is_required)
values
    ('ADR1', 'ADR Uygunluk Belgesi',             true),
    ('ADR2', 'Taşımacı TMGD Atama Belgesi',       true),
    ('ADR3', 'Yıllık TMGD Faaliyet Raporu',       true),
    ('ADR4', 'Kaza / Olay Bildirim Formu',        false),
    ('ADR5', 'Güzergah Risk Analizi',             false),
    ('VH1',  'Araç Muayene Belgesi',              true),
    ('VH2',  'Araç ADR Uygunluk Sertifikası',     true),
    ('VH3',  'Zorunlu Mali Sorumluluk Sigortası', true),
    ('VH4',  'Araç Tescil Belgesi',               true),
    ('TR1',  'Sürücü ADR Eğitim Sertifikası',     true),
    ('TR2',  'Personel Tehlikeli Madde Eğitimi',  true),
    ('TR3',  'İlk Yardım Eğitim Belgesi',         false)
on conflict (code) do nothing;
