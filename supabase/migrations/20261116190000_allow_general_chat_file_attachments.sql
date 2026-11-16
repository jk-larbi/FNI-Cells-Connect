-- Allow any file type for chat attachments while keeping the existing
-- private bucket and 50 MB per-file storage limit.
update storage.buckets
set allowed_mime_types = null,
    file_size_limit = 52428800
where id = 'fni-chat-media';
