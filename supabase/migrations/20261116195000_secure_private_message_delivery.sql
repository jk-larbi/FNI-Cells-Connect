-- Secure, role-aware private-message delivery for FNI Cells Connect.
-- All writes are authenticated against auth.uid(); client-supplied sender
-- identity and role are never trusted.

create or replace function public.fni_send_private_message(p_message jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid text := auth.uid()::text;
  v_sender public.profiles%rowtype;
  v_recipient public.profiles%rowtype;
  v_recipient_uid text := nullif(p_message->>'recipient_uid', '');
  v_message_id text := nullif(p_message->>'id', '');
  v_content text := coalesce(p_message->>'content', '');
  v_recipient_name text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to send a private message.';
  end if;

  if v_message_id is null or length(trim(v_content)) = 0 then
    raise exception 'A message ID and message content are required.';
  end if;

  select * into v_sender
  from public.profiles p
  where p.supabase_user_id = auth.uid()
     or p.id = auth.uid()::text
  order by case when p.supabase_user_id = auth.uid() then 0 else 1 end
  limit 1;

  if not found or coalesce(v_sender.is_active, false) is not true then
    raise exception 'Your active FNI profile could not be verified.';
  end if;

  if v_recipient_uid is null or v_recipient_uid = v_uid then
    raise exception 'Choose a valid recipient for this message.';
  end if;

  if v_recipient_uid = 'admin' then
    if v_sender.role not in ('tutor', 'cell_leader') then
      raise exception 'Only tutors can use the leadership inbox recipient.';
    end if;
    v_recipient_name := 'Administrator / Leadership';
  else
    select * into v_recipient
    from public.profiles p
    where p.id = v_recipient_uid
      and p.is_active = true
    limit 1;

    if not found then
      raise exception 'The recipient is not an active FNI member.';
    end if;

    if v_sender.role in ('admin', 'super_admin', 'national_admin') then
      if v_recipient.role not in ('tutor', 'cell_leader') then
        raise exception 'Administrators can send private messages to active tutors.';
      end if;
    elsif v_sender.role in ('tutor', 'cell_leader') then
      if v_recipient.role not in ('tutor', 'cell_leader', 'admin', 'super_admin', 'national_admin') then
        raise exception 'This member cannot receive private messages.';
      end if;
    else
      raise exception 'Your account is not authorised to send private messages.';
    end if;

    v_recipient_name := v_recipient.full_name;
  end if;

  insert into public.private_messages (
    id, sender_uid, sender_name, sender_role, recipient_uid, recipient_name,
    cell_id, cell_name, content, is_read, read_at, reply_to, attachments
  ) values (
    v_message_id,
    v_uid,
    v_sender.full_name,
    v_sender.role,
    v_recipient_uid,
    coalesce(nullif(v_recipient_name, ''), nullif(p_message->>'recipient_name', ''), 'FNI Member'),
    v_sender.cell_id,
    v_sender.cell_name,
    trim(v_content),
    false,
    null,
    coalesce(p_message->'reply_to', 'null'::jsonb),
    coalesce(p_message->'attachments', '[]'::jsonb)
  )
  on conflict (id) do nothing;

  return true;
end;
$$;

revoke all on function public.fni_send_private_message(jsonb) from public, anon;
grant execute on function public.fni_send_private_message(jsonb) to authenticated;
