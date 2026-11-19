import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Delete as BackspaceIcon, Clock, Sparkles } from 'lucide-react';

export interface IosEmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onBackspace?: () => void;
  onClose?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// 1. UNICODE SKIN TONE MODIFIERS (UTS #51)
// ---------------------------------------------------------------------------
export type SkinTone = '' | '1F3FB' | '1F3FC' | '1F3FD' | '1F3FE' | '1F3FF';

export const SKIN_TONES: { tone: SkinTone; label: string; preview: string }[] = [
  { tone: '', label: 'Default Yellow', preview: '🖐️' },
  { tone: '1F3FB', label: 'Light', preview: '🖐🏻' },
  { tone: '1F3FC', label: 'Medium-Light', preview: '🖐🏼' },
  { tone: '1F3FD', label: 'Medium', preview: '🖐🏽' },
  { tone: '1F3FE', label: 'Medium-Dark', preview: '🖐🏾' },
  { tone: '1F3FF', label: 'Dark', preview: '🖐🏿' },
];

const TONE_COMPATIBLE_REGEX = /^(👋|🤚|🖐️|✋|🖖|🫱|🫲|🫳|🫴|👌|🤌|🤏|✌️|🤞|🫰|🤟|🤘|🤙|👈|👉|👆|🖕|👇|☝️|🫵|👍|👎|✊|👊|🤛|🤜|👏|🙌|🫶|👐|🤲|🤝|🙏|✍️|💅|🤳|💪|🦵|🦶|👂|👃|👶|👧|🧒|👦|👩|🧑|👨|👵|🧓|👴|👮|👷|💂|🕵️|👩‍⚕️|👨‍⚕️|👩‍🎓|👨‍🎓|👩‍🏫|👨‍🏫|👩‍⚖️|👨‍⚖️|👩‍🌾|👨‍🌾|👩‍🍳|👨‍🍳|👩‍🔧|👨‍🔧|👩‍🏭|👨‍🏭|👩‍💼|👨‍💼|👩‍🔬|👨‍🔬|👩‍💻|👨‍💻|👩‍🎤|👨‍🎤|👩‍🎨|👨‍🎨|👩‍✈️|👨‍✈️|👩‍🚀|👨‍🚀|👩‍🚒|👨‍🚒|🦸|🦹|🧙|🧚|🧛|🧜|🧝|🧞|🧟|💆|💇|🚶|🏃|💃|🕺|🧗|🏇|🧘|🏄|🏊|🤽|🚣|🚴|🚵|🏋️|🤾|🤸|🤼|🤺|🏌️|⛹️)$/;

export const applySkinTone = (emoji: string, tone: SkinTone): string => {
  if (!tone) {
    // Strip existing skin tone modifier if any
    return emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');
  }
  const stripped = emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');
  const modifier = String.fromCodePoint(parseInt(tone, 16));
  // If emoji has zero-width joiner (ZWJ), insert modifier after first character sequence
  if (stripped.includes('\u200D')) {
    const parts = stripped.split('\u200D');
    return `${parts[0]}${modifier}\u200D${parts.slice(1).join('\u200D')}`;
  }
  // Remove variation selector 16 if present before attaching tone modifier
  const cleanBase = stripped.replace(/\uFE0F/g, '');
  return `${cleanBase}${modifier}`;
};

// ---------------------------------------------------------------------------
// 2. COMPLETE EMOJI CATEGORIES DATASET
// ---------------------------------------------------------------------------
export interface EmojiCategoryDef {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
}

