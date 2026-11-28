-- Preserve the complete follow-up fields already used by the contact workflow.
-- Existing records remain NULL where these values were never captured.
ALTER TABLE public.evangelism_contacts
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS contact_attempts INTEGER,
  ADD COLUMN IF NOT EXISTS discipleship_progress TEXT,
  ADD COLUMN IF NOT EXISTS established_date DATE,
  ADD COLUMN IF NOT EXISTS completion_date DATE;

COMMENT ON COLUMN public.evangelism_contacts.contact_attempts IS
  'Number of follow-up attempts recorded by the ministry team; NULL means not recorded.';
COMMENT ON COLUMN public.evangelism_contacts.discipleship_progress IS
  'Current discipleship stage or progress note recorded for the contact.';
