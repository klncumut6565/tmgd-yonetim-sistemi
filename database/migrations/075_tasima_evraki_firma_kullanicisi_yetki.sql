-- ============================================================================
-- Migration 075: Tasima Evraki — firma kullanicisina (company) YALNIZCA bu
-- modulde, YALNIZCA kendi firmasinda yazma yetkisi
-- ----------------------------------------------------------------------------
-- NEDEN: 053 bu yetkiyi vermek icin yazilmisti ama canli veritabaninda
-- uygulanmamisti; canlida transport_documents ayri insert/update/delete
-- politikalariyla yalnizca yazabilir() ekibine acikti. Ayrica firm_carriers
-- okuma kurali onayli HER kullaniciya TUM firmalarin tasiyicilarini
-- gosteriyordu (firma ayrimi yoktu).
--
-- KURAL (Tasima Evraki'nin tum tablolari icin ayni):
--   okuma : is_admin() VEYA firmaya atanmis (is_assigned)
--   yazma : is_admin() VEYA ((yazabilir() VEYA firma_kullanicisi()) VE
--           user_firms ile o firmaya atanmis)
-- Diger tum modullerde company rolu salt-okunur KALIR (bu migration
-- yalnizca asagidaki tablolara dokunur).
--
-- Tablolar: transport_documents, transport_document_items, firm_consignees,
--           firm_carriers  (sofor/plaka rehberi 074'te ayni kuralla)
-- ============================================================================

-- ---------------------------------------------------------------- transport_documents
DROP POLICY IF EXISTS transport_documents_write  ON public.transport_documents;
DROP POLICY IF EXISTS transport_documents_insert ON public.transport_documents;
DROP POLICY IF EXISTS transport_documents_update ON public.transport_documents;
DROP POLICY IF EXISTS transport_documents_delete ON public.transport_documents;

CREATE POLICY transport_documents_insert ON public.transport_documents
FOR INSERT WITH CHECK (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = transport_documents.firm_id AND uf.user_id = auth.uid()))
);
CREATE POLICY transport_documents_update ON public.transport_documents
FOR UPDATE USING (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = transport_documents.firm_id AND uf.user_id = auth.uid()))
)
WITH CHECK (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = transport_documents.firm_id AND uf.user_id = auth.uid()))
);
CREATE POLICY transport_documents_delete ON public.transport_documents
FOR DELETE USING (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = transport_documents.firm_id AND uf.user_id = auth.uid()))
);

-- ---------------------------------------------------------------- transport_document_items
DROP POLICY IF EXISTS transport_document_items_write ON public.transport_document_items;
CREATE POLICY transport_document_items_write ON public.transport_document_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.transport_documents td
    WHERE td.id = transport_document_items.document_id
      AND (public.is_admin()
           OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
             SELECT 1 FROM public.user_firms uf
             WHERE uf.firm_id = td.firm_id AND uf.user_id = auth.uid())))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transport_documents td
    WHERE td.id = transport_document_items.document_id
      AND (public.is_admin()
           OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
             SELECT 1 FROM public.user_firms uf
             WHERE uf.firm_id = td.firm_id AND uf.user_id = auth.uid())))
  )
);

-- ---------------------------------------------------------------- firm_consignees (alici rehberi)
DROP POLICY IF EXISTS firm_consignees_write  ON public.firm_consignees;
DROP POLICY IF EXISTS firm_consignees_insert ON public.firm_consignees;
DROP POLICY IF EXISTS firm_consignees_update ON public.firm_consignees;
DROP POLICY IF EXISTS firm_consignees_delete ON public.firm_consignees;

CREATE POLICY firm_consignees_insert ON public.firm_consignees
FOR INSERT WITH CHECK (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = firm_consignees.firm_id AND uf.user_id = auth.uid()))
);
CREATE POLICY firm_consignees_update ON public.firm_consignees
FOR UPDATE USING (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = firm_consignees.firm_id AND uf.user_id = auth.uid()))
);
CREATE POLICY firm_consignees_delete ON public.firm_consignees
FOR DELETE USING (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = firm_consignees.firm_id AND uf.user_id = auth.uid()))
);

-- ---------------------------------------------------------------- firm_carriers (tasiyici rehberi)
-- Okuma artik firma bazli (onceden onayli herkes tum firmalarinkini goruyordu).
DROP POLICY IF EXISTS firm_carriers_read  ON public.firm_carriers;
DROP POLICY IF EXISTS firm_carriers_write ON public.firm_carriers;

CREATE POLICY firm_carriers_read ON public.firm_carriers
FOR SELECT USING (public.is_admin() OR public.is_assigned(firm_id));

CREATE POLICY firm_carriers_write ON public.firm_carriers
FOR ALL USING (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = firm_carriers.firm_id AND uf.user_id = auth.uid()))
)
WITH CHECK (
  public.is_admin()
  OR ((public.yazabilir() OR public.firma_kullanicisi()) AND EXISTS (
    SELECT 1 FROM public.user_firms uf
    WHERE uf.firm_id = firm_carriers.firm_id AND uf.user_id = auth.uid()))
);

INSERT INTO public._migrations (id) VALUES ('075_tasima_evraki_firma_kullanicisi_yetki')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