export const IOS_EMOJI_CATEGORIES: EmojiCategoryDef[] = [
  {
    id: 'faith',
    name: 'Faith & Fellowship',
    icon: '🕊️',
    emojis: [
      '🕊️', '📖', '✝️', '🕎', '👑', '🕯️', '⛪', '🍇', '🍞', '🍷', '🐑', '🌾',
      '🌱', '🛡️', '⚔️', '🎺', '🔔', '📜', '🗝️', '💎', '💍', '🎁', '💌', '🏛️',
      '🔥', '💧', '☀️', '🌈', '🙏', '🙌', '🤲', '🛐', '✨', '⭐', '🌟', '🕊'
    ],
  },
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝',
      '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶',
      '🫥', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷',
      '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯', '🤠', '🥳',
      '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳',
      '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓',
      '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡',
      '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
    ],
  },
  {
    id: 'people',
    name: 'People & Gestures',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️',
      '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️',
      '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁',
      '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫦', '👶', '👧', '🧒', '👦', '👩', '🧑',
      '👨', '👵', '🧓', '👴', '👮', '👷', '💂', '🕵️', '👩‍⚕️', '👨‍⚕️', '👩‍🎓', '👨‍🎓', '👩‍🏫',
      '👨‍🏫', '👩‍⚖️', '👨‍⚖️', '👩‍🌾', '👨‍🌾', '👩‍🍳', '👨‍🍳', '👩‍🔧', '👨‍🔧', '👩‍🏭', '👨‍🏭', '👩‍💼',
      '👨‍💼', '👩‍🔬', '👨‍🔬', '👩‍💻', '👨‍💻', '👩‍🎤', '👨‍🎤', '👩‍🎨', '👨‍🎨', '👩‍✈️', '👨‍✈️', '👩‍🚀',
      '👨‍🚀', '👩‍🚒', '👨‍🚒', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆',
      '💇', '🚶', '🏃', '💃', '🕺', '🧗', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🚴',
      '🚵', '🏋️', '🤾', '🤸', '🤼', '🤺', '🏌️', '⛹️'
    ],
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷',
      '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥',
      '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞',
      '🐜', '🪲', '🪳', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐',
      '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓',
      '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄',
      '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🦮', '🐩', '🐈', '🐓', '🦃',
      '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀',
      '🐿️', '🦔', '🌵', '🎄', '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀', '🎍',
      '🪴', '🌾', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜',
      '🌚', '⚡', '🔥', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄'
    ],
  },
  {
    id: 'food',
    name: 'Food & Drinks',
    icon: '🍔',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑',
      '🥭', '🍍', '🥥', '🥝', '🍅', '🫒', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑',
      '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨',
      '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪',
      '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈',
      '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤',
      '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂',
      '🍰', '🧁', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🧃',
      '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉'
    ],
  },
  {
    id: 'activities',
    name: 'Activities & Sports',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸',
      '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋',
      '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️', '🤼', '🤸', '⛹️',
      '🤺', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈',
      '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬',
      '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🪈', '🎲', '♟️',
      '🎯', '🎳', '🎮', '🕹️', '🧩'
    ],
  },
  {
    id: 'travel',
    name: 'Travel & Places',
    icon: '🚗',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛',
      '🚜', '🛵', '🏍️', '🛺', '🚲', '🛴', '🚏', '🛣️', '🛤️', '🚨', '🚥', '🚦', '🛑',
      '🚧', '⚓', '🛟', '⛵', '🚤', '🛳️', '⛴️', '🛥️', '🚢', '✈️', '🛩️', '🛫', '🛬',
      '🪂', '💺', '🚁', '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸', '🌍', '🌎', '🌏', '🗺️',
      '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️',
      '🏗️', '🧱', '🏘️', '🏚️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩',
      '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋'
    ],
  },
  {
    id: 'objects',
    name: 'Objects',
    icon: '💡',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀',
      '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻',
      '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🪫', '🔌',
      '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰',
      '💳', '🧾', '💎', '⚖️', '🪜', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️',
      '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️',
      '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '🪬', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹',
      '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽',
      '🚿', '🛁', '🪥', '🪒', '🧴', '🧷', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🎁',
      '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🪩', '🧧', '✉️', '📩',
      '📨', '📧', '📦', '🏷️'
    ],
  },
  {
    id: 'symbols',
    name: 'Symbols',
    icon: '🔣',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🩶', '🤍', '🤎', '🩷', '🩵', '❤️‍🔥',
      '❤️‍🩹', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💯', '💢',
      '💥', '💬', '💭', '💤', '🛑', '⚠️', '🚸', '⛔', '🚫', '✅', '❌', '⭕', '❗',
      '❓', '❕', '❔', '‼️', '⁉️', '🔆', '🔅', '🔱', '⚜️', '☢️', '☣️', '⬆️', '↗️',
      '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔃',
      '🔄', '🔙', '🔚', '🔛', '🔜', '🔝', '✝️', '🕎', '✡️', '🔯', '☯️', '♾️', '🎵',
      '🎶', '💲', '💱', '🏧', '🚮', '🚰', '♿', '🚹', '🚺', '🚻', '🚼', '🚾', '📶',
      '🛜', '📳', '📴', '➕', '➖', '➗', '✖️', '🟰', '🔟', '🔠', '🔡', '🔢', '🔣', '🔤',
      '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '🆔', '🆕', '🆓', '🆙', '🆒', '🆗', '🆖'
    ],
  },
  {
    id: 'flags',
    name: 'Flags',
    icon: '🚩',
    emojis: [
      '🇬🇭', '🇳🇬', '🇿🇦', '🇰🇪', '🇺🇬', '🇱🇷', '🇸🇱', '🇪🇹', '🇷🇼', '🇹🇿', '🇿🇼', '🇿🇲', '🇪🇬',
      '🇲🇦', '🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇳🇿', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇵🇹', '🇳🇱', '🇧🇪',
      '🇨🇭', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇧🇷', '🇯🇵', '🇨🇳', '🇮🇳', '🇰🇷', '🇸🇬', '🇦🇪', '🇸🇦',
      '🇶🇦', '🇮🇱', '🇺🇦', '🇷🇺', '🇪🇺', '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️'
    ],
  },
];

