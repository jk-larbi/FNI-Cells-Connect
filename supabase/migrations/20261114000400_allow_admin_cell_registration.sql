-- Allow administrators to register cells for assigned tutors or without an assigned login.
-- Tutor self-registration still requires auth.uid() to match the supplied tutor UID.
CREATE OR REPLACE FUNCTION public.register_cell_and_promote_tutor(
  p_name text, p_location text, p_tutor_uid text, p_leader_name text, p_leader_phone text,
  p_region_id text DEFAULT NULL, p_region_name text DEFAULT NULL,
  p_meeting_day text DEFAULT 'Wednesday', p_meeting_time text DEFAULT '18:30',
  p_venue_address text DEFAULT NULL, p_target_attendance integer DEFAULT 20, p_full_name text DEFAULT NULL
)
RETURNS TABLE(cell_id text, cell_name text, is_existing_associated boolean, duplicates_removed integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,private,pg_temp
AS $$
DECLARE
  v_uid text := auth.uid()::text;
  v_profile public.profiles%ROWTYPE;
  v_target_profile public.profiles%ROWTYPE;
  v_actor_is_admin boolean := false;
  v_normalized text;
  v_cell_id text;
  v_app_cell_id text;
  v_cell_tutor_uid text;
  v_dupe_ids text[];
  v_reference_ids text[];
  v_deleted integer := 0;
  v_existing boolean := false;
  v_table text;
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF nullif(trim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Cell name is required'; END IF;

  SELECT * INTO v_profile FROM public.profiles
   WHERE supabase_user_id=auth.uid() OR id=v_uid
   LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR NOT v_profile.is_active THEN RAISE EXCEPTION 'An active FNI account is required'; END IF;
  v_actor_is_admin := v_profile.role IN ('admin','super_admin','national_admin');

  IF NOT v_actor_is_admin AND p_tutor_uid IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You may only register a cell for your own authenticated account';
  END IF;

  IF v_actor_is_admin THEN
    v_cell_tutor_uid := nullif(trim(p_tutor_uid),'');
    IF v_cell_tutor_uid IS NULL OR v_cell_tutor_uid IN ('admin-created','unassigned') THEN
      RAISE EXCEPTION 'Select an existing active tutor account before registering this cell';
    END IF;
    SELECT * INTO v_target_profile FROM public.profiles
     WHERE (id=v_cell_tutor_uid OR supabase_user_id::text=v_cell_tutor_uid)
       AND is_active=true
     LIMIT 1 FOR UPDATE;
    IF v_target_profile.id IS NULL THEN
      RAISE EXCEPTION 'The selected tutor account could not be found or is inactive';
    END IF;
    v_cell_tutor_uid := coalesce(v_target_profile.supabase_user_id::text,v_target_profile.id);
  ELSE
    v_target_profile := v_profile;
    v_cell_tutor_uid := v_uid;
  END IF;

  IF v_target_profile.id IS NOT NULL AND v_target_profile.role IN ('admin','super_admin','national_admin') THEN
    RAISE EXCEPTION 'Administrator accounts cannot be assigned as cell tutors';
  END IF;

  v_normalized := regexp_replace(lower(trim(p_name)), '[^a-z0-9]', '', 'g');
  IF length(v_normalized)<3 THEN RAISE EXCEPTION 'Cell name must contain at least three letters or numbers'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_normalized));

  SELECT c.id INTO v_cell_id FROM public.cells c
   WHERE regexp_replace(lower(trim(c.name)), '[^a-z0-9]', '', 'g')=v_normalized
   ORDER BY c.is_archived ASC,c.is_active DESC,coalesce(c.total_members,0) DESC,
            coalesce(c.active_members,0) DESC,c.created_at ASC,c.id ASC
   LIMIT 1 FOR UPDATE;
  v_existing := v_cell_id IS NOT NULL;

  IF v_cell_id IS NULL THEN
    SELECT 'FNI-CEL-'||lpad((count(*)+1)::text,3,'0') INTO v_code FROM public.cells;
    INSERT INTO public.cells(
      name,normalized_name,location,tutor_uid,leader_id,leader_name,leader_phone,code,
      region_id,region_name,meeting_day,meeting_time,venue_address,target_attendance,status,is_active,is_archived
    ) VALUES (
      trim(p_name),v_normalized,coalesce(nullif(trim(p_location),''),'Central Fellowship Campus'),
      v_cell_tutor_uid,v_cell_tutor_uid,
      coalesce(nullif(trim(p_leader_name),''),nullif(v_target_profile.full_name,''),v_profile.full_name),
      nullif(trim(p_leader_phone),''),v_code,nullif(p_region_id,''),coalesce(p_region_name,''),
      coalesce(nullif(p_meeting_day,''),'Wednesday'),coalesce(nullif(p_meeting_time,''),'18:30'),
      coalesce(nullif(trim(p_venue_address),''),nullif(trim(p_location),''),'Fellowship Venue'),
      greatest(coalesce(p_target_attendance,20),1),'Active',true,false
    ) RETURNING id INTO v_cell_id;
  ELSE
    UPDATE public.cells SET
      name=trim(p_name),normalized_name=v_normalized,
      location=coalesce(nullif(trim(p_location),''),location,'Central Fellowship Campus'),
      tutor_uid=v_cell_tutor_uid,leader_id=v_cell_tutor_uid,
      leader_name=coalesce(nullif(trim(p_leader_name),''),leader_name),
      leader_phone=coalesce(nullif(trim(p_leader_phone),''),leader_phone),
      region_id=coalesce(nullif(p_region_id,''),region_id),region_name=coalesce(nullif(p_region_name,''),region_name),
      meeting_day=coalesce(nullif(p_meeting_day,''),meeting_day,'Wednesday'),
      meeting_time=coalesce(nullif(p_meeting_time,''),meeting_time,'18:30'),
      venue_address=coalesce(nullif(trim(p_venue_address),''),nullif(trim(p_location),''),venue_address),
      target_attendance=greatest(coalesce(p_target_attendance,target_attendance,20),1),
      is_active=true,is_archived=false,status='Active',updated_at=now()
    WHERE id=v_cell_id;
  END IF;

  UPDATE public.cells SET firebase_id=id WHERE id=v_cell_id AND firebase_id IS NULL;
  SELECT coalesce(firebase_id,id) INTO v_app_cell_id FROM public.cells WHERE id=v_cell_id;
  SELECT array_agg(id),array_agg(DISTINCT ref_id) INTO v_dupe_ids,v_reference_ids
    FROM public.cells c CROSS JOIN LATERAL unnest(ARRAY[c.id,c.firebase_id]) AS ref(ref_id)
   WHERE regexp_replace(lower(trim(c.name)), '[^a-z0-9]', '', 'g')=v_normalized
     AND c.id<>v_cell_id AND ref_id IS NOT NULL;
  v_dupe_ids:=coalesce(v_dupe_ids,ARRAY[]::text[]);
  v_reference_ids:=coalesce(v_reference_ids,ARRAY[]::text[]);

  IF cardinality(v_dupe_ids)>0 THEN
    UPDATE public.cells c SET
      total_members=greatest(coalesce(c.total_members,0),coalesce((SELECT max(x.total_members) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
      active_members=greatest(coalesce(c.active_members,0),coalesce((SELECT max(x.active_members) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
      new_members=greatest(coalesce(c.new_members,0),coalesce((SELECT max(x.new_members) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
      requiring_follow_up=greatest(coalesce(c.requiring_follow_up,0),coalesce((SELECT max(x.requiring_follow_up) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
      target_attendance=greatest(coalesce(c.target_attendance,0),coalesce((SELECT max(x.target_attendance) FROM public.cells x WHERE x.id=ANY(v_dupe_ids)),0)),
      updated_at=now() WHERE c.id=v_cell_id;
    FOREACH v_table IN ARRAY ARRAY['cell_meeting_reports','evangelism_reports','evangelism_contacts','follow_ups','offerings','offering_records','cell_reports','private_messages','location_share_sessions'] LOOP
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=v_table AND column_name='cell_id') THEN
        EXECUTE format('UPDATE public.%I SET cell_id=$1 WHERE cell_id=ANY($2)',v_table) USING v_app_cell_id,v_reference_ids;
      END IF;
    END LOOP;
    UPDATE public.profiles AS p SET cell_id=v_app_cell_id,cell_name=trim(p_name),updated_at=now()
     WHERE p.cell_id=ANY(v_reference_ids);
    DELETE FROM public.cells WHERE id=ANY(v_dupe_ids);
    GET DIAGNOSTICS v_deleted=ROW_COUNT;
  END IF;

  IF v_target_profile.id IS NOT NULL THEN
    UPDATE public.profiles SET
      role='tutor',is_active=true,is_onboarded=true,
      full_name=coalesce(nullif(trim(p_full_name),''),nullif(trim(p_leader_name),''),full_name),
      phone_number=coalesce(nullif(trim(p_leader_phone),''),phone_number),
      region_id=coalesce(nullif(p_region_id,''),region_id),
      region_name=coalesce(nullif(p_region_name,''),region_name),
      cell_id=v_app_cell_id,cell_name=trim(p_name),updated_at=now()
     WHERE id=v_target_profile.id;
  END IF;

  RETURN QUERY SELECT v_cell_id,trim(p_name),v_existing,v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.register_cell_and_promote_tutor(text,text,text,text,text,text,text,text,text,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_cell_and_promote_tutor(text,text,text,text,text,text,text,text,text,text,integer,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
