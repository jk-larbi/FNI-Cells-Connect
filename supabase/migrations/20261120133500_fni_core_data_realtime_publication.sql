-- Expand Supabase Realtime to durable FNI records that already use Supabase
-- as their source of truth. Existing RLS policies continue to control visibility.
do $$
declare
  table_name text;
  realtime_tables text[] := array[
    'account_deactivation_requests',
    'cell_leadership_history',
    'cell_members',
    'community_chat_preferences',
    'community_members',
    'community_message_hidden_for_user',
    'community_message_reactions',
    'gallery_albums',
    'gallery_items',
    'notification_dismissals',
    'private_chat_preferences',
    'private_message_hidden_for_user',
    'private_message_pins',
    'private_message_reactions',
    'regions',
    'reporting_periods',
    'review_logs',
    'teaching_materials'
  ];
begin
  foreach table_name in array realtime_tables loop
    if to_regclass(format('public.%I', table_name)) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = table_name
       ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
