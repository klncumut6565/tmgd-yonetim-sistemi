-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — TEK PARÇA VERİTABANI ŞEMASI
-- =====================================================================
-- Bu dosya, orijinal sohbette 001_database_core.sql'den 074.
-- teslimata kadar dağılmış olan TÜM "create table" / "create policy" /
-- "create function" parçalarının tek çatı altında, doğru kurulum
-- sırasına göre birleştirilmiş halidir.
--
-- Kaynak: anaproje.txt (TESLİMAT 001-074 arası)
-- Bu sürüm: tek dosya, idempotent (tekrar çalıştırılabilir: "if not
-- exists" / "create or replace" kullanılır), tutarlı "public." şema
-- öneki eklenmiştir.
--
-- KULLANIM (Supabase):
--   1) Supabase Dashboard → SQL Editor → New Query
--   2) Bu dosyanın tamamını yapıştır → RUN
--   3) Table Editor'da tabloların oluştuğunu kontrol et
--
-- NOT: En alttaki "BÖLÜM 19 — ÖRNEK VERİ (SEED)" isteğe bağlıdır,
-- sadece geliştirme/test ortamında çalıştırın.
-- =====================================================================


-- =====================================================================
-- BÖLÜM 0 — EXTENSIONS & ORTAK FONKSİYONLAR
-- =====================================================================

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


-- =====================================================================
-- BÖLÜM 1 — ÇEKİRDEK (kaynak: 001_database_core.sql)
-- =====================================================================

-- PROFILES ------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    email text,
    phone text,
    role text not null default 'tmgd'
        check (role in ('super_admin','admin','tmgd','assistant','viewer','company')),
    avatar_url text,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- FIRMS -----------------------------------------------------------------
create table if not exists public.firms (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    tax_number varchar(20),
    mersis_number varchar(25),
    city text,
    district text,
    address text,
    phone text,
    email text,
    website text,
    logo_url text,
    notes text,
    status text default 'active'
        check (status in ('active','passive','archived')),
    created_by uuid references public.profiles(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

drop trigger if exists trg_firms_updated_at on public.firms;
create trigger trg_firms_updated_at
before update on public.firms
for each row execute function public.set_updated_at();

-- USER_FIRMS ------------------------------------------------------------
create table if not exists public.user_firms (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    firm_id uuid not null references public.firms(id) on delete cascade,
    permission text default 'editor'
        check (permission in ('owner','editor','viewer')),
    created_at timestamptz default now(),
    unique(user_id, firm_id)
);

-- SETTINGS ----------------------------------------------------------------
create table if not exists public.settings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    theme text default 'light',
    language text default 'tr',
    timezone text default 'Europe/Istanbul',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(user_id)
);

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

-- ACTIVITY LOGS -----------------------------------------------------------
create table if not exists public.activity_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete set null,
    firm_id uuid references public.firms(id) on delete set null,
    action text not null,
    entity_type text,
    entity_id uuid,
    details jsonb,
    created_at timestamptz default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_firms_name on public.firms(name);
create index if not exists idx_user_firms_user on public.user_firms(user_id);
create index if not exists idx_user_firms_firm on public.user_firms(firm_id);
create index if not exists idx_activity_logs_user on public.activity_logs(user_id);
create index if not exists idx_activity_logs_firm on public.activity_logs(firm_id);
create index if not exists idx_activity_logs_created on public.activity_logs(created_at desc);


-- =====================================================================
-- BÖLÜM 2 — BELGE YÖNETİMİ (kaynak: 002_documents.sql)
-- =====================================================================

create table if not exists public.document_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    sort_order integer default 0,
    is_active boolean default true,
    created_at timestamptz default now()
);

create table if not exists public.document_types (
    id uuid primary key default gen_random_uuid(),
    category_id uuid references public.document_categories(id) on delete set null,
    code varchar(20) not null unique,
    name text not null,
    description text,
    is_required boolean default true,
    is_active boolean default true,
    created_at timestamptz default now()
);

create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    document_type_id uuid not null references public.document_types(id) on delete restrict,
    title text not null,
    description text,
    status text default 'draft'
        check (status in ('draft','active','review','archived')),
    current_version integer default 1,
    created_by uuid references public.profiles(id) on delete set null,
    updated_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create table if not exists public.document_versions (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    version_number integer not null,
    content jsonb,
    notes text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now(),
    unique(document_id, version_number)
);

create index if not exists idx_documents_firm on public.documents(firm_id);
create index if not exists idx_documents_type on public.documents(document_type_id);
create index if not exists idx_document_versions_document on public.document_versions(document_id);


