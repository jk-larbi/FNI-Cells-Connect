import React, { useState } from 'react';
import {
  X,
  Folder,
  FolderPlus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image,
} from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { GalleryAlbum } from '../../../types/learning';
import { GalleryService } from '../../../services/galleryService';

export interface AdminAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  albums: GalleryAlbum[];
  onAlbumsUpdated: () => void;
  currentUser?: { id: string; full_name?: string };
}

export const AdminAlbumModal: React.FC<AdminAlbumModalProps> = ({
  isOpen,
  onClose,
  albums,
  onAlbumsUpdated,
  currentUser,
}) => {
  const [editingAlbum, setEditingAlbum] = useState<GalleryAlbum | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('training');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  const startCreate = () => {
    setEditingAlbum(null);
    setTitle('');
    setDescription('');
    setCategory('training');
    setCoverImageUrl('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80');
    setErrorMsg(null);
  };

  const startEdit = (album: GalleryAlbum) => {
    setEditingAlbum(album);
    setTitle(album.title);
    setDescription(album.description || '');
    setCategory(album.category || 'training');
    setCoverImageUrl(album.cover_image_url || '');
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Album title is required.');
      return;
    }

    setSubmitting(true);
    try {
      await GalleryService.saveAlbum(
        {
          ...(editingAlbum ? { id: editingAlbum.id } : {}),
          title: title.trim(),
          description: description.trim(),
          category,
          cover_image_url: coverImageUrl.trim() || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
        },
        currentUser ? { id: currentUser.id, name: currentUser.full_name } : undefined
      );

      startCreate();
      onAlbumsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save album.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (albumId: string) => {
    if (!confirm('Are you sure you want to delete this album? Media inside it will not be deleted but will be unassigned.')) {
      return;
    }

    setSubmitting(true);
    try {
      await GalleryService.deleteAlbum(albumId);
      if (editingAlbum?.id === albumId) startCreate();
      onAlbumsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete album.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#111c2d] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-900/40">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Gallery Albums Directory
              </h3>
              <p className="text-xs text-slate-500">
                Create and organize thematic media collections for cell tutors.
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Add / Edit Form */}
          <form onSubmit={handleSave} className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-purple-600" />
                <span>{editingAlbum ? 'Edit Selected Album' : 'Create New Album'}</span>
              </span>
              {editingAlbum && (
                <button
                  type="button"
                  onClick={startCreate}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Album Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Discipleship Bootcamp 2026"
                  className="w-full px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Theme Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="training">Tutor Training</option>
                  <option value="leadership">Leadership Classes</option>
                  <option value="biblical">Bible Studies</option>
                  <option value="practical">Workshops</option>
                  <option value="conference">Conference Materials</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Overview of the album's curriculum or ministerial focus..."
                className="w-full px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Cover Image URL
              </label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={e => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{editingAlbum ? 'Update Album' : 'Create Album'}</span>
              </button>
            </div>
          </form>

          {/* Existing Albums List */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Existing Albums ({albums.length})
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#111c2d]">
              {albums.map(album => (
                <div
                  key={album.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-white/10">
                      {album.cover_image_url ? (
                        <img src={album.cover_image_url} alt={album.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Folder className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {album.title}
                        </span>
                        <span className="px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-semibold">
                          {album.item_count || 0} items
                        </span>
                      </div>
                      {album.description && (
                        <p className="text-[11px] text-slate-500 truncate">{album.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(album)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Edit album"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(album.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete album"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
