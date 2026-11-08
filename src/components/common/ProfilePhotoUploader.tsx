import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { processProfileImage } from '../../utils/imageUtils';

interface ProfilePhotoUploaderProps {
  currentAvatarUrl?: string;
  userName?: string;
  userRole?: string;
  onPhotoUploaded: (dataUrl: string) => Promise<void> | void;
  onPhotoRemoved?: () => Promise<void> | void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  currentAvatarUrl,
  userName = 'User',
  userRole,
  onPhotoUploaded,
  onPhotoRemoved,
  size = 'md',
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const getInitials = (name: string) => {
    return name
      ? name
          .split(' ')
          .map(n => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'FN';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const processedDataUrl = await processProfileImage(file, 320, 0.85);
      await onPhotoUploaded(processedDataUrl);
      setStatusMessage({ text: 'Picture updated successfully!', isError: false });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({
        text: err?.message || 'Failed to upload photo. Please try a different image.',
        isError: true,
      });
    } finally {
      setIsProcessing(false);
      // Reset input value so re-selecting same file triggers change
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!onPhotoRemoved) return;
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await onPhotoRemoved();
      setStatusMessage({ text: 'Picture removed.', isError: false });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({
        text: err?.message || 'Failed to remove picture.',
        isError: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const dimensionClasses = {
    sm: 'w-14 h-14 text-sm',
    md: 'w-20 h-20 text-lg',
    lg: 'w-24 h-24 text-2xl',
  }[size];

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-4">
        {/* Avatar with click-to-upload camera overlay */}
        <div className="relative group shrink-0">
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`${dimensionClasses} rounded-full bg-[#142B4A] text-[#C6A45A] font-bold flex items-center justify-center shadow-md border-2 border-white overflow-hidden cursor-pointer transition-transform group-hover:scale-102`}
            title="Click to change profile picture"
          >
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt={userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{getInitials(userName)}</span>
            )}

            {/* Hover Camera Overlay */}
            <div className="absolute inset-0 bg-[#142B4A]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-full">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-[#C6A45A]" />
              )}
            </div>
          </div>

          {/* Camera Badge in bottom corner */}
          <button
            type="button"
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#C6A45A] text-[#142B4A] flex items-center justify-center shadow-md border border-white hover:bg-[#b89549] transition-colors cursor-pointer"
            title="Upload or change photo"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hidden File Input (supports mobile camera and file picker) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          capture="user"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />

        {/* Action Buttons & Guidance */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-[#C6A45A]" />
              )}
              <span>{currentAvatarUrl ? 'Change Picture' : 'Upload Picture'}</span>
            </button>

            {currentAvatarUrl && onPhotoRemoved && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isProcessing}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FFF5F5] text-[#C74646] text-xs font-bold transition-all border border-[#FECDCA] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Remove current picture"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-[#667085]">
            Supports JPG, PNG, WEBP. Square cropped automatically for optimal display across reports and leaders list.
          </p>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`text-xs p-2.5 rounded-xl border flex items-center gap-2 animate-in fade-in ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {statusMessage.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};
