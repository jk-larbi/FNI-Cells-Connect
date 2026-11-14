-- Reversible trash for completed location-sharing sessions.
-- Keep the session and its GPS points in place so restoration is lossless.
ALTER TABLE public.location_share_sessions
  ADD COLUMN IF NOT EXISTS trashed_at timestamptz,
  ADD COLUMN IF NOT EXISTS trashed_by uuid REFERENCES auth.users(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'location_share_sessions_trashed_only_when_stopped'
      AND conrelid = 'public.location_share_sessions'::regclass
  ) THEN
    ALTER TABLE public.location_share_sessions
      ADD CONSTRAINT location_share_sessions_trashed_only_when_stopped
      CHECK (trashed_at IS NULL OR ended_at IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS location_share_sessions_trash_idx
  ON public.location_share_sessions(trashed_at DESC)
  WHERE trashed_at IS NOT NULL;

DROP POLICY IF EXISTS location_sessions_owner_or_admin_trash_update
  ON public.location_share_sessions;
CREATE POLICY location_sessions_owner_or_admin_trash_update
  ON public.location_share_sessions
  FOR UPDATE TO authenticated
  USING (tutor_user_id = (select auth.uid()) OR (select private.is_admin()))
  WITH CHECK (tutor_user_id = (select auth.uid()) OR (select private.is_admin()));

-- Preserve the existing read-only policy and grant only the two archive columns.
REVOKE UPDATE ON public.location_share_sessions FROM anon, authenticated;
GRANT UPDATE (trashed_at, trashed_by)
  ON public.location_share_sessions TO authenticated;
