-- YEDEK: 029/030 performans migration'ları ÖNCESİ public şema RLS politikaları
-- (2026-10-28). Geri almak gerekirse bu dosya olduğu gibi çalıştırılabilir.

BEGIN;

DROP POLICY IF EXISTS activity_logs_delete ON public.activity_logs;
CREATE POLICY activity_logs_delete ON public.activity_logs AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = activity_logs.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS activity_logs_insert ON public.activity_logs;
CREATE POLICY activity_logs_insert ON public.activity_logs AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = activity_logs.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS activity_logs_select ON public.activity_logs;
CREATE POLICY activity_logs_select ON public.activity_logs AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS activity_logs_update ON public.activity_logs;
CREATE POLICY activity_logs_update ON public.activity_logs AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = activity_logs.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS adr_projects_delete ON public.adr_projects;
CREATE POLICY adr_projects_delete ON public.adr_projects AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = adr_projects.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS adr_projects_insert ON public.adr_projects;
CREATE POLICY adr_projects_insert ON public.adr_projects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = adr_projects.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS adr_projects_select ON public.adr_projects;
CREATE POLICY adr_projects_select ON public.adr_projects AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS adr_projects_update ON public.adr_projects;
CREATE POLICY adr_projects_update ON public.adr_projects AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = adr_projects.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS adr_reports_delete ON public.adr_reports;
CREATE POLICY adr_reports_delete ON public.adr_reports AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = adr_reports.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS adr_reports_insert ON public.adr_reports;
CREATE POLICY adr_reports_insert ON public.adr_reports AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = adr_reports.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS adr_reports_select ON public.adr_reports;
CREATE POLICY adr_reports_select ON public.adr_reports AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS adr_reports_update ON public.adr_reports;
CREATE POLICY adr_reports_update ON public.adr_reports AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = adr_reports.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS adr_syn_select ON public.adr_synonyms;
CREATE POLICY adr_syn_select ON public.adr_synonyms AS PERMISSIVE FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS adr_un_select ON public.adr_un_numbers;
CREATE POLICY adr_un_select ON public.adr_un_numbers AS PERMISSIVE FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS adr_un_write ON public.adr_un_numbers;
CREATE POLICY adr_un_write ON public.adr_un_numbers AS PERMISSIVE FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS ai_provider_keys_super_admin_all ON public.ai_provider_keys;
CREATE POLICY ai_provider_keys_super_admin_all ON public.ai_provider_keys AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text) AND (p.approval_status = 'approved'::text) AND (p.is_active = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text) AND (p.approval_status = 'approved'::text) AND (p.is_active = true)))));

DROP POLICY IF EXISTS annual_reports_delete ON public.annual_reports;
CREATE POLICY annual_reports_delete ON public.annual_reports AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = annual_reports.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS annual_reports_insert ON public.annual_reports;
CREATE POLICY annual_reports_insert ON public.annual_reports AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = annual_reports.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS annual_reports_select ON public.annual_reports;
CREATE POLICY annual_reports_select ON public.annual_reports AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS annual_reports_update ON public.annual_reports;
CREATE POLICY annual_reports_update ON public.annual_reports AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = annual_reports.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS annual_statistics_delete ON public.annual_statistics;
CREATE POLICY annual_statistics_delete ON public.annual_statistics AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = annual_statistics.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS annual_statistics_insert ON public.annual_statistics;
CREATE POLICY annual_statistics_insert ON public.annual_statistics AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = annual_statistics.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS annual_statistics_select ON public.annual_statistics;
CREATE POLICY annual_statistics_select ON public.annual_statistics AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS annual_statistics_update ON public.annual_statistics;
CREATE POLICY annual_statistics_update ON public.annual_statistics AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = annual_statistics.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS api_keys_delete ON public.api_keys;
CREATE POLICY api_keys_delete ON public.api_keys AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = api_keys.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS api_keys_insert ON public.api_keys;
CREATE POLICY api_keys_insert ON public.api_keys AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = api_keys.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS api_keys_select ON public.api_keys;
CREATE POLICY api_keys_select ON public.api_keys AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS api_keys_update ON public.api_keys;
CREATE POLICY api_keys_update ON public.api_keys AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = api_keys.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS atik_firmalari_select ON public.atik_firmalari;
CREATE POLICY atik_firmalari_select ON public.atik_firmalari AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.approval_status = 'approved'::text) AND (p.is_active = true) AND (p.role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'tmgd'::text]))))));

