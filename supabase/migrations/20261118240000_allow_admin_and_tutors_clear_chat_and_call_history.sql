-- FNI Cells Connect: Allow Administrators and Tutors to Clear Chat History & Call History
-- Migration: 20261118240000_allow_admin_and_tutors_clear_chat_and_call_history.sql

-- 1. CALL HISTORY POLICIES & PERMISSIONS
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS call_history_delete_own ON public.call_history;
CREATE POLICY call_history_delete_own ON public.call_history
FOR DELETE TO authenticated
USING (
  user_id = (select private.current_fni_profile_id())
  OR user_id = (select auth.uid())::text
  OR (select private.is_admin())
  OR (select private.is_fni_admin())
  OR (select public.is_admin())
);

-- RPC to clear caller's entire call history
CREATE OR REPLACE FUNCTION public.fni_clear_call_history()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile_id text := private.current_fni_profile_id();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE supabase_user_id = v_uid OR id = v_uid::text LIMIT 1;
  END IF;

  DELETE FROM public.call_history
  WHERE user_id = v_profile_id OR user_id = v_uid::text;

  RETURN true;
END;
$$;

-- RPC to delete an individual call history record
CREATE OR REPLACE FUNCTION public.fni_delete_call_record(p_record_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile_id text := private.current_fni_profile_id();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE supabase_user_id = v_uid OR id = v_uid::text LIMIT 1;
  END IF;

  DELETE FROM public.call_history
  WHERE id = p_record_id
    AND (
      user_id = v_profile_id 
      OR user_id = v_uid::text 
      OR private.is_admin() 
      OR private.is_fni_admin() 
      OR public.is_admin()
    );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fni_clear_call_history() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fni_clear_call_history() TO authenticated;

REVOKE ALL ON FUNCTION public.fni_delete_call_record(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fni_delete_call_record(uuid) TO authenticated;


-- 2. CHAT HISTORY CLEARING POLICIES & RPCS
ALTER TABLE public.community_chat_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chat_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own community chat preferences" ON public.community_chat_preferences;
CREATE POLICY "Users manage their own community chat preferences"
ON public.community_chat_preferences FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own private chat preferences" ON public.private_chat_preferences;
CREATE POLICY "Users manage their own private chat preferences"
ON public.private_chat_preferences FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RPC to clear community chat history (for self or for everyone if admin)
CREATE OR REPLACE FUNCTION public.fni_clear_community_chat_history(p_for_everyone boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  -- Admin broadcast clear
  IF p_for_everyone IS TRUE THEN
    IF NOT (private.is_admin() OR private.is_fni_admin() OR public.is_admin()) THEN
      RAISE EXCEPTION 'Administrator permission required to clear community chat for everyone.';
    END IF;

    UPDATE public.community_messages
    SET deleted_for_everyone_at = now()
    WHERE deleted_for_everyone_at IS NULL;

    RETURN true;
  END IF;

  -- Personal clear for current user
  INSERT INTO public.community_chat_preferences (user_id, cleared_at, updated_at)
  VALUES (v_uid, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    cleared_at = EXCLUDED.cleared_at,
    updated_at = EXCLUDED.updated_at;

  RETURN true;
END;
$$;

-- RPC to clear private chat history (for self or for both participants)
CREATE OR REPLACE FUNCTION public.fni_clear_private_chat_history(p_conversation_id text, p_for_everyone boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile_id text := private.current_fni_profile_id();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE supabase_user_id = v_uid OR id = v_uid::text LIMIT 1;
  END IF;

  IF p_for_everyone IS TRUE THEN
    UPDATE public.private_messages
    SET deleted_for_everyone_at = now()
    WHERE deleted_for_everyone_at IS NULL
      AND (
        (sender_uid = v_profile_id AND recipient_uid = p_conversation_id)
        OR (sender_uid = p_conversation_id AND recipient_uid = v_profile_id)
        OR (sender_uid = v_uid::text AND recipient_uid = p_conversation_id)
        OR (sender_uid = p_conversation_id AND recipient_uid = v_uid::text)
        OR (p_conversation_id = '*' AND (sender_uid = v_profile_id OR recipient_uid = v_profile_id OR sender_uid = v_uid::text OR recipient_uid = v_uid::text))
      );
  END IF;

  -- Personal clear: record in private_chat_preferences
  INSERT INTO public.private_chat_preferences (user_id, conversation_id, cleared_at, updated_at)
  VALUES (v_uid, p_conversation_id, now(), now())
  ON CONFLICT (user_id, conversation_id) DO UPDATE SET
    cleared_at = EXCLUDED.cleared_at,
    deleted_at = NULL,
    updated_at = EXCLUDED.updated_at;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fni_clear_community_chat_history(boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fni_clear_community_chat_history(boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.fni_clear_private_chat_history(text, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fni_clear_private_chat_history(text, boolean) TO authenticated;
