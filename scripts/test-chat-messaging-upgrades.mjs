import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const view = read('../src/components/communication/MessagingView.tsx');
const messaging = read('../src/services/messagingService.ts');
const supabase = read('../src/services/supabaseService.ts');

assert.match(supabase, /supabase\.auth\.getUser\(\)/, 'chat uploads must use the authenticated storage owner');
assert.match(supabase, /return \{ name: file\.name, path, mimeType, size: file\.size \}/, 'messages must store stable object paths');
assert.doesNotMatch(supabase, /path: signed/, 'new chat messages must not persist expiring signed URLs');
assert.match(supabase, /createSignedUrl\(objectPath, 60 \* 60 \* 24\)/, 'private media URLs must be refreshed for recipients');
assert.match(view, /<video controls playsInline/, 'videos must render inline with playback controls');
assert.match(view, /<audio controls preload="metadata"/, 'music and audio files must have an inline audio player');
assert.match(view, /<img src=\{fileUrl\}/, 'photos must render inline');
assert.match(view, /setImagePreview\(\{ url: fileUrl, name: att\.name \|\| 'FNI image' \}\)/, 'photos must open in a full-screen image viewer');
assert.match(view, /handleSaveAttachment = async/, 'attachments must have a save/share flow');
assert.match(view, /Filesystem\.writeFile/, 'native devices must prepare attachments for the system share sheet');
assert.match(view, /Share\.share\(/, 'native devices must expose Save to Photos/Gallery through the system share sheet');
assert.match(view, /navigator\.canShare\(\{ files: \[file\] \}\)/, 'web devices must use the native file share sheet when supported');
assert.match(view, /link\.download = safeName/, 'web devices must have a direct download fallback');
assert.match(view, /onContextMenu=\{e => e\.stopPropagation\(\)\}/, 'attachment controls must not trigger the message context menu');
assert.match(view, /window\.open\(fileUrl, '_blank'/, 'documents must open for viewing');
assert.match(view, /Save \$\{att\.name \|\| 'document'\}/, 'documents must have a save action');
assert.match(view, /Save audio/, 'music and audio attachments must have an explicit save action');
assert.match(view, /onClick=\{e => e\.stopPropagation\(\)\}/, 'native media controls must not trigger message context menus');
assert.match(view, /accept="image\/\*,video\/\*,audio\/\*/, 'the attachment picker must accept audio and video');
assert.match(view, /const message: PrivateMessage = \{/, 'private Realtime rows must be mapped directly without a second fetch');
assert.match(view, /const message: CommunityMessage = \{/, 'community Realtime rows must be mapped directly without a second fetch');
assert.match(messaging, /Notifications are deliberately dispatched after the message commit/, 'private notifications must not block message send');
assert.match(messaging, /Keep chat delivery independent from push\/email notification latency/, 'community notifications must not block message send');
assert.match(messaging, /if \(!success\) throw new Error\('The message could not be deleted for everyone/, 'delete-for-everyone must report server failure');
assert.match(view, /The message could not be deleted\. Please try again\./, 'failed deletes must be reported and restored');
console.log('Chat media, realtime delivery, and deletion regression checks passed.');

const communityMessagingMigration = read('../supabase/migrations/20261120150000_community_message_author_delete_pin_and_tombstone_sync.sql');
assert.match(view, /deleteTargetMessage\.senderUid === currentUser\?\.id \|\| isAdmin/, 'message authors and admins must see the delete-for-everyone option');
assert.match(messaging, /getCommunityDeletedMessageIds\(\)/, 'community loads must refresh server deletion tombstones');
assert.match(messaging, /deletedMessageIds === null \? \[\]/, 'stale cache must not be merged if tombstones cannot be refreshed');
assert.doesNotMatch(messaging, /message\.isPinned \|\| \(createdAt > cutoff/, 'personal history clearing must also hide older pinned messages');
assert.match(messaging, /ConversationCacheService\.clearConversation\(viewerUid, 'community'\)/, 'community clear must clear only the current user cache');
assert.match(supabase, /rpc\('set_community_message_pin'/, 'community pinning must use the authoritative RPC');
assert.match(communityMessagingMigration, /drop function if exists public\.set_community_message_pin\(text, boolean\)/, 'obsolete two-argument pin overload must be removed');
assert.match(communityMessagingMigration, /drop index if exists public\.community_messages_one_pinned_idx/, 'community must support multiple pinned messages');
assert.match(communityMessagingMigration, /v_sender is distinct from v_uid/, 'authors must be checked independently from administrator permissions');
assert.match(messaging, /if \(forEveryone\) \{\s*console\.warn\('Community-wide clear was rejected by the server:/, 'a failed admin-only clear must not fall back to a broad client update');
console.log('Community author deletion, personal clear isolation, tombstone sync, and Telegram-style pin regression checks passed.');

assert.match(messaging, /isCommunityMessageVisibleForUser\(/, 'Realtime community updates must respect personal clear-history cutoffs');

const communityClearMigration = read('../supabase/migrations/20261120160000_community_chat_personal_and_admin_clear_rpc.sql');
assert.match(communityClearMigration, /if coalesce\(p_for_everyone, false\)/, 'community clear mode must be explicit');
assert.match(communityClearMigration, /Administrator permission required to clear community chat for everyone/, 'only administrators may clear community history for everyone');
assert.match(communityClearMigration, /insert into public\.community_chat_preferences \(user_id, cleared_at, updated_at\)/, 'personal clear must write only the current user preference');
assert.match(communityClearMigration, /grant execute on function public\.fni_clear_community_chat_history\(boolean\) to authenticated/, 'authenticated members must use the secured clear RPC');

const privatePinMigration = read('../supabase/migrations/20261120170000_private_message_participant_pin_rpc.sql');
assert.match(supabase, /rpc\('set_private_message_pin'/, 'private message pinning must use the authoritative participant RPC');
assert.doesNotMatch(supabase, /\.from\('private_messages'\)\s*\.update\(payload\)/, 'private message pinning must not rely on a client-side RLS update');
assert.match(privatePinMigration, /security definer/i, 'private pin RPC must safely bypass table RLS after validating participants');
assert.match(privatePinMigration, /v_profile_id is distinct from v_sender/, 'private pin RPC must validate sender participation');
assert.match(privatePinMigration, /v_profile_id is distinct from v_recipient/, 'private pin RPC must validate recipient participation');
assert.match(privatePinMigration, /return true;/, 'private pin RPC must return an explicit success result');
console.log('Private message participant pinning regression checks passed.');


// Real-time online status and durable last-seen regression checks.
const presenceMigration = read('../supabase/migrations/20261128110000_fni_chat_presence_and_last_seen.sql');
assert.match(presenceMigration, /create table if not exists public\.fni_user_presence/i, 'member presence must have a durable database table');
assert.match(presenceMigration, /enable row level security/i, 'presence records must be protected by RLS');
assert.match(presenceMigration, /p\.supabase_user_id = \(select auth\.uid\(\)\)/i, 'members may only write their own presence records');
assert.match(presenceMigration, /fni_authenticated_member_presence_read/i, 'authenticated active members must be able to receive presence events');
assert.match(presenceMigration, /fni_authenticated_member_presence_write/i, 'authenticated active members must be able to publish presence events');
assert.match(presenceMigration, /alter publication supabase_realtime add table public\.fni_user_presence/i, 'last-seen changes must be available through Realtime');
assert.match(view, /supabase\.channel\('fni-presence'/, 'chat must subscribe to the shared FNI presence channel');
assert.match(view, /presenceChannel\.track\(/, 'chat must publish the current member as online');
assert.match(view, /presenceChannel\.untrack\(/, 'chat must clear online presence when the app is backgrounded or closed');
assert.match(view, /presenceChannel\.presenceState\(\)/, 'chat must derive online members from the Realtime presence state');
assert.match(view, /from\('fni_user_presence'\)[\s\S]*?upsert\(/, 'chat must persist last-seen heartbeats');
assert.match(view, /setInterval\(\(\) => \{[\s\S]*?writeLastSeen\(\)/, 'chat must refresh last-seen while active');
assert.match(view, /visibilitychange/, 'chat must update availability when the app is backgrounded or resumed');
assert.match(view, /isOnline: onlineMemberIds\.has\(peer\.id\)/, 'direct contacts must use actual presence, not a hardcoded online flag');
assert.match(view, /formatMemberLastSeen\(activeContact\?\.lastSeenAt\)/, 'chat headers must display the stored last-seen time');
console.log('FNI real-time online presence and durable last-seen regression checks passed.');