DROP POLICY IF EXISTS atik_firmalari_write ON public.atik_firmalari;
CREATE POLICY atik_firmalari_write ON public.atik_firmalari AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.approval_status = 'approved'::text) AND (p.is_active = true) AND (p.role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'tmgd'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.approval_status = 'approved'::text) AND (p.is_active = true) AND (p.role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'tmgd'::text]))))));

DROP POLICY IF EXISTS atik_kodlari_select ON public.atik_kodlari_katalogu;
CREATE POLICY atik_kodlari_select ON public.atik_kodlari_katalogu AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS audit_log_admin_read ON public.audit_log;
CREATE POLICY audit_log_admin_read ON public.audit_log AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text) AND (p.approval_status = 'approved'::text) AND (p.is_active = true)))));

DROP POLICY IF EXISTS audit_log_no_delete ON public.audit_log;
CREATE POLICY audit_log_no_delete ON public.audit_log AS PERMISSIVE FOR DELETE TO authenticated
  USING (false);

DROP POLICY IF EXISTS audit_log_no_direct_insert ON public.audit_log;
CREATE POLICY audit_log_no_direct_insert ON public.audit_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS audit_log_no_update ON public.audit_log;
CREATE POLICY audit_log_no_update ON public.audit_log AS PERMISSIVE FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS belge_tarama_oturumlari_select ON public.belge_tarama_oturumlari;
CREATE POLICY belge_tarama_oturumlari_select ON public.belge_tarama_oturumlari AS PERMISSIVE FOR SELECT TO authenticated
  USING (((created_by = auth.uid()) OR is_admin()));

