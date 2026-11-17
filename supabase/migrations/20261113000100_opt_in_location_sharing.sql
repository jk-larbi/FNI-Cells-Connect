-- Tutor-controlled, event-scoped location sharing.
-- Coordinates are accepted only for an authenticated tutor's currently active session.
CREATE TABLE IF NOT EXISTS public.location_share_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_profile_id text NOT NULL,
  tutor_name text NOT NULL,
  cell_id text,
  cell_name text,
  activity_type text NOT NULL CHECK (activity_type IN ('evangelism','cell_meeting')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE TABLE IF NOT EXISTS public.location_share_points (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.location_share_sessions(id) ON DELETE CASCADE,
  tutor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m double precision CHECK (accuracy_m IS NULL OR accuracy_m >= 0),
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS location_share_sessions_started_idx ON public.location_share_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS location_share_points_session_time_idx ON public.location_share_points(session_id, captured_at);
ALTER TABLE public.location_share_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_share_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS location_sessions_owner_or_admin_read ON public.location_share_sessions;
CREATE POLICY location_sessions_owner_or_admin_read ON public.location_share_sessions
FOR SELECT TO authenticated USING (tutor_user_id = (select auth.uid()) OR (select private.is_admin()));
DROP POLICY IF EXISTS location_points_owner_or_admin_read ON public.location_share_points;
CREATE POLICY location_points_owner_or_admin_read ON public.location_share_points
FOR SELECT TO authenticated USING (tutor_user_id = (select auth.uid()) OR (select private.is_admin()));
REVOKE ALL ON public.location_share_sessions FROM anon, authenticated;
REVOKE ALL ON public.location_share_points FROM anon, authenticated;
GRANT SELECT ON public.location_share_sessions, public.location_share_points TO authenticated;

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
    SELECT c.name,c.id INTO v_cell_name,v_canonical_cell_id FROM public.cells c
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
   VALUES(auth.uid(),v_profile.id,v_profile.full_name,v_canonical_cell_id,v_cell_name,p_activity_type)
   RETURNING id INTO v_session;
  RETURN v_session;
END; $$;

CREATE OR REPLACE FUNCTION public.record_location_share_point(
  p_session_id uuid, p_latitude double precision, p_longitude double precision, p_accuracy_m double precision DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_owner uuid; v_ended_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid coordinates'; END IF;
  SELECT tutor_user_id,ended_at INTO v_owner,v_ended_at
    FROM public.location_share_sessions WHERE id=p_session_id FOR UPDATE;
  IF NOT FOUND OR v_owner <> auth.uid() OR v_ended_at IS NOT NULL THEN
    RAISE EXCEPTION 'Location sharing is not active';
  END IF;
  INSERT INTO public.location_share_points(session_id,tutor_user_id,latitude,longitude,accuracy_m)
    VALUES(p_session_id,auth.uid(),p_latitude,p_longitude,p_accuracy_m);
END; $$;

CREATE OR REPLACE FUNCTION public.stop_location_share(p_session_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.location_share_sessions SET ended_at=now()
   WHERE id=p_session_id AND tutor_user_id=auth.uid() AND ended_at IS NULL;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  RETURN v_count=1;
END; $$;
REVOKE ALL ON FUNCTION public.start_location_share(text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.record_location_share_point(uuid,double precision,double precision,double precision) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.stop_location_share(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_location_share(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_location_share_point(uuid,double precision,double precision,double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stop_location_share(uuid) TO authenticated;