-- =====================================================================
-- BÖLÜM 3 — GÖREV YÖNETİMİ (kaynak: 003_tasks.sql)
-- =====================================================================

create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    assigned_to uuid references public.profiles(id) on delete set null,
    created_by uuid references public.profiles(id) on delete set null,
    title text not null,
    description text,
    priority text default 'medium'
        check (priority in ('low','medium','high','critical')),
    status text default 'todo'
        check (status in ('todo','in_progress','review','completed','cancelled')),
    start_date date,
    due_date date,
    completed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create table if not exists public.task_comments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete set null,
    comment text not null,
    created_at timestamptz default now()
);

create table if not exists public.task_history (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete set null,
    old_status text,
    new_status text,
    note text,
    created_at timestamptz default now()
);

create table if not exists public.task_attachments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    uploaded_by uuid references public.profiles(id) on delete set null,
    file_name text not null,
    storage_path text not null,
    file_size bigint,
    mime_type text,
    created_at timestamptz default now()
);

create index if not exists idx_tasks_firm on public.tasks(firm_id);
create index if not exists idx_tasks_assigned on public.tasks(assigned_to);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_task_comments_task on public.task_comments(task_id);
create index if not exists idx_task_history_task on public.task_history(task_id);


-- =====================================================================
-- BÖLÜM 4 — FİRMA OPERASYONLARI (kaynak: 004_company.sql)
-- =====================================================================