DROP POLICY IF EXISTS calendar_events_delete ON public.calendar_events;
CREATE POLICY calendar_events_delete ON public.calendar_events AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = calendar_events.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
CREATE POLICY calendar_events_insert ON public.calendar_events AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = calendar_events.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
CREATE POLICY calendar_events_select ON public.calendar_events AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
CREATE POLICY calendar_events_update ON public.calendar_events AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = calendar_events.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS company_users_delete ON public.company_users;
CREATE POLICY company_users_delete ON public.company_users AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = company_users.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS company_users_insert ON public.company_users;
CREATE POLICY company_users_insert ON public.company_users AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = company_users.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS company_users_select ON public.company_users;
CREATE POLICY company_users_select ON public.company_users AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS company_users_update ON public.company_users;
CREATE POLICY company_users_update ON public.company_users AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = company_users.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS dashboard_charts_delete ON public.dashboard_charts;
CREATE POLICY dashboard_charts_delete ON public.dashboard_charts AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = dashboard_charts.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS dashboard_charts_insert ON public.dashboard_charts;
CREATE POLICY dashboard_charts_insert ON public.dashboard_charts AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = dashboard_charts.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS dashboard_charts_select ON public.dashboard_charts;
CREATE POLICY dashboard_charts_select ON public.dashboard_charts AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS dashboard_charts_update ON public.dashboard_charts;
CREATE POLICY dashboard_charts_update ON public.dashboard_charts AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = dashboard_charts.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS dashboard_kpis_delete ON public.dashboard_kpis;
CREATE POLICY dashboard_kpis_delete ON public.dashboard_kpis AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = dashboard_kpis.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS dashboard_kpis_insert ON public.dashboard_kpis;
CREATE POLICY dashboard_kpis_insert ON public.dashboard_kpis AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = dashboard_kpis.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS dashboard_kpis_select ON public.dashboard_kpis;
CREATE POLICY dashboard_kpis_select ON public.dashboard_kpis AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS dashboard_kpis_update ON public.dashboard_kpis;
CREATE POLICY dashboard_kpis_update ON public.dashboard_kpis AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = dashboard_kpis.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS dismissed_notifications_own ON public.dismissed_notifications;
CREATE POLICY dismissed_notifications_own ON public.dismissed_notifications AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = documents.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = documents.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS documents_update ON public.documents;
CREATE POLICY documents_update ON public.documents AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = documents.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS drivers_delete ON public.drivers;
CREATE POLICY drivers_delete ON public.drivers AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = drivers.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS drivers_insert ON public.drivers;
CREATE POLICY drivers_insert ON public.drivers AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = drivers.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS drivers_select ON public.drivers;
CREATE POLICY drivers_select ON public.drivers AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS drivers_update ON public.drivers;
CREATE POLICY drivers_update ON public.drivers AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = drivers.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS employees_delete ON public.employees;
CREATE POLICY employees_delete ON public.employees AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = employees.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS employees_insert ON public.employees;
CREATE POLICY employees_insert ON public.employees AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = employees.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS employees_update ON public.employees;
CREATE POLICY employees_update ON public.employees AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = employees.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS exemption_calculations_delete ON public.exemption_calculations;
CREATE POLICY exemption_calculations_delete ON public.exemption_calculations AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = exemption_calculations.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS exemption_calculations_insert ON public.exemption_calculations;
CREATE POLICY exemption_calculations_insert ON public.exemption_calculations AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = exemption_calculations.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS exemption_calculations_select ON public.exemption_calculations;
CREATE POLICY exemption_calculations_select ON public.exemption_calculations AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS exemption_calculations_update ON public.exemption_calculations;
CREATE POLICY exemption_calculations_update ON public.exemption_calculations AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = exemption_calculations.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS files_delete ON public.files;
CREATE POLICY files_delete ON public.files AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = files.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS files_insert ON public.files;
CREATE POLICY files_insert ON public.files AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = files.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS files_select ON public.files;
CREATE POLICY files_select ON public.files AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS files_update ON public.files;
CREATE POLICY files_update ON public.files AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = files.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_arac_evrak_dosyalari_delete ON public.firm_arac_evrak_dosyalari;
CREATE POLICY firm_arac_evrak_dosyalari_delete ON public.firm_arac_evrak_dosyalari AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_arac_evrak_dosyalari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_arac_evrak_dosyalari_insert ON public.firm_arac_evrak_dosyalari;
CREATE POLICY firm_arac_evrak_dosyalari_insert ON public.firm_arac_evrak_dosyalari AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_arac_evrak_dosyalari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_arac_evrak_dosyalari_select ON public.firm_arac_evrak_dosyalari;
CREATE POLICY firm_arac_evrak_dosyalari_select ON public.firm_arac_evrak_dosyalari AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS firm_arac_evrak_dosyalari_update ON public.firm_arac_evrak_dosyalari;
CREATE POLICY firm_arac_evrak_dosyalari_update ON public.firm_arac_evrak_dosyalari AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_arac_evrak_dosyalari.firm_id) AND (uf.user_id = auth.uid())))))))
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_arac_evrak_dosyalari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_arac_evraklari_delete ON public.firm_arac_evraklari;
CREATE POLICY firm_arac_evraklari_delete ON public.firm_arac_evraklari AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_arac_evraklari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_arac_evraklari_insert ON public.firm_arac_evraklari;
CREATE POLICY firm_arac_evraklari_insert ON public.firm_arac_evraklari AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_arac_evraklari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_arac_evraklari_select ON public.firm_arac_evraklari;
CREATE POLICY firm_arac_evraklari_select ON public.firm_arac_evraklari AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS firm_arac_evraklari_update ON public.firm_arac_evraklari;
CREATE POLICY firm_arac_evraklari_update ON public.firm_arac_evraklari AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_arac_evraklari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_belge_dosyalari_delete ON public.firm_belge_dosyalari;
CREATE POLICY firm_belge_dosyalari_delete ON public.firm_belge_dosyalari AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_belge_dosyalari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_belge_dosyalari_insert ON public.firm_belge_dosyalari;
CREATE POLICY firm_belge_dosyalari_insert ON public.firm_belge_dosyalari AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_belge_dosyalari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_belge_dosyalari_select ON public.firm_belge_dosyalari;
CREATE POLICY firm_belge_dosyalari_select ON public.firm_belge_dosyalari AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS firm_belge_dosyalari_update ON public.firm_belge_dosyalari;
CREATE POLICY firm_belge_dosyalari_update ON public.firm_belge_dosyalari AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_belge_dosyalari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_belgeleri_delete ON public.firm_belgeleri;
CREATE POLICY firm_belgeleri_delete ON public.firm_belgeleri AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_belgeleri.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_belgeleri_insert ON public.firm_belgeleri;
CREATE POLICY firm_belgeleri_insert ON public.firm_belgeleri AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_belgeleri.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_belgeleri_select ON public.firm_belgeleri;
CREATE POLICY firm_belgeleri_select ON public.firm_belgeleri AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS firm_belgeleri_update ON public.firm_belgeleri;
CREATE POLICY firm_belgeleri_update ON public.firm_belgeleri AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_belgeleri.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_carriers_read ON public.firm_carriers;
CREATE POLICY firm_carriers_read ON public.firm_carriers AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS firm_carriers_write ON public.firm_carriers;
CREATE POLICY firm_carriers_write ON public.firm_carriers AS PERMISSIVE FOR ALL TO public
  USING ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_carriers.firm_id) AND (uf.user_id = auth.uid())))))))
  WITH CHECK ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_carriers.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_chemicals_delete ON public.firm_chemicals;
