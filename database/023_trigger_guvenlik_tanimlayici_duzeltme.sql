-- 023_trigger_guvenlik_tanimlayici_duzeltme.sql
-- ---------------------------------------------------------------------
-- KESİN KÖK SEBEP BULUNDU: "Görevler" sayfasında bir görevi tamamlarken
-- alınan "Bu işlem için yetkin yok" hatası, tasks tablosunun RLS
-- politikasından KAYNAKLANMIYORDU (teşhis: is_super_admin()=true,
-- is_admin()=true, profil.role=super_admin, onay=approved — hepsi doğru).
--
-- Gerçek sebep: tasks tablosunda "status değişince task_history'e kayıt
-- düş" diyen bir TRIGGER var (task_status_history()). Bu fonksiyon
-- SECURITY DEFINER OLARAK TANIMLI DEĞİLDİ — yani trigger, UPDATE'i yapan
-- kullanıcının kendi (temel tablo) yetkileriyle çalışıyordu. task_history
-- tablosu için hiçbir yerde açık bir GRANT ifadesi yoktu; bu yüzden
-- trigger'ın task_history'e INSERT yapma girişimi "permission denied"
-- ile başarısız oluyor, PostgREST bunu genel bir yetki hatası olarak
-- dışarı veriyor ve UPDATE'in TAMAMI (tasks güncellemesi dahil) geri
-- alınıyordu — süper admin olsa bile.
--
-- Aynı zafiyet deseni (SECURITY DEFINER olmayan, başka bir tabloya INSERT
-- yapan yardımcı/trigger fonksiyonu) create_default_folders() ve
-- log_activity() içinde de var; onlar da önleyici olarak düzeltiliyor.
--
-- Idempotent — güvenle tekrar çalıştırılabilir.
-- ---------------------------------------------------------------------

create or replace function public.task_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if old.status is distinct from new.status then
        insert into public.task_history (task_id, user_id, old_status, new_status, note)
        values (new.id, new.assigned_to, old.status, new.status, 'Status değiştirildi');
    end if;
    return new;
end;
$$;

create or replace function public.create_default_folders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.folders (firm_id, name)
    select new.id, name
    from public.folder_templates;

    return new;
end;
$$;

create or replace function public.log_activity(
    p_user_id uuid,
    p_firm_id uuid,
    p_action text,
    p_entity_type text,
    p_entity_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.activity_logs (user_id, firm_id, action, entity_type, entity_id)
    values (p_user_id, p_firm_id, p_action, p_entity_type, p_entity_id);
end;
$$;

-- Ek güvenlik önlemi (kemer + askı): SECURITY DEFINER'a rağmen temel
-- tablo yetkisi tamamen eksikse yine sorun çıkabilir — bu tabloların
-- authenticated rolüne açık şekilde yazma izni olduğundan emin ol.
grant select, insert on public.task_history to authenticated;
grant select, insert on public.folders to authenticated;
grant select, insert on public.activity_logs to authenticated;
