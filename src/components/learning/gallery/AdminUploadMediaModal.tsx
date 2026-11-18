import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Image,
  Film,
  FileText,
  Folder,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link,
  Shield,
  Star,
  Eye,
  Download,
} from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import {
  GalleryItem,
  GalleryAlbum,
  GalleryMediaType,
  GalleryPhotoSubcategory,
  GalleryVideoSubcategory,
  GalleryDocumentSubcategory,
} from '../../../types/learning';
import { GalleryService } from '../../../services/galleryService';

export interface AdminUploadMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  albums: GalleryAlbum[];
  editingItem?: GalleryItem | null;
  onItemSaved: () => void;
  currentUser?: { id: string; full_name?: string };
}

const PHOTO_SUBCATEGORIES: GalleryPhotoSubcategory[] = [
  'Training Sessions',
  'Class Activities',
  'Ministry Events',
  'Workshops & Conferences',
];

const VIDEO_SUBCATEGORIES: GalleryVideoSubcategory[] = [
  'Recorded Lessons',
  'Tutorials',
  'Training Sessions',
  'Demonstrations',
];

const DOCUMENT_SUBCATEGORIES: GalleryDocumentSubcategory[] = [
  'PDF Materials',
  'Presentations',
  'Study Guides',
  'Learning Notes',
];