create table if not exists public.vehicles (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    plate_number varchar(20) not null,
    brand text,
    model text,
    model_year integer,
    vehicle_type text,
    adr_certificate_no text,
    adr_valid_until date,
    inspection_date date,
    inspection_valid_until date,
    notes text,
    status text default 'active'
        check (status in ('active','inactive','sold')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

create table if not exists public.drivers (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    first_name text not null,
    last_name text not null,
    national_id varchar(20),
    phone text,
    email text,
    adr_certificate_no text,
    adr_valid_until date,
    driving_license_class text,
    notes text,
    status text default 'active'
        check (status in ('active','inactive')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

drop trigger if exists trg_drivers_updated_at on public.drivers;
create trigger trg_drivers_updated_at
before update on public.drivers
for each row execute function public.set_updated_at();

create table if not exists public.employees (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    first_name text not null,
    last_name text not null,
    department text,
    position text,
    phone text,
    email text,
    notes text,
    status text default 'active'
        check (status in ('active','inactive')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create table if not exists public.visits (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    visitor_id uuid references public.profiles(id) on delete set null,
    visit_date date not null,
    visit_start timestamptz,
    visit_end timestamptz,
    visit_type text,
    summary text,
    next_visit_date date,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

drop trigger if exists trg_visits_updated_at on public.visits;
create trigger trg_visits_updated_at
before update on public.visits
for each row execute function public.set_updated_at();

create table if not exists public.visit_notes (
    id uuid primary key default gen_random_uuid(),
    visit_id uuid not null references public.visits(id) on delete cascade,
    created_by uuid references public.profiles(id) on delete set null,
    note text not null,
    created_at timestamptz default now()
);

create index if not exists idx_vehicles_firm on public.vehicles(firm_id);
create index if not exists idx_vehicles_plate on public.vehicles(plate_number);
create index if not exists idx_drivers_firm on public.drivers(firm_id);
create index if not exists idx_drivers_adr on public.drivers(adr_valid_until);
create index if not exists idx_employees_firm on public.employees(firm_id);
create index if not exists idx_visits_firm on public.visits(firm_id);
create index if not exists idx_visits_date on public.visits(visit_date);
create index if not exists idx_visit_notes_visit on public.visit_notes(visit_id);


-- =====================================================================
-- BÖLÜM 5 — DOSYA/DEPOLAMA (kaynak: 005_storage.sql)
-- =====================================================================

create table if not exists public.folders (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    parent_folder_id uuid references public.folders(id) on delete cascade,
    name text not null,
    description text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now()
);

create table if not exists public.files (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    folder_id uuid references public.folders(id) on delete set null,
    document_id uuid references public.documents(id) on delete set null,
    uploaded_by uuid references public.profiles(id) on delete set null,
    file_name text not null,
    original_name text not null,
    storage_path text not null,
    file_extension varchar(20),
    mime_type text,
    file_size bigint,
    version_no integer default 1,
    description text,
    is_latest boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

drop trigger if exists trg_files_updated_at on public.files;
create trigger trg_files_updated_at
before update on public.files
for each row execute function public.set_updated_at();

create table if not exists public.file_versions (
    id uuid primary key default gen_random_uuid(),
    file_id uuid not null references public.files(id) on delete cascade,
    version_no integer not null,
    storage_path text not null,
    file_size bigint,
    uploaded_by uuid references public.profiles(id) on delete set null,
    notes text,
    created_at timestamptz default now(),
    unique(file_id, version_no)
);

create table if not exists public.file_tags (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    created_at timestamptz default now()
);

create table if not exists public.file_tag_relations (
    id uuid primary key default gen_random_uuid(),
    file_id uuid not null references public.files(id) on delete cascade,
    tag_id uuid not null references public.file_tags(id) on delete cascade,
    unique(file_id, tag_id)
);

create index if not exists idx_files_firm on public.files(firm_id);
create index if not exists idx_files_folder on public.files(folder_id);
create index if not exists idx_files_document on public.files(document_id);
create index if not exists idx_files_latest on public.files(is_latest);
create index if not exists idx_file_versions_file on public.file_versions(file_id);
create index if not exists idx_folders_firm on public.folders(firm_id);


-- =====================================================================
-- BÖLÜM 6 — BİLDİRİMLER (kaynak: 006_notifications.sql)
-- =====================================================================

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    firm_id uuid references public.firms(id) on delete cascade,
    title text not null,
    message text not null,
    notification_type text default 'system'
        check (notification_type in ('system','task','document','visit','reminder','warning')),
    is_read boolean default false,
    created_at timestamptz default now()
);

create table if not exists public.reminders (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    assigned_user_id uuid references public.profiles(id) on delete set null,
    title text not null,
    description text,
    reminder_date date not null,
    priority text default 'medium'
        check (priority in ('low','medium','high','critical')),
    is_completed boolean default false,
    completed_at timestamptz,
    created_at timestamptz default now()
);

create table if not exists public.user_alerts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    alert_type text not null,
    title text not null,
    description text,
    severity text default 'info'
        check (severity in ('info','warning','danger','success')),
    is_dismissed boolean default false,
    created_at timestamptz default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(is_read);
create index if not exists idx_reminders_date on public.reminders(reminder_date);
create index if not exists idx_reminders_user on public.reminders(assigned_user_id);
create index if not exists idx_user_alerts_user on public.user_alerts(user_id);


-- =====================================================================
-- BÖLÜM 7 — TAKVİM & ADR TRANSPORT PRO KÖPRÜSÜ (T-029, T-030)
-- =====================================================================

create table if not exists public.calendar_events (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    title text not null,
    start_date timestamptz,
    end_date timestamptz,
    created_at timestamptz default now()
);

create table if not exists public.adr_reports (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    report_date date,
    report_type text,
    report_file uuid,
    created_at timestamptz default now()
);


-- =====================================================================
-- BÖLÜM 8 — EĞİTİM / OLAY / UYGUNSUZLUK / RİSK (T-031 .. T-037)
-- =====================================================================

create table if not exists public.trainings (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    title text not null,
    training_type text,
    trainer_name text,
    training_date date,
    valid_until date,
    notes text,
    created_at timestamptz default now()
);

create table if not exists public.training_attendees (
    id uuid primary key default gen_random_uuid(),
    training_id uuid references public.trainings(id) on delete cascade,
    employee_id uuid references public.employees(id) on delete cascade,
    attended boolean default true,
    certificate_no text,
    created_at timestamptz default now()
);

create table if not exists public.incidents (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    incident_date timestamptz,
    incident_type text,           -- Sızıntı, Yangın, Dökülme, Kaza, Ramak Kala, Uygunsuzluk
    location text,
    description text,
    root_cause text,
    corrective_action text,
    status text default 'open',
    created_at timestamptz default now()
);

create table if not exists public.nonconformities (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    title text,
    description text,
    severity text,
    status text default 'open',
    detected_date date,
    due_date date,
    created_at timestamptz default now()
);

create table if not exists public.corrective_actions (
    id uuid primary key default gen_random_uuid(),
    nonconformity_id uuid references public.nonconformities(id) on delete cascade,
    assigned_to uuid references public.profiles(id) on delete set null,
    action_description text,
    due_date date,
    completed boolean default false,
    completed_at timestamptz
);

create table if not exists public.risk_assessments (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    hazard text,
    probability integer,
    severity integer,
    risk_score integer,           -- önerilen hesap: probability * severity
    mitigation text,
    created_at timestamptz default now()
);

create table if not exists public.annual_reports (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    report_year integer,
    report_status text,
    report_file_id uuid references public.files(id) on delete set null,
    prepared_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now()
);

create table if not exists public.signatures (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete set null,
    signed_entity_type text,
    signed_entity_id uuid,
    signed_at timestamptz default now(),
    ip_address text
);


-- =====================================================================
-- BÖLÜM 9 — BİLDİRİM KUYRUKLARI (T-038, T-039)
-- =====================================================================

create table if not exists public.email_queue (
    id uuid primary key default gen_random_uuid(),
    recipient_email text,
    subject text,
    body text,
    status text default 'pending',
    created_at timestamptz default now()
);

create table if not exists public.whatsapp_queue (
    id uuid primary key default gen_random_uuid(),
    phone text,
    message text,
    status text default 'pending',
    created_at timestamptz default now()
);


-- =====================================================================
-- BÖLÜM 10 — ADR VERİ MOTORU (T-041 .. T-050)
-- =====================================================================

-- NOT: adr_substances (T-041), sohbette daha sonra adr_un_numbers
-- (T-043) ile genişletilmiş/üretim-amaçlı hale getirilmiştir.
-- İkisi de korunuyor; gerçek uygulamada adr_un_numbers'ı birincil
-- kaynak olarak kullanmanız önerilir.
create table if not exists public.adr_substances (
    id uuid primary key default gen_random_uuid(),
    un_number text,
    proper_shipping_name text,
    adr_class text,
    packing_group text,
    tunnel_code text,
    created_at timestamptz default now()
);

create table if not exists public.adr_projects (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    project_name text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now()
);

create table if not exists public.adr_calculations (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.adr_projects(id) on delete cascade,
    calculation_json jsonb,
    result_json jsonb,
    created_at timestamptz default now()
);

create table if not exists public.adr_un_numbers (
    id uuid primary key default gen_random_uuid(),
    un_number varchar(10) not null unique,
    proper_shipping_name text not null,
    class text,
    classification_code text,
    packing_group text,
    tunnel_code text,
    hazard_no text,
    labels text,
    transport_category text,
    limited_quantity text,
    excepted_quantity text,
    created_at timestamptz default now()
);

create table if not exists public.adr_synonyms (
    id uuid primary key default gen_random_uuid(),
    adr_un_id uuid references public.adr_un_numbers(id) on delete cascade,
    synonym_name text not null
);

create table if not exists public.safety_data_sheets (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    adr_un_id uuid references public.adr_un_numbers(id) on delete set null,
    manufacturer text,
    revision_no text,
    revision_date date,
    file_id uuid references public.files(id) on delete set null,
    created_at timestamptz default now()
);

create table if not exists public.written_instructions (
    id uuid primary key default gen_random_uuid(),
    adr_class text,
    language_code text,
    file_id uuid references public.files(id) on delete set null,
    created_at timestamptz default now()
);

create table if not exists public.orange_plates (
    id uuid primary key default gen_random_uuid(),
    adr_un_id uuid references public.adr_un_numbers(id) on delete cascade,
    hazard_no text,
    un_number text,
    created_at timestamptz default now()
);

create table if not exists public.adr_certificates (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid references public.employees(id) on delete cascade,
    certificate_type text,
    certificate_no text,
    issue_date date,
    expiry_date date,
    file_id uuid references public.files(id) on delete set null
);

create table if not exists public.exemption_calculations (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    calculation_date timestamptz,
    total_points numeric,
    exemption_applied boolean,
    calculation_json jsonb
);

create table if not exists public.segregation_rules (
    id uuid primary key default gen_random_uuid(),
    class_a text,
    class_b text,
    rule_code text,
    description text
);


-- =====================================================================
-- BÖLÜM 11 — DENETİM (T-051 .. T-054)
-- =====================================================================

create table if not exists public.inspections (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    inspection_date date,
    inspector_id uuid references public.profiles(id) on delete set null,
    score numeric,
    result text,
    notes text
);

create table if not exists public.inspection_questions (
    id uuid primary key default gen_random_uuid(),
    question_code text,
    question_text text,
    category text
);

create table if not exists public.inspection_answers (
    id uuid primary key default gen_random_uuid(),
    inspection_id uuid references public.inspections(id) on delete cascade,
    question_id uuid references public.inspection_questions(id) on delete cascade,
    answer text,
    score numeric,
    notes text
);

create table if not exists public.annual_statistics (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    report_year integer,
    shipment_count integer,
    incident_count integer,
    training_count integer,
    inspection_count integer
);


-- =====================================================================
-- BÖLÜM 12 — AI / SİSTEM ALTYAPISI (T-055 .. T-059)
-- =====================================================================

create table if not exists public.ai_conversations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete set null,
    question text,
    answer text,
    created_at timestamptz default now()
);

create table if not exists public.system_settings (
    id uuid primary key default gen_random_uuid(),
    setting_key text unique,
    setting_value text,
    updated_at timestamptz default now()
);

create table if not exists public.licenses (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    license_type text,
    start_date date,
    end_date date,
    max_users integer,
    is_active boolean default true
);

create table if not exists public.api_keys (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    api_key text,
    is_active boolean default true,
    created_at timestamptz default now()
);

create table if not exists public.system_logs (
    id uuid primary key default gen_random_uuid(),
    log_level text,
    source_module text,
    message text,
    payload jsonb,
    created_at timestamptz default now()
);


-- =====================================================================
-- BÖLÜM 13 — YETKİ MATRİSİ (RBAC) & FİRMA KULLANICILARI (T-061 .. T-064)
-- =====================================================================

create table if not exists public.permissions (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,        -- örn: "firm.create", "task.update"
    name text not null,
    module text not null
);

create table if not exists public.role_permissions (
    id uuid primary key default gen_random_uuid(),
    role_name text not null,
    permission_id uuid references public.permissions(id) on delete cascade,
    unique(role_name, permission_id)
);

create table if not exists public.company_users (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    title text,
    is_primary boolean default false,
    created_at timestamptz default now()
);

create table if not exists public.folder_templates (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    sort_order integer default 0
);

-- Firma oluşunca şablon klasörleri otomatik oluşturulur
create or replace function public.create_default_folders()
returns trigger
language plpgsql
as $$
begin
    insert into public.folders (firm_id, name)
    select new.id, name
    from public.folder_templates;

    return new;
end;
$$;

drop trigger if exists trg_create_folders on public.firms;
create trigger trg_create_folders
after insert on public.firms
for each row execute function public.create_default_folders();


-- =====================================================================
-- BÖLÜM 14 — DASHBOARD (T-065, T-066)
-- =====================================================================

create table if not exists public.dashboard_kpis (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid,
    active_tasks integer,
    overdue_tasks integer,
    expiring_documents integer,
    expiring_adr_certificates integer,
    updated_at timestamptz
);

create table if not exists public.dashboard_charts (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid,
    chart_type text,
    chart_data jsonb,
    created_at timestamptz default now()
);


-- =====================================================================
-- BÖLÜM 15 — ADR TRANSPORT PRO ENTEGRASYONU (T-068 .. T-074)
-- =====================================================================

create table if not exists public.visit_reports (
    id uuid primary key default gen_random_uuid(),
    visit_id uuid references public.visits(id) on delete cascade,
    report_no text,
    report_date date,
    report_content jsonb,
    pdf_file_id uuid references public.files(id) on delete set null
);

create table if not exists public.generated_instructions (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid,
    adr_class text,
    language_code text,
    generated_pdf uuid,
    created_at timestamptz default now()
);

create table if not exists public.sync_jobs (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid references public.firms(id) on delete cascade,
    job_type text,
    source_system text,
    target_system text,
    status text,
    payload jsonb,
    result jsonb,
    started_at timestamptz,
    finished_at timestamptz
);

create table if not exists public.sync_queue (
    id uuid primary key default gen_random_uuid(),
    entity_type text,
    entity_id uuid,
    operation text,
    payload jsonb,
    processed boolean default false,
    created_at timestamptz default now()
);

create table if not exists public.transport_documents (
    id uuid primary key default gen_random_uuid(),
    firm_id uuid,
    document_no text,
    transport_date date,
    consignor text,
    consignee text,
    carrier text,
    created_at timestamptz default now()
);

create table if not exists public.transport_document_items (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references public.transport_documents(id) on delete cascade,
    un_number text,
    proper_shipping_name text,
    adr_class text,
    packing_group text,
    quantity numeric
);

create table if not exists public.generated_plates (
    id uuid primary key default gen_random_uuid(),
    transport_document_id uuid,
    hazard_no text,
    un_number text,
    pdf_file_id uuid
);


-- =====================================================================
-- BÖLÜM 16 — ROW LEVEL SECURITY (kaynak: 007_rls.sql, "KRİTİK TESLİMAT")
-- =====================================================================
-- ⚠️ ÖNEMLİ: Orijinal sohbette bu sadece bir İLK SÜRÜM olarak işaretlenmiş
-- ve SADECE SELECT politikaları verilmişti:
--      SELECT ✔   INSERT ❌   UPDATE ❌   DELETE ❌
-- Bu dosyada `firms` ve `tasks` için INSERT/UPDATE/DELETE politikaları
-- AYRICA eklendi (aşağıda "EK POLİTİKALAR" başlığı altında, neden
-- eklendiği açıklanıyor). documents, files, vehicles, drivers, employees,
-- visits, notifications için hâlâ sadece SELECT var — bu tablolara yazan
-- bir ekran eklerseniz önce o tablo için de INSERT/UPDATE/DELETE
-- politikası yazmanız gerekir.
-- =====================================================================

alter table public.firms enable row level security;
alter table public.documents enable row level security;
alter table public.tasks enable row level security;
alter table public.files enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.employees enable row level security;
alter table public.visits enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'super_admin'
    );
$$;

drop policy if exists firms_select on public.firms;
create policy firms_select on public.firms for select using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf where uf.firm_id = firms.id and uf.user_id = auth.uid())
);

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf where uf.firm_id = documents.firm_id and uf.user_id = auth.uid())
);

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf where uf.firm_id = tasks.firm_id and uf.user_id = auth.uid())
);

