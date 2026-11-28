import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const view = read('../src/components/communication/MessagingView.tsx');
const css = read('../src/index.css');

assert.match(view, /fni-private-chat-header/, 'private chat must expose its Stitch header styling hook');
assert.match(view, /fni-private-chat-stream/, 'private chat must expose its Stitch message stream styling hook');
assert.match(view, /fni-private-chat-composer/, 'private chat must expose its Stitch composer styling hook');
assert.match(view, /fni-private-chat-input/, 'private chat input must expose its Stitch styling hook');
assert.match(css, /\.fni-private-chat-stream \.fni-bubble-incoming/, 'incoming private messages must use the light Stitch bubble treatment');
assert.match(css, /html\.dark \.fni-messages-stitch \.fni-private-chat-stream \.fni-bubble-incoming/, 'incoming private messages must remain readable in dark mode');

console.log('Private chat Stitch layout and light/dark contrast regression checks passed.');
