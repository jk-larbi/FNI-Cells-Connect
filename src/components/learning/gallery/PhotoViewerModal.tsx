import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  User,
  Folder,
  Tag,
  Maximize2,
} from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { GalleryItem } from '../../../types/learning';

export interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GalleryItem[];
  initialIndex?: number;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  onClose,
  items,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
  }, [initialIndex, isOpen]);

  // Back button handler
  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  const currentItem = items[currentIndex];

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setZoomLevel(1);
    } else {
      setCurrentIndex(0); // wrap around
      setZoomLevel(1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setZoomLevel(1);
    } else {
      setCurrentIndex(items.length - 1); // wrap around
      setZoomLevel(1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel(z => Math.min(3, z + 0.25));
      } else if (e.key === '-') {
        setZoomLevel(z => Math.max(0.5, z - 0.25));
      } else if (e.key === '0') {
        setZoomLevel(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, items.length]);

  if (!isOpen || !currentItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-fadeIn select-none">
      {/* Top Bar Controls */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/60 border-b border-white/10 shrink-0 text-white z-20">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
            {currentIndex + 1} / {items.length}
          </span>
          <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
            {currentItem.title}
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-white/10 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 text-white/80">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoomLevel !== 1 && (
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 rounded-full hover:bg-white/20 text-amber-400 transition-colors cursor-pointer"
                title="Reset Zoom (0)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle details */}
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              showDetails ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Toggle Details"
          >
            <Tag className="w-4 h-4" />
          </button>

          {/* Download button */}
          {currentItem.allow_download !== false && (
            <a
              href={currentItem.file_url}
              download={currentItem.file_name || 'fni-photo.jpg'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-rose-600 text-white transition-colors cursor-pointer ml-1"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
        {/* Previous Button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/15 backdrop-blur-xs transition-transform active:scale-95 cursor-pointer"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Active Image */}
        <div
          className="max-w-full max-h-full flex items-center justify-center transition-transform duration-150 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <img
            src={currentItem.file_url}
            alt={currentItem.title}
            className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl shadow-2xl select-none"
            draggable={false}
          />
        </div>

        {/* Next Button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/15 backdrop-blur-xs transition-transform active:scale-95 cursor-pointer"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Information Drawer */}
      {showDetails && (
        <div className="px-4 sm:px-6 py-3.5 bg-black/75 border-t border-white/10 text-white shrink-0 z-20 backdrop-blur-md animate-fadeIn">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white">
                  {currentItem.title}
                </span>
                {currentItem.subcategory && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-amber-300 font-semibold text-[10px]">
                    {currentItem.subcategory}
                  </span>
                )}
                {currentItem.album_title && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold text-[10px] flex items-center gap-1">
                    <Folder className="w-2.5 h-2.5" />
                    <span>{currentItem.album_title}</span>
                  </span>
                )}
              </div>
              {currentItem.description && (
                <p className="text-white/70 text-[11px] leading-relaxed max-w-2xl">
                  {currentItem.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 text-white/60 text-[11px] shrink-0">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>{new Date(currentItem.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>{currentItem.uploaded_by_name || 'FNI Ministry'}</span>
              </div>
              {currentItem.file_size && (
                <span className="font-mono text-white/50">{currentItem.file_size}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
