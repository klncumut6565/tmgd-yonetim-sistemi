-- ============================================================================
-- Migration 053: Taşıma Evrakı — 'company' rolüne kendi firması için yazma
-- ----------------------------------------------------------------------------
-- NEDEN: Şimdiye kadar Taşıma Evrakı (transport_documents /
-- transport_document_items) yalnızca yazabilir() ekibine (super_admin,
-- admin, tmgd, assistant) açıktı; 'company' (firma kullanıcısı) yalnızca
-- görüntüleyip PDF indirebiliyordu (bkz. 027_adr_transport_envanter.sql
-- ve src/components/TasimaEvraki.tsx üstündeki not).
--
-- Umut'un kararıyla bu değişti: firma kullanıcısı artık KENDİ firmasının
-- taşıma evraklarını oluşturup düzenleyebilir/silebilir. Diğer tüm
-- ekranlardaki salt-okunurluk (canWrite=false) AYNEN KORUNUYOR — bu
-- migration yalnızca transport_documents / transport_document_items ve
-- (evrakta yeni alıcı eklenebilsin diye) firm_consignees tablolarını
-- kapsıyor, hepsi kullanıcının user_firms üzerinden atanmış olduğu
-- firma ile SINIRLI.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN
-- ============================================================================

-- ---------------------------------------------------------------------
-- transport_documents: company + kendi firması
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS transport_documents_write ON public.transport_documents;
CREATE POLICY transport_documents_write ON public.transport_documents
FOR ALL USING (
    public.is_admin()
    OR (
        (public.yazabilir() OR public.firma_kullanicisi())
        AND EXISTS (
            SELECT 1 FROM public.user_firms uf
            WHERE uf.firm_id = transport_documents.firm_id
              AND uf.user_id = auth.uid()
        )
    )
)
WITH CHECK (
    public.is_admin()
    OR (
        (public.yazabilir() OR public.firma_kullanicisi())
        AND EXISTS (
            SELECT 1 FROM public.user_firms uf
            WHERE uf.firm_id = transport_documents.firm_id
              AND uf.user_id = auth.uid()
        )
    )
);

-- ---------------------------------------------------------------------
-- transport_document_items: aynı yetki, üst belge (transport_documents)
-- üzerinden firma kontrolü
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS transport_document_items_write ON public.transport_document_items;
CREATE POLICY transport_document_items_write ON public.transport_document_items
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.transport_documents td
        WHERE td.id = transport_document_items.document_id
          AND (
              public.is_admin()
              OR (
                  (public.yazabilir() OR public.firma_kullanicisi())
                  AND EXISTS (
                      SELECT 1 FROM public.user_firms uf
                      WHERE uf.firm_id = td.firm_id AND uf.user_id = auth.uid()
                  )
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.transport_documents td
        WHERE td.id = transport_document_items.document_id
          AND (
              public.is_admin()
              OR (
                  (public.yazabilir() OR public.firma_kullanicisi())
                  AND EXISTS (
                      SELECT 1 FROM public.user_firms uf
                      WHERE uf.firm_id = td.firm_id AND uf.user_id = auth.uid()
                  )
              )
          )
    )
);

-- ---------------------------------------------------------------------
-- firm_consignees: Taşıma Evrakı formunda yeni "Alıcı" kaydı ekleyebilmesi
-- için company'ye kendi firmasıyla sınırlı yazma izni. Önceki politika
-- (035_firm_consignees.sql) hiçbir firma sınırı taşımıyordu — bu politika
-- company için firma sınırını da ekleyerek daha sıkı bir hale getiriyor.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "firm_consignees_write" ON public.firm_consignees;
CREATE POLICY "firm_consignees_write"
  ON public.firm_consignees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approval_status = 'approved'
        AND p.is_active = true
        AND p.role IN ('super_admin', 'admin', 'tmgd')
    )
    OR (
        public.firma_kullanicisi()
        AND EXISTS (
            SELECT 1 FROM public.user_firms uf
            WHERE uf.firm_id = firm_consignees.firm_id
              AND uf.user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approval_status = 'approved'
        AND p.is_active = true
        AND p.role IN ('super_admin', 'admin', 'tmgd')
    )
    OR (
        public.firma_kullanicisi()
        AND EXISTS (
            SELECT 1 FROM public.user_firms uf
            WHERE uf.firm_id = firm_consignees.firm_id
              AND uf.user_id = auth.uid()
        )
    )
  );

-- PostgREST şema önbelleğini tazele
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- Migration kaydı
-- ----------------------------------------------------------------------------
INSERT INTO public._migrations (id) VALUES ('053_tasima_evraki_company_yazma')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SON
-- ============================================================================
