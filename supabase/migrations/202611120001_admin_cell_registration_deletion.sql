-- Admin-only permanent deletion of selected cell registrations and cell-owned history.
-- Tutor/leader accounts are deliberately retained and unlinked; audit logs are preserved.
CREATE OR REPLACE FUNCTION public.admin_delete_cell_registrations(p_cell_ids TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_keys TEXT[];
  v_names TEXT[];
  v_deleted_count INTEGER;
  v_table TEXT;
  v_user_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator permission required';
  END IF;

  IF p_cell_ids IS NULL OR cardinality(p_cell_ids) = 0 THEN
    RAISE EXCEPTION 'Select at least one cell';
  END IF;

  SELECT array_agg(DISTINCT key_value), array_agg(DISTINCT name)
    INTO v_keys, v_names
  FROM (
    SELECT c.id::text AS key_value, c.name
    FROM public.cells c
    WHERE c.id::text = ANY(p_cell_ids) OR c.firebase_id = ANY(p_cell_ids)
    UNION ALL
    SELECT c.firebase_id, c.name
    FROM public.cells c
    WHERE c.id::text = ANY(p_cell_ids) OR c.firebase_id = ANY(p_cell_ids)
      AND c.firebase_id IS NOT NULL
  ) matched;

  IF v_keys IS NULL OR cardinality(v_keys) = 0 THEN
    RAISE EXCEPTION 'No matching cell registrations were found';
  END IF;

  SELECT full_name INTO v_user_name
  FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.audit_logs (user_id, user_name, action, entity_type, entity_id, details, created_at)
  VALUES (
    auth.uid(), COALESCE(v_user_name, 'Administrator'),
    'DELETE_CELL_REGISTRATIONS', 'cell',
    array_to_string(v_keys, ','),
    jsonb_build_object('cell_names', COALESCE(v_names, ARRAY[]::text[]),
                       'cell_keys', v_keys,
                       'associated_history_permanently_deleted', true),
    now()
  );

  -- Remove review history tied to reports being removed.
  IF to_regclass('public.review_logs') IS NOT NULL THEN
    DELETE FROM public.review_logs
    WHERE report_id IN (
      SELECT id::text FROM public.cell_meeting_reports WHERE cell_id = ANY(v_keys)
      UNION
      SELECT id::text FROM public.evangelism_reports WHERE cell_id = ANY(v_keys)
    );
  END IF;

  -- Remove all records whose ownership is keyed by the cell registration.
  FOREACH v_table IN ARRAY ARRAY[
    'follow_ups', 'evangelism_contacts', 'cell_meeting_reports',
    'evangelism_reports', 'offerings', 'offering_records',
    'cell_reports', 'private_messages', 'community_messages'
  ] LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE cell_id::text = ANY($1)', v_table)
      USING v_keys;
    END IF;
  END LOOP;

  -- Keep leader/tutor login accounts, but detach their cell assignment.
  UPDATE public.profiles
  SET cell_id = NULL, cell_name = NULL, updated_at = now()
  WHERE cell_id::text = ANY(v_keys)
     OR cell_name = ANY(COALESCE(v_names, ARRAY[]::text[]));

  DELETE FROM public.cells
  WHERE id::text = ANY(v_keys) OR firebase_id = ANY(v_keys);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'No cell registrations were deleted';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_cell_registrations(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_cell_registrations(TEXT[]) TO authenticated;
