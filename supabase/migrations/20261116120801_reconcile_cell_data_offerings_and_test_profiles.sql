ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET is_test_account = true, updated_at = now()
WHERE id IN ('fa433004-b028-4ac8-9dec-138bf81e61cf', '06ff4b6f-0b90-4973-943f-8bc7f79a5bfd')
AND (lower(coalesce(full_name, '')) IN ('test tutor', 'test fni member') OR lower(coalesce(email, '')) LIKE '%dummy%');

CREATE OR REPLACE FUNCTION public.get_member_directory()
RETURNS TABLE(id text, full_name text, username text, role text, cell_name text, avatar_url text, region_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT p.id::text, p.full_name, p.username, p.role::text, p.cell_name, p.avatar_url, p.region_name, p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.is_active IS TRUE AND p.is_test_account IS FALSE
    AND p.role IN ('tutor', 'admin', 'super_admin') AND p.id <> auth.uid()::text
  ORDER BY lower(p.full_name);
$function$;
REVOKE ALL ON FUNCTION public.get_member_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_directory() TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_offering_from_cell_meeting_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_meeting_date date;
  v_cell_id text;
  v_cell_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.offerings WHERE report_id = OLD.id;
    RETURN OLD;
  END IF;

  v_meeting_date := COALESCE(NEW.meeting_date, NEW.submitted_at::date, CURRENT_DATE);
  SELECT c.id, c.name INTO v_cell_id, v_cell_name
  FROM public.cells c
  WHERE (c.id = NEW.cell_id OR c.firebase_id = NEW.cell_id)
    AND c.is_active IS TRUE AND COALESCE(c.is_archived, false) IS FALSE
  ORDER BY (c.id = NEW.cell_id) DESC
  LIMIT 1;

  IF COALESCE(NEW.offering, 0) > 0 AND v_cell_id IS NOT NULL THEN
    INSERT INTO public.offerings (
      id, report_id, cell_id, cell_name, tutor_uid, tutor_name, amount,
      currency, meeting_date, week_label, submitted_at, status
    )
    VALUES (
      'off-' || NEW.id, NEW.id, v_cell_id, v_cell_name, NEW.tutor_uid, NEW.tutor_name,
      NEW.offering, 'GHS', v_meeting_date,
      'Week ' || CEIL(EXTRACT(DAY FROM v_meeting_date) / 7.0)::int || ' (' || TO_CHAR(v_meeting_date, 'Mon') || ')',
      COALESCE(NEW.submitted_at, now()), NEW.status
    )
    ON CONFLICT (id) DO UPDATE SET
      cell_id = EXCLUDED.cell_id, cell_name = EXCLUDED.cell_name,
      tutor_uid = EXCLUDED.tutor_uid, tutor_name = EXCLUDED.tutor_name,
      amount = EXCLUDED.amount, currency = EXCLUDED.currency,
      meeting_date = EXCLUDED.meeting_date, week_label = EXCLUDED.week_label,
      submitted_at = EXCLUDED.submitted_at, status = EXCLUDED.status, updated_at = now();
  ELSE
    DELETE FROM public.offerings WHERE report_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.sync_offering_from_cell_meeting_report() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_offering_from_cell_meeting_report_trigger ON public.cell_meeting_reports;
CREATE TRIGGER sync_offering_from_cell_meeting_report_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.cell_meeting_reports
FOR EACH ROW EXECUTE FUNCTION public.sync_offering_from_cell_meeting_report();

INSERT INTO public.offerings (
  id, report_id, cell_id, cell_name, tutor_uid, tutor_name, amount,
  currency, meeting_date, week_label, submitted_at, status
)
SELECT
  'off-' || r.id, r.id, c.id, c.name, r.tutor_uid, r.tutor_name, r.offering,
  'GHS', COALESCE(r.meeting_date, r.submitted_at::date, CURRENT_DATE),
  'Week ' || CEIL(EXTRACT(DAY FROM COALESCE(r.meeting_date, r.submitted_at::date, CURRENT_DATE)) / 7.0)::int
    || ' (' || TO_CHAR(COALESCE(r.meeting_date, r.submitted_at::date, CURRENT_DATE), 'Mon') || ')',
  COALESCE(r.submitted_at, now()), r.status
FROM public.cell_meeting_reports r
JOIN public.cells c ON (c.id = r.cell_id OR c.firebase_id = r.cell_id)
WHERE COALESCE(r.offering, 0) > 0 AND c.is_active IS TRUE AND COALESCE(c.is_archived, false) IS FALSE
ON CONFLICT (id) DO UPDATE SET
  cell_id = EXCLUDED.cell_id, cell_name = EXCLUDED.cell_name,
  amount = EXCLUDED.amount, status = EXCLUDED.status,
  meeting_date = EXCLUDED.meeting_date, submitted_at = EXCLUDED.submitted_at, updated_at = now();

CREATE OR REPLACE FUNCTION public.admin_delete_cell_registrations(p_cell_ids text[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_keys text[];
  v_names text[];
  v_deleted_count integer;
  v_table text;
  v_user_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator permission required'; END IF;
  IF p_cell_ids IS NULL OR cardinality(p_cell_ids) = 0 THEN RAISE EXCEPTION 'Select at least one cell'; END IF;

  SELECT array_agg(DISTINCT key_value), array_agg(DISTINCT cell_name) INTO v_keys, v_names
  FROM (
    SELECT c.id::text AS key_value, c.name AS cell_name FROM public.cells c
    WHERE c.id::text = ANY(p_cell_ids) OR c.firebase_id = ANY(p_cell_ids)
    UNION ALL
    SELECT c.firebase_id AS key_value, c.name AS cell_name FROM public.cells c
    WHERE c.firebase_id IS NOT NULL AND (c.id::text = ANY(p_cell_ids) OR c.firebase_id = ANY(p_cell_ids))
  ) matched WHERE key_value IS NOT NULL;

  IF v_keys IS NULL OR cardinality(v_keys) = 0 THEN RAISE EXCEPTION 'No matching cell registrations were found'; END IF;
  SELECT full_name INTO v_user_name FROM public.profiles WHERE supabase_user_id = auth.uid();

  INSERT INTO public.audit_logs (user_id, user_name, action, entity_type, entity_id, details, created_at)
  VALUES (auth.uid()::text, COALESCE(v_user_name, 'Administrator'), 'DELETE_CELL_REGISTRATIONS', 'cell',
    array_to_string(v_keys, ','),
    jsonb_build_object('cell_names', COALESCE(v_names, ARRAY[]::text[]), 'cell_keys', v_keys, 'associated_history_permanently_deleted', true), now());

  IF to_regclass('public.review_logs') IS NOT NULL THEN
    DELETE FROM public.review_logs WHERE report_id IN (
      SELECT id::text FROM public.cell_meeting_reports WHERE cell_id = ANY(v_keys)
      UNION SELECT id::text FROM public.evangelism_reports WHERE cell_id = ANY(v_keys));
  END IF;

  IF to_regclass('public.location_share_points') IS NOT NULL AND to_regclass('public.location_share_sessions') IS NOT NULL THEN
    DELETE FROM public.location_share_points WHERE session_id IN (
      SELECT id FROM public.location_share_sessions WHERE cell_id::text = ANY(v_keys));
  END IF;

  IF to_regclass('public.community_message_reactions') IS NOT NULL AND to_regclass('public.community_messages') IS NOT NULL THEN
    DELETE FROM public.community_message_reactions WHERE message_id IN (
      SELECT id FROM public.community_messages WHERE cell_name = ANY(COALESCE(v_names, ARRAY[]::text[])));
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    DELETE FROM public.notifications
    WHERE COALESCE(metadata->>'cell_id', metadata->>'cellId') = ANY(v_keys)
       OR COALESCE(metadata->>'cell_name', metadata->>'cellName') = ANY(COALESCE(v_names, ARRAY[]::text[]));
  END IF;

  FOREACH v_table IN ARRAY ARRAY[
    'community_members', 'follow_ups', 'evangelism_contacts', 'cell_meeting_reports',
    'evangelism_reports', 'offerings', 'offering_records', 'cell_reports',
    'private_messages', 'location_share_sessions'
  ] LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE cell_id::text = ANY($1)', v_table) USING v_keys;
    END IF;
  END LOOP;

  IF to_regclass('public.community_messages') IS NOT NULL THEN
    DELETE FROM public.community_messages WHERE cell_name = ANY(COALESCE(v_names, ARRAY[]::text[]));
  END IF;

  UPDATE public.profiles SET cell_id = NULL, cell_name = NULL, updated_at = now()
  WHERE cell_id::text = ANY(v_keys) OR cell_name = ANY(COALESCE(v_names, ARRAY[]::text[]));

  DELETE FROM public.cells WHERE id::text = ANY(v_keys) OR firebase_id = ANY(v_keys);
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count = 0 THEN RAISE EXCEPTION 'No cell registrations were deleted'; END IF;
  RETURN TRUE;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_delete_cell_registrations(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_cell_registrations(text[]) TO authenticated;
