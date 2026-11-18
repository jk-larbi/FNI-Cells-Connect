import React, { useMemo, useState } from 'react';

const EMOJI_CATEGORIES = [
  { name: 'Smileys', icon: '😀', emojis: '😀 😃 😄 😁 😆 😅 😂 🙂 🙃 🫠 😉 😊 😇 🥰 😍 🤩 😘 😗 ☺️ 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🫢 🫣 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 🫤 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖'.split(' ') },
  { name: 'People', icon: '👋', emojis: '👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦'.split(' ') },
  { name: 'Hearts', icon: '❤️', emojis: '❤️ 🧡 💛 💚 💙 💜 🖤 🩶 🤍 🤎 🩷 🩵 ❤️‍🔥 ❤️‍🩹 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟'.split(' ') },
  { name: 'Nature', icon: '🌿', emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🦋 🐌 🐞 🐜 🪲 🪳 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🦮 🐩 🐈 🐓 🦃 🦚 🦜 🦢 🦩 🕊️ 🐇 🦝 🦨 🦡 🦦 🦥 🐁 🐀 🐿️ 🦔 🌵 🎄 🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🎍 🪴 🌾 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌜 🌚 ⭐ 🌟 ✨ ⚡ 🔥 🌈 ☀️ 🌤️ ⛅ 🌧️ ❄️'.split(' ') },
  { name: 'Food', icon: '🍎', emojis: '🍇 🍈 🍉 🍊 🍋 🍌 🍍 🥭 🍎 🍏 🍐 🍑 🍒 🍓 🫐 🥝 🍅 🫒 🥥 🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🍄 🥜 🌰 🍞 🥐 🥖 🫓 🥨 🥯 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🫔 🥙 🧆 🥚 🍳 🥘 🍲 🥣 🥗 🍿 🧈 🧂 🥫 🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍠 🍢 🍣 🍤 🍥 🥮 🍡 🥟 🥠 🥡 🦪 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🫖 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉'.split(' ') },
  { name: 'Activities', icon: '⚽', emojis: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🏋️ 🤼 🤸 ⛹️ 🤺 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻 🪈 🎲 ♟️ 🎯 🎳 🎮 🕹️ 🧩'.split(' ') },
  { name: 'Travel', icon: '🚗', emojis: '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🛺 🚲 🛴 🚏 🛣️ 🛤️ 🚨 🚥 🚦 🛑 🚧 ⚓ 🛟 ⛵ 🚤 🛳️ ⛴️ 🛥️ 🚢 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚁 🚟 🚠 🚡 🛰️ 🚀 🛸 🌍 🌎 🌏 🗺️ 🧭 🏔️ ⛰️ 🌋 🗻 🏕️ 🏖️ 🏜️ 🏝️ 🏞️ 🏟️ 🏛️ 🏗️ 🧱 🏘️ 🏚️ 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 ⛪ 🕌 🛕 🕍 ⛩️ 🕋'.split(' ') },
  { name: 'Objects', icon: '💡', emojis: '⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 🧾 💎 ⚖️ 🪜 🧰 🔧 🔨 ⚒️ 🛠️ ⛏️ 🔩 ⚙️ 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳️ 🩹 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🧺 🧻 🚽 🚿 🛁 🪥 🪒 🧴 🧷 🧸 🪆 🖼️ 🪞 🪟 🛍️ 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🎎 🏮 🪩 🧧'.split(' ') },
  { name: 'Symbols', icon: '💯', emojis: '💯 🔔 🔕 🎵 🎶 💹 🏧 🚮 🚰 ♿ 🚹 🚺 🚻 🚼 🚾 🛂 🛃 🛄 🛅 ⚠️ 🚸 ⛔ 🚫 🚳 🚭 🚯 🚱 🚷 📵 🔞 ☢️ ☣️ ⬆️ ↗️ ➡️ ↘️ ⬇️ ↙️ ⬅️ ↖️ ↕️ ↔️ 🔃 🔄 🔙 🔚 🔛 🔜 🔝 🛐 ⚛️ 🕉️ ✡️ ☸️ ☯️ ✝️ ☦️ ☪️ ☮️ 🕎 🔯 ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⛎ 🔀 🔁 🔂 ▶️ ⏩ ⏭️ ⏯️ ◀️ ⏪ ⏮️ 🔼 ⏫ 🔽 ⏬ ⏸️ ⏹️ ⏺️ ⏏️ 🎦 🔅 🔆 📶 🛜 📳 📴 ✖️ ➕ ➖ ➗ 🟰 ♾️ ‼️ ⁉️ ❓ ❔ ❕ ❗ 〰️ 💱 💲 ⚕️ ♻️ ⚜️ 🔱 📛 🔰 ⭕ ✅ ☑️ ✔️ ❌ ❎ ➰ ➿ 🔟 🔠 🔡 🔢 🔣 🔤 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 🆔 🆕 🆓 🆙 🆒 🆗 🆖 🆚 🈁 🈯 🈲 🈳 🈴 🈵 🈶 🈚 🈸 🈺 🉐 🈹 🈂️ 🛑'.split(' ') },
  { name: 'Flags', icon: '🏳️', emojis: '🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🇬🇭 🇳🇬 🇿🇦 🇰🇪 🇺🇬 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇳🇿 🇫🇷 🇩🇪 🇮🇹 🇪🇸 🇵🇹 🇧🇷 🇯🇵 🇨🇳 🇮🇳 🇸🇬 🇦🇪 🇸🇦 🇮🇱 🇺🇦 🇷🇺 🇪🇺'.split(' ') },
];

interface FniEmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export const FniEmojiPicker: React.FC<FniEmojiPickerProps> = ({ onSelect }) => {
  const [category, setCategory] = useState('Smileys');
  const [query, setQuery] = useState('');
  const active = EMOJI_CATEGORIES.find(item => item.name === category) || EMOJI_CATEGORIES[0];
  const emojis = useMemo(() => query.trim()
    ? EMOJI_CATEGORIES.flatMap(item => item.emojis).filter((emoji, index, all) => all.indexOf(emoji) === index)
    : active.emojis, [active, query]);

  return (
    <section aria-label="Emoji picker" className="w-full min-w-0 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#182533] shadow-2xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input aria-label="Search emojis" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search emojis" className="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm outline-none" />
        <span className="text-xs text-slate-500 whitespace-nowrap">{emojis.length} emojis</span>
      </div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Emoji categories">
        {EMOJI_CATEGORIES.map(item => (
          <button key={item.name} type="button" role="tab" aria-selected={!query && category === item.name} onClick={() => { setCategory(item.name); setQuery(''); }} title={item.name} className={`shrink-0 w-9 h-9 rounded-lg text-lg ${!query && category === item.name ? 'bg-blue-100 dark:bg-blue-950' : 'hover:bg-slate-100 dark:hover:bg-white/10'}`}>
            {item.icon}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-48 overflow-y-auto overscroll-contain" role="list" aria-label={`${query ? 'Search results' : category} emojis`}>
        {emojis.map((emoji, index) => (
          <button key={`${emoji}-${index}`} type="button" onClick={() => onSelect(emoji)} aria-label={`Insert ${emoji}`} className="aspect-square min-w-0 rounded-lg text-xl hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-transform">
            {emoji}
          </button>
        ))}
      </div>
    </section>
  );
};
