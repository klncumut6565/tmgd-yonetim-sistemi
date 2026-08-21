-- ============================================================================
-- Migration 059: Tablo A — Hatalı Tünel Kodu Düzeltmesi
-- ----------------------------------------------------------------------------
-- SORUN: Taşıma Evrakı'nda UN 3077 ve UN 3291 için tünel kısıtlama kodu
-- yanlış hesaplanıyordu. İnceleme sonucu kök neden bulundu: Tablo A verisi
-- (009_tam_adr_veritabani.sql) yüklenirken 5 satırda tunnel_code sütununa,
-- tünel kodu yerine ADR 7.2.4 kapsamındaki PAKETLEME ÖZEL HÜKMÜ (V-kodu)
-- yazılmış. Yani veri sütun kayması değil, tekil hücre hatasıydı — diğer
-- 2.933 satır doğru.
--
-- Hatalı 5 satır ve doğru ADR 2025 tünel kodları:
--   UN 3077 (Sınıf 9,   M7, PG III) : 'V13' -> 'E'
--   UN 3082 (Sınıf 9,   M6, PG III) : 'V12' -> 'E'
--   UN 3291 (Sınıf 6.2, I3)         : 'V1'  -> 'E'   (2 satır)
--   UN 3549 (Sınıf 6.2, I3)         : 'V1'  -> 'E'
--
-- NOT: 'C5000D' (52 satır) hatalı DEĞİLDİR — patlayıcılar için geçerli bir
-- ADR tünel kodudur, dokunulmamıştır.
--
-- Idempotent — yalnızca hâlâ V-kodu içeren satırları günceller.
-- ============================================================================

UPDATE public.adr_un_numbers
SET tunnel_code = 'E'
WHERE tunnel_code IN ('V1', 'V12', 'V13')
  AND un_number IN ('3077', '3082', '3291', '3549');

-- ----------------------------------------------------------------------------
-- EK DÜZELTME: UN 0331 / 0332 — tehlike tanımlama no (Kemler) alanı
-- ----------------------------------------------------------------------------
-- Sınıf 1 (patlayıcı) maddelerin ADR Tablo A sütun (20)'si BOŞTUR. 384 Sınıf 1
-- satırının 382'sinde bu alan doğru şekilde boşken, yalnızca bu 2 satırda
-- sınıflandırma kodu (1.5D) yanlışlıkla bu alana da kopyalanmış.
UPDATE public.adr_un_numbers
SET hazard_no = ''
WHERE un_number IN ('0331', '0332') AND hazard_no = '1.5D';

-- ----------------------------------------------------------------------------
-- DOĞRULAMA — sonuç boş dönmeli (hiç V-kodu kalmamalı)
-- ----------------------------------------------------------------------------

SELECT un_number, proper_shipping_name, class, tunnel_code
FROM public.adr_un_numbers
WHERE tunnel_code ~ '^V[0-9]*$'
ORDER BY un_number;

-- Düzeltilen satırların son hâli
SELECT un_number, class, packing_group, tunnel_code
FROM public.adr_un_numbers
WHERE un_number IN ('3077', '3082', '3291', '3549')
ORDER BY un_number;

-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('059_tablo_a_tunel_kodu_duzeltme')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
