import React, { useState, useEffect, useMemo } from 'react';
import {
  Image,
  Film,
  FileText,
  Folder,
  Search,
  Upload,
  Plus,
  Filter,
  Play,
  Maximize2,
  Download,
  Calendar,
  User,
  Award,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  FolderPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  GalleryItem,
  GalleryAlbum,
  GalleryMediaType,
} from '../../types/learning';
import { GalleryService } from '../../services/galleryService';

// Modals
import { PhotoViewerModal } from './gallery/PhotoViewerModal';
import { VideoPlayerModal } from './gallery/VideoPlayerModal';
import { DocumentViewerModal } from './gallery/DocumentViewerModal';
import { AdminUploadMediaModal } from './gallery/AdminUploadMediaModal';
import { AdminAlbumModal } from './gallery/AdminAlbumModal';

type MainTab = 'all' | 'photos' | 'videos' | 'documents' | 'albums';

export const LearningGalleryView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();

  // Data state
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<MainTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');

  // Modals state
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<GalleryItem | null>(null);
  const [activeDocument, setActiveDocument] = useState<GalleryItem | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  useEffect(() => {
    const handleCloudChange = (event: Event) => {
      const table = (event as CustomEvent).detail?.table;
      if (table === '*' || ['gallery_albums', 'gallery_items'].includes(table)) void loadData();
    };
    window.addEventListener('fni:cloud-data-changed', handleCloudChange);
    return () => window.removeEventListener('fni:cloud-data-changed', handleCloudChange);
  }, [isAdmin]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [albumData, itemData] = await Promise.all([
        GalleryService.getAlbums(isAdmin),
        GalleryService.getItems(isAdmin),
      ]);
      setAlbums(albumData);
      setItems(itemData);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered items based on tab, subcategory, album, and search
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Role-based publish guard
      if (!isAdmin && !item.is_published) return false;

      // 2. Tab filter
      if (activeTab === 'photos' && item.media_type !== 'photo') return false;
      if (activeTab === 'videos' && item.media_type !== 'video') return false;
      if (activeTab === 'documents' && item.media_type !== 'document') return false;

      // 3. Subcategory filter
      if (selectedSubcategory !== 'all' && item.subcategory !== selectedSubcategory) {
        return false;
      }

      // 4. Album filter
      if (selectedAlbumId !== 'all' && item.album_id !== selectedAlbumId) {
        return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesSubcat = (item.subcategory || '').toLowerCase().includes(q);
        const matchesAlbum = (item.album_title || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesSubcat && !matchesAlbum) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeTab, selectedSubcategory, selectedAlbumId, searchQuery, isAdmin]);

  // Photo-only subset for lightbox index navigation
  const photoItems = useMemo(() => {
    return filteredItems.filter(i => i.media_type === 'photo');
  }, [filteredItems]);

  // Featured items
  const featuredItems = useMemo(() => {
    return items.filter(i => i.is_featured && (isAdmin || i.is_published));
  }, [items, isAdmin]);

  // Recently added (latest 6)
  const recentItems = useMemo(() => {
    return [...items]
      .filter(i => isAdmin || i.is_published)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  }, [items, isAdmin]);

  // Subcategories available for active tab
  const availableSubcategories = useMemo(() => {
    if (activeTab === 'photos') {
      return ['Training Sessions', 'Class Activities', 'Ministry Events', 'Workshops & Conferences'];
    }
    if (activeTab === 'videos') {
      return ['Recorded Lessons', 'Tutorials', 'Training Sessions', 'Demonstrations'];
    }
    if (activeTab === 'documents') {
      return ['PDF Materials', 'Presentations', 'Study Guides', 'Learning Notes'];
    }
    return [];
  }, [activeTab]);

  // Item click handler
  const handleItemClick = (item: GalleryItem) => {
    if (item.media_type === 'photo') {
      const idx = photoItems.findIndex(p => p.id === item.id);
      setActivePhotoIndex(idx >= 0 ? idx : 0);
    } else if (item.media_type === 'video') {
      setActiveVideo(item);
    } else if (item.media_type === 'document') {
      setActiveDocument(item);
    }
  };

  // Admin Quick Actions
  const handleTogglePublish = async (e: React.MouseEvent, item: GalleryItem) => {
    e.stopPropagation();
    await GalleryService.togglePublish(item.id, !item.is_published);
    loadData();
  };

  const handleToggleFeatured = async (e: React.MouseEvent, item: GalleryItem) => {
    e.stopPropagation();
    await GalleryService.toggleFeatured(item.id, !item.is_featured);
    loadData();
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: GalleryItem) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    await GalleryService.deleteItem(item.id);
    loadData();
  };

  const handleEditItem = (e: React.MouseEvent, item: GalleryItem) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsUploadModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* =======================================================================
          1. GALLERY HERO & HEADING
      ======================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#142B4A] via-[#1A365D] to-[#2E1065] text-white shadow-xl relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#C6A45A]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 text-[#C6A45A] font-bold text-xs uppercase tracking-wider backdrop-blur-xs border border-white/10 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                <span>Media Archive & Library</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Learning Portal Gallery
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Explore high-resolution event photos, recorded masterclasses, theological study guides, and leadership albums curated for FNI cell tutors.
            </p>
          </div>

          {/* Admin Header Action Controls */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsUploadModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-[#C6A45A] hover:bg-[#b5934a] text-[#142B4A] font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Media</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAlbumModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-purple-300" />
                <span>Manage Albums</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =======================================================================
          2. SEARCH & MAIN CATEGORY FILTER TABS
      ======================================================================= */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Resources', icon: Layers, count: items.length },
              { id: 'photos', label: 'Photos', icon: Image, count: items.filter(i => i.media_type === 'photo').length },
              { id: 'videos', label: 'Videos', icon: Film, count: items.filter(i => i.media_type === 'video').length },
              { id: 'documents', label: 'Documents', icon: FileText, count: items.filter(i => i.media_type === 'document').length },
              { id: 'albums', label: 'Albums', icon: Folder, count: albums.length },
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as MainTab);
                    setSelectedSubcategory('all');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#142B4A] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#C6A45A]' : ''}`} />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, topic, or album..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
            />
          </div>
        </div>

        {/* Secondary Subcategory Pill Filters (When applicable) */}
        {activeTab !== 'albums' && (availableSubcategories.length > 0 || albums.length > 0) && (
          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Subcategory pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Filter:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSubcategory('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  selectedSubcategory === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Subcategories
              </button>
              {availableSubcategories.map(sub => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    selectedSubcategory === sub
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Filter by Album selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">Album:</span>
              <select
                value={selectedAlbumId}
                onChange={e => setSelectedAlbumId(e.target.value)}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 focus:outline-none"
              >
                <option value="all">All Albums</option>
                {albums.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* =======================================================================
          3. FEATURED RESOURCES SECTION (Rendered on 'All' tab when featured items exist)
      ======================================================================= */}
      {activeTab === 'all' && !searchQuery.trim() && featuredItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Featured Resources</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              Curated ministerial highlights
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredItems.map(item => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="group relative rounded-3xl bg-white dark:bg-[#111c2d] border border-amber-500/20 dark:border-amber-500/20 shadow-xs hover:shadow-xl transition-all overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1"
              >
                {/* Thumbnail Image Container */}
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                  <img
                    src={item.thumbnail_url || item.file_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-md">
                      <Award className="w-3 h-3" />
                      <span>FEATURED</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/60 text-white font-bold text-[10px] backdrop-blur-xs uppercase">
                      {item.media_type}
                    </span>
                  </div>

                  {/* Play Overlay for Video */}
                  {item.media_type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </div>
                    </div>
                  )}

                  {/* Photo Expand Icon */}
                  {item.media_type === 'photo' && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-1.5 rounded-full bg-black/60 text-white backdrop-blur-xs">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}

                  {/* Document Format Badge */}
                  {item.media_type === 'document' && (
                    <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-bold">
                      PDF
                    </div>
                  )}
                </div>

                {/* Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    {item.album_title && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-0.5">
                        {item.album_title}
                      </span>
                    )}
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-white/5">
                    <span>{new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="font-mono">{item.file_size}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =======================================================================
          4. RECENTLY ADDED MEDIA SECTION (Carousel / Horizontal Cards)
      ======================================================================= */}
      {activeTab === 'all' && !searchQuery.trim() && recentItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Recently Added</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              Latest uploads across categories
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recentItems.map(item => (
              <div
                key={`recent-${item.id}`}
                onClick={() => handleItemClick(item)}
                className="group relative rounded-2xl bg-white dark:bg-[#111c2d] border border-slate-200 dark:border-white/10 p-2 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col"
              >
                <div className="relative aspect-square w-full rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                  <img
                    src={item.thumbnail_url || item.file_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded-md bg-black/70 text-white font-black text-[9px] uppercase backdrop-blur-2xs">
                    {item.media_type}
                  </div>
                </div>
                <h5 className="font-bold text-[11px] text-slate-900 dark:text-white line-clamp-1">
                  {item.title}
                </h5>
                <span className="text-[10px] text-slate-400 mt-auto pt-1">
                  {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =======================================================================
          5. MAIN CONTENT VIEW: ALBUMS VIEW OR RESOURCE THUMBNAIL GRID
      ======================================================================= */}
      {activeTab === 'albums' ? (
        /* Albums Gallery Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-purple-600" />
                <span>Ministry Albums ({albums.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Thematic media collections organized for training and discipleship
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAlbumModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>New Album</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {albums.map(album => {
              const albumItemsCount = items.filter(i => i.album_id === album.id).length;
              return (
                <div
                  key={album.id}
                  onClick={() => {
                    setSelectedAlbumId(album.id);
                    setActiveTab('all');
                  }}
                  className="group relative rounded-3xl bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-xl transition-all overflow-hidden cursor-pointer flex flex-col hover:-translate-y-1"
                >
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                    <img
                      src={album.cover_image_url || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80'}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/60 text-white font-bold text-xs backdrop-blur-xs flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>{albumItemsCount} items</span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-0.5">
                        {album.category || 'Curriculum'}
                      </span>
                      <h4 className="font-black text-sm sm:text-base leading-snug truncate">
                        {album.title}
                      </h4>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <p className="text-slate-600 dark:text-slate-300 text-xs line-clamp-2 leading-relaxed">
                      {album.description || 'Curated ministerial training resources and media.'}
                    </p>

                    <div className="mt-3 pt-3 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-bold border-t border-slate-100 dark:border-white/5">
                      <span>Browse Album Collection</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Resource Grid: Photos, Videos, Documents */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Gallery Resources</span>
              <span className="text-xs font-normal text-slate-400">
                ({filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'})
              </span>
            </h3>

            {selectedAlbumId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedAlbumId('all')}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Clear Album Filter
              </button>
            )}
          </div>

          {filteredItems.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 opacity-50" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                No matching resources found
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try searching with different keywords, selecting another category, or resetting your album filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSubcategory('all');
                  setSelectedAlbumId('all');
                  setActiveTab('all');
                }}
                className="mt-2 text-xs text-blue-600 font-bold hover:underline"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            /* Gallery Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="group relative rounded-3xl bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-xl transition-all overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1"
                >
                  {/* Thumbnail Cover */}
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                    <img
                      src={item.thumbnail_url || item.file_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Media Type Tag */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-black/60 text-white font-bold text-[9px] backdrop-blur-2xs uppercase">
                        {item.media_type}
                      </span>
                      {item.is_featured && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                          <Award className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Admin Action Menu on Thumbnail */}
                    {isAdmin && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-1 backdrop-blur-xs"
                      >
                        <button
                          type="button"
                          onClick={e => handleTogglePublish(e, item)}
                          className={`p-1 rounded-full ${item.is_published ? 'text-emerald-400' : 'text-slate-400'}`}
                          title={item.is_published ? 'Published (Click to unpublish)' : 'Unpublished (Click to publish)'}
                        >
                          {item.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={e => handleToggleFeatured(e, item)}
                          className={`p-1 rounded-full ${item.is_featured ? 'text-amber-400' : 'text-slate-400'}`}
                          title="Toggle featured status"
                        >
                          <Award className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={e => handleEditItem(e, item)}
                          className="p-1 rounded-full text-blue-400 hover:text-white"
                          title="Edit Resource"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={e => handleDeleteItem(e, item)}
                          className="p-1 rounded-full text-rose-400 hover:text-rose-600"
                          title="Delete Resource"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Video Center Play Icon */}
                    {item.media_type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 ml-0.5 fill-current" />
                        </div>
                      </div>
                    )}

                    {/* Photo Corner Hover Expand */}
                    {item.media_type === 'photo' && (
                      <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-1 rounded-full bg-black/60 text-white backdrop-blur-xs">
                          <Maximize2 className="w-3 h-3" />
                        </div>
                      </div>
                    )}

                    {/* Document Format Label */}
                    {item.media_type === 'document' && (
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[9px] font-bold">
                        PDF
                      </div>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-1.5">
                    <div>
                      {item.subcategory && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block truncate">
                          {item.subcategory}
                        </span>
                      )}
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-white/5">
                      <span>{new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      <span className="font-mono">{item.file_size}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          6. MODALS
      ======================================================================= */}
      {/* Lightbox Photo Viewer Modal */}
      <PhotoViewerModal
        isOpen={activePhotoIndex !== null}
        onClose={() => setActivePhotoIndex(null)}
        items={photoItems}
        initialIndex={activePhotoIndex || 0}
      />

      {/* Built-in Video Player Modal */}
      <VideoPlayerModal
        isOpen={activeVideo !== null}
        onClose={() => setActiveVideo(null)}
        video={activeVideo}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={activeDocument !== null}
        onClose={() => setActiveDocument(null)}
        document={activeDocument}
      />

      {/* Admin Upload / Edit Media Modal */}
      <AdminUploadMediaModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setEditingItem(null);
        }}
        albums={albums}
        editingItem={editingItem}
        onItemSaved={loadData}
        currentUser={currentUser ? { id: currentUser.id, full_name: currentUser.full_name } : undefined}
      />

      {/* Admin Album Management Modal */}
      <AdminAlbumModal
        isOpen={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        albums={albums}
        onAlbumsUpdated={loadData}
        currentUser={currentUser ? { id: currentUser.id, full_name: currentUser.full_name } : undefined}
      />
    </div>
  );
};
