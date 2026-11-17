-- Cell-owned tutor registration and cell/name/password sign-in.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL AND btrim(username) <> '';

CREATE OR REPLACE FUNCTION public.admin_create_cell(p_name text)
RETURNS TABLE(id text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_name text := btrim(p_name);
  v_normalized text;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION 'Administrator permission required';
  END IF;
  IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 120 THEN
    RAISE EXCEPTION 'Enter a cell name between 2 and 120 characters';
  END IF;
  v_normalized := regexp_replace(lower(v_name), '[^a-z0-9]', '', 'g');
  IF length(v_normalized) < 2 THEN
    RAISE EXCEPTION 'Enter a valid cell name';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cells c
    WHERE regexp_replace(lower(btrim(c.name)), '[^a-z0-9]', '', 'g') = v_normalized
      AND coalesce(c.is_archived, false) = false
  ) THEN
    RAISE EXCEPTION 'A cell with this name already exists';
  END IF;
  RETURN QUERY
    INSERT INTO public.cells (name, normalized_name, is_active, is_archived, status)
    VALUES (v_name, v_normalized, true, false, 'Active')
    RETURNING public.cells.id, public.cells.name;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_cell(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_cell(text) TO authenticated;

-- Public directory exposes only active cell names and tutor display names.
CREATE OR REPLACE FUNCTION public.tutor_signup_directory(p_cell_id text DEFAULT NULL)
RETURNS TABLE(id text, name text, entry_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_cell_id IS NULL THEN
    RETURN QUERY
      SELECT c.id, c.name, 'cell'::text
      FROM public.cells c
      WHERE c.is_active = true AND coalesce(c.is_archived, false) = false
      ORDER BY c.name;
  ELSE
    RETURN QUERY
      SELECT p.id, p.full_name, 'tutor'::text
      FROM public.profiles p
      WHERE p.cell_id = p_cell_id
        AND p.role = 'tutor'
        AND p.is_active = true
      ORDER BY p.full_name;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.tutor_signup_directory(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tutor_signup_directory(text) TO anon, authenticated;

-- Only administrators may create cells; tutors join an existing official cell.
DROP POLICY IF EXISTS cells_admin_insert ON public.cells;
CREATE POLICY cells_admin_insert ON public.cells
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

NOTIFY pgrst, 'reload schema';
