-- Repair private tutor/leadership chat visibility and read receipts.
CREATE POLICY private_messages_admin_read
ON public.private_messages
FOR SELECT
TO authenticated
USING (private.is_admin());

CREATE POLICY private_messages_admin_update
ON public.private_messages
FOR UPDATE
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

-- Allow authenticated tutors to receive the shared community-chat alert.
CREATE POLICY notifications_read_tutor_community
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = 'tutor_community');

-- Allow chat notifications only when backed by a real message sent by this user.
CREATE POLICY notifications_insert_message_delivery
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (
    user_id = 'admin'
    AND type = 'direct_message'
    AND EXISTS (
      SELECT 1
      FROM public.private_messages pm
      WHERE pm.id = metadata ->> 'messageId'
        AND pm.sender_uid = (SELECT auth.uid())::text
        AND pm.recipient_uid = 'admin'
    )
  )
  OR
  (
    user_id = 'tutor_community'
    AND type = 'community_message'
    AND EXISTS (
      SELECT 1
      FROM public.community_messages cm
      WHERE cm.id = metadata ->> 'messageId'
        AND cm.sender_uid = (SELECT auth.uid())::text
    )
  )
);

-- Separate reactions from message content so members can react to other users' posts.
CREATE TABLE public.community_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  user_name text NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_message_reactions_unique UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX community_message_reactions_message_idx
ON public.community_message_reactions (message_id);

ALTER TABLE public.community_message_reactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE
ON TABLE public.community_message_reactions
TO authenticated;

CREATE POLICY community_message_reactions_read
ON public.community_message_reactions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY community_message_reactions_insert
ON public.community_message_reactions
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid())::text);

CREATE POLICY community_message_reactions_delete
ON public.community_message_reactions
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid())::text OR private.is_admin());

-- Realtime streams messages and in-app notifications, with RLS filtering per user.
ALTER PUBLICATION supabase_realtime
ADD TABLE public.private_messages, public.community_messages, public.notifications;
