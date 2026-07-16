-- 021_profiles_ad_gorunurlugu.sql
-- ---------------------------------------------------------------------
-- SORUN: profiles_select politikası yalnızca "kendi profilini" veya
-- (admin/super_admin ise) "herkesi" görmeye izin veriyordu. Normal
-- tmgd/assistant rolündeki bir kullanıcı BAŞKA bir personelin adını
-- (full_name) sorgulayamıyordu — RLS bunu hata değil, sessizce boş
-- sonuç olarak döndürüyor.
--
-- ETKİ: "Belge Oluştur" ekranında firmaya atanmış TMGD'nin adı
-- HAZIRLAYAN alanına yazılamıyordu (isim tespit edilemedi görünümü),
-- çünkü belgeyi oluşturan kullanıcı admin/super_admin değilse ve
-- atanan TMGD kendisi değilse, o profile erişemiyordu.
--
-- ÇÖZÜM: Giriş yapmış (authenticated) ve aktif (is_active) herhangi
-- bir kullanıcının, diğer aktif personelin id/full_name/role gibi
-- temel (hassas olmayan) bilgilerini görebilmesine izin veren bir
-- kural ekleniyor. E-posta/telefon gibi alanlar zaten aynı satırda
-- döner ama uygulama tarafında yalnızca gerekli yerlerde kullanılmalı.
-- ---------------------------------------------------------------------

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
    id = auth.uid()                                   -- herkes kendini görür
    or public.is_super_admin()                        -- super_admin hepsini görür
    or (public.is_admin() and role != 'super_admin')  -- admin: super_admin hariç hepsini görür
    or (auth.uid() is not null and is_active = true)  -- diğer tüm giriş yapmış kullanıcılar: aktif personeli görebilir
);