drop policy if exists files_select on public.files;
create policy files_select on public.files for select using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf where uf.firm_id = files.firm_id and uf.user_id = auth.uid())
);

drop policy if exists vehicles_select on public.vehicles;
create policy vehicles_select on public.vehicles for select using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf where uf.firm_id = vehicles.firm_id and uf.user_id = auth.uid())
);

drop policy if exists drivers_select on public.drivers;
create policy drivers_select on public.drivers for select using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf where uf.firm_id = drivers.firm_id and uf.user_id = auth.uid())
);

drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees for select using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf where uf.firm_id = employees.firm_id and uf.user_id = auth.uid())
);

drop policy if exists visits_select on public.visits;
create policy visits_select on public.visits for select using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf where uf.firm_id = visits.firm_id and uf.user_id = auth.uid())
);

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (
    user_id = auth.uid() or public.is_super_admin()
);

-- ---------------------------------------------------------------------
-- EK POLİTİKALAR (kaynakta YOKTU, burada eklendi)
-- ---------------------------------------------------------------------
-- Orijinal 007_rls.sql sadece SELECT ile geldi ve "INSERT/UPDATE/DELETE
-- henüz eksik" diye açıkça not edilmişti. Ancak bu projede ürettiğimiz
-- "Yeni Firma" (firms/page.tsx) ve "Görev Oluştur" (tasks/page.tsx)
-- formaları gerçekten INSERT çağrısı yapıyor — RLS açık ama INSERT
-- politikası olmadan bu çağrılar "new row violates row-level security
-- policy" hatasıyla başarısız olurdu. Bu yüzden sadece bu iki tablo için
-- INSERT/UPDATE/DELETE ekledik. Diğer tablolar (documents, files, vehicles
-- vb.) için yazma politikaları hâlâ tanımlı DEĞİL — bkz. ROADMAP.md.

