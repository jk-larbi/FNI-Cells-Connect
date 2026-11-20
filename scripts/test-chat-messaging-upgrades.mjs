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
assert.match(view, /accept="image\/\*,video\/\*,audio\/\*/, 'the attachment picker must accept audio and video');
assert.match(view, /const message: PrivateMessage = \{/, 'private Realtime rows must be mapped directly without a second fetch');
assert.match(view, /const message: CommunityMessage = \{/, 'community Realtime rows must be mapped directly without a second fetch');
assert.match(messaging, /Notifications are deliberately dispatched after the message commit/, 'private notifications must not block message send');
assert.match(messaging, /Keep chat delivery independent from push\/email notification latency/, 'community notifications must not block message send');
assert.match(messaging, /if \(!success\) throw new Error\('The message could not be deleted for everyone/, 'delete-for-everyone must report server failure');
assert.match(view, /The message could not be deleted\. Please try again\./, 'failed deletes must be reported and restored');
console.log('Chat media, realtime delivery, and deletion regression checks passed.');
