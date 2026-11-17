-- Tutors can receive authenticated broadcast notifications.
CREATE POLICY notifications_read_broadcast
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = 'all');

-- A tutor may alert leadership about a report only after the matching report
-- exists and belongs to that authenticated tutor.
CREATE POLICY notifications_insert_report_submission
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = 'admin'
  AND type = 'report_submitted'
  AND (
    EXISTS (
      SELECT 1
      FROM public.cell_meeting_reports r
      WHERE r.id = metadata ->> 'reportId'
        AND r.tutor_uid = (SELECT auth.uid())::text
    )
    OR EXISTS (
      SELECT 1
      FROM public.evangelism_reports r
      WHERE r.id = metadata ->> 'reportId'
        AND r.tutor_uid = (SELECT auth.uid())::text
    )
  )
);