-- FIRMS: oluşturma yetkisi role bağlı (yeni firma henüz user_firms'ta
-- olmadığı için SELECT'teki gibi "üyelik" kontrolü burada işe yaramaz).
drop policy if exists firms_insert on public.firms;
create policy firms_insert on public.firms for insert with check (
    public.is_super_admin()
    or exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role in ('super_admin','admin','tmgd')
    )
);

drop policy if exists firms_update on public.firms;
create policy firms_update on public.firms for update using (
    public.is_super_admin()
    or exists (
        select 1 from public.user_firms uf
        where uf.firm_id = firms.id
        and uf.user_id = auth.uid()
        and uf.permission in ('owner','editor')
    )
);

drop policy if exists firms_delete on public.firms;
create policy firms_delete on public.firms for delete using (
    public.is_super_admin()
);

-- TASKS: SELECT'teki "firma üyesi mi" kontrolüyle aynı mantık.
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
);

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete using (
    public.is_super_admin()
    or exists (
        select 1 from public.user_firms uf
        where uf.firm_id = tasks.firm_id
        and uf.user_id = auth.uid()
        and uf.permission in ('owner','editor')
    )
);

-- ---------------------------------------------------------------------
-- EK POLİTİKALAR 2 — vehicles / drivers / employees / visits
-- ---------------------------------------------------------------------
-- Bu dört tablo için arayüzde tam CRUD ekranları yazıldı (Araçlar,
-- Sürücüler, Personeller, Ziyaretler). Bu yüzden SELECT'in yanı sıra
-- INSERT/UPDATE/DELETE politikaları da gerekiyor. Hepsi aynı mantıkta:
-- kullanıcı, kaydın ait olduğu firmanın üyesi olmalı (user_firms).
-- Silme için editör/owner yetkisi aranır.

