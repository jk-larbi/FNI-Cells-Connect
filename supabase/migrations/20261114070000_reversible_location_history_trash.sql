-- Reversible trash for completed location-sharing sessions.
-- Active sessions cannot be trashed; their GPS watcher must be stopped first.
ALTER TABLE public.location_share_sessions
  ADD COLUMN IF NOT EXISTS trashed_at timestamptz,
  ADD COLUMN IF NOT EXISTS trashed_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS location_share_sessions_trash_idx
  ON public.location_share_sessions(trashed_at DESC)
  WHERE trashed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.trash_location_share_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private,pg_temp
AS $$
DECLARE v_owner uuid; v_ended_at timestamptz; v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT tutor_user_id, ended_at INTO v_owner, v_ended_at
    FROM public.location_share_sessions WHERE id=p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Location session not found'; END IF;
  IF v_ended_at IS NULL THEN RAISE EXCEPTION 'Stop live sharing before moving this session to Trash'; END IF;
  IF v_owner <> auth.uid() AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'You are not authorised to move this session to Trash';
  END IF;
  UPDATE public.location_share_sessions
    SET trashed_at=now(), trashed_by=auth.uid()
    WHERE id=p_session_id AND trashed_at IS NULL;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  RETURN v_count=1;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_location_share_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private,pg_temp
AS $$
DECLARE v_owner uuid; v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT tutor_user_id INTO v_owner
    FROM public.location_share_sessions WHERE id=p_session_id AND trashed_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trashed location session not found'; END IF;
  IF v_owner <> auth.uid() AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'You are not authorised to restore this session';
  END IF;
  UPDATE public.location_share_sessions
    SET trashed_at=NULL, trashed_by=NULL
    WHERE id=p_session_id AND trashed_at IS NOT NULL;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  RETURN v_count=1;
END;
$$;

REVOKE ALL ON FUNCTION public.trash_location_share_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_location_share_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trash_location_share_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_location_share_session(uuid) TO authenticated;
