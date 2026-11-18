import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  Calendar,
  User,
  Folder,
  RotateCcw,
  Film,
} from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { GalleryItem } from '../../../types/learning';

export interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: GalleryItem | null;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  video,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  useEffect(() => {
    if (isOpen) {
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [isOpen, video?.id]);

  // Video event listeners
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onLoadedMetadata = () => setDuration(v.duration);
    const onEnded = () => setIsPlaying(false);

    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('ended', onEnded);

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('ended', onEnded);
    };
  }, [isOpen, video]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    const v = videoRef.current;
    if (v) {
      v.currentTime = target;
      setCurrentTime(target);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    const v = videoRef.current;
    if (v) {
      v.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isMuted) {
      v.muted = false;
      v.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      v.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        const v = videoRef.current;
        if (v) v.currentTime = Math.min(v.duration, v.currentTime + 5);
      } else if (e.key === 'ArrowLeft') {
        const v = videoRef.current;
        if (v) v.currentTime = Math.max(0, v.currentTime - 5);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-fadeIn select-none">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/60 border-b border-white/10 shrink-0 text-white z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <Film className="w-4 h-4 text-amber-400 shrink-0" />
          <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
            {video.title}
          </h2>
          {video.subcategory && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white/10 text-amber-300 font-semibold text-[10px]">
              {video.subcategory}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {video.allow_download !== false && (
            <a
              href={video.file_url}
              download={video.file_name || 'fni-video.mp4'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Download Video"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-rose-600 text-white transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video Viewport Container */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center bg-black overflow-hidden group cursor-pointer"
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={video.file_url}
          className="max-w-full max-h-[75vh] object-contain shadow-2xl"
          playsInline
        />

        {/* Big Center Play Icon when paused */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-amber-500/90 text-slate-900 flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110">
              <Play className="w-7 h-7 ml-1 fill-current" />
            </div>
          </div>
        )}

        {/* Video Player Floating Bottom Control Bar */}
        <div
          onClick={e => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-300"
        >
          {/* Progress Slider */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  const v = videoRef.current;
                  if (v) v.currentTime = 0;
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] font-mono text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Volume Slider */}
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400 hidden sm:block"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
                title="Toggle Fullscreen (F)"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Metadata Drawer */}
      <div className="px-4 sm:px-6 py-3.5 bg-black/80 border-t border-white/10 text-white shrink-0 z-20 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white">
                {video.title}
              </span>
              {video.album_title && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold text-[10px] flex items-center gap-1">
                  <Folder className="w-2.5 h-2.5" />
                  <span>{video.album_title}</span>
                </span>
              )}
            </div>
            {video.description && (
              <p className="text-white/70 text-[11px] leading-relaxed max-w-2xl">
                {video.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 text-white/60 text-[11px] shrink-0">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{new Date(video.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>{video.uploaded_by_name || 'FNI Ministry'}</span>
            </div>
            {video.file_size && (
              <span className="font-mono text-white/50">{video.file_size}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