CREATE POLICY firm_chemicals_delete ON public.firm_chemicals AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_chemicals.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_chemicals_insert ON public.firm_chemicals;
CREATE POLICY firm_chemicals_insert ON public.firm_chemicals AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_chemicals.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_chemicals_select ON public.firm_chemicals;
CREATE POLICY firm_chemicals_select ON public.firm_chemicals AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS firm_chemicals_update ON public.firm_chemicals;
CREATE POLICY firm_chemicals_update ON public.firm_chemicals AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_chemicals.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_consignees_delete ON public.firm_consignees;
CREATE POLICY firm_consignees_delete ON public.firm_consignees AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_consignees.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_consignees_insert ON public.firm_consignees;
CREATE POLICY firm_consignees_insert ON public.firm_consignees AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_consignees.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_consignees_select ON public.firm_consignees;
CREATE POLICY firm_consignees_select ON public.firm_consignees AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS firm_consignees_update ON public.firm_consignees;
CREATE POLICY firm_consignees_update ON public.firm_consignees AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_consignees.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_gorevli_listesi_delete ON public.firm_gorevli_listesi;
CREATE POLICY firm_gorevli_listesi_delete ON public.firm_gorevli_listesi AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_gorevli_listesi.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_gorevli_listesi_insert ON public.firm_gorevli_listesi;
CREATE POLICY firm_gorevli_listesi_insert ON public.firm_gorevli_listesi AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_gorevli_listesi.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_gorevli_listesi_select ON public.firm_gorevli_listesi;
CREATE POLICY firm_gorevli_listesi_select ON public.firm_gorevli_listesi AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS firm_gorevli_listesi_update ON public.firm_gorevli_listesi;
CREATE POLICY firm_gorevli_listesi_update ON public.firm_gorevli_listesi AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_gorevli_listesi.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_notes_danisman_delete ON public.firm_notes;
CREATE POLICY firm_notes_danisman_delete ON public.firm_notes AS PERMISSIVE FOR DELETE TO authenticated
  USING (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'tmgd'::text])) AND (p.approval_status = 'approved'::text) AND (p.is_active = true))))));