-- Bu dört tablodaki SELECT politikaları BÖLÜM 16'da zaten tanımlı.

-- VEHICLES
drop policy if exists vehicles_insert on public.vehicles;
create policy vehicles_insert on public.vehicles for insert with check (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = vehicles.firm_id and uf.user_id = auth.uid())
);
drop policy if exists vehicles_update on public.vehicles;
create policy vehicles_update on public.vehicles for update using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = vehicles.firm_id and uf.user_id = auth.uid())
);
drop policy if exists vehicles_delete on public.vehicles;
create policy vehicles_delete on public.vehicles for delete using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = vehicles.firm_id and uf.user_id = auth.uid()
        and uf.permission in ('owner','editor'))
);

-- DRIVERS
drop policy if exists drivers_insert on public.drivers;
create policy drivers_insert on public.drivers for insert with check (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = drivers.firm_id and uf.user_id = auth.uid())
);
drop policy if exists drivers_update on public.drivers;
create policy drivers_update on public.drivers for update using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = drivers.firm_id and uf.user_id = auth.uid())
);
drop policy if exists drivers_delete on public.drivers;
create policy drivers_delete on public.drivers for delete using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = drivers.firm_id and uf.user_id = auth.uid()
        and uf.permission in ('owner','editor'))
);

-- EMPLOYEES
drop policy if exists employees_insert on public.employees;
create policy employees_insert on public.employees for insert with check (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = employees.firm_id and uf.user_id = auth.uid())
);
drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees for update using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = employees.firm_id and uf.user_id = auth.uid())
);
drop policy if exists employees_delete on public.employees;
create policy employees_delete on public.employees for delete using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = employees.firm_id and uf.user_id = auth.uid()
        and uf.permission in ('owner','editor'))
);

