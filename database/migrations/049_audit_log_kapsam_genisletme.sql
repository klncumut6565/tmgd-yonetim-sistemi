-- ============================================================================
-- Migration 049: Denetim İzi (audit_log) Kapsamını Genişlet
-- ----------------------------------------------------------------------------
-- SORUN: Firma detay sayfasındaki "Denetim İzi" sekmesi (FirmAuditTab.tsx)
-- boş görünüyordu — genel /audit-log sayfası (RLS zaten 027'de düzeltilmişti)
-- veri gösterirken, firma bazlı sekme boştu.
--
-- KÖK NEDEN: Migration 024'teki audit trigger'ları yalnızca O TARİHTE var
-- olan 10 tabloya takılmıştı: firms, tasks, documents, files, vehicles,
-- drivers, employees, visits, notifications, user_roles (user_roles hâlâ
-- mevcut değil — o zaman bile yanlış isimdi). Ancak sistemin bugün asıl
-- kullanılan firma-bazlı modülleri (Belge Takip, Araç Evrakı Oluştur,
-- Sürücü Listesi, Görevli Listesi, Kimyasal Envanter, Taşıma Evrakı, Firma
-- Notları, Alıcı Firmalar, Kayıt Dosyaları) migration 024'ten SONRA
-- eklendi ve audited_tables listesine hiç dahil edilmedi. Sonuç: bu
-- tablolarda yapılan hiçbir değişiklik audit_log'a yazılmıyordu — firma
-- bazlı sekme bu yüzden neredeyse her zaman boş görünüyordu.
--
-- ÇÖZÜM: migration 024'teki AYNI dinamik DO bloğu deseniyle, eksik kalan
-- tüm firma-bazlı tablolara audit trigger'ı eklenir. Tablo o kurulumda
-- yoksa (IF EXISTS kontrolü) sessizce atlanır — güvenle tekrar
-- çalıştırılabilir (idempotent).
--
-- NOT: Bu migration'dan SONRA yapılan değişiklikler görünür olur; GEÇMİŞ
-- (migration öncesi) değişiklikler audit_log'a zaten hiç yazılmadığı için
-- geriye dönük olarak eklenemez.
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  audited_tables TEXT[] := ARRAY[
    'firm_belgeleri',        -- Belge Takip — madde bazlı durum
    'firm_belge_dosyalari',  -- Belge Takip — yüklenen dosyalar
    'firm_arac_evraklari',   -- Araç Evrakı Oluştur (TMFB/K1 + Ek-3..Ek-10)
    'firm_surucu_listesi',   -- Sürücü Listesi (TMGDK-L3)
    'firm_gorevli_listesi',  -- Görevli Listesi (TMGDK-G1)
    'firm_chemicals',        -- Kimyasal Envanter (ADR Transport modülü)
    'firm_consignees',       -- Alıcı Firmalar
    'firm_notes',            -- Firma Notları
    'transport_documents',   -- Taşıma Evrakı
    'transport_document_items',
    'kayit_dosyalari'        -- Genel kayıt dosya ekleri
  ];
BEGIN
  FOREACH t IN ARRAY audited_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;', t, t);
      EXECUTE format('
        CREATE TRIGGER trg_audit_%I
        AFTER INSERT OR UPDATE OR DELETE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
      ', t, t);
      RAISE NOTICE 'Audit trigger eklendi: %', t;
    ELSE
      RAISE NOTICE 'Tablo bulunamadı, atlandı: %', t;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- DOĞRULAMA
-- ----------------------------------------------------------------------------
-- Hangi tablolarda audit trigger'ı olduğunu listeler — yukarıdaki 11 tablo
-- (bu kurulumda var olanlar) + migration 024'teki eskiler görünmeli.

SELECT event_object_table AS tablo, trigger_name
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_audit_%'
ORDER BY event_object_table;

-- ----------------------------------------------------------------------------
-- MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('049_audit_log_kapsam_genisletme')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