DROP POLICY IF EXISTS firm_notes_danisman_insert ON public.firm_notes;
CREATE POLICY firm_notes_danisman_insert ON public.firm_notes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.approval_status = 'approved'::text) AND (p.is_active = true) AND ((p.role = 'admin'::text) OR ((p.role = 'tmgd'::text) AND (EXISTS ( SELECT 1
           FROM user_firms uf
          WHERE ((uf.firm_id = firm_notes.firm_id) AND (uf.user_id = auth.uid())))))))))));

DROP POLICY IF EXISTS firm_notes_danisman_select ON public.firm_notes;
CREATE POLICY firm_notes_danisman_select ON public.firm_notes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.approval_status = 'approved'::text) AND (p.is_active = true) AND ((p.role = 'admin'::text) OR ((p.role = 'tmgd'::text) AND (EXISTS ( SELECT 1
           FROM user_firms uf
          WHERE ((uf.firm_id = firm_notes.firm_id) AND (uf.user_id = auth.uid()))))))))));

DROP POLICY IF EXISTS firm_notes_danisman_update ON public.firm_notes;
CREATE POLICY firm_notes_danisman_update ON public.firm_notes AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'tmgd'::text])) AND (p.approval_status = 'approved'::text) AND (p.is_active = true))))))
  WITH CHECK ((author_id = auth.uid()));

DROP POLICY IF EXISTS firm_notes_super_admin_all ON public.firm_notes;
CREATE POLICY firm_notes_super_admin_all ON public.firm_notes AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text) AND (p.approval_status = 'approved'::text) AND (p.is_active = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text) AND (p.approval_status = 'approved'::text) AND (p.is_active = true)))));

DROP POLICY IF EXISTS firm_surucu_listesi_delete ON public.firm_surucu_listesi;
CREATE POLICY firm_surucu_listesi_delete ON public.firm_surucu_listesi AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_surucu_listesi.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_surucu_listesi_insert ON public.firm_surucu_listesi;
CREATE POLICY firm_surucu_listesi_insert ON public.firm_surucu_listesi AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_surucu_listesi.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firm_surucu_listesi_select ON public.firm_surucu_listesi;
CREATE POLICY firm_surucu_listesi_select ON public.firm_surucu_listesi AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS firm_surucu_listesi_update ON public.firm_surucu_listesi;
CREATE POLICY firm_surucu_listesi_update ON public.firm_surucu_listesi AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firm_surucu_listesi.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS firms_delete ON public.firms;
CREATE POLICY firms_delete ON public.firms AS PERMISSIVE FOR DELETE TO public
  USING (is_admin());

DROP POLICY IF EXISTS firms_insert ON public.firms;
CREATE POLICY firms_insert ON public.firms AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (yazabilir());

DROP POLICY IF EXISTS firms_select ON public.firms;
CREATE POLICY firms_select ON public.firms AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(id)));

