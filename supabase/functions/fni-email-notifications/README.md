# FNI email notifications

Set these Supabase Edge Function secrets before email delivery can work:

- `RESEND_API_KEY`: API key from Resend.
- `EMAIL_FROM`: verified sender, e.g. `FNI Cells Connect <notifications@your-verified-domain.org>`.

The function uses Supabase's built-in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` runtime secrets. Do not commit provider keys to GitHub or frontend environment variables.

The authenticated caller is verified from its Supabase JWT. Report alerts require the caller to own the persisted report. Teaching-material and announcement broadcasts require an active administrator and verify the persisted published material / announcement. The destination for report alerts is stored in the single-row `admin_notification_settings` table and is configured from Admin Settings after login. Tutor broadcasts go only to active profiles with registered email addresses.
