-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 014
-- =====================================================================
-- BUG DÜZELTMESİ: public.profiles tablosunda RLS açıktı (002'de) ama
-- hiçbir zaman bir DELETE politikası tanımlanmamıştı — yalnızca select
-- ve update politikaları vardı. Postgres RLS'te bir işlem için politika
-- yoksa o işlem HERKESE (super_admin dahil) kapalıdır. Bu yüzden admin
-- panelindeki "Sil" butonu hiçbir zaman çalışmıyordu.
--
-- Bu migration super_admin'in profil silebilmesini sağlar. Kendi
-- profilini silmesi ayrıca engellenir (yanlışlıkla kendi hesabını
-- silip sistemin dışında kalmasını önlemek için).
--
-- ÖNEMLİ NOT: Bu, yalnızca public.profiles tablosundaki satırı siler.
-- Supabase Auth'taki asıl giriş hesabını (auth.users) SİLMEZ — bu,
-- güvenlik gereği yalnızca Supabase Dashboard → Authentication → Users
-- ekranından veya service_role anahtarıyla yapılabilir; istemci
-- tarafından (tarayıcıdan) hiçbir zaman yapılamaz.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- (schema.sql → ... → 013'ten SONRA. Idempotent.)
-- =====================================================================

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
for delete using (
    public.is_super_admin()
    and id <> auth.uid()   -- kendi profilini silemez
);
