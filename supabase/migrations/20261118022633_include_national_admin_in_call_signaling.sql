drop policy if exists "fni_call_participants_can_receive_signals" on realtime.messages;
drop policy if exists "fni_call_participants_can_send_signals" on realtime.messages;
create policy "fni_call_participants_can_receive_signals" on realtime.messages
for select to authenticated using (
 extension='broadcast' and split_part(realtime.topic(),':',1)='fni-call'
 and exists(select 1 from public.profiles p
  where p.supabase_user_id=(select auth.uid())
   and p.id in (split_part(realtime.topic(),':',3),split_part(realtime.topic(),':',4))
   and p.is_active is true and coalesce(p.is_test_account,false) is false
   and p.role in ('tutor','admin','super_admin','national_admin'))
);
create policy "fni_call_participants_can_send_signals" on realtime.messages
for insert to authenticated with check (
 extension='broadcast' and split_part(realtime.topic(),':',1)='fni-call'
 and exists(select 1 from public.profiles p
  where p.supabase_user_id=(select auth.uid())
   and p.id in (split_part(realtime.topic(),':',3),split_part(realtime.topic(),':',4))
   and p.is_active is true and coalesce(p.is_test_account,false) is false
   and p.role in ('tutor','admin','super_admin','national_admin'))
);