-- VISITS
drop policy if exists visits_insert on public.visits;
create policy visits_insert on public.visits for insert with check (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = visits.firm_id and uf.user_id = auth.uid())
);
drop policy if exists visits_update on public.visits;
create policy visits_update on public.visits for update using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = visits.firm_id and uf.user_id = auth.uid())
);
drop policy if exists visits_delete on public.visits;
create policy visits_delete on public.visits for delete using (
    public.is_super_admin()
    or exists (select 1 from public.user_firms uf
        where uf.firm_id = visits.firm_id and uf.user_id = auth.uid()
        and uf.permission in ('owner','editor'))
);


-- =====================================================================
-- BÖLÜM 17 — FONKSİYONLAR, TRIGGER'LAR & VIEW'LAR (kaynak: 008_functions.sql)
-- =====================================================================

create or replace function public.log_activity(
    p_user_id uuid,
    p_firm_id uuid,
    p_action text,
    p_entity_type text,
    p_entity_id uuid
)
returns void
language plpgsql
as $$
begin
    insert into public.activity_logs (user_id, firm_id, action, entity_type, entity_id)
    values (p_user_id, p_firm_id, p_action, p_entity_type, p_entity_id);
end;
$$;

create or replace function public.task_status_history()
returns trigger
language plpgsql
as $$
begin
    if old.status is distinct from new.status then
        insert into public.task_history (task_id, user_id, old_status, new_status, note)
        values (new.id, new.assigned_to, old.status, new.status, 'Status değiştirildi');
    end if;
    return new;
end;
$$;

drop trigger if exists trg_task_status_history on public.tasks;
create trigger trg_task_status_history
after update on public.tasks
for each row execute function public.task_status_history();

create or replace view public.dashboard_statistics as
select
    (select count(*) from public.firms) as total_firms,
    (select count(*) from public.tasks where status <> 'completed') as open_tasks,
    (select count(*) from public.documents) as total_documents,
    (select count(*) from public.vehicles) as total_vehicles;

create or replace view public.adr_expiring_drivers as
select d.id, d.first_name, d.last_name, d.adr_valid_until, f.name as firm_name
from public.drivers d
join public.firms f on f.id = d.firm_id
where d.adr_valid_until <= current_date + interval '30 days';

create or replace view public.adr_expiring_vehicles as
select v.id, v.plate_number, v.adr_valid_until, f.name as firm_name
from public.vehicles v
join public.firms f on f.id = v.firm_id
where v.adr_valid_until <= current_date + interval '30 days';


-- =====================================================================
-- BÖLÜM 18 — SOHBETTE "İLERİDE EKLEYECEĞİM" DENİLEN PLANLI ALANLAR
-- =====================================================================
-- Bunlar orijinal metinde gelecek teslimatlar için not edilmiş ama
-- hiçbir "create table" bloğuna işlenmemiş alanlardı. Burada ayrı,
-- işaretli bir bölümde topluyoruz ki neyin "asıl tasarım", neyin
-- "not edilen plan" olduğu net olsun.
-- =====================================================================

