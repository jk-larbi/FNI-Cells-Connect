-- Disable the legacy tutor-capable cell creation RPC.
-- All new cells must be created through the administrator-only admin_create_cell RPC.
REVOKE ALL ON FUNCTION public.register_cell_and_promote_tutor(text,text,text,text,text,text,text,text,text,text,integer,text)
  FROM PUBLIC, anon, authenticated;
