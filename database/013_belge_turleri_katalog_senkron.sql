-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 013
-- =====================================================================
-- "Belge Türü *" seçim kutusu (sol menü → Belgeler → Yeni Belge) boş
-- görünüyordu çünkü document_types tablosu ya hiç doldurulmamıştı ya da
-- schema.sql'deki eski/örnek 7 satırlık seed (P1-P4, K1-K3 — GERÇEK ADR
-- katalogla ADI/İÇERİĞİ ÖRTÜŞMEYEN placeholder veriler) "Üretim ortamında
-- ÇALIŞTIRMAYIN" uyarılı demo bölümünün içindeydi.
--
-- Bu migration, document_types'ı sistemde asıl kullanılan tek kaynak olan
-- src/lib/belgeKatalogu.ts'teki 44 gerçek ADR belge koduyla (P1-P8, T1-T20,
-- K1-K9, L1-L4, SA1-SA3) doldurur/düzeltir. Kod çakışması olan eski
-- placeholder satırlar (örn. eski "P1 = Tehlikeli Madde Güvenlik Politikası")
-- SİLİNMEZ, sadece adı doğru/güncel metinle değiştirilir (on conflict do
-- update) — böylece o koda referans veren mevcut "documents" kayıtları
-- bozulmaz.
--
-- Ayrıca migration 007'de eklenen, gerçek katalogla hiç örtüşmeyen 12
-- placeholder tür (ADR1-5, VH1-4, TR1-3) pasif hale getirilir (is_active
-- = false) — "Yeni Belge" listesinde artık görünmezler ama onlara referans
-- veren eski kayıtlar bozulmaz, dilenirse elle tekrar aktif edilebilir.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- (schema.sql → ... → 012'den SONRA. Idempotent, tekrar çalıştırılabilir.)
-- =====================================================================

insert into public.document_types (code, name, is_required)
values
    ('P1', 'Yük Kabul Prosedürü (Alıcı)', true),
    ('P2', 'Boşaltma Öncesi / Sırası / Sonrası Önlemler Prosedürü', true),
    ('P3', 'Sevkiyat Uygunluk Kontrol Prosedürü (Taşıt · Ambalaj · Etiket · Karışık Yükleme)', true),
    ('P4', 'Tehlikeli Madde Tanımlama ve Sınıflandırma Prosedürü', true),
    ('P5', 'Yükleme Öncesi / Sırası / Sonrası Önlemler Prosedürü', true),
    ('P6', 'Paketleme (ADR 4.1) Prosedürü', true),
    ('P7', 'Dolum Öncesi / Sırası / Sonrası Önlemler Prosedürü', true),
    ('P8', 'Taşıma Öncesi / Sırası / Sonrası Önlemler Prosedürü', true),
    ('T1', 'Boşaltma Sırasında Alınacak Önlemler Talimatı (Alıcı)', true),
    ('T2', 'Boşaltma Sonrası Arındırma · Vana/Kapak Kapatma Kontrol Talimatı', true),
    ('T3', 'Taşıt / Konteyner Temizlik ve Dezenfeksiyon Talimatı', true),
    ('T4', 'Boşaltma Öncesi Tahribat / Hasar Kontrol Talimatı', true),
    ('T5', 'Sevkiyat Uygunluk Talimatı (Taşıt · Basınçlı Kap · Etiket · Karışık Yükleme)', true),
    ('T6', 'Karışık Yükleme Yasakları ve Ayırım Kuralları Talimatı', true),
    ('T7', 'Konteyner Etiket / Levha ve Turuncu Plaka Kontrol Talimatı', true),
    ('T8', 'Hasarlı / Sızdıran Ambalaj Yüklenmesi ve Yükleme Emniyeti (ADR 7.5) Talimatı', true),
    ('T9', 'Basınçlı Ekipman Periyodik Test / Muayene Takip Talimatı', true),
    ('T10', 'Muayenesi Geçmiş Ekipman Bertaraf Talimatı', true),
    ('T11', 'Karışık Paketleme Kuralları Talimatı', true),
    ('T12', 'Ambalaj İşaretleme ve Etiketleme Uygunluk Talimatı', true),
    ('T13', 'YTB Muayene Kontrolü ve Uygun Tanka Dolum Talimatı', true),
    ('T14', 'Dolum Öncesi Etiket / Levha ve Turuncu Plaka Talimatı', true),
    ('T15', 'Bölmeli Tank Dolumu ve Azami Doldurma Derecesi Talimatı', true),
    ('T16', 'Dolum Sonrası Sızdırmazlık ve Bulaşma Kontrol Talimatı', true),
    ('T17', 'Dökme Dolum (ADR 7.3) ve Taşımacı TMFB Kontrol Talimatı', true),
    ('T18', 'Taşıt Etiket / Levha / Plaka ve Sızıntı-Hasar Kontrol Talimatı', true),
    ('T19', 'Taşıtta Teçhizat Bulundurma Talimatı (ADR 8.1.4 / 8.1.5)', true),
    ('T20', 'Karışık Yükleme · İhlal Durumu · Boş YTB Taşıma Evrakı Talimatı', true),
    ('K1', 'Teslim Alınan Konteyner Kontrol Formu (Alıcı)', true),
    ('K2', 'Boşaltma Sonrası Arındırma / Kapatma Kontrol Formu', true),
    ('K3', 'Sevkiyat Uygunluk Kontrol Formu (Gönderen)', true),
    ('K4', 'Yükleme Kontrol Formu (Ayırım · Etiket · Emniyet)', true),
    ('K5', 'Boş / Temizlenmiş Konteyner Takip Formu', true),
    ('K6', 'Paketleme Kontrol Formu (Basınçlı Ekipman · İşaret/Etiket)', true),
    ('K7', 'Dolum Kontrol Formu (Muayene · Plaka · Sızdırmazlık)', true),
    ('K8', 'Taşıt Teçhizat Kontrol Formu (KKE · Yangın Teçhizatı)', true),
    ('K9', 'Taşıt / Sürücü Belge Kontrol ve Takip Formu', true),
    ('L1', 'Tehlikeli Madde Envanter Listesi', true),
    ('L2', 'Araç / Taşımacı Listesi ve Taşıma Evrakı Kayıtları', true),
    ('L3', 'Sürücü Listesi (Ad · TC · SRC5 · Giriş/Çıkış)', true),
    ('L4', 'Ekipman / Ambalaj Takip Listesi', true),
    ('SA1', 'Sefer Takip Formu', true),
    ('SA2', 'Aktarım Kaydı', true),
    ('SA3', 'ADR Belge Kaydı', true)
on conflict (code) do update set
    name = excluded.name,
    is_required = excluded.is_required,
    is_active = true;

-- Gerçek katalogla örtüşmeyen eski placeholder türleri pasif yap
-- (siliniyor değil — sadece "Yeni Belge" listesinden gizleniyor).
update public.document_types
set is_active = false
where code in (
    'ADR1','ADR2','ADR3','ADR4','ADR5',
    'VH1','VH2','VH3','VH4',
    'TR1','TR2','TR3'
);
