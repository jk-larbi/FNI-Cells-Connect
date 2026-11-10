CREATE OR REPLACE FUNCTION private.create_community_message_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.notifications (
    id,
    user_id,
    title,
    message,
    type,
    channel,
    target_tab,
    metadata,
    is_read,
    created_at
  )
  SELECT
    'notif-cmsg-' || NEW.id || '-' || p.id,
    p.id,
    'Community Chat: ' || NEW.sender_name || ' (' || COALESCE(NEW.cell_name, 'Fellowship Leader') || ')',
    CASE
      WHEN length(NEW.content) > 90 THEN left(NEW.content, 90) || '...'
      ELSE NEW.content
    END,
    'community_message',
    'in_app',
    'messages',
    jsonb_build_object(
      'messageId', NEW.id,
      'senderUid', NEW.sender_uid,
      'senderName', NEW.sender_name,
      'category', 'messages',
      'targetTab', 'messages'
    ),
    false,
    COALESCE(NEW.created_at, now())
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.supabase_user_id IS NOT NULL
    AND p.role IN ('tutor', 'cell_leader', 'regional_leader')
    AND p.id <> NEW.sender_uid
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.create_community_message_notifications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS community_message_notification_fanout ON public.community_messages;

CREATE TRIGGER community_message_notification_fanout
AFTER INSERT ON public.community_messages
FOR EACH ROW
EXECUTE FUNCTION private.create_community_message_notifications();
