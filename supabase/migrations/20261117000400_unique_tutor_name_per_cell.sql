-- A tutor's display name must uniquely identify them within their selected cell.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_tutor_cell_name_unique
  ON public.profiles (cell_id, lower(btrim(full_name)))
  WHERE role = 'tutor' AND cell_id IS NOT NULL;