export const AdminUploadMediaModal: React.FC<AdminUploadMediaModalProps> = ({
  isOpen,
  onClose,
  albums,
  editingItem,
  onItemSaved,
  currentUser,
}) => {
  const [mediaType, setMediaType] = useState<GalleryMediaType>('photo');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subcategory, setSubcategory] = useState<string>('Training Sessions');
  const [albumId, setAlbumId] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('1.5 MB');
  const [fileType, setFileType] = useState<string>('image/jpeg');
  const [durationSeconds, setDurationSeconds] = useState<number | undefined>(undefined);

  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [allowDownload, setAllowDownload] = useState<boolean>(true);
  const [tutorAccessLevel, setTutorAccessLevel] = useState<'all_tutors' | 'cell_leaders_only' | 'executives_only'>('all_tutors');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [useUrlDirectly, setUseUrlDirectly] = useState(false);

  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  useEffect(() => {
    if (editingItem) {
      setMediaType(editingItem.media_type);
      setTitle(editingItem.title);
      setDescription(editingItem.description || '');
      setSubcategory(editingItem.subcategory || (editingItem.media_type === 'photo' ? 'Training Sessions' : editingItem.media_type === 'video' ? 'Recorded Lessons' : 'PDF Materials'));
      setAlbumId(editingItem.album_id || '');
      setFileUrl(editingItem.file_url);
      setFileName(editingItem.file_name || '');
      setFileSize(editingItem.file_size || '1.5 MB');
      setFileType(editingItem.file_type || '');
      setDurationSeconds(editingItem.duration_seconds);
      setIsFeatured(editingItem.is_featured);
      setIsPublished(editingItem.is_published);
      setAllowDownload(editingItem.allow_download);
      setTutorAccessLevel(editingItem.tutor_access_level);
      setUseUrlDirectly(true);
    } else {
      resetForm();
    }
  }, [editingItem, isOpen]);

  // Adjust default subcategory on media type change
  useEffect(() => {
    if (!editingItem) {
      if (mediaType === 'photo') {
        setSubcategory(PHOTO_SUBCATEGORIES[0]);
      } else if (mediaType === 'video') {
        setSubcategory(VIDEO_SUBCATEGORIES[0]);
      } else {
        setSubcategory(DOCUMENT_SUBCATEGORIES[0]);
      }
    }
  }, [mediaType]);

  const resetForm = () => {
    setMediaType('photo');
    setTitle('');
    setDescription('');
    setSubcategory(PHOTO_SUBCATEGORIES[0]);
    setAlbumId(albums[0]?.id || '');
    setFileUrl('');
    setFileName('');
    setFileSize('1.5 MB');
    setFileType('image/jpeg');
    setDurationSeconds(undefined);
    setIsFeatured(false);
    setIsPublished(true);
    setAllowDownload(true);
    setTutorAccessLevel('all_tutors');
    setUploading(false);
    setUploadProgress(0);
    setErrorMsg(null);
    setUseUrlDirectly(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setUploading(true);
    setUploadProgress(25);

    try {
      const timer = setInterval(() => {
        setUploadProgress(p => (p < 85 ? p + 20 : p));
      }, 200);

      const uploaded = await GalleryService.uploadFile(file, currentUser ? { id: currentUser.id } : undefined);
      clearInterval(timer);
      setUploadProgress(100);

      setFileUrl(uploaded.url);
      setFileName(uploaded.name);
      setFileSize(uploaded.size);
      setFileType(uploaded.mimeType);

      if (!title.trim()) {
        const cleanName = uploaded.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Resource title is required.');
      return;
    }
    if (!fileUrl.trim()) {
      setErrorMsg('Please upload a file or provide a valid media URL.');
      return;
    }

    setUploading(true);
    try {
      const selectedAlbum = albums.find(a => a.id === albumId);
      await GalleryService.saveItem(
        {
          ...(editingItem ? { id: editingItem.id } : {}),
          title: title.trim(),
          description: description.trim(),
          media_type: mediaType,
          category: mediaType === 'photo' ? 'photos' : mediaType === 'video' ? 'videos' : 'documents',
          subcategory,
          album_id: albumId || undefined,
          album_title: selectedAlbum?.title,
          file_url: fileUrl.trim(),
          thumbnail_url: mediaType === 'photo' ? fileUrl.trim() : undefined,
          file_name: fileName.trim() || `${title.replace(/[^a-zA-Z0-9]/g, '_')}.${mediaType === 'photo' ? 'jpg' : mediaType === 'video' ? 'mp4' : 'pdf'}`,
          file_size: fileSize,
          file_type: fileType,
          duration_seconds: durationSeconds,
          is_featured: isFeatured,
          is_published: isPublished,
          allow_download: allowDownload,
          tutor_access_level: tutorAccessLevel,
        },
        currentUser ? { id: currentUser.id, name: currentUser.full_name } : undefined
      );

      onItemSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save resource.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-[#111c2d] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-900/40">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {editingItem ? 'Edit Gallery Resource' : 'Upload Learning Gallery Resource'}
              </h3>
              <p className="text-xs text-slate-500">
                Publish high-resolution photos, recorded video lessons, or PDF guides.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Media Type Selector */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Select Media Category
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'photo', label: 'Photo', icon: Image },
                { id: 'video', label: 'Video', icon: Film },
                { id: 'document', label: 'Document', icon: FileText },
              ].map(t => {
                const Icon = t.icon;
                const isSelected = mediaType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMediaType(t.id as any)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. File Uploader or Direct URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Media File Attachment
              </label>
              <button
                type="button"
                onClick={() => setUseUrlDirectly(v => !v)}
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Link className="w-3 h-3" />
                <span>{useUrlDirectly ? 'Upload from device' : 'Use web URL link'}</span>
              </button>
            </div>

            {useUrlDirectly ? (
              <div className="space-y-1">
                <input
                  type="url"
                  value={fileUrl}
                  onChange={e => setFileUrl(e.target.value)}
                  placeholder="https://example.com/media/session.mp4 or photo.jpg"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400">
                  Accepts direct cloud storage URLs, MP4/WebM videos, WebP/JPG images, and PDF documents.
                </p>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-blue-400 rounded-3xl p-6 text-center transition-colors">
                <input
                  type="file"
                  accept={mediaType === 'photo' ? 'image/*' : mediaType === 'video' ? 'video/*' : '.pdf,.doc,.docx,.ppt,.pptx'}
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  {fileName ? (
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">{fileName}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold">✓ Uploaded ({fileSize})</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        Drag and drop your file here, or browse
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {mediaType === 'photo' ? 'JPG, PNG, WebP up to 30MB' : mediaType === 'video' ? 'MP4, WebM up to 100MB' : 'PDF, DOCX, PPTX up to 30MB'}
                      </p>
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="mt-3 space-y-1">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Uploading {uploadProgress}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Resource Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Discipleship Training Conference 2026"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Description & Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Summary of the key teachings, context, and ministry relevance..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* 4. Subcategory & Album Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Category Classification
              </label>
              <select
                value={subcategory}
                onChange={e => setSubcategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {mediaType === 'photo' && PHOTO_SUBCATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                {mediaType === 'video' && VIDEO_SUBCATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                {mediaType === 'document' && DOCUMENT_SUBCATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Assign to Album
              </label>
              <select
                value={albumId}
                onChange={e => setAlbumId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No specific album</option>
                {albums.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Access & Publishing Controls */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 space-y-3">
            <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider block">
              Tutor Access & Permissions
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={e => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Published for Tutors
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={e => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span>Featured Resource</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={e => setAllowDownload(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Allow Downloads
                </span>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Tutor Role Restriction
              </label>
              <select
                value={tutorAccessLevel}
                onChange={e => setTutorAccessLevel(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              >
                <option value="all_tutors">All Registered Tutors</option>
                <option value="cell_leaders_only">Assigned Cell Leaders Only</option>
                <option value="executives_only">Executive Council Only</option>
              </select>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Resource...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingItem ? 'Save Changes' : 'Publish Resource'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
