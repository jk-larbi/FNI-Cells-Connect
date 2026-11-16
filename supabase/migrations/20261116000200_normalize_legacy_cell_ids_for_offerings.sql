CREATE OR REPLACE FUNCTION public.sync_offering_from_cell_meeting_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_meeting_date date;
  v_cell_id text;
  v_cell_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.offerings WHERE report_id = OLD.id;
    RETURN OLD;
  END IF;

  v_meeting_date := COALESCE(NEW.meeting_date, NEW.submitted_at::date, CURRENT_DATE);
  SELECT c.id, c.name INTO v_cell_id, v_cell_name
  FROM public.cells c
  WHERE (c.id = NEW.cell_id OR c.firebase_id = NEW.cell_id)
    AND c.is_active IS TRUE
    AND COALESCE(c.is_archived, false) IS FALSE
  ORDER BY (c.id = NEW.cell_id) DESC
  LIMIT 1;

  IF COALESCE(NEW.offering, 0) > 0 AND v_cell_id IS NOT NULL THEN
    INSERT INTO public.offerings (
      id, report_id, cell_id, cell_name, tutor_uid, tutor_name, amount,
      currency, meeting_date, week_label, submitted_at, status
    )
    VALUES (
      'off-' || NEW.id, NEW.id, v_cell_id, v_cell_name, NEW.tutor_uid, NEW.tutor_name,
      NEW.offering, 'GHS', v_meeting_date,
      'Week ' || CEIL(EXTRACT(DAY FROM v_meeting_date) / 7.0)::int || ' (' || TO_CHAR(v_meeting_date, 'Mon') || ')',
      COALESCE(NEW.submitted_at, now()), NEW.status
    )
    ON CONFLICT (id) DO UPDATE SET
      cell_id = EXCLUDED.cell_id, cell_name = EXCLUDED.cell_name,
      tutor_uid = EXCLUDED.tutor_uid, tutor_name = EXCLUDED.tutor_name,
      amount = EXCLUDED.amount, currency = EXCLUDED.currency,
      meeting_date = EXCLUDED.meeting_date, week_label = EXCLUDED.week_label,
      submitted_at = EXCLUDED.submitted_at, status = EXCLUDED.status, updated_at = now();
  ELSE
    DELETE FROM public.offerings WHERE report_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.offerings o
SET cell_id = c.id, cell_name = c.name, updated_at = now()
FROM public.cells c
WHERE o.cell_id = c.firebase_id AND c.is_active IS TRUE AND COALESCE(c.is_archived, false) IS FALSE;

INSERT INTO public.offerings (
  id, report_id, cell_id, cell_name, tutor_uid, tutor_name, amount,
  currency, meeting_date, week_label, submitted_at, status
)
SELECT
  'off-' || r.id, r.id, c.id, c.name, r.tutor_uid, r.tutor_name, r.offering,
  'GHS', COALESCE(r.meeting_date, r.submitted_at::date, CURRENT_DATE),
  'Week ' || CEIL(EXTRACT(DAY FROM COALESCE(r.meeting_date, r.submitted_at::date, CURRENT_DATE)) / 7.0)::int
    || ' (' || TO_CHAR(COALESCE(r.meeting_date, r.submitted_at::date, CURRENT_DATE), 'Mon') || ')',
  COALESCE(r.submitted_at, now()), r.status
FROM public.cell_meeting_reports r
JOIN public.cells c ON c.id = r.cell_id OR c.firebase_id = r.cell_id
WHERE COALESCE(r.offering, 0) > 0 AND c.is_active IS TRUE AND COALESCE(c.is_archived, false) IS FALSE
ON CONFLICT (id) DO UPDATE SET
  cell_id = EXCLUDED.cell_id, cell_name = EXCLUDED.cell_name,
  amount = EXCLUDED.amount, status = EXCLUDED.status,
  meeting_date = EXCLUDED.meeting_date, submitted_at = EXCLUDED.submitted_at, updated_at = now();