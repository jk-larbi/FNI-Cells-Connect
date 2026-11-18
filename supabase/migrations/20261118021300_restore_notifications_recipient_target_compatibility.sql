alter table public.notifications add column if not exists recipient_target text;
update public.notifications set recipient_target=user_id where recipient_target is null or recipient_target='';
create or replace function private.sync_notification_recipient_target()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public
as $$
begin
  if new.recipient_target is null or new.recipient_target='' then
    new.recipient_target:=new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_notification_recipient_target() from public,anon,authenticated;
drop trigger if exists sync_notification_recipient_target on public.notifications;
create trigger sync_notification_recipient_target
before insert or update of user_id,recipient_target on public.notifications
for each row execute function private.sync_notification_recipient_target();
create index if not exists idx_notifications_recipient_target_created
on public.notifications(recipient_target,created_at desc);
