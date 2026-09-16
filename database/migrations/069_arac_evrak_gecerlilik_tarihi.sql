-- ============================================================================
-- Migration 069: Araç Evrakı dosyalarına geçerlilik tarihi
-- ----------------------------------------------------------------------------
-- AMAÇ: "Araç Evrakı Oluştur" ekranından yüklenen belgelerin (taşıt kartı,
-- araç muayenesi, sigorta, SRC-5, atık taşıma uygunluk belgesi ...) çoğu
-- SÜRELİdir. Şimdiye kadar bu dosyalar için geçerlilik tarihi tutulmuyordu;
-- dolayısıyla süresi yaklaşan araç evrakı ne gösterge panelinde ne de
-- bildirim zilinde görünüyordu.
--
-- YAPILAN:
--   1) firm_arac_evrak_dosyalari tablosuna gecerlilik_tarihi (DATE) eklenir.
--   2) expiring_documents view'ı — tüm geçerlilik uyarılarının okunduğu tek
--      kaynak — bu dosyaları da kapsayacak şekilde genişletilir. Böylece
--      NotificationBell, gösterge paneli ve workflow kuralları HİÇBİR kod
--      değişikliği olmadan bu uyarıları da almaya başlar.
--
-- Başlık biçimi: "Araç Evrakı: <Belge adı> — <Plaka>"
-- Araca özel olmayan (firma ortak: TMFB, K1) belgelerde plaka eki olmaz.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN. Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Geçerlilik tarihi sütunu
-- ----------------------------------------------------------------------------
ALTER TABLE public.firm_arac_evrak_dosyalari
  ADD COLUMN IF NOT EXISTS gecerlilik_tarihi DATE;

COMMENT ON COLUMN public.firm_arac_evrak_dosyalari.gecerlilik_tarihi IS
  'Belgenin son geçerlilik tarihi. NULL = süresiz / takip edilmiyor. Dolu ise expiring_documents üzerinden uyarı üretilir.';

-- Uyarı sorguları tarih üzerinden çalıştığı için kısmi indeks
CREATE INDEX IF NOT EXISTS idx_arac_evrak_dosyalari_gecerlilik
  ON public.firm_arac_evrak_dosyalari(gecerlilik_tarihi)
  WHERE gecerlilik_tarihi IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2) expiring_documents view'ı — araç evrakı dalı eklenir
--    (migration 067'deki iki dal aynen korunur)
-- ----------------------------------------------------------------------------
create or replace view public.expiring_documents
with (security_invoker = true) as
select
    d.id,
    d.title,
    d.expiry_date,
    d.firm_id,
    f.name as firm_name,
    (d.expiry_date - current_date) as days_left
from public.documents d
join public.firms f on f.id = d.firm_id
where d.expiry_date is not null
  and d.status != 'archived'

union all

select
    fb.id,
    'Belge Takip: ' || coalesce(
        case fb.code
            when 'AS1' then 'K1/K2 Taşıma Yetki Belgesi'
            when 'AS2' then 'Taşıt Kartı'
            when 'AS3' then 'Araç Muayenesi'
            when 'AS4' then 'Araç Ruhsatı'
            when 'AS5' then 'Araç Sigorta/Kasko veya Tehlikeli Madde Mali Sorumluluk Sigortası'
            when 'AS6' then 'Karayolu ile Atık Taşıma Uygunluk Belgesi'
            when 'AS7' then 'SRC-5 Belgeli Şoför Sertifikası'
            when 'G1'  then 'Tehlikeli Madde Faaliyet Belgesi (TMFB)'
            when 'G2'  then 'Tehlikeli Madde Faaliyet Tespit Raporu (Ek-3)'
            when 'G3'  then 'Görevli Personel Listesi'
            when 'S1'  then 'TMGD Hizmet Sözleşmesi'
            when 'S2'  then 'TMGD Sertifikası'
            when 'S3'  then 'U-Net Yetkilendirme Kaydı'
            when 'E1'  then 'ADR 1.3 Genel Bilinçlendirme Eğitimi Kayıtları'
            when 'E2'  then 'Göreve Özgü ve Emniyet Eğitimi Kayıtları'
            when 'D1'  then 'Emniyet Planı / Değerlendirme Kaydı'
            when 'D2'  then 'Güvenlik Bilgi Formları (GBF/SDS) Dosyası'
            when 'D3'  then 'Kaza / Olay Bildirim Raporları'
            when 'D4'  then 'Diğer'
            else null
        end,
        fb.code
    ) as title,
    fb.valid_until as expiry_date,
    fb.firm_id,
    f.name as firm_name,
    (fb.valid_until - current_date) as days_left
from public.firm_belgeleri fb
join public.firms f on f.id = fb.firm_id
where fb.valid_until is not null

union all

-- YENİ DAL: Araç Evrakı Oluştur ekranından yüklenen dosyalar.
-- Belge türü anahtarları src/components/AracEvraklari.tsx içindeki
-- ARAC_BELGE_SLOTLARI ile aynıdır; yeni tür eklenirse buraya da eklenmelidir.
select
    ae.id,
    'Araç Evrakı: ' || coalesce(
        case ae.belge_turu
            when 'tmfb'             then 'Tehlikeli Madde Faaliyet Belgesi (TMFB)'
            when 'k1'               then 'K1 Taşıma Yetki Belgesi'
            when 'tasit_karti'      then 'Taşıt Kartı'
            when 'arac_muayene'     then 'Araç Muayenesi'
            when 'arac_ruhsat'      then 'Araç Ruhsatı'
            when 'sigorta_kasko'    then 'Araç Sigorta / Kasko / TMMS'
            when 'src5_belgesi'     then 'SRC-5 Belgeli Şoför Sertifikası'
            when 'tasima_evraklari' then 'Atık Taşıma Uygunluk / ADR Uygunluk Belgesi'
            else null
        end,
        ae.belge_turu   -- eşleşme yoksa ham anahtar
    )
    -- Araca özel belgede plaka eklenir; firma ortak belgesinde (vehicle_id
    -- NULL) plaka yoktur, o yüzden ek de basılmaz.
    || coalesce(' — ' || v.plate_number, '') as title,
    ae.gecerlilik_tarihi as expiry_date,
    ae.firm_id,
    f.name as firm_name,
    (ae.gecerlilik_tarihi - current_date) as days_left
from public.firm_arac_evrak_dosyalari ae
join public.firms f on f.id = ae.firm_id
left join public.vehicles v on v.id = ae.vehicle_id
where ae.gecerlilik_tarihi is not null

order by expiry_date;

-- ----------------------------------------------------------------------------
-- DOĞRULAMA — geçerlilik tarihi girilmiş araç evraklarını listeler.
-- ----------------------------------------------------------------------------
select title, firm_name, expiry_date, days_left
from public.expiring_documents
where title like 'Araç Evrakı:%'
order by days_left
limit 20;

-- ============================================================================
-- SON
-- ============================================================================
