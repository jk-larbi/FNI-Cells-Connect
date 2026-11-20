export interface ChatWallpaperItem {
  id: string;
  name: string;
  color: string;
  previewStyle: Record<string, string>;
  image: string;
}

export interface ColorSwatchItem {
  id: string;
  name: string;
  color: string;
}

export interface PresetBannerItem {
  id: string;
  name: string;
  url: string;
}

export const BUILT_IN_WALLPAPERS: ChatWallpaperItem[] = [
  { id: 'default', name: 'Classic Default', color: '#F5F7FA', previewStyle: { backgroundColor: '#F5F7FA' }, image: 'none' },
  { id: 'navy_mesh', name: 'Royal Navy Mesh', color: '#142B4A', previewStyle: { background: 'linear-gradient(135deg, #142B4A 0%, #1A365D 50%, #203D63 100%)' }, image: 'linear-gradient(135deg, #142B4A 0%, #1A365D 50%, #203D63 100%)' },
  { id: 'golden_dawn', name: 'Golden Dawn', color: '#FAF6ED', previewStyle: { background: 'radial-gradient(circle at 18% 18%, rgba(198,164,90,.3), transparent 45%), radial-gradient(circle at 82% 82%, rgba(198,164,90,.2), transparent 40%), #FAF6ED' }, image: 'radial-gradient(circle at 18% 18%, rgba(198,164,90,.25), transparent 45%), radial-gradient(circle at 82% 82%, rgba(198,164,90,.18), transparent 40%), #FAF6ED' },
  { id: 'ocean_breeze', name: 'Ocean Breeze', color: '#EAF2FB', previewStyle: { background: 'radial-gradient(circle at 15% 20%, rgba(91,145,205,.25) 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, rgba(91,145,205,.2) 0 2px, transparent 3px), #EAF2FB' }, image: 'radial-gradient(circle at 15% 20%, rgba(91,145,205,.2) 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, rgba(91,145,205,.15) 0 2px, transparent 3px), #EAF2FB' },
  { id: 'lavender_peace', name: 'Lavender Peace', color: '#F1EEFA', previewStyle: { background: 'radial-gradient(circle at 20% 25%, rgba(137,112,190,.25), transparent 40%), #F1EEFA' }, image: 'radial-gradient(circle at 20% 25%, rgba(137,112,190,.2), transparent 40%), #F1EEFA' },
  { id: 'sage_harmony', name: 'Sage Harmony', color: '#EDF4EF', previewStyle: { background: 'radial-gradient(circle at 80% 20%, rgba(91,145,108,.25), transparent 35%), #EDF4EF' }, image: 'radial-gradient(circle at 80% 20%, rgba(91,145,108,.2), transparent 35%), #EDF4EF' },
  { id: 'midnight_depth', name: 'Midnight Depth', color: '#0B132B', previewStyle: { background: 'linear-gradient(180deg, #0B132B 0%, #1C2541 100%)' }, image: 'linear-gradient(180deg, #0B132B 0%, #1C2541 100%)' },
];

export const SOLID_COLORS: ColorSwatchItem[] = [
  { id: 'solid_telegram_dark', name: 'Telegram Dark', color: '#0e1621' },
  { id: 'solid_unigram_night', name: 'Unigram Night', color: '#17212b' },
  { id: 'solid_obsidian', name: 'Obsidian Night', color: '#090d16' },
  { id: 'solid_navy', name: 'Deep Royal Navy', color: '#142B4A' },
  { id: 'solid_night', name: 'Dark Slate', color: '#0F172A' },
  { id: 'solid_charcoal', name: 'Deep Charcoal', color: '#1E293B' },
  { id: 'solid_forest', name: 'Deep Forest', color: '#0F281E' },
  { id: 'solid_pine', name: 'Dark Pine', color: '#143826' },
  { id: 'solid_olive', name: 'Olive Grove', color: '#1C2814' },
  { id: 'solid_wine', name: 'Dark Wine', color: '#26101C' },
  { id: 'solid_violet', name: 'Royal Violet', color: '#1B1429' },
  { id: 'solid_espresso', name: 'Deep Espresso', color: '#1F1A16' },
  { id: 'solid_classic', name: 'Classic Grey', color: '#F5F7FA' },
  { id: 'solid_warm', name: 'Warm Paper', color: '#FAF6ED' },
  { id: 'solid_ice', name: 'Ice Blue', color: '#EAF2FB' },
  { id: 'solid_mint', name: 'Soft Mint', color: '#F0FDF4' },
  { id: 'solid_lavender', name: 'Soft Lavender', color: '#F1EEFA' },
  { id: 'solid_rose', name: 'Soft Rose', color: '#FFF1F2' },
  { id: 'solid_peach', name: 'Soft Peach', color: '#FFF7ED' },
  { id: 'solid_alabaster', name: 'Warm Alabaster', color: '#FEFCE8' },
  { id: 'solid_silver', name: 'Silver Cloud', color: '#F1F5F9' },
  { id: 'solid_slate', name: 'Mineral Slate', color: '#E2E8F0' },
  { id: 'solid_doodle_green', name: 'Telegram Green', color: '#85AD7B' },
  { id: 'solid_sky', name: 'Electric Sky', color: '#3B82F6' },
];

