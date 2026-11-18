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
  const searchTerms: Record<string, string> = {
    smileys: 'smile happy laugh face crying sad angry sick love emotion',
    people: 'people person hand gesture body family',
    hearts: 'heart love affection romance broken heart',
    nature: 'animal animals pet dog cat bird fish plant flower weather',
    food: 'food fruit vegetable meal drink dessert',
    activities: 'sport sports game music art celebration trophy',
    travel: 'travel transport vehicle car plane building place',
    objects: 'object technology phone computer tool medical money gift',
    symbols: 'symbol sign religious check mark warning number',
    flags: 'flag country nation pride',
  };
  const emojis = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return active.emojis;
    const matchedCategories = EMOJI_CATEGORIES.filter(item =>
      item.name.toLowerCase().includes(term) || (searchTerms[item.name.toLowerCase()] || '').includes(term)
    );
    const directMatches = EMOJI_CATEGORIES.flatMap(item => item.emojis).filter(emoji => emoji.includes(term));
    return [...new Set([...matchedCategories.flatMap(item => item.emojis), ...directMatches])];
  }, [active, query]);

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
