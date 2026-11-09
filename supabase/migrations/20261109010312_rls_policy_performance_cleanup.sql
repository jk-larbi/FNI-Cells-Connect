-- Reduce redundant permissive policies and make private legacy storage explicitly deny-all.
DROP POLICY IF EXISTS regions_admin ON public.regions;
CREATE POLICY regions_admin_insert ON public.regions FOR INSERT TO authenticated WITH CHECK((select private.is_admin()));
CREATE POLICY regions_admin_update ON public.regions FOR UPDATE TO authenticated USING((select private.is_admin())) WITH CHECK((select private.is_admin()));
CREATE POLICY regions_admin_delete ON public.regions FOR DELETE TO authenticated USING((select private.is_admin()));

DROP POLICY IF EXISTS periods_admin ON public.reporting_periods;
CREATE POLICY periods_admin_insert ON public.reporting_periods FOR INSERT TO authenticated WITH CHECK((select private.is_admin()));
CREATE POLICY periods_admin_update ON public.reporting_periods FOR UPDATE TO authenticated USING((select private.is_admin())) WITH CHECK((select private.is_admin()));
CREATE POLICY periods_admin_delete ON public.reporting_periods FOR DELETE TO authenticated USING((select private.is_admin()));

DROP POLICY IF EXISTS materials_admin ON public.teaching_materials;
CREATE POLICY materials_admin_insert ON public.teaching_materials FOR INSERT TO authenticated WITH CHECK((select private.is_admin()));
CREATE POLICY materials_admin_update ON public.teaching_materials FOR UPDATE TO authenticated USING((select private.is_admin())) WITH CHECK((select private.is_admin()));
CREATE POLICY materials_admin_delete ON public.teaching_materials FOR DELETE TO authenticated USING((select private.is_admin()));

DROP POLICY IF EXISTS settings_admin ON public.system_settings;
CREATE POLICY settings_admin_insert ON public.system_settings FOR INSERT TO authenticated WITH CHECK((select private.is_admin()));
CREATE POLICY settings_admin_update ON public.system_settings FOR UPDATE TO authenticated USING((select private.is_admin())) WITH CHECK((select private.is_admin()));
CREATE POLICY settings_admin_delete ON public.system_settings FOR DELETE TO authenticated USING((select private.is_admin()));

DROP POLICY IF EXISTS soul_target_configs_admin ON public.soul_target_configs;
CREATE POLICY soul_target_configs_admin_insert ON public.soul_target_configs FOR INSERT TO authenticated WITH CHECK((select private.is_admin()));
CREATE POLICY soul_target_configs_admin_update ON public.soul_target_configs FOR UPDATE TO authenticated USING((select private.is_admin())) WITH CHECK((select private.is_admin()));
CREATE POLICY soul_target_configs_admin_delete ON public.soul_target_configs FOR DELETE TO authenticated USING((select private.is_admin()));

DROP POLICY IF EXISTS cells_admin ON public.cells;
CREATE POLICY cells_admin_insert ON public.cells FOR INSERT TO authenticated WITH CHECK((select private.is_admin()) OR (tutor_uid=(select auth.uid())::text AND (leader_id IS NULL OR leader_id=(select auth.uid())::text)));
CREATE POLICY cells_admin_update ON public.cells FOR UPDATE TO authenticated USING((select private.is_admin()) OR tutor_uid=(select auth.uid())::text)
WITH CHECK((select private.is_admin()) OR (tutor_uid=(select auth.uid())::text AND (leader_id IS NULL OR leader_id=(select auth.uid())::text)));
CREATE POLICY cells_admin_delete ON public.cells FOR DELETE TO authenticated USING((select private.is_admin()));

DROP POLICY IF EXISTS contacts_read ON public.evangelism_contacts;
DROP POLICY IF EXISTS followups_read ON public.follow_ups;
DROP POLICY IF EXISTS review_logs_admin ON public.review_logs;
DROP POLICY IF EXISTS review_logs_read ON public.review_logs;
CREATE POLICY review_logs_select ON public.review_logs FOR SELECT TO authenticated
USING((select private.is_admin()) OR reviewer_uid=(select auth.uid())::text);
CREATE POLICY review_logs_insert ON public.review_logs FOR INSERT TO authenticated WITH CHECK((select private.is_admin()));
CREATE POLICY review_logs_update ON public.review_logs FOR UPDATE TO authenticated USING((select private.is_admin())) WITH CHECK((select private.is_admin()));
CREATE POLICY review_logs_delete ON public.review_logs FOR DELETE TO authenticated USING((select private.is_admin()));

DROP POLICY IF EXISTS firebase_legacy_deny ON private.firebase_legacy_documents;
CREATE POLICY firebase_legacy_deny ON private.firebase_legacy_documents FOR ALL TO PUBLIC USING(false) WITH CHECK(false);