DROP POLICY IF EXISTS firms_update ON public.firms;
CREATE POLICY firms_update ON public.firms AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = firms.id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS folders_delete ON public.folders;
CREATE POLICY folders_delete ON public.folders AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = folders.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS folders_insert ON public.folders;
CREATE POLICY folders_insert ON public.folders AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = folders.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS folders_select ON public.folders;
CREATE POLICY folders_select ON public.folders AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS folders_update ON public.folders;
CREATE POLICY folders_update ON public.folders AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = folders.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS generated_instructions_delete ON public.generated_instructions;
CREATE POLICY generated_instructions_delete ON public.generated_instructions AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = generated_instructions.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS generated_instructions_insert ON public.generated_instructions;
CREATE POLICY generated_instructions_insert ON public.generated_instructions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = generated_instructions.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS generated_instructions_select ON public.generated_instructions;
CREATE POLICY generated_instructions_select ON public.generated_instructions AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS generated_instructions_update ON public.generated_instructions;
CREATE POLICY generated_instructions_update ON public.generated_instructions AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = generated_instructions.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS incidents_delete ON public.incidents;
CREATE POLICY incidents_delete ON public.incidents AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = incidents.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS incidents_insert ON public.incidents;
CREATE POLICY incidents_insert ON public.incidents AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = incidents.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS incidents_select ON public.incidents;
CREATE POLICY incidents_select ON public.incidents AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS incidents_update ON public.incidents;
CREATE POLICY incidents_update ON public.incidents AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = incidents.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS inspections_delete ON public.inspections;
CREATE POLICY inspections_delete ON public.inspections AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = inspections.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS inspections_insert ON public.inspections;
CREATE POLICY inspections_insert ON public.inspections AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = inspections.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS inspections_select ON public.inspections;
CREATE POLICY inspections_select ON public.inspections AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS inspections_update ON public.inspections;
CREATE POLICY inspections_update ON public.inspections AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = inspections.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS kayit_dosyalari_delete ON public.kayit_dosyalari;
CREATE POLICY kayit_dosyalari_delete ON public.kayit_dosyalari AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = kayit_dosyalari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS kayit_dosyalari_insert ON public.kayit_dosyalari;
CREATE POLICY kayit_dosyalari_insert ON public.kayit_dosyalari AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = kayit_dosyalari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS kayit_dosyalari_select ON public.kayit_dosyalari;
CREATE POLICY kayit_dosyalari_select ON public.kayit_dosyalari AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS kayit_dosyalari_update ON public.kayit_dosyalari;
CREATE POLICY kayit_dosyalari_update ON public.kayit_dosyalari AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = kayit_dosyalari.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS licenses_delete ON public.licenses;
CREATE POLICY licenses_delete ON public.licenses AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = licenses.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS licenses_insert ON public.licenses;
CREATE POLICY licenses_insert ON public.licenses AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = licenses.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS licenses_select ON public.licenses;
CREATE POLICY licenses_select ON public.licenses AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS licenses_update ON public.licenses;
CREATE POLICY licenses_update ON public.licenses AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = licenses.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS mevzuat_select ON public.mevzuat;
CREATE POLICY mevzuat_select ON public.mevzuat AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.approval_status = 'approved'::text) AND (p.is_active = true)))));

DROP POLICY IF EXISTS mevzuat_write ON public.mevzuat;
CREATE POLICY mevzuat_write ON public.mevzuat AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS mevzuat_metin_select ON public.mevzuat_metin;
CREATE POLICY mevzuat_metin_select ON public.mevzuat_metin AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.approval_status = 'approved'::text) AND (p.is_active = true)))));

DROP POLICY IF EXISTS mevzuat_metin_write ON public.mevzuat_metin;
CREATE POLICY mevzuat_metin_write ON public.mevzuat_metin AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS nonconformities_delete ON public.nonconformities;
CREATE POLICY nonconformities_delete ON public.nonconformities AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = nonconformities.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS nonconformities_insert ON public.nonconformities;
CREATE POLICY nonconformities_insert ON public.nonconformities AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = nonconformities.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS nonconformities_select ON public.nonconformities;
CREATE POLICY nonconformities_select ON public.nonconformities AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS nonconformities_update ON public.nonconformities;
CREATE POLICY nonconformities_update ON public.nonconformities AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = nonconformities.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS notifications_delete ON public.notifications;
CREATE POLICY notifications_delete ON public.notifications AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = notifications.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = notifications.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = notifications.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS profiles_delete ON public.profiles;
CREATE POLICY profiles_delete ON public.profiles AS PERMISSIVE FOR DELETE TO public
  USING (((id <> auth.uid()) AND (is_super_admin() OR (is_admin() AND (role <> 'super_admin'::text)))));

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING (((id = auth.uid()) OR is_super_admin() OR (is_admin() AND (role <> 'super_admin'::text))));

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING (((id = auth.uid()) OR is_admin()));

