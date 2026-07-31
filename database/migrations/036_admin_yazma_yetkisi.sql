-- ============================================================================
-- Migration 036: Yonetici (admin) YAZMA yetkisi — tum firmalarda
-- ----------------------------------------------------------------------------
-- SORUN:
-- Migration 006 admin rolune tum firmalari GORME yetkisi verdi, ancak
-- YAZMA politikalari (004'te tanimli) degistirilmedi. 004'teki kural:
--     is_super_admin() OR (yazabilir() AND user_firms'de atanmis olmak)
-- Yani admin:
--   ✓ Tum firmalari goruyordu
--   ✗ Ama yalnizca KENDISINE ATANMIS firmalari duzenleyebiliyordu
--
-- Sonuc: Yonetim menusunden firma atamasi yapan bir admin, o firmanin
-- logosunu degistiremiyor, belge olusturamiyor, arac/surucu ekleyemiyordu.
--
-- COZUM:
-- firm_id kolonu olan TUM tablolarda ve firms tablosunda yazma
-- politikalarina public.is_admin() eklendi. Boylece:
--   super_admin -> her sey (degismedi)
--   admin       -> tum firmalarda tam yetki (YENI)
--   tmgd/asistan-> yalnizca atandigi firmalar (degismedi)
--   viewer      -> yalnizca okuma (degismedi)
--
-- Politikalar dinamik uretiliyor: information_schema'dan firm_id kolonu
-- olan tablolar bulunuyor, boylece sonradan eklenen tablolar (kimyasal
-- envanter, tasima evraki, firm_consignees vb.) da kapsama
-- dahil oluyor ve ileride tablo eklendiginde bu migration tekrar
-- calistirilarak guncellenebiliyor.
--
-- Idempotent — bir kac kez calistirilabilir.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) FIRMS tablosu — admin tum firmalari duzenleyebilir
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS firms_update ON public.firms;
CREATE POLICY firms_update ON public.firms FOR UPDATE USING (
    public.is_admin()                 -- super_admin + admin → tum firmalar
    OR (public.yazabilir() AND EXISTS (
        SELECT 1 FROM public.user_firms uf
        WHERE uf.firm_id = firms.id AND uf.user_id = auth.uid()
    ))
);

-- Silme yetkisi bilincli olarak SADECE super_admin'de kaliyor:
-- firma silinince tum alt kayitlar cascade siliniyor, geri donusu yok.


-- ----------------------------------------------------------------------------
-- 2) firm_id kolonu olan TUM tablolar — INSERT / UPDATE / DELETE
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables tb
          ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND c.column_name = 'firm_id'
          AND tb.table_type = 'BASE TABLE'
          -- HARIC TUTULANLAR (kendi ozel RLS kurallari var, ezilmemeli):
          --   audit_log   : yalnizca trigger yazar, super_admin okur
          --   firm_notes  : Buzz entegrasyonu kapsaminda super_admin-only
          AND c.table_name NOT IN ('audit_log', 'firm_notes')
        ORDER BY c.table_name
    LOOP
        -- RLS acik olsun
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        -- INSERT
        EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
        EXECUTE format($f$
            CREATE POLICY %1$I_insert ON public.%1$I FOR INSERT WITH CHECK (
                public.is_admin()
                OR (public.yazabilir() AND EXISTS (
                    SELECT 1 FROM public.user_firms uf
                    WHERE uf.firm_id = %1$I.firm_id AND uf.user_id = auth.uid()
                ))
            )
        $f$, t);

        -- UPDATE
        EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
        EXECUTE format($f$
            CREATE POLICY %1$I_update ON public.%1$I FOR UPDATE USING (
                public.is_admin()
                OR (public.yazabilir() AND EXISTS (
                    SELECT 1 FROM public.user_firms uf
                    WHERE uf.firm_id = %1$I.firm_id AND uf.user_id = auth.uid()
                ))
            )
        $f$, t);

        -- DELETE
        EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
        EXECUTE format($f$
            CREATE POLICY %1$I_delete ON public.%1$I FOR DELETE USING (
                public.is_admin()
                OR (public.yazabilir() AND EXISTS (
                    SELECT 1 FROM public.user_firms uf
                    WHERE uf.firm_id = %1$I.firm_id AND uf.user_id = auth.uid()
                ))
            )
        $f$, t);

        -- Eski/alternatif adlandirmali politikalari da temizle ki ayni
        -- komut icin birden fazla politika kalmasin (PostgreSQL bunlari
        -- OR'lar; karisikligi onlemek icin tek politika birakiyoruz).
        EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_all ON public.%I', t, t);

        -- SELECT (006'daki kurali koruyarak yeni tablolara da uygula)
        EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
        EXECUTE format($f$
            CREATE POLICY %1$I_select ON public.%1$I FOR SELECT USING (
                public.is_admin()
                OR public.is_assigned(%1$I.firm_id)
            )
        $f$, t);

        RAISE NOTICE 'Politikalar guncellendi: %', t;
    END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- 3) get_firm_tmgd_name — HAZIRLAYAN adi bulunamama sorunu
-- ----------------------------------------------------------------------------
-- SORUN: Fonksiyon yalnizca role = 'tmgd' olan atanmis kullaniciyi
-- ariyordu. Bir firmaya TMGD rolunde kimse atanmamissa (orn. yonetici
-- kendini atadiysa) "atanmis TMGD bulunamadi" uyarisi cikiyor ve
-- belgelerde HAZIRLAYAN bos kaliyordu.
--
-- COZUM: Once 'tmgd' rolu aranir (dogru ve tercih edilen davranis);
-- bulunamazsa atanmis admin/super_admin'e dusulur. Boylece belge
-- HAZIRLAYAN alani bos kalmaz.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_firm_tmgd_name(p_firm_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_erisim boolean;
  v_isim text;
BEGIN
  SELECT (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_firms uf
      WHERE uf.firm_id = p_firm_id AND uf.user_id = auth.uid()
    )
  ) INTO v_erisim;

  IF NOT v_erisim THEN
    RETURN NULL;
  END IF;

  -- 1) Oncelik: TMGD rolundeki atanmis kullanici
  SELECT p.full_name INTO v_isim
  FROM public.user_firms uf
  JOIN public.profiles p ON p.id = uf.user_id
  WHERE uf.firm_id = p_firm_id
    AND p.role = 'tmgd'
    AND p.is_active = true
    AND COALESCE(NULLIF(TRIM(p.full_name), ''), NULL) IS NOT NULL
  ORDER BY (uf.permission = 'owner') DESC, uf.created_at ASC
  LIMIT 1;

  IF v_isim IS NOT NULL THEN
    RETURN v_isim;
  END IF;

  -- 2) Yedek: atanmis yonetici (admin / super_admin)
  SELECT p.full_name INTO v_isim
  FROM public.user_firms uf
  JOIN public.profiles p ON p.id = uf.user_id
  WHERE uf.firm_id = p_firm_id
    AND p.role IN ('admin', 'super_admin')
    AND p.is_active = true
    AND COALESCE(NULLIF(TRIM(p.full_name), ''), NULL) IS NOT NULL
  ORDER BY (uf.permission = 'owner') DESC, uf.created_at ASC
  LIMIT 1;

  RETURN v_isim;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_firm_tmgd_name(uuid) TO authenticated;


-- ----------------------------------------------------------------------------
-- 4) DOGRULAMA
-- ----------------------------------------------------------------------------

SELECT COUNT(*) AS guncellenen_tablo_sayisi
FROM information_schema.columns c
JOIN information_schema.tables tb
  ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
WHERE c.table_schema = 'public'
  AND c.column_name = 'firm_id'
  AND tb.table_type = 'BASE TABLE'
  AND c.table_name NOT IN ('audit_log', 'firm_notes');


-- ----------------------------------------------------------------------------
-- 5) MIGRATION KAYDI
-- ----------------------------------------------------------------------------

INSERT INTO public._migrations (id) VALUES ('036_admin_yazma_yetkisi')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- Bu migrationdan sonra admin rolu:
--   ✓ Tum firmalari gorur (zaten vardi)
--   ✓ Tum firmalarda duzenleme yapar: logo, bilgi, arac, surucu,
--     personel, ziyaret, gorev, belge, envanter, tasima evraki...
--   ✗ Firma SILEMEZ (yalnizca super_admin)
--   ✗ Kullanici rolu degistiremez (yalnizca super_admin — 006'da tanimli)
-- ============================================================================
