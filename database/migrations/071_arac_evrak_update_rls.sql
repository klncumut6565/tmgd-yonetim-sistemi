-- ============================================================================
-- Migration 071: firm_arac_evrak_dosyalari — eksik UPDATE RLS politikası
-- ----------------------------------------------------------------------------
-- SORUN: 050_arac_evrak_dosyalari_multi.sql, bu tabloya SELECT/INSERT/DELETE
-- politikaları eklemişti ama UPDATE politikasını UNUTMUŞTU. Row Level
-- Security AÇIK bir tabloda, bir komut (burada UPDATE) için HİÇ politika
-- yoksa Postgres o komutu VARSAYILAN OLARAK REDDEDER — ama bir WHERE ile eşen
-- satır olmadığı için Supabase/PostgREST bunu HATA olarak döndürmez, sadece
-- 0 satır güncellenmiş olarak (sessizce) "başarılı" döner.
--
-- SOMUT ETKİSİ: "Araç Evrakı Oluştur" ekranında bir belgenin Geçerlilik
-- Tarihi'ni girip kaydettiğinde, arayüz hata göstermiyordu (çünkü gerçek bir
-- hata yoktu) ama satır veritabanında GÜNCELLENMEMİŞTİ. Sayfa yenilenince
-- eski (boş) değer tekrar çekiliyor, kullanıcıya "tarih siliniyor" gibi
-- görünüyordu.
--
-- ÇÖZÜM: SELECT/INSERT/DELETE'te kullanılan AYNI erişim mantığıyla eksik
-- UPDATE politikası eklenir.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN. Idempotent.
-- ============================================================================

DROP POLICY IF EXISTS firm_arac_evrak_dosyalari_update ON public.firm_arac_evrak_dosyalari;
CREATE POLICY firm_arac_evrak_dosyalari_update ON public.firm_arac_evrak_dosyalari FOR UPDATE USING (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_arac_evrak_dosyalari.firm_id AND uf.user_id = auth.uid()
    ))
) WITH CHECK (
    public.is_admin()
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firm_arac_evrak_dosyalari.firm_id AND uf.user_id = auth.uid()
    ))
);

-- ----------------------------------------------------------------------------
-- DOĞRULAMA — tablodaki tüm politikaları listeler (update de dahil görünmeli).
-- ----------------------------------------------------------------------------
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'firm_arac_evrak_dosyalari'
order by cmd;

-- ============================================================================
-- SON
-- ============================================================================