DROP POLICY IF EXISTS reminders_delete ON public.reminders;
CREATE POLICY reminders_delete ON public.reminders AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = reminders.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS reminders_insert ON public.reminders;
CREATE POLICY reminders_insert ON public.reminders AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = reminders.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS reminders_select ON public.reminders;
CREATE POLICY reminders_select ON public.reminders AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS reminders_update ON public.reminders;
CREATE POLICY reminders_update ON public.reminders AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = reminders.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS risk_assessments_delete ON public.risk_assessments;
CREATE POLICY risk_assessments_delete ON public.risk_assessments AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = risk_assessments.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS risk_assessments_insert ON public.risk_assessments;
CREATE POLICY risk_assessments_insert ON public.risk_assessments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = risk_assessments.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS risk_assessments_select ON public.risk_assessments;
CREATE POLICY risk_assessments_select ON public.risk_assessments AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS risk_assessments_update ON public.risk_assessments;
CREATE POLICY risk_assessments_update ON public.risk_assessments AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = risk_assessments.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS safety_data_sheets_delete ON public.safety_data_sheets;
CREATE POLICY safety_data_sheets_delete ON public.safety_data_sheets AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = safety_data_sheets.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS safety_data_sheets_insert ON public.safety_data_sheets;
CREATE POLICY safety_data_sheets_insert ON public.safety_data_sheets AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = safety_data_sheets.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS safety_data_sheets_select ON public.safety_data_sheets;
CREATE POLICY safety_data_sheets_select ON public.safety_data_sheets AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS safety_data_sheets_update ON public.safety_data_sheets;
CREATE POLICY safety_data_sheets_update ON public.safety_data_sheets AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = safety_data_sheets.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS sync_jobs_delete ON public.sync_jobs;
CREATE POLICY sync_jobs_delete ON public.sync_jobs AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = sync_jobs.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS sync_jobs_insert ON public.sync_jobs;
CREATE POLICY sync_jobs_insert ON public.sync_jobs AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = sync_jobs.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS sync_jobs_select ON public.sync_jobs;
CREATE POLICY sync_jobs_select ON public.sync_jobs AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS sync_jobs_update ON public.sync_jobs;
CREATE POLICY sync_jobs_update ON public.sync_jobs AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = sync_jobs.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete ON public.tasks AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = tasks.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = tasks.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = tasks.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS trainings_delete ON public.trainings;
CREATE POLICY trainings_delete ON public.trainings AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = trainings.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS trainings_insert ON public.trainings;
CREATE POLICY trainings_insert ON public.trainings AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = trainings.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS trainings_select ON public.trainings;
CREATE POLICY trainings_select ON public.trainings AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS trainings_update ON public.trainings;
CREATE POLICY trainings_update ON public.trainings AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = trainings.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS transport_document_items_select ON public.transport_document_items;
CREATE POLICY transport_document_items_select ON public.transport_document_items AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM transport_documents td
  WHERE ((td.id = transport_document_items.document_id) AND (is_admin() OR is_assigned(td.firm_id))))));

DROP POLICY IF EXISTS transport_document_items_write ON public.transport_document_items;
CREATE POLICY transport_document_items_write ON public.transport_document_items AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM transport_documents td
  WHERE ((td.id = transport_document_items.document_id) AND (is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
           FROM user_firms uf
          WHERE ((uf.firm_id = td.firm_id) AND (uf.user_id = auth.uid()))))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM transport_documents td
  WHERE ((td.id = transport_document_items.document_id) AND (is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
           FROM user_firms uf
          WHERE ((uf.firm_id = td.firm_id) AND (uf.user_id = auth.uid()))))))))));

