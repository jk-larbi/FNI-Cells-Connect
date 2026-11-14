-- Atomic cell deduplication/tutor promotion and location-share notifications.
-- Applied to the FNI Cells Connect Supabase project.

CREATE OR REPLACE FUNCTION public.register_cell_and_promote_tutor(
  p_name text,
  p_location text,
  p_tutor_uid text,
  p_leader_name text,
  p_leader_phone text,
  p_region_id text DEFAULT NULL,
  p_region_name text DEFAULT NULL,
  p_meeting_day text DEFAULT 'Wednesday',
  p_meeting_time text DEFAULT '18:30',
  p_venue_address text DEFAULT NULL,
  p_target_attendance integer DEFAULT 20,
  p_full_name text DEFAULT NULL
)
RETURNS TABLE(cell_id text, cell_name text, is_existing_associated boolean, duplicates_removed integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_uid text := auth.uid()::text;
  v_profile public.profiles%ROWTYPE;
  v_normalized text;
  v_cell_id text;
  v_app_cell_id text;
  v_dupe_ids text[];
  v_reference_ids text[];
  v_deleted integer := 0;
  v_existing boolean := false;
  v_table text;
  v_code text;
BEGIN
  IF auth.uid() IS NULL OR p_tutor_uid IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You may only register a cell for your own authenticated account';
  END IF;
  IF nullif(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Cell name is required';
  END IF;

  SELECT * INTO v_profile FROM public.profiles
   WHERE supabase_user_id = auth.uid() OR id = v_uid
   LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR NOT v_profile.is_active OR v_profile.role IN ('admin','super_admin','national_admin') THEN
    RAISE EXCEPTION 'An active tutor account is required to register a cell';
  END IF;

  v_normalized := regexp_replace(lower(trim(p_name)), '[^a-z0-9]', '', 'g');
  IF length(v_normalized) < 3 THEN
    RAISE EXCEPTION 'Cell name must contain at least three letters or numbers';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_normalized));

  SELECT c.id INTO v_cell_id
    FROM public.cells c
   WHERE regexp_replace(lower(coalesce(nullif(c.normalized_name,''), c.name)), '[^a-z0-9]', '', 'g') = v_normalized
   ORDER BY c.is_archived ASC, c.is_active DESC, c.created_at ASC, c.id ASC
   LIMIT 1 FOR UPDATE;
  v_existing := v_cell_id IS NOT NULL;

  IF v_cell_id IS NULL THEN
    SELECT 'FNI-CEL-' || lpad((count(*) + 1)::text, 3, '0') INTO v_code FROM public.cells;
    INSERT INTO public.cells (
      name, normalized_name, location, tutor_uid, leader_id, leader_name, leader_phone,
      code, region_id, region_name, meeting_day, meeting_time, venue_address,
      target_attendance, status, is_active, is_archived
    ) VALUES (
      trim(p_name), v_normalized, coalesce(nullif(trim(p_location),''), 'Central Fellowship Campus'),
      v_uid, v_uid, coalesce(nullif(trim(p_leader_name),''), v_profile.full_name),
      nullif(trim(p_leader_phone),''),
      v_code, nullif(p_region_id,''), coalesce(p_region_name,''), coalesce(nullif(p_meeting_day,''),'Wednesday'),
      coalesce(nullif(p_meeting_time,''),'18:30'), coalesce(nullif(trim(p_venue_address),''), nullif(trim(p_location),''), 'Fellowship Venue'),
      greatest(coalesce(p_target_attendance,20),1), 'Active', true, false
    ) RETURNING id INTO v_cell_id;
  ELSE
    UPDATE public.cells SET
      name = trim(p_name),
      normalized_name = v_normalized,
      location = coalesce(nullif(trim(p_location),''), location, 'Central Fellowship Campus'),
      tutor_uid = v_uid,
      leader_id = v_uid,
      leader_name = coalesce(nullif(trim(p_leader_name),''), leader_name),
      leader_phone = coalesce(nullif(trim(p_leader_phone),''), leader_phone),
      region_id = coalesce(nullif(p_region_id,''), region_id),
      region_name = coalesce(nullif(p_region_name,''), region_name),
      meeting_day = coalesce(nullif(p_meeting_day,''), meeting_day, 'Wednesday'),
      meeting_time = coalesce(nullif(p_meeting_time,''), meeting_time, '18:30'),
      venue_address = coalesce(nullif(trim(p_venue_address),''), nullif(trim(p_location),''), venue_address),
      target_attendance = greatest(coalesce(p_target_attendance,target_attendance,20),1),
      is_active = true, is_archived = false, status = 'Active', updated_at = now()
    WHERE id = v_cell_id;
  END IF;

  SELECT coalesce(c.firebase_id, c.id) INTO v_app_cell_id
    FROM public.cells c WHERE c.id = v_cell_id;

  SELECT array_agg(id), array_agg(DISTINCT ref_id)
    INTO v_dupe_ids, v_reference_ids
    FROM public.cells c
    CROSS JOIN LATERAL unnest(ARRAY[c.id, c.firebase_id]) AS ref(ref_id)
   WHERE regexp_replace(lower(coalesce(nullif(c.normalized_name,''), c.name)), '[^a-z0-9]', '', 'g') = v_normalized
     AND c.id <> v_cell_id
     AND ref_id IS NOT NULL;
  v_dupe_ids := coalesce(v_dupe_ids, ARRAY[]::text[]);
  v_reference_ids := coalesce(v_reference_ids, ARRAY[]::text[]);

  IF cardinality(v_dupe_ids) > 0 THEN
    UPDATE public.cells c SET
      total_members = greatest(coalesce(c.total_members,0), coalesce((SELECT max(x.total_members) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
      active_members = greatest(coalesce(c.active_members,0), coalesce((SELECT max(x.active_members) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
      new_members = greatest(coalesce(c.new_members,0), coalesce((SELECT max(x.new_members) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
      requiring_follow_up = greatest(coalesce(c.requiring_follow_up,0), coalesce((SELECT max(x.requiring_follow_up) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
      target_attendance = greatest(coalesce(c.target_attendance,0), coalesce((SELECT max(x.target_attendance) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
      updated_at=now() WHERE c.id=v_cell_id;
    FOREACH v_table IN ARRAY ARRAY[
      'cell_meeting_reports','evangelism_reports','evangelism_contacts','follow_ups',
      'offerings','offering_records','cell_reports','private_messages','location_share_sessions'
    ] LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name=v_table AND column_name='cell_id'
      ) THEN
        EXECUTE format('UPDATE public.%I SET cell_id = $1 WHERE cell_id = ANY($2)', v_table)
          USING v_app_cell_id, v_reference_ids;
      END IF;
    END LOOP;

    UPDATE public.profiles
       SET cell_id = v_app_cell_id, cell_name = trim(p_name), updated_at = now()
     WHERE cell_id = ANY(v_reference_ids);
    DELETE FROM public.cells WHERE id = ANY(v_dupe_ids);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  UPDATE public.profiles
     SET role = 'tutor',
         is_active = true,
         is_onboarded = true,
         full_name = coalesce(nullif(trim(p_full_name),''), nullif(trim(p_leader_name),''), full_name),
         phone_number = coalesce(nullif(trim(p_leader_phone),''), phone_number),
         region_id = coalesce(nullif(p_region_id,''), region_id),
         region_name = coalesce(nullif(p_region_name,''), region_name),
         cell_id = v_app_cell_id,
         cell_name = trim(p_name),
         updated_at = now()
   WHERE id = v_profile.id;

  RETURN QUERY SELECT v_cell_id, trim(p_name), v_existing, v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.register_cell_and_promote_tutor(text,text,text,text,text,text,text,text,text,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_cell_and_promote_tutor(text,text,text,text,text,text,text,text,text,text,integer,text) TO authenticated;

-- Clean up any exact-name duplicates already present, re-pointing history before deletion.
DO $
DECLARE g record; v_keep_id text; v_keep_app_id text; v_dupe_ids text[]; v_reference_ids text[]; v_table text;
BEGIN
  FOR g IN
    SELECT regexp_replace(lower(trim(name)), '[^a-z0-9]', '', 'g') AS norm
      FROM public.cells GROUP BY 1 HAVING count(*) > 1
  LOOP
    SELECT id INTO v_keep_id FROM public.cells
     WHERE regexp_replace(lower(trim(name)), '[^a-z0-9]', '', 'g')=g.norm
     ORDER BY is_archived ASC, is_active DESC, coalesce(total_members,0) DESC,
              coalesce(active_members,0) DESC, created_at ASC, id ASC
     LIMIT 1 FOR UPDATE;
    SELECT coalesce(firebase_id,id) INTO v_keep_app_id FROM public.cells WHERE id=v_keep_id;
    SELECT array_agg(id),array_agg(DISTINCT ref_id) INTO v_dupe_ids,v_reference_ids
      FROM public.cells c CROSS JOIN LATERAL unnest(ARRAY[c.id,c.firebase_id]) AS ref(ref_id)
     WHERE regexp_replace(lower(trim(c.name)), '[^a-z0-9]', '', 'g')=g.norm
       AND c.id<>v_keep_id AND ref_id IS NOT NULL;
    IF coalesce(cardinality(v_dupe_ids),0)>0 THEN
      UPDATE public.cells c SET
        total_members=greatest(coalesce(c.total_members,0),coalesce((SELECT max(x.total_members) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
        active_members=greatest(coalesce(c.active_members,0),coalesce((SELECT max(x.active_members) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
        new_members=greatest(coalesce(c.new_members,0),coalesce((SELECT max(x.new_members) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
        requiring_follow_up=greatest(coalesce(c.requiring_follow_up,0),coalesce((SELECT max(x.requiring_follow_up) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
        target_attendance=greatest(coalesce(c.target_attendance,0),coalesce((SELECT max(x.target_attendance) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
        updated_at=now() WHERE c.id=v_keep_id;
      FOREACH v_table IN ARRAY ARRAY['cell_meeting_reports','evangelism_reports','evangelism_contacts','follow_ups','offerings','offering_records','cell_reports','private_messages','location_share_sessions'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=v_table AND column_name='cell_id') THEN
          EXECUTE format('UPDATE public.%I SET cell_id=$1 WHERE cell_id=ANY($2)',v_table) USING v_keep_app_id,v_reference_ids;
        END IF;
      END LOOP;
      UPDATE public.profiles SET cell_id=v_keep_app_id,cell_name=(SELECT name FROM public.cells WHERE id=v_keep_id),updated_at=now()
       WHERE cell_id=ANY(v_reference_ids);
      DELETE FROM public.cells WHERE id=ANY(v_dupe_ids);
    END IF;
  END LOOP;
END $;

UPDATE public.cells SET normalized_name=regexp_replace(lower(trim(name)), '[^a-z0-9]', '', 'g')
 WHERE normalized_name IS NULL OR normalized_name='';
CREATE UNIQUE INDEX IF NOT EXISTS cells_normalized_name_unique
  ON public.cells(normalized_name) WHERE normalized_name IS NOT NULL AND normalized_name<>'';

CREATE OR REPLACE FUNCTION public.start_location_share(p_activity_type text, p_cell_id text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_cell_name text; v_canonical_cell_id text; v_session uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_activity_type NOT IN ('evangelism','cell_meeting') THEN RAISE EXCEPTION 'Invalid activity type'; END IF;
  SELECT * INTO v_profile FROM public.profiles
   WHERE supabase_user_id=auth.uid() AND is_active=true
     AND role IN ('tutor','cell_leader','regional_leader') LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active tutor profile required'; END IF;
  IF p_cell_id IS NOT NULL THEN
    SELECT c.name,coalesce(c.firebase_id,c.id) INTO v_cell_name,v_canonical_cell_id FROM public.cells c
     WHERE (c.id=p_cell_id OR c.firebase_id=p_cell_id)
       AND (c.tutor_uid=auth.uid()::text OR c.leader_id=auth.uid()::text
            OR v_profile.cell_id=c.id OR v_profile.cell_id=c.firebase_id) LIMIT 1;
    IF v_canonical_cell_id IS NULL THEN RAISE EXCEPTION 'You are not authorised to share for this cell'; END IF;
  ELSE
    v_canonical_cell_id := v_profile.cell_id;
    v_cell_name := v_profile.cell_name;
  END IF;
  UPDATE public.location_share_sessions SET ended_at=now()
   WHERE tutor_user_id=auth.uid() AND ended_at IS NULL;
  INSERT INTO public.location_share_sessions(tutor_user_id,tutor_profile_id,tutor_name,cell_id,cell_name,activity_type)
   VALUES(auth.uid(),v_profile.id,coalesce(v_profile.full_name,'Tutor'),v_canonical_cell_id,v_cell_name,p_activity_type)
   RETURNING id INTO v_session;

  INSERT INTO public.notifications (
    id,user_id,title,message,type,channel,target_tab,metadata,is_read,created_at
  ) VALUES (
    'location-share-' || v_session::text,
    'admin',
    'Tutor started live location sharing',
    coalesce(v_profile.full_name,'A tutor') || ' has started sharing their live location for ' ||
      CASE WHEN p_activity_type='evangelism' THEN 'evangelism outreach' ELSE 'a cell meeting' END ||
      coalesce(' · ' || v_cell_name,'') || '.',
    'system_alert','in_app','dashboard',
    jsonb_build_object('recipientRole','admin','targetTab','dashboard','category','location',
      'sessionId',v_session,'tutorUserId',auth.uid(),'tutorName',coalesce(v_profile.full_name,'Tutor'),
      'cellName',v_cell_name,'activityType',p_activity_type),
    false,now()
  ) ON CONFLICT (id) DO NOTHING;
  RETURN v_session;
END; $$;
REVOKE ALL ON FUNCTION public.start_location_share(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_location_share(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.stop_location_share(p_session_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.location_share_sessions SET ended_at=now()
   WHERE id=p_session_id AND tutor_user_id=auth.uid() AND ended_at IS NULL;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count=1 AND NOT EXISTS (SELECT 1 FROM public.location_share_points WHERE session_id=p_session_id) THEN
    DELETE FROM public.notifications WHERE id='location-share-' || p_session_id::text;
  END IF;
  RETURN v_count=1;
END; $$;
REVOKE ALL ON FUNCTION public.stop_location_share(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stop_location_share(uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='location_share_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.location_share_sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='location_share_points') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.location_share_points;
  END IF;
END $$;