// ---------------------------------------------------------------------------
// 3. SEARCH SYNONYM DICTIONARY (FAST INSTANT SEARCH)
// ---------------------------------------------------------------------------
const SEARCH_SYNONYMS: Record<string, string[]> = {
  pray: ['🙏', '🛐', '⛪', '📖', '🕊️', '🤲'],
  prayer: ['🙏', '🛐', '⛪', '📖', '🕊️'],
  amen: ['🙏', '🙌', '🕊️', '✨', '✝️'],
  church: ['⛪', '✝️', '🕊️', '📖', '🕯️', '🏛️'],
  bible: ['📖', '📜', '✝️', '🕊️'],
  cross: ['✝️', '☦️', '✞'],
  god: ['✝️', '🕊️', '👑', '☀️', '✨', '🙏'],
  jesus: ['✝️', '🕊️', '👑', '🍞', '🍷', '🐑', '❤️'],
  faith: ['🕊️', '✝️', '📖', '🛡️', '👑', '🙏'],
  fellowship: ['🕊️', '🤝', '👥', '🍞', '🍷', '❤️'],
  love: ['❤️', '🥰', '😍', '💖', '💕', '🫶', '😘', '💓', '💗'],
  heart: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️'],
  happy: ['😀', '😃', '😄', '😁', '😊', '🥳', '🥰', '🤩'],
  smile: ['😀', '😃', '😄', '😁', '🙂', '😊'],
  laugh: ['😂', '🤣', '😆', '😹'],
  sad: ['😢', '😭', '🥺', '😞', '😔', '💔', '🙁'],
  cry: ['😢', '😭', '😿'],
  angry: ['😡', '😠', '🤬', '👿'],
  fire: ['🔥', '💥', '✨', '⚡'],
  star: ['⭐', '🌟', '✨', '💫'],
  celebrate: ['🎉', '🎊', '🥳', '🍾', '🎈', '🎂'],
  clap: ['👏', '🙌', '🎉'],
  thumbs: ['👍', '👎'],
  peace: ['✌️', '🕊️', '☮️'],
  ghana: ['🇬🇭'],
  nigeria: ['🇳🇬'],
  africa: ['🇬🇭', '🇳🇬', '🇿🇦', '🇰🇪', '🇺🇬', '🌍'],
  flag: ['🚩', '🏁', '🇬🇭', '🇳🇬', '🇿🇦', '🇺🇸', '🇬🇧'],
  call: ['📞', '☎️', '📱', '📲'],
  money: ['💰', '💵', '💸', '🪙', '💳'],
};