-- Firma Portalı için (004/005 notları):
alter table public.firms add column if not exists portal_enabled boolean default true;
alter table public.firms add column if not exists portal_contact_email text;
alter table public.firms add column if not exists portal_contact_name text;
alter table public.firms add column if not exists portal_user_id uuid;

-- ADR Transport Pro entegrasyonu için (005 notu):
alter table public.firms add column if not exists adr_activity_type text;
alter table public.firms add column if not exists adr_company_type text;
alter table public.firms add column if not exists annual_tonnage numeric;
alter table public.firms add column if not exists risk_level text;
alter table public.firms add column if not exists tmgd_assigned uuid references public.profiles(id);

-- Firma Portalı kullanıcı tipi için (TESLİMAT 024 notu):
alter table public.profiles add column if not exists company_user boolean default false;

-- NOT: TESLİMAT 082'de geçen "firm_health_score" view'ı kaynak metinde
-- tamamlanmamış (yarım) bir SQL parçası olarak verildi ("select firm_id,
-- score from ..."). Çalışır bir SQL olmadığı için buraya eklenmedi;
-- puanlama mantığı ROADMAP.md içinde not edildi.


-- =====================================================================
-- BÖLÜM 19 — ÖRNEK VERİ / SEED (kaynak: 009_seed.sql) — İSTEĞE BAĞLI
-- =====================================================================
-- ⚠️ Gerçek kullanıcı UUID'leri Supabase Auth tarafından üretilir;
-- burada sadece örnek firma/tip/etiket verisi oluşturulur.
-- Üretim ortamında bu bölümü ÇALIŞTIRMAYIN.
--
-- DÜZELTME NOTU: Orijinal metinde firms.id için gen_random_uuid()
-- kullanılıp sonunda "on conflict do nothing" denmişti — ID her
-- çalıştırmada yeniden rastgele üretildiği için bu hiçbir zaman
-- çakışmaz ve script ikinci kez çalıştırıldığında firmalar ÇİFTLENİRDİ.
-- Burada sabit (deterministik) UUID'ler kullanılarak gerçekten
-- idempotent hale getirildi. Aynı sorun document_categories için de
-- vardı (unique constraint yoktu) — yukarıda tabloya unique eklendi.
-- =====================================================================

-- Firma oluşunca trg_create_folders tetiklenip buradan klasör kopyalayacağı
-- için folder_templates, örnek firmalardan ÖNCE doldurulmalı.
insert into public.folder_templates (name, sort_order)
values
    ('ADR', 1),
    ('MSDS', 2),
    ('Eğitim', 3),
    ('Araç Belgeleri', 4),
    ('Sürücü Belgeleri', 5),
    ('Faaliyet Raporları', 6),
    ('Denetimler', 7)
on conflict (name) do nothing;

insert into public.firms (id, name, city, district, status)
values
    ('a0000000-0000-4000-8000-000000000001', 'ABC Kimya Sanayi A.Ş.', 'İstanbul', 'Tuzla', 'active'),
    ('a0000000-0000-4000-8000-000000000002', 'XYZ Petrol Lojistik Ltd.', 'Kocaeli', 'Gebze', 'active'),
    ('a0000000-0000-4000-8000-000000000003', 'DEF Endüstriyel Gazlar', 'Bursa', 'Nilüfer', 'active')
on conflict (id) do nothing;

insert into public.document_categories (name, sort_order)
values
    ('Prosedürler', 1),
    ('Talimatlar', 2),
    ('Formlar', 3),
    ('Raporlar', 4),
    ('Kontrol Belgeleri', 5)
on conflict (name) do nothing;

insert into public.document_types (code, name, is_required)
values
    ('P1', 'Tehlikeli Madde Güvenlik Politikası', true),
    ('P2', 'TMGD Görev Tanımı', true),
    ('P3', 'Yıllık Faaliyet Raporu', true),
    ('P4', 'Kaza Prosedürü', true),
    ('K1', 'Saha Kontrol Formu', true),
    ('K2', 'Araç Kontrol Formu', true),
    ('K3', 'Personel Eğitim Formu', true)
on conflict (code) do nothing;

insert into public.file_tags (name)
values ('ADR'), ('TMGD'), ('Eğitim'), ('Araç'), ('Sürücü'), ('Denetim')
on conflict (name) do nothing;

-- =====================================================================
-- ŞEMA SONU
-- =====================================================================
