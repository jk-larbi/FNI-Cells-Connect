-- Align evangelism_contacts with the follow-up fields used by the application.
-- Existing rows keep NULL for optional values that were never recorded.
ALTER TABLE public.evangelism_contacts
  ADD COLUMN IF NOT EXISTS follow_up_status TEXT NOT NULL DEFAULT 'Uncontacted',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_notes TEXT,
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS contact_attempts INTEGER,
  ADD COLUMN IF NOT EXISTS discipleship_progress TEXT,
  ADD COLUMN IF NOT EXISTS established_date DATE,
  ADD COLUMN IF NOT EXISTS completion_date DATE,
  ADD COLUMN IF NOT EXISTS last_follow_up_date DATE,
  ADD COLUMN IF NOT EXISTS next_follow_up_date DATE,
  ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.evangelism_contacts.contact_attempts IS
  'Number of follow-up attempts recorded by the ministry team; NULL means not recorded.';
COMMENT ON COLUMN public.evangelism_contacts.discipleship_progress IS
  'Current discipleship stage or progress note recorded for the contact.';
COMMENT ON COLUMN public.evangelism_contacts.legacy_data IS
  'Preserves legacy contact metadata not represented by dedicated columns.';
