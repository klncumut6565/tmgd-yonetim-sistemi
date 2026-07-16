-- 022_firma_tmgd_guvenli_erisim.sql
-- ---------------------------------------------------------------------
-- DÜZELTME: 021_profiles_ad_gorunurlugu.sql HATALIYDI ve GERİ ALINIYOR.
--
-- 021'de yapılan hata: "giriş yapmış herkes diğer aktif personelin
-- profilini görebilir" kuralı eklenmişti. Bu RLS satır-bazlı olduğu için
-- SADECE full_name değil, o sorguda seçilen HER SÜTUN (email, telefon vb.)
-- herkese açık hale gelmişti. Ayrıca bu, "Firma Bilgileri" ekranında bir
-- TMGD'nin başka TMGD'lere/super_admin'e firma ataması yapabilmesi gibi
-- yetki aşımına da zemin hazırladı.
--
-- DOĞRU ÇÖZÜM: Firma ataması zaten Yönetim → Firma Atamaları sekmesinde
-- (yalnızca super_admin/admin, public.user_firms tablosu üzerinden)
-- yapılıyor. "Belge Oluştur" ekranının HAZIRLAYAN alanı için gereken tek
-- şey, bir firmaya atanmış TMGD'nin ADINI, o firmaya erişimi olan
-- kullanıcıların görebilmesidir — profillerin tamamını değil.
--
-- Bunu, hiçbir tabloyu/RLS'i genişletmeden, yalnızca tek bir isim
-- döndüren ve çağıranın o firmaya erişimi olup olmadığını kendisi
-- kontrol eden bir SECURITY DEFINER fonksiyonla sağlıyoruz.
-- ---------------------------------------------------------------------

-- 1) profiles_select politikasını 021 öncesi haline geri al
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
    id = auth.uid()                                   -- herkes kendini görür
    or public.is_super_admin()                        -- super_admin hepsini görür
    or (public.is_admin() and role != 'super_admin')  -- admin: super_admin hariç hepsini görür
);

-- 2) Güvenli isim getirme fonksiyonu: yalnızca çağıranın erişimi olan bir
--    firmanın atanmış TMGD'sinin adını döndürür, başka hiçbir alan sızmaz.
create or replace function public.get_firm_tmgd_name(p_firm_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_erisim boolean;
  v_isim text;
begin
  select (
    public.is_admin()
    or exists (
      select 1 from public.user_firms uf
      where uf.firm_id = p_firm_id and uf.user_id = auth.uid()
    )
  ) into v_erisim;

  if not v_erisim then
    return null;
  end if;

  select p.full_name into v_isim
  from public.user_firms uf
  join public.profiles p on p.id = uf.user_id
  where uf.firm_id = p_firm_id
    and p.role = 'tmgd'
    and p.is_active = true
  order by (uf.permission = 'owner') desc, uf.created_at asc
  limit 1;

  return v_isim;
end;
$$;

grant execute on function public.get_firm_tmgd_name(uuid) to authenticated;

-- 3) Artık kullanılmayan firms.tmgd_assigned kolonunu tutmaya gerek yok
--    (yanlış/yetkisiz bir mekanizmaydı) — veri kaybı olmaması için
--    kolonu SİLMİYORUZ, sadece uygulama artık onu okumuyor/yazmıyor.
--    İstersen ileride "drop column tmgd_assigned" ile temizlenebilir.
