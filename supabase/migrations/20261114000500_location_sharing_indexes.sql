-- Keep one live sharing session per tutor and index the tutor ownership foreign keys.
CREATE INDEX IF NOT EXISTS location_share_sessions_tutor_user_id_idx
  ON public.location_share_sessions(tutor_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS location_share_one_active_session_per_tutor
  ON public.location_share_sessions(tutor_user_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS location_share_points_tutor_user_id_idx
  ON public.location_share_points(tutor_user_id);
