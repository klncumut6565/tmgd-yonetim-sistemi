-- ============================================================================
-- Migration 064: Atık Kodu Kütüphanesi (Taşıma Evrakı — Ürün Ekle)
-- ----------------------------------------------------------------------------
-- AMAÇ: Taşıma Evrakı'nda "Ürün Ekle" kısmında atık kodu veya atık adı
-- yazılarak arama/seçim yapılabilmesi. Seçilen atık kodu, PDF'te "Uygun
-- Sevkiyat Adı" hücresinin sonuna "(Atık Kodu: XX XX XX)" olarak eklenir.
--
-- TASARIM KARARI — ÇOK ÖNEMLİ:
-- Bu tabloda ADR Sınıfı, Ambalajlama Grubu, Tünel Kodu, Taşıma Kategorisi
-- veya Uygun Sevkiyat Adı BİLE İNCE SAKLANMAZ. Sadece atık kodu, atık adı
-- (serbest metin, arama/görüntüleme amaçlı), UN numarası ve (varsa)
-- ambalajlama grubu tutulur. Gerçek ADR verileri HER ZAMAN canlı olarak
-- public.adr_un_numbers (Tablo A) tablosundan çekilir. Nedeni:
--   1) Kullanıcının paylaştığı ham listede en az bir KESİN hata tespit
--      edildi (UN 3249'un gerçek ADR adı "İLAÇ, KATI, TOKSİK, B.B.B."dir,
--      "TIBBİ ATIK" değil — o UN 3291'e karşılık gelir). Sevkiyat adını
--      hiç saklamayıp Tablo A'dan çekmek bu tür hataları otomatik olarak
--      by-pass eder.
--   2) UN 3077 / UN 3082 için tünel kodu geçmişte ('E' yerine '-' olması
--      gerektiği, bkz. migration 062/063) ELLE düzeltilmişti. Tünel kodu/
--      taşıma kategorisi burada saklansaydı, gelecekteki benzer ADR
--      düzeltmeleri bu kütüphaneye YANSIMAZDI. Canlı JOIN ile otomatik
--      günceller.
--   3) UN 1133 gibi bazı UN numaraları BİRDEN FAZLA Ambalajlama Grubu
--      varyantına sahiptir (viskozite/parlama noktasına göre I/II/III
--      değişir) — bu yüzden ambalajlama grubu burada saklanır ve Tablo
--      A sorgusunda un_number+packing_group birlikte eşleştirilir.
--
-- UN NUMARASI SEÇİMİ KULLANICI TARAFINDAN VERİLDİĞİ GİBİ KORUNDU — bu bir
-- sınıflandırma kararıdır (hangi atığın hangi ADR girişine karşılık
-- geldiği), TMGD/uzman değerlendirmesi gerektirir; içerik olarak
-- değiştirilmedi, sadece hatalı yardımcı alanlar (sevkiyat adı, tünel
-- kodu, taşıma kategorisi) hiç saklanmayacak şekilde tasarlandı.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.atik_kodlari_katalogu (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atik_kodu     text NOT NULL UNIQUE,      -- örn. "04 02 19*" (Türkiye Atık Yönetimi Yönetmeliği Ek-4 / Avrupa Atık Kataloğu kodu)
  atik_adi      text NOT NULL,             -- örn. "Tekstil kimyasal atığı" — yalnızca arama/görüntüleme amaçlı
  un_number     text NOT NULL,             -- adr_un_numbers.un_number ile eşleştirilir (FK değil — Tablo A'da birden çok satır olabilir)
  packing_group text,                      -- bazı UN'lerde birden fazla AG varyantı olduğundan doğru Tablo A satırını seçmek için
  detay         text,                      -- opsiyonel ek açıklama (kaynak listedeki "Detay" sütunu)
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atik_kodlari_un_number ON public.atik_kodlari_katalogu (un_number);
CREATE INDEX IF NOT EXISTS idx_atik_kodlari_atik_adi ON public.atik_kodlari_katalogu USING gin (to_tsvector('turkish', atik_adi));

ALTER TABLE public.atik_kodlari_katalogu ENABLE ROW LEVEL SECURITY;

-- Herkes (oturum açmış her kullanıcı) arayıp okuyabilir — adr_un_numbers
-- (Tablo A) ile aynı erişim mantığı: referans/kütüphane verisi, firma
-- bazlı değil.
DROP POLICY IF EXISTS atik_kodlari_select ON public.atik_kodlari_katalogu;
CREATE POLICY atik_kodlari_select ON public.atik_kodlari_katalogu
  FOR SELECT
  TO authenticated
  USING (true);

-- Yazma yalnızca service_role (Supabase yönetim paneli / migration) ile
-- yapılır — normal kullanıcılar bu kütüphaneyi değiştiremez, ADR Tablo A
-- gibi merkezi ve doğrulanmış bir kaynak olarak kalır.

COMMENT ON TABLE public.atik_kodlari_katalogu IS
  'Atık kodu → UN numarası eşleştirme kütüphanesi (Taşıma Evrakı "Ürün Ekle" araması için). ADR verileri (sınıf/AG/tünel/kategori/sevkiyat adı) BİLİNÇLİ OLARAK burada tutulmaz; her zaman public.adr_un_numbers''tan canlı çekilir. Zamanla yeni atık kodları eklenebilir.';

-- ----------------------------------------------------------------------------
-- SEED — kullanıcının paylaştığı liste (UN numarası/ambalajlama grubu
-- seçimleri olduğu gibi korunmuştur; sevkiyat adı/tünel kodu/taşıma
-- kategorisi hiç saklanmıyor, yukarıdaki tasarım kararına bakınız).
-- ----------------------------------------------------------------------------
INSERT INTO public.atik_kodlari_katalogu (atik_kodu, atik_adi, un_number, packing_group, detay) VALUES
  ('04 02 19*', 'Tekstil kimyasal atığı', '3077', 'III', NULL),
  ('07 01 03*', 'Organik solvent', '1993', 'II', NULL),
  ('07 05 08*', 'Farmasötik atık', '3249', 'II', NULL),
  ('08 01 11*', 'Atık boya/vernik', '3077', 'III', 'Organik çözücüler ya da diğer tehlikeli maddeler içeren atık boya ve vernikler'),
  ('08 01 17*', 'Boya çamuru', '3175', 'II', NULL),
  ('08 03 17*', 'Atık baskı tonerleri', '3077', 'III', 'Tehlikeli maddeler içeren atık baskı tonerleri'),
  ('08 04 11*', 'Atık yapıştırıcı', '1133', 'II', NULL),
  ('09 01 04*', 'Fotoğrafik atık', '3082', 'III', NULL),
  ('11 01 09*', 'Asidik çözelti', '3264', 'II', NULL),
  ('12 01 09*', 'Halojen içermeyen işleme emülsiyonları ve çözeltileri', '3082', 'III', 'Halojen içermeyen işleme emülsiyon ve solüsyonları'),
  ('13 01 10*', 'Atık hidrolik yağ', '3082', 'III', NULL),
  ('13 01 13*', 'Diğer hidrolik yağlar', '3082', 'III', NULL),
  ('13 02 05*', 'Atık motor yağı', '3082', 'III', NULL),
  ('13 05 07*', 'Yağ/su ayırıcı atığı', '3082', 'III', NULL),
  ('14 06 02*', 'Halojensiz solvent', '1993', 'II', NULL),
  ('14 06 03*', 'Halojenli solvent', '1993', 'II', NULL),
  ('15 01 10*', 'Kirli ambalaj', '3509', NULL, 'Tehlikeli maddelerin kalıntılarını içeren ya da tehlikeli maddelerle kontamine olmuş ambalajlar'),
  ('15 02 02*', 'Kontamine bez', '3077', 'III', NULL),
  ('16 01 07*', 'Yağ filtresi', '3077', 'III', NULL),
  ('16 01 13*', 'Fren sıvısı', '3082', 'III', NULL),
  ('16 02 13*', 'Tehlikeli bileşen içeren ıskarta ekipman', '3077', 'III', '16 02 09''dan 16 02 12''ye kadar olanların dışındaki tehlikeli parçalar içeren ıskarta ekipmanlar'),
  ('16 03 05*', 'Organik atık kimyasallar', '3082', 'III', 'Tehlikeli maddeler içeren organik atıklar'),
  ('16 05 06*', 'Laboratuvar kimyasalları', '2811', 'II', NULL),
  ('16 06 01*', 'Kurşun akü', '2794', NULL, NULL),
  ('16 06 02*', 'Ni-Cd akü', '2795', NULL, NULL),
  ('17 02 04*', 'Tehlikeli ahşap', '3175', 'II', NULL),
  ('17 04 09*', 'Yağlı metal', '3077', 'III', NULL),
  ('18 01 03*', 'Tıbbi atık', '3291', 'II', 'Enfeksiyonu önlemek amacı ile toplanmaları ve bertarafı özel işleme tabi olan atıklar'),
  ('19 08 13*', 'Arıtma çamuru', '3077', 'III', NULL),
  ('19 12 11*', 'Tehlikeli mekanik işlem atığı', '3077', 'III', NULL),
  ('20 01 21*', 'Floresan', '3077', 'III', 'Flüoresan lambalar ve diğer cıva içeren atıklar'),
  ('20 01 26*', 'Tehlikeli yağ ve gres', '3082', 'III', NULL),
  ('20 01 27*', 'Tehlikeli madde içeren boya, mürekkep, yapıştırıcı ve reçineler', '3082', 'III', 'Tehlikeli maddeler içeren boya, mürekkepler, yapıştırıcılar ve reçineler'),
  ('20 01 33*', 'Tehlikeli pil', '3480', NULL, NULL)
ON CONFLICT (atik_kodu) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Taşıma Evrakı kalemlerine atık kodu bilgisi eklenmesi
-- ----------------------------------------------------------------------------
ALTER TABLE public.transport_document_items
  ADD COLUMN IF NOT EXISTS atik_kodu text;

COMMENT ON COLUMN public.transport_document_items.atik_kodu IS
  'Seçilmişse, ürünün Avrupa Atık Kataloğu / Atık Yönetimi Yönetmeliği kodu (örn. "04 02 19*"). PDF''te Uygun Sevkiyat Adı''nın sonuna "(Atık Kodu: ...)" olarak eklenir.';

-- ----------------------------------------------------------------------------
-- DOĞRULAMA — UN numaralarının gerçekten Tablo A'da bulunup bulunmadığını
-- ve (varsa) belirtilen ambalajlama grubuyla eşleşip eşleşmediğini kontrol
-- eder. Boş dönmesi beklenir; bir satır dönerse o UN/AG kombinasyonu
-- Tablo A'da yok demektir — TMGD tarafından ayrıca incelenmelidir.
-- ----------------------------------------------------------------------------
SELECT k.atik_kodu, k.un_number, k.packing_group
FROM public.atik_kodlari_katalogu k
WHERE NOT EXISTS (
  SELECT 1 FROM public.adr_un_numbers a
  WHERE a.un_number = k.un_number
    AND (k.packing_group IS NULL OR a.packing_group = k.packing_group OR a.packing_group IS NULL)
);

-- ============================================================================
-- SON
-- ============================================================================