export const OUTGOING_BUBBLE_COLORS: ColorSwatchItem[] = [
  { id: 'bubble_telegram_green', name: 'Telegram Emerald', color: '#1b5e3f' },
  { id: 'bubble_mint_green', name: 'Bright Mint', color: '#059669' },
  { id: 'bubble_spring_jade', name: 'Spring Jade', color: '#10b981' },
  { id: 'bubble_pine_forest', name: 'Pine Forest', color: '#14532d' },
  { id: 'bubble_royal_blue', name: 'Royal Blue', color: '#2563eb' },
  { id: 'bubble_sky_cyan', name: 'Sky Cyan', color: '#0284c7' },
  { id: 'bubble_turquoise', name: 'Turquoise', color: '#06b6d4' },
  { id: 'bubble_deep_teal', name: 'Deep Teal', color: '#0d9488' },
  { id: 'bubble_royal_navy', name: 'FNI Royal Navy', color: '#142B4A' },
  { id: 'bubble_electric_indigo', name: 'Electric Indigo', color: '#4f46e5' },
  { id: 'bubble_soft_iris', name: 'Soft Iris', color: '#6366f1' },
  { id: 'bubble_royal_violet', name: 'Royal Violet', color: '#7c3aed' },
  { id: 'bubble_vivid_purple', name: 'Vivid Purple', color: '#9333ea' },
  { id: 'bubble_bright_magenta', name: 'Bright Magenta', color: '#c026d3' },
  { id: 'bubble_ruby_crimson', name: 'Ruby Crimson', color: '#e11d48' },
  { id: 'bubble_cardinal_red', name: 'Cardinal Red', color: '#dc2626' },
  { id: 'bubble_sunset_coral', name: 'Sunset Coral', color: '#ea580c' },
  { id: 'bubble_warm_amber', name: 'Warm Amber', color: '#f59e0b' },
  { id: 'bubble_harvest_gold', name: 'FNI Gold', color: '#c6a45a' },
  { id: 'bubble_olive_lime', name: 'Olive Lime', color: '#65a30d' },
  { id: 'bubble_steel_slate', name: 'Steel Slate', color: '#475569' },
  { id: 'bubble_charcoal', name: 'Charcoal Graphite', color: '#334155' },
  { id: 'bubble_obsidian', name: 'Obsidian Black', color: '#18181b' },
  { id: 'bubble_deep_wine', name: 'Wine Velvet', color: '#831843' },
];

export const PRESET_PROFILE_BANNERS: PresetBannerItem[] = [
  { id: 'royal_gold', name: 'Royal Gold & Navy', url: 'linear-gradient(135deg, #142B4A 0%, #1e3a8a 50%, #C6A45A 100%)' },
  { id: 'deep_sanctuary', name: 'Deep Sanctuary', url: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #312e81 100%)' },
  { id: 'emerald_pasture', name: 'Living Waters', url: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)' },
  { id: 'celestial_dawn', name: 'Celestial Dawn', url: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #f59e0b 100%)' },
  { id: 'sunset_grace', name: 'Sunset Grace', url: 'linear-gradient(135deg, #881337 0%, #e11d48 50%, #f97316 100%)' },
  { id: 'heavenly_ocean', name: 'Heavenly Ocean', url: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)' },
];
