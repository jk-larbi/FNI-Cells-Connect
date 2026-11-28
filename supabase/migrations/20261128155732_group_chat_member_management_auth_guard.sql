-- Require a real owner/moderator membership before management actions.
-- SQL NULL must not pass a PL/pgSQL IF authorization check.
do $$
declare
  v_definition text;
begin
  v_definition := pg_get_functiondef('public.manage_fni_group_chat_member(text,text,text,text)'::regprocedure);
  v_definition := replace(
    v_definition,
    'if v_actor_role not in (''owner'', ''moderator'') then',
    'if v_actor_role is null or v_actor_role not in (''owner'', ''moderator'') then'
  );
  v_definition := replace(
    v_definition,
    'case when v_action = ''set_role'' then v_role else v_target_role end',
    'case when v_action = ''set_role'' then v_role when v_action = ''add_member'' then ''member'' else v_target_role end'
  );
  execute v_definition;
end $$;
