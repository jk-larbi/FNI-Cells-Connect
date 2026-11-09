-- The combined cell_admin_insert and cell_admin_update policies already include owner checks.
DROP POLICY IF EXISTS cells_owner_insert ON public.cells;
DROP POLICY IF EXISTS cells_owner_update ON public.cells;