const DEFAULT_RECENTS = ['🕊️', '🙏', '❤️', '🔥', '📖', '✝️', '🙌', '✨', '😂', '👍', '😊', '🎉', '👏', '💯', '🇬🇭', '👑'];

// ---------------------------------------------------------------------------
// 4. MAIN COMPONENT: IosEmojiPicker
// ---------------------------------------------------------------------------
export const IosEmojiPicker: React.FC<IosEmojiPickerProps> = ({
  onSelectEmoji,
  onBackspace,
  onClose,
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('faith');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSkinTone, setSelectedSkinTone] = useState<SkinTone>('');
  const [showSkinToneBar, setShowSkinToneBar] = useState<boolean>(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(DEFAULT_RECENTS);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);

  // Load saved skin tone & recent emojis from localStorage
  useEffect(() => {
    try {
      const savedTone = localStorage.getItem('fni_emoji_skin_tone');
      if (savedTone !== null) {
        setSelectedSkinTone(savedTone as SkinTone);
      }
      const savedRecents = localStorage.getItem('fni_recent_emojis');
      if (savedRecents) {
        const parsed = JSON.parse(savedRecents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentEmojis(parsed);
        }
      }
    } catch {}
  }, []);

  // Save selected skin tone
  const handleToneChange = (tone: SkinTone) => {
    setSelectedSkinTone(tone);
    try {
      localStorage.setItem('fni_emoji_skin_tone', tone);
    } catch {}
    setShowSkinToneBar(false);
  };

  // Push used emoji into recents
  const handleSelect = (emoji: string) => {
    onSelectEmoji(emoji);
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch {}

    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      const updated = [emoji, ...filtered].slice(0, 36);
      try {
        localStorage.setItem('fni_recent_emojis', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Compute displayed emojis based on search query or selected category
  const displayedEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (q) {
      // 1. Direct synonym lookup
      const synonymMatches = SEARCH_SYNONYMS[q] || [];

      // 2. Text matches across categories & names
      const matchedCats = IOS_EMOJI_CATEGORIES.filter(c =>
        c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
      );
      const categoryEmojis = matchedCats.flatMap(c => c.emojis);

      // 3. Synonym partial matches
      const partialSynonyms = Object.entries(SEARCH_SYNONYMS)
        .filter(([key]) => key.includes(q) || q.includes(key))
        .flatMap(([, list]) => list);

      const combined = [...new Set([...synonymMatches, ...partialSynonyms, ...categoryEmojis])];
      if (combined.length > 0) {
        return combined.map(e => (TONE_COMPATIBLE_REGEX.test(e) ? applySkinTone(e, selectedSkinTone) : e));
      }

      // Fallback: search in popular recents + all
      const allEmojis = IOS_EMOJI_CATEGORIES.flatMap(c => c.emojis);
      return allEmojis.slice(0, 48).map(e => (TONE_COMPATIBLE_REGEX.test(e) ? applySkinTone(e, selectedSkinTone) : e));
    }

    if (selectedCategory === 'recents') {
      return recentEmojis;
    }

    const cat = IOS_EMOJI_CATEGORIES.find(c => c.id === selectedCategory);
    const rawList = cat ? cat.emojis : IOS_EMOJI_CATEGORIES[0].emojis;

    // Apply skin tone if category is people or has tone compatible emojis
    return rawList.map(e => (TONE_COMPATIBLE_REGEX.test(e) ? applySkinTone(e, selectedSkinTone) : e));
  }, [searchQuery, selectedCategory, selectedSkinTone, recentEmojis]);

  return (
    <div
      className={`flex flex-col w-full rounded-3xl bg-slate-100/95 dark:bg-[#1a2634]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-3 select-none text-slate-800 dark:text-slate-100 font-sans transition-all animate-fadeIn ${className}`}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Apple Color Emoji", "SF Pro Text", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Top Bar: Search Input, Skin Tone Button & Backspace ── */}
      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60 dark:border-white/10 shrink-0">
        {/* iOS-style Search Pill */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Emoji"
            className="w-full pl-8 pr-7 py-1.5 rounded-full bg-slate-200/70 dark:bg-black/30 border border-transparent focus:border-blue-500/40 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Skin Tone Palette Selector Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSkinToneBar(prev => !prev)}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border transition-all cursor-pointer ${
              selectedSkinTone
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-xs'
                : 'border-slate-300 dark:border-white/20 bg-white dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15'
            }`}
            title="Choose Skin Tone"
          >
            {selectedSkinTone
              ? SKIN_TONES.find(t => t.tone === selectedSkinTone)?.preview || '🖐️'
              : '🖐️'}
          </button>

          {/* Floating iOS Skin Tone Popover */}
          {showSkinToneBar && (
            <div className="absolute right-0 bottom-full mb-2 z-40 flex items-center gap-1 p-1.5 rounded-full bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/15 shadow-2xl animate-scaleUp">
              {SKIN_TONES.map(item => (
                <button
                  key={item.tone}
                  type="button"
                  onClick={() => handleToneChange(item.tone)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-base hover:scale-125 transition-transform cursor-pointer ${
                    selectedSkinTone === item.tone ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/40' : ''
                  }`}
                  title={item.label}
                >
                  {item.preview}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Backspace Button (iOS Keyboard Style) */}
        {onBackspace && (
          <button
            type="button"
            onClick={onBackspace}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
            title="Delete last character"
          >
            <BackspaceIcon className="w-4 h-4" />
          </button>
        )}

        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title="Close emoji keyboard"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Middle: Emoji Grid Display ── */}
      <div
        ref={gridContainerRef}
        className="max-h-56 sm:max-h-64 overflow-y-auto custom-scrollbar overscroll-contain py-2 px-1 space-y-1.5"
      >
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          <span>
            {searchQuery
              ? `Results (${displayedEmojis.length})`
              : selectedCategory === 'recents'
              ? 'Frequently Used'
              : IOS_EMOJI_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Emojis'}
          </span>
          {selectedCategory === 'recents' && recentEmojis.length > 0 && !searchQuery && (
            <button
              type="button"
              onClick={() => {
                setRecentEmojis(DEFAULT_RECENTS);
                try {
                  localStorage.removeItem('fni_recent_emojis');
                } catch {}
              }}
              className="text-[10px] text-blue-500 hover:underline normal-case font-normal"
            >
              Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-8 sm:grid-cols-9 gap-1 sm:gap-1.5">
          {displayedEmojis.map((emoji, idx) => (
            <button
              key={`${emoji}-${idx}`}
              type="button"
              onClick={() => handleSelect(emoji)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/10 flex items-center justify-center text-2xl cursor-pointer transition-all hover:scale-125 active:scale-90"
              title={emoji}
            >
              <span>{emoji}</span>
            </button>
          ))}
        </div>

        {displayedEmojis.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400">
            <p>No matching emojis found.</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-2 text-blue-500 hover:underline text-xs"
            >
              View all emojis
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom Dock: iOS Category Icons Bar ── */}
      {!searchQuery && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/10 shrink-0 gap-1 overflow-x-auto no-scrollbar">
          {/* Recents Tab */}
          <button
            type="button"
            onClick={() => setSelectedCategory('recents')}
            className={`p-1.5 rounded-xl transition-all cursor-pointer shrink-0 text-base flex items-center justify-center ${
              selectedCategory === 'recents'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-xs scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white opacity-70 hover:opacity-100'
            }`}
            title="Frequently Used"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Standard Categories */}
          {IOS_EMOJI_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-1.5 rounded-xl transition-all cursor-pointer shrink-0 text-lg flex items-center justify-center ${
                selectedCategory === cat.id
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-xs scale-110'
                  : 'hover:bg-slate-200/50 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
              }`}
              title={cat.name}
            >
              <span>{cat.icon}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
