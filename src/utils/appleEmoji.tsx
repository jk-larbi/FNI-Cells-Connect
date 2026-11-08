import React from 'react';

// Official Apple Color Emoji dataset (64px high resolution PNGs from emoji-datasource-apple)
export const APPLE_EMOJI_MAP: { [emoji: string]: string } = {
  '🙏': '1f64f',
  '🙌': '1f64c',
  '✝️': '271d-fe0f',
  '🕊️': '1f54a-fe0f',
  '❤️': '2764-fe0f',
  '🔥': '1f525',
  '📖': '1f4d6',
  '✨': '2728',
  '🌟': '1f31f',
  '👑': '1f451',
  '🛡️': '1f6e1-fe0f',
  '⛪': '26ea',
  '👍': '1f44d',
  '👏': '1f44f',
  '🎉': '1f389',
  '🥳': '1f973',
  '💯': '1f4af',
  '🤝': '1f91d',
  '💪': '1f4aa',
  '💖': '1f496',
  '🤍': '1f90d',
  '😊': '1f60a',
  '😂': '1f602',
  '😃': '1f603',
  '📞': '1f4de',
  '💬': '1f4ac',
  '👣': '1f463',
  '🌱': '1f331',
  '🎯': '1f3af',
  '☀️': '2600-fe0f',
  '🌈': '1f308',
  '💐': '1f490',
  '🍞': '1f35e',
  '🍇': '1f347',
  '⚡': '26a1',
  '😇': '1f607',
};

export function getAppleEmojiUrl(emoji: string): string | null {
  const code = APPLE_EMOJI_MAP[emoji];
  if (code) {
    return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${code}.png`;
  }
  try {
    const full = [...emoji].map(c => c.codePointAt(0)!.toString(16)).join('-');
    return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${full}.png`;
  } catch (e) {
    return null;
  }
}

export const AppleEmoji: React.FC<{
  emoji: string;
  size?: number;
  className?: string;
}> = ({ emoji, size = 20, className = '' }) => {
  const url = getAppleEmojiUrl(emoji);
  if (!url) return <span className={className}>{emoji}</span>;

  return (
    <img
      src={url}
      alt={emoji}
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      className={`inline-block object-contain select-none align-middle ${className}`}
      onError={e => {
        const target = e.currentTarget;
        target.style.display = 'none';
        const span = document.createElement('span');
        span.textContent = emoji;
        target.parentNode?.insertBefore(span, target);
      }}
    />
  );
};

// Replaces known Apple emojis in text strings with authentic AppleEmoji image components
export function renderWithAppleEmojis(text: string, size = 18): React.ReactNode[] {
  // Regex pattern matching any of our supported emojis
  const emojiKeys = Object.keys(APPLE_EMOJI_MAP).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${emojiKeys.join('|')})`, 'g');
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (APPLE_EMOJI_MAP[part]) {
      return (
        <AppleEmoji
          key={`emoji-${index}`}
          emoji={part}
          size={size}
          className="mx-0.5 -mt-0.5"
        />
      );
    }
    return part;
  });
}
