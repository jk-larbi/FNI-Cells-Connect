-- FNI Cells Connect: Reporting Deadlines for Both Cell Meeting and Evangelism Reports
-- Migration: 20261118241000_both_report_types_deadline_settings.sql

-- 1. Add dedicated columns for both report types to public.system_settings
ALTER TABLE public.system_settings
    ADD COLUMN IF NOT EXISTS evangelism_deadline_day TEXT DEFAULT 'Saturday',
    ADD COLUMN IF NOT EXISTS evangelism_deadline_time TEXT DEFAULT '17:00',
    ADD COLUMN IF NOT EXISTS enable_meeting_reminders BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS enable_evangelism_reminders BOOLEAN DEFAULT true;

-- 2. Backfill existing rows with defaults if null
UPDATE public.system_settings
SET 
    submission_deadline_day = COALESCE(submission_deadline_day, 'Sunday'),
    submission_deadline_time = COALESCE(submission_deadline_time, '18:00'),
    evangelism_deadline_day = COALESCE(evangelism_deadline_day, 'Saturday'),
    evangelism_deadline_time = COALESCE(evangelism_deadline_time, '17:00'),
    enable_meeting_reminders = COALESCE(enable_meeting_reminders, true),
    enable_evangelism_reminders = COALESCE(enable_evangelism_reminders, true)
WHERE id = 'global';

-- 3. Dedicated SECURITY DEFINER RPC to configure and persist deadlines for both report types
CREATE OR REPLACE FUNCTION public.save_fni_report_deadlines(
  p_meeting_day text,
  p_meeting_time text,
  p_evang_day text,
  p_evang_time text,
  p_enable_meeting_reminders boolean DEFAULT true,
  p_enable_evangelism_reminders boolean DEFAULT true,
  p_updated_by text DEFAULT 'Administrator'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  -- Verify caller is an administrator
  IF NOT (
    private.is_admin() 
    OR private.is_fni_admin() 
    OR public.is_admin()
  ) THEN
    RAISE EXCEPTION 'Administrator privileges are required to configure FNI report deadlines.';
  END IF;

  INSERT INTO public.system_settings (
    id,
    submission_deadline_day,
    submission_deadline_time,
    evangelism_deadline_day,
    evangelism_deadline_time,
    enable_meeting_reminders,
    enable_evangelism_reminders,
    weekly_deadline,
    updated_at,
    updated_by
  ) VALUES (
    'global',
    COALESCE(p_meeting_day, 'Sunday'),
    COALESCE(p_meeting_time, '18:00'),
    COALESCE(p_evang_day, 'Saturday'),
    COALESCE(p_evang_time, '17:00'),
    COALESCE(p_enable_meeting_reminders, true),
    COALESCE(p_enable_evangelism_reminders, true),
    'Cell Meetings: ' || COALESCE(p_meeting_day, 'Sunday') || ' at ' || COALESCE(p_meeting_time, '18:00') || ' | Evangelism: ' || COALESCE(p_evang_day, 'Saturday') || ' at ' || COALESCE(p_evang_time, '17:00') || ' Ghana Time',
    timezone('utc'::text, now()),
    COALESCE(p_updated_by, 'Administrator')
  )
  ON CONFLICT (id) DO UPDATE SET
    submission_deadline_day = EXCLUDED.submission_deadline_day,
    submission_deadline_time = EXCLUDED.submission_deadline_time,
    evangelism_deadline_day = EXCLUDED.evangelism_deadline_day,
    evangelism_deadline_time = EXCLUDED.evangelism_deadline_time,
    enable_meeting_reminders = EXCLUDED.enable_meeting_reminders,
    enable_evangelism_reminders = EXCLUDED.enable_evangelism_reminders,
    weekly_deadline = EXCLUDED.weekly_deadline,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by;

  RETURN true;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.save_fni_report_deadlines TO authenticated;
