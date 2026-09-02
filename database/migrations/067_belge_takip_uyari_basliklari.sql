-- ============================================================================
-- Migration 067: Belge Takip uyarılarında okunabilir belge adları
-- ----------------------------------------------------------------------------
-- SORUN: expiring_documents view'ı (tüm geçerlilik uyarılarının okunduğu
-- otoriter kaynak — NotificationBell ve workflow kuralları buradan besleniyor)
-- Belge Takip maddelerinin başlığını ham KOD ile üretiyordu:
--     ('Belge Takip: ' || fb.code)   →  "Belge Takip: AS3"
-- Bu, bildirimde kullanıcının hangi belgenin süresinin dolduğunu anlamasını
-- imkânsız kılıyordu. Özellikle yeni eklenen "Araç ve Sürücü Belgeleri"
-- bölümü (AS1-AS7: yetki belgesi, taşıt kartı, muayene, ruhsat, sigorta,
-- atık taşıma uygunluk belgesi, SRC-5) tamamen SÜRELİ belgelerden oluştuğu
-- için bu bölümdeki uyarılar sık görülecek.
--
-- ÇÖZÜM: Kod → okunabilir ad eşleşmesi view'a gömülür. Eşleşme bulunamayan
-- (gelecekte eklenecek) kodlar için eski davranış (kodun kendisi) korunur,
-- böylece view hiçbir zaman boş/yanıltıcı başlık üretmez.
--
-- NOT: Buradaki adlar src/lib/belgeKatalogu.ts → BELGE_LABELS ile aynı
-- olmalıdır. Yeni bir belge kodu eklenirse bu listeye de eklenmelidir.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN. Idempotent.
-- ============================================================================

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
            -- Araç ve Sürücü Belgeleri (yalnızca taşımacı firmalarda)
            when 'AS1' then 'K1/K2 Taşıma Yetki Belgesi'
            when 'AS2' then 'Taşıt Kartı'
            when 'AS3' then 'Araç Muayenesi'
            when 'AS4' then 'Araç Ruhsatı'
            when 'AS5' then 'Araç Sigorta/Kasko veya Tehlikeli Madde Mali Sorumluluk Sigortası'
            when 'AS6' then 'Karayolu ile Atık Taşıma Uygunluk Belgesi'
            when 'AS7' then 'SRC-5 Belgeli Şoför Sertifikası'
            -- TMFB · EK-3 · Görevli Listesi
            when 'G1'  then 'Tehlikeli Madde Faaliyet Belgesi (TMFB)'
            when 'G2'  then 'Tehlikeli Madde Faaliyet Tespit Raporu (Ek-3)'
            when 'G3'  then 'Görevli Personel Listesi'
            -- TMGD Sözleşme · Sertifika · Yetki
            when 'S1'  then 'TMGD Hizmet Sözleşmesi'
            when 'S2'  then 'TMGD Sertifikası'
            when 'S3'  then 'U-Net Yetkilendirme Kaydı'
            -- Eğitimler
            when 'E1'  then 'ADR 1.3 Genel Bilinçlendirme Eğitimi Kayıtları'
            when 'E2'  then 'Göreve Özgü ve Emniyet Eğitimi Kayıtları'
            -- Emniyet Planı · GBF · Diğer
            when 'D1'  then 'Emniyet Planı / Değerlendirme Kaydı'
            when 'D2'  then 'Güvenlik Bilgi Formları (GBF/SDS) Dosyası'
            when 'D3'  then 'Kaza / Olay Bildirim Raporları'
            when 'D4'  then 'Diğer'
            else null
        end,
        fb.code   -- eşleşme yoksa eski davranış: ham kod
    ) as title,
    fb.valid_until as expiry_date,
    fb.firm_id,
    f.name as firm_name,
    (fb.valid_until - current_date) as days_left
from public.firm_belgeleri fb
join public.firms f on f.id = fb.firm_id
where fb.valid_until is not null

order by expiry_date;

-- ----------------------------------------------------------------------------
-- DOĞRULAMA — geçerlilik tarihi girilmiş Belge Takip maddelerini, kalan gün
-- sayısına göre listeler. Başlıkların artık okunabilir olması beklenir.
-- ----------------------------------------------------------------------------
select title, firm_name, expiry_date, days_left
from public.expiring_documents
where title like 'Belge Takip:%'
order by days_left
limit 20;

-- ============================================================================
-- SON
-- ============================================================================
