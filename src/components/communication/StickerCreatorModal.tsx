import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Smile,
  Type,
  Palette,
  Check,
  Upload,
  Camera,
  Trash2,
} from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { CustomSticker } from '../../types';

export interface StickerCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSticker: (sticker: Omit<CustomSticker, 'id'>) => void;
  onSendStickerImmediately?: (sticker: Omit<CustomSticker, 'id'>) => void;
}

const STICKER_PALETTES = [
  { name: 'Royal Gold', bg: 'linear-gradient(135deg, #142B4A 0%, #0F172A 100%)', border: '#C6A45A', textColor: '#FCE77D' },
  { name: 'Kingdom Purple', bg: 'linear-gradient(135deg, #6B21A8 0%, #3B0764 100%)', border: '#D8B4FE', textColor: '#FFFFFF' },
  { name: 'Emerald Fire', bg: 'linear-gradient(135deg, #065F46 0%, #022C22 100%)', border: '#34D399', textColor: '#A7F3D0' },
  { name: 'Celestial Blue', bg: 'linear-gradient(135deg, #1E40AF 0%, #172554 100%)', border: '#60A5FA', textColor: '#DBEAFE' },
  { name: 'Amber Sunset', bg: 'linear-gradient(135deg, #9A3412 0%, #431407 100%)', border: '#FB923C', textColor: '#FFEDD5' },
  { name: 'Clean White', bg: '#FFFFFF', border: '#E2E8F0', textColor: '#0F172A' },
  { name: 'Deep Onyx', bg: '#0B131F', border: '#1E293B', textColor: '#F8FAFC' },
];

const PRESET_EMOJIS = [
  '🙏', '🕊️', '👑', '🔥', '❤️', '📖', '✝️', '💡', '🙌', '🛡️', '⚡', '🌾',
  '🏆', '🍇', '🍞', '🍷', '🎺', '🏛️', '💎', '🌈', '🌱', '☀️', '💪', '🎉'
];

export const StickerCreatorModal: React.FC<StickerCreatorModalProps> = ({
  isOpen,
  onClose,
  onSaveSticker,
  onSendStickerImmediately,
}) => {
  const [mode, setMode] = useState<'emoji' | 'image'>('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState('🕊️');
  const [caption, setCaption] = useState('Anointed');
  const [selectedPalette, setSelectedPalette] = useState(STICKER_PALETTES[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [sendAfterSave, setSendAfterSave] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Sticker image must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setMode('image');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (mode === 'emoji' && !selectedEmoji) return;
    if (mode === 'image' && !uploadedImage) return;

    const label = caption.trim() || (mode === 'emoji' ? selectedEmoji : 'Custom Sticker');
    const newSticker: Omit<CustomSticker, 'id'> = {
      stickerType: 'custom',
      label,
      emoji: mode === 'emoji' ? selectedEmoji : undefined,
      imageUrl: mode === 'image' ? uploadedImage! : undefined,
      usageCount: 1,
    };

    onSaveSticker(newSticker);

    if (sendAfterSave && onSendStickerImmediately) {
      onSendStickerImmediately(newSticker);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-[#C6A45A] flex items-center justify-center">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">Create Custom Sticker</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Design stickers for fellowship chats</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* Live Sticker Preview Card */}
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-50 dark:bg-black/30 border border-dashed border-slate-200 dark:border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Live Sticker Preview</span>
            <div
              className="w-36 h-36 rounded-3xl p-3 flex flex-col items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 select-none relative overflow-hidden"
              style={{
                background: selectedPalette.bg,
                border: `2.5px solid ${selectedPalette.border}`,
              }}
            >
              {mode === 'image' && uploadedImage ? (
                <div className="w-full h-24 rounded-xl overflow-hidden bg-black/10 flex items-center justify-center mb-1">
                  <img src={uploadedImage} alt="Sticker preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <span className="text-5xl filter drop-shadow-md my-1 animate-bounce-short">{selectedEmoji}</span>
              )}
              {caption.trim() && (
                <span
                  className="font-extrabold text-xs text-center truncate max-w-[120px] px-2 py-0.5 rounded-full bg-black/25 backdrop-blur-xs mt-1"
                  style={{ color: selectedPalette.textColor }}
                >
                  {caption.trim()}
                </span>
              )}
            </div>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-black/25">
            <button
              type="button"
              onClick={() => setMode('emoji')}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'emoji'
                  ? 'bg-white dark:bg-[#182533] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Smile className="w-4 h-4 text-amber-500" />
              <span>Emoji & Badge</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('image');
                if (!uploadedImage) fileInputRef.current?.click();
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'image'
                  ? 'bg-white dark:bg-[#182533] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-blue-500" />
              <span>Custom Photo / Image</span>
            </button>
          </div>

          {/* Emoji Selection Grid */}
          {mode === 'emoji' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Choose Icon</label>
              <div className="grid grid-cols-8 gap-1.5 p-2 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                {PRESET_EMOJIS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setSelectedEmoji(em)}
                    className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-transform cursor-pointer ${
                      selectedEmoji === em
                        ? 'bg-amber-100 dark:bg-amber-950/60 ring-2 ring-amber-500 scale-110'
                        : 'hover:bg-slate-200 dark:hover:bg-white/10 hover:scale-110'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Image Upload Area */}
          {mode === 'image' && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {uploadedImage ? (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <img src={uploadedImage} alt="Uploaded" className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Photo loaded</p>
                      <p className="text-[10px] text-slate-400">Ready to save</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-bold hover:bg-slate-300 dark:hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImage(null);
                        setMode('emoji');
                      }}
                      className="p-1 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/15 hover:border-blue-500 dark:hover:border-blue-400 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Tap to upload a photo (PNG / JPG)</span>
                  <span className="text-[10px] text-slate-400">Max size 2MB</span>
                </button>
              )}
            </div>
          )}

          {/* Caption Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Sticker Label / Word</label>
            <div className="relative">
              <Type className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={24}
                placeholder="e.g. Amen, Hallelujah, Praying, Blessed..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Color Palettes */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Palette className="w-3.5 h-3.5 text-purple-500" />
              <span>Theme Card Color</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
              {STICKER_PALETTES.map(pal => (
                <button
                  key={pal.name}
                  type="button"
                  onClick={() => setSelectedPalette(pal)}
                  className={`w-8 h-8 rounded-full shrink-0 border-2 transition-transform cursor-pointer flex items-center justify-center ${
                    selectedPalette.name === pal.name ? 'scale-110 shadow-md ring-2 ring-blue-500' : 'hover:scale-105'
                  }`}
                  style={{
                    background: pal.bg,
                    borderColor: pal.border,
                  }}
                  title={pal.name}
                >
                  {selectedPalette.name === pal.name && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Option: Send immediately */}
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-black/20 cursor-pointer select-none border border-slate-100 dark:border-white/5">
            <input
              type="checkbox"
              checked={sendAfterSave}
              onChange={e => setSendAfterSave(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Send directly to active conversation upon creation
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/50 dark:bg-black/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Sticker</span>
          </button>
        </div>
      </div>
    </div>
  );
};