DROP POLICY IF EXISTS transport_documents_delete ON public.transport_documents;
CREATE POLICY transport_documents_delete ON public.transport_documents AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = transport_documents.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS transport_documents_insert ON public.transport_documents;
CREATE POLICY transport_documents_insert ON public.transport_documents AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = transport_documents.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS transport_documents_select ON public.transport_documents;
CREATE POLICY transport_documents_select ON public.transport_documents AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS transport_documents_update ON public.transport_documents;
CREATE POLICY transport_documents_update ON public.transport_documents AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = transport_documents.firm_id) AND (uf.user_id = auth.uid())))))))
  WITH CHECK ((is_admin() OR ((yazabilir() OR firma_kullanicisi()) AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = transport_documents.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS user_firms_admin_all ON public.user_firms;
CREATE POLICY user_firms_admin_all ON public.user_firms AS PERMISSIVE FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS user_firms_delete ON public.user_firms;
CREATE POLICY user_firms_delete ON public.user_firms AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = user_firms.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS user_firms_insert ON public.user_firms;
CREATE POLICY user_firms_insert ON public.user_firms AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = user_firms.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS user_firms_select ON public.user_firms;
CREATE POLICY user_firms_select ON public.user_firms AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS user_firms_update ON public.user_firms;
CREATE POLICY user_firms_update ON public.user_firms AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = user_firms.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS notif_settings_insert ON public.user_notification_settings;
CREATE POLICY notif_settings_insert ON public.user_notification_settings AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS notif_settings_select ON public.user_notification_settings;
CREATE POLICY notif_settings_select ON public.user_notification_settings AS PERMISSIVE FOR SELECT TO public
  USING (((user_id = auth.uid()) OR is_super_admin()));

DROP POLICY IF EXISTS notif_settings_update ON public.user_notification_settings;
CREATE POLICY notif_settings_update ON public.user_notification_settings AS PERMISSIVE FOR UPDATE TO public
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS vehicles_delete ON public.vehicles;
CREATE POLICY vehicles_delete ON public.vehicles AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = vehicles.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS vehicles_insert ON public.vehicles;
CREATE POLICY vehicles_insert ON public.vehicles AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = vehicles.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS vehicles_select ON public.vehicles;
CREATE POLICY vehicles_select ON public.vehicles AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS vehicles_update ON public.vehicles;
CREATE POLICY vehicles_update ON public.vehicles AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = vehicles.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS visits_delete ON public.visits;
CREATE POLICY visits_delete ON public.visits AS PERMISSIVE FOR DELETE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = visits.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS visits_insert ON public.visits;
CREATE POLICY visits_insert ON public.visits AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = visits.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS visits_select ON public.visits;
CREATE POLICY visits_select ON public.visits AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin() OR is_assigned(firm_id)));

DROP POLICY IF EXISTS visits_update ON public.visits;
CREATE POLICY visits_update ON public.visits AS PERMISSIVE FOR UPDATE TO public
  USING ((is_admin() OR (yazabilir() AND (EXISTS ( SELECT 1
   FROM user_firms uf
  WHERE ((uf.firm_id = visits.firm_id) AND (uf.user_id = auth.uid())))))));

DROP POLICY IF EXISTS workflow_rule_log_admin_read ON public.workflow_rule_log;
CREATE POLICY workflow_rule_log_admin_read ON public.workflow_rule_log AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text) AND (p.approval_status = 'approved'::text) AND (p.is_active = true)))));

DROP POLICY IF EXISTS workflow_rules_admin_all ON public.workflow_rules;
CREATE POLICY workflow_rules_admin_all ON public.workflow_rules AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text) AND (p.approval_status = 'approved'::text) AND (p.is_active = true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text) AND (p.approval_status = 'approved'::text) AND (p.is_active = true)))));

COMMIT;
