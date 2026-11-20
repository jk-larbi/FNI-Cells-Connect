-- Keep historical chat attachments addressable after signed URLs expire.
-- New uploads store object paths; normalize older rows that stored signed URLs.
update public.private_messages message
set attachments = normalized.attachments
from lateral (
  select coalesce(jsonb_agg(
    case
      when attachment->>'path' like '%/storage/v1/object/sign/fni-chat-media/%' then
        jsonb_set(
          attachment,
          '{path}',
          to_jsonb(
            replace(
              split_part(regexp_replace(attachment->>'path', '^.*?/storage/v1/object/sign/fni-chat-media/', ''), '?', 1),
              '%2F', '/'
            )
          )
        )
      else attachment
    end
  ), '[]'::jsonb) as attachments
  from jsonb_array_elements(
    case when jsonb_typeof(message.attachments) = 'array' then message.attachments else '[]'::jsonb end
  ) attachment
) normalized
where message.attachments::text like '%/storage/v1/object/sign/fni-chat-media/%';

update public.community_messages message
set attachments = normalized.attachments
from lateral (
  select coalesce(jsonb_agg(
    case
      when attachment->>'path' like '%/storage/v1/object/sign/fni-chat-media/%' then
        jsonb_set(
          attachment,
          '{path}',
          to_jsonb(
            replace(
              split_part(regexp_replace(attachment->>'path', '^.*?/storage/v1/object/sign/fni-chat-media/', ''), '?', 1),
              '%2F', '/'
            )
          )
        )
      else attachment
    end
  ), '[]'::jsonb) as attachments
  from jsonb_array_elements(
    case when jsonb_typeof(message.attachments) = 'array' then message.attachments else '[]'::jsonb end
  ) attachment
) normalized
where message.attachments::text like '%/storage/v1/object/sign/fni-chat-media/%';

-- The chat timeline queries filter each participant and order by creation time.
create index if not exists private_messages_sender_created_idx
  on public.private_messages (sender_uid, created_at desc);
