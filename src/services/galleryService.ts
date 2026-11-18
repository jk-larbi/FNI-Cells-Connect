import { supabase } from '../lib/supabase';
import { GalleryAlbum, GalleryItem, GalleryMediaType } from '../types/learning';

const KEYS = {
  ALBUMS: 'fni_gallery_albums_cache',
  ITEMS: 'fni_gallery_items_cache',
};

// Initial in-memory default albums
const DEFAULT_ALBUMS: GalleryAlbum[] = [
  {
    id: 'alb-tutor-training',
    title: 'Tutor Training',
    description: 'Comprehensive discipleship methodology, cell ministry foundations, and pedagogy for cell tutors.',
    category: 'training',
    cover_image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
    item_count: 3,
    created_at: new Date('2026-11-01').toISOString(),
  },
  {
    id: 'alb-leadership-classes',
    title: 'Leadership Classes',
    description: 'Executive leadership, pastoral governance, vision casting, and team building workshops.',
    category: 'leadership',
    cover_image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
    item_count: 2,
    created_at: new Date('2026-11-02').toISOString(),
  },
  {
    id: 'alb-bible-studies',
    title: 'Bible Studies',
    description: 'Expository teachings, Old & New Testament surveys, and systematic biblical hermeneutics.',
    category: 'biblical',
    cover_image_url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80',
    item_count: 2,
    created_at: new Date('2026-11-03').toISOString(),
  },
  {
    id: 'alb-workshops',
    title: 'Workshops',
    description: 'Hands-on practical ministry drills, evangelism outreach clinics, and follow-up strategies.',
    category: 'practical',
    cover_image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80',
    item_count: 2,
    created_at: new Date('2026-11-04').toISOString(),
  },
  {
    id: 'alb-conference-materials',
    title: 'Conference Materials',
    description: 'National annual conference presentations, keynote recordings, and executive digests.',
    category: 'conference',
    cover_image_url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
    item_count: 1,
    created_at: new Date('2026-11-05').toISOString(),
  },
];

// Initial in-memory default gallery items
const DEFAULT_ITEMS: GalleryItem[] = [
  // Photos
  {
    id: 'item-photo-1',
    title: 'National Cell Leaders Leadership Induction',
    description: 'Commissioning and dedication of newly appointed fellowship tutors at the Regional Cathedral.',
    media_type: 'photo',
    category: 'photos',
    subcategory: 'Ministry Events',
    album_id: 'alb-leadership-classes',
    album_title: 'Leadership Classes',
    file_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80',
    file_name: 'induction-2026.jpg',
    file_size: '3.2 MB',
    file_type: 'image/jpeg',
    is_featured: true,
    is_published: true,
    allow_download: true,
    tutor_access_level: 'all_tutors',
    uploaded_by_name: 'Church Directorate',
    created_at: new Date('2026-11-10T10:00:00Z').toISOString(),
  },
  {
    id: 'item-photo-2',
    title: 'Evangelism Harvest & Community Outreach Clinic',
    description: 'Tutors participating in practical neighborhood soul-winning and prayer walk assignments.',
    media_type: 'photo',
    category: 'photos',
    subcategory: 'Workshops & Conferences',
    album_id: 'alb-workshops',
    album_title: 'Workshops',
    file_url: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1600&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=600&q=80',
    file_name: 'harvest-outreach.jpg',
    file_size: '2.8 MB',
    file_type: 'image/jpeg',
    is_featured: false,
    is_published: true,
    allow_download: true,
    tutor_access_level: 'all_tutors',
    uploaded_by_name: 'Evangelism Board',
    created_at: new Date('2026-11-12T14:30:00Z').toISOString(),
  },
  {
    id: 'item-photo-3',
    title: 'Themelios Discipleship Class Practical Workshop',
    description: 'Interactive table discussion during the discipleship modules on building relational small groups.',
    media_type: 'photo',
    category: 'photos',
    subcategory: 'Class Activities',
    album_id: 'alb-tutor-training',
    album_title: 'Tutor Training',
    file_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
    file_name: 'themelios-workshop.jpg',
    file_size: '4.1 MB',
    file_type: 'image/jpeg',
    is_featured: true,
    is_published: true,
    allow_download: true,
    tutor_access_level: 'all_tutors',
    uploaded_by_name: 'Academic Directorate',
    created_at: new Date('2026-11-14T09:15:00Z').toISOString(),
  },

  // Videos
  {
    id: 'item-video-1',
    title: 'Mastering Biblical Hermeneutics for Cell Tutors',
    description: 'Executive masterclass on dissecting and interpreting scriptural texts for small group discussions.',
    media_type: 'video',
    category: 'videos',
    subcategory: 'Recorded Lessons',
    album_id: 'alb-bible-studies',
    album_title: 'Bible Studies',
    file_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    file_name: 'masterclass-hermeneutics.mp4',
    file_size: '45.2 MB',
    file_type: 'video/mp4',
    duration_seconds: 596,
    is_featured: true,
    is_published: true,
    allow_download: true,
    tutor_access_level: 'all_tutors',
    uploaded_by_name: 'Pastoral Council',
    created_at: new Date('2026-11-15T11:00:00Z').toISOString(),
  },
  {
    id: 'item-video-2',
    title: 'Cell Growth & Multiplication Masterclass',
    description: 'Strategic demonstration of how to transition an active cell group into healthy split multiplication.',
    media_type: 'video',
    category: 'videos',
    subcategory: 'Demonstrations',
    album_id: 'alb-tutor-training',
    album_title: 'Tutor Training',
    file_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    file_name: 'cell-multiplication.mp4',
    file_size: '68.0 MB',
    file_type: 'video/mp4',
    duration_seconds: 653,
    is_featured: false,
    is_published: true,
    allow_download: true,
    tutor_access_level: 'all_tutors',
    uploaded_by_name: 'Church Growth Secretariat',
    created_at: new Date('2026-11-16T15:20:00Z').toISOString(),
  },

  // Documents
  {
    id: 'item-doc-1',
    title: 'FNI Cell Leader Official Field Handbook 2026',
    description: 'Complete operational manual, soul-winning follow-up protocols, weekly report procedures, and code of conduct.',
    media_type: 'document',
    category: 'documents',
    subcategory: 'PDF Materials',
    album_id: 'alb-tutor-training',
    album_title: 'Tutor Training',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnail_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
    file_name: 'FNI_Cell_Leader_Handbook_2026.pdf',
    file_size: '3.5 MB',
    file_type: 'application/pdf',
    is_featured: true,
    is_published: true,
    allow_download: true,
    tutor_access_level: 'all_tutors',
    uploaded_by_name: 'Headquarters Secretariat',
    created_at: new Date('2026-11-08T08:00:00Z').toISOString(),
  },
  {
    id: 'item-doc-2',
    title: 'Evangelism Soul-Winning Strategy & Follow-Up Guide',
    description: 'Actionable framework covering initial gospel presentation, prayer counseling, and 72-hour visitation.',
    media_type: 'document',
    category: 'documents',
    subcategory: 'Study Guides',
    album_id: 'alb-workshops',
    album_title: 'Workshops',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnail_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
    file_name: 'Evangelism_Strategy_Guide.pdf',
    file_size: '1.9 MB',
    file_type: 'application/pdf',
    is_featured: false,
    is_published: true,
    allow_download: true,
    tutor_access_level: 'all_tutors',
    uploaded_by_name: 'Evangelism Board',
    created_at: new Date('2026-11-13T16:45:00Z').toISOString(),
  },
];

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export class GalleryService {
  // ===========================================================================
  // 1. ALBUMS
  // ===========================================================================
  static async getAlbums(isAdmin = false): Promise<GalleryAlbum[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('gallery_albums')
          .select('*, gallery_items(count)')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: GalleryAlbum[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            category: d.category,
            cover_image_url: d.cover_image_url,
            item_count: d.gallery_items?.[0]?.count ?? 0,
            created_by: d.created_by,
            created_at: d.created_at,
            updated_at: d.updated_at,
          }));
          writeLocal(KEYS.ALBUMS, mapped);
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Supabase getAlbums error, falling back to cache:', e);
    }

    return readLocal<GalleryAlbum[]>(KEYS.ALBUMS, DEFAULT_ALBUMS);
  }

  static async saveAlbum(
    album: Partial<GalleryAlbum>,
    user?: { id?: string; name?: string }
  ): Promise<GalleryAlbum> {
    const isNew = !album.id;
    const albumId = album.id || `alb-${Date.now()}`;
    const payload = {
      id: albumId,
      title: album.title || 'Untitled Album',
      description: album.description || '',
      category: album.category || 'training',
      cover_image_url: album.cover_image_url || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
      created_by: user?.id,
      updated_at: new Date().toISOString(),
      ...(isNew ? { created_at: new Date().toISOString() } : {}),
    };

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('gallery_albums')
          .upsert(payload)
          .select()
          .single();
        if (!error && data) {
          this.updateLocalAlbum(data);
          return data;
        }
      }
    } catch (e) {
      console.warn('Supabase saveAlbum error, writing to local cache:', e);
    }

    const savedAlbum: GalleryAlbum = {
      ...payload,
      created_at: payload.created_at || new Date().toISOString(),
      item_count: album.item_count || 0,
    };
    this.updateLocalAlbum(savedAlbum);
    return savedAlbum;
  }

  private static updateLocalAlbum(album: GalleryAlbum): void {
    const list = readLocal<GalleryAlbum[]>(KEYS.ALBUMS, DEFAULT_ALBUMS);
    const idx = list.findIndex(a => a.id === album.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...album };
    } else {
      list.unshift(album);
    }
    writeLocal(KEYS.ALBUMS, list);
  }

  static async deleteAlbum(albumId: string): Promise<void> {
    try {
      if (supabase) {
        await supabase.from('gallery_albums').delete().eq('id', albumId);
      }
    } catch (e) {
      console.warn('Supabase deleteAlbum error:', e);
    }

    const list = readLocal<GalleryAlbum[]>(KEYS.ALBUMS, DEFAULT_ALBUMS);
    writeLocal(KEYS.ALBUMS, list.filter(a => a.id !== albumId));
  }

  // ===========================================================================
  // 2. GALLERY ITEMS
  // ===========================================================================
  static async getItems(
    isAdmin = false,
    filters?: {
      mediaType?: GalleryMediaType | 'all';
      albumId?: string;
      category?: string;
      search?: string;
    }
  ): Promise<GalleryItem[]> {
    try {
      if (supabase) {
        let query = supabase
          .from('gallery_items')
          .select('*, gallery_albums(title)')
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          query = query.eq('is_published', true);
        }

        if (filters?.mediaType && filters.mediaType !== 'all') {
          query = query.eq('media_type', filters.mediaType);
        }

        if (filters?.albumId) {
          query = query.eq('album_id', filters.albumId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const mapped: GalleryItem[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            media_type: d.media_type,
            category: d.category,
            subcategory: d.subcategory,
            album_id: d.album_id,
            album_title: d.gallery_albums?.title,
            file_url: d.file_url,
            thumbnail_url: d.thumbnail_url || d.file_url,
            file_name: d.file_name,
            file_size: d.file_size || '1.5 MB',
            file_type: d.file_type,
            duration_seconds: d.duration_seconds,
            is_featured: Boolean(d.is_featured),
            is_published: Boolean(d.is_published),
            allow_download: d.allow_download !== false,
            tutor_access_level: d.tutor_access_level || 'all_tutors',
            uploaded_by: d.uploaded_by,
            uploaded_by_name: d.uploaded_by_name || 'Church Directorate',
            created_at: d.created_at,
            updated_at: d.updated_at,
          }));

          writeLocal(KEYS.ITEMS, mapped);
          return this.applyLocalFilters(mapped, filters, isAdmin);
        }
      }
    } catch (e) {
      console.warn('Supabase getItems error, falling back to cache:', e);
    }

    const cached = readLocal<GalleryItem[]>(KEYS.ITEMS, DEFAULT_ITEMS);
    return this.applyLocalFilters(cached, filters, isAdmin);
  }

  private static applyLocalFilters(
    items: GalleryItem[],
    filters?: {
      mediaType?: GalleryMediaType | 'all';
      albumId?: string;
      category?: string;
      search?: string;
    },
    isAdmin = false
  ): GalleryItem[] {
    return items.filter(item => {
      if (!isAdmin && !item.is_published) return false;
      if (filters?.mediaType && filters.mediaType !== 'all' && item.media_type !== filters.mediaType) {
        return false;
      }
      if (filters?.albumId && item.album_id !== filters.albumId) {
        return false;
      }
      if (filters?.category && filters.category !== 'all' && item.category !== filters.category && item.subcategory !== filters.category) {
        return false;
      }
      if (filters?.search && filters.search.trim()) {
        const q = filters.search.toLowerCase();
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
  }

  static async saveItem(
    item: Partial<GalleryItem>,
    user?: { id?: string; name?: string }
  ): Promise<GalleryItem> {
    const isNew = !item.id;
    const itemId = item.id || `item-${Date.now()}`;
    const payload = {
      id: itemId,
      title: item.title || 'Untitled Resource',
      description: item.description || '',
      media_type: item.media_type || 'photo',
      category: item.category || 'photos',
      subcategory: item.subcategory,
      album_id: item.album_id || null,
      file_url: item.file_url || '',
      thumbnail_url: item.thumbnail_url || item.file_url,
      file_name: item.file_name || 'attachment',
      file_size: item.file_size || '1.5 MB',
      file_type: item.file_type || (item.media_type === 'photo' ? 'image/jpeg' : item.media_type === 'video' ? 'video/mp4' : 'application/pdf'),
      duration_seconds: item.duration_seconds,
      is_featured: Boolean(item.is_featured),
      is_published: item.is_published !== false,
      allow_download: item.allow_download !== false,
      tutor_access_level: item.tutor_access_level || 'all_tutors',
      uploaded_by: user?.id,
      uploaded_by_name: user?.name || item.uploaded_by_name || 'Church Directorate',
      updated_at: new Date().toISOString(),
      ...(isNew ? { created_at: new Date().toISOString() } : {}),
    };

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('gallery_items')
          .upsert(payload)
          .select('*, gallery_albums(title)')
          .single();
        if (!error && data) {
          const mapped: GalleryItem = {
            ...payload,
            album_title: data.gallery_albums?.title,
            created_at: data.created_at || new Date().toISOString(),
          };
          this.updateLocalItem(mapped);
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Supabase saveItem error, writing to cache:', e);
    }

    const saved: GalleryItem = {
      ...payload,
      created_at: payload.created_at || new Date().toISOString(),
      album_title: item.album_title,
    };
    this.updateLocalItem(saved);
    return saved;
  }

  private static updateLocalItem(item: GalleryItem): void {
    const list = readLocal<GalleryItem[]>(KEYS.ITEMS, DEFAULT_ITEMS);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.unshift(item);
    }
    writeLocal(KEYS.ITEMS, list);
  }

  static async deleteItem(itemId: string): Promise<void> {
    try {
      if (supabase) {
        await supabase.from('gallery_items').delete().eq('id', itemId);
      }
    } catch (e) {
      console.warn('Supabase deleteItem error:', e);
    }

    const list = readLocal<GalleryItem[]>(KEYS.ITEMS, DEFAULT_ITEMS);
    writeLocal(KEYS.ITEMS, list.filter(i => i.id !== itemId));
  }

  static async togglePublish(itemId: string, isPublished: boolean): Promise<void> {
    try {
      if (supabase) {
        await supabase
          .from('gallery_items')
          .update({ is_published: isPublished, updated_at: new Date().toISOString() })
          .eq('id', itemId);
      }
    } catch (e) {
      console.warn('Supabase togglePublish error:', e);
    }

    const list = readLocal<GalleryItem[]>(KEYS.ITEMS, DEFAULT_ITEMS);
    const target = list.find(i => i.id === itemId);
    if (target) {
      target.is_published = isPublished;
      writeLocal(KEYS.ITEMS, list);
    }
  }

  static async toggleFeatured(itemId: string, isFeatured: boolean): Promise<void> {
    try {
      if (supabase) {
        await supabase
          .from('gallery_items')
          .update({ is_featured: isFeatured, updated_at: new Date().toISOString() })
          .eq('id', itemId);
      }
    } catch (e) {
      console.warn('Supabase toggleFeatured error:', e);
    }

    const list = readLocal<GalleryItem[]>(KEYS.ITEMS, DEFAULT_ITEMS);
    const target = list.find(i => i.id === itemId);
    if (target) {
      target.is_featured = isFeatured;
      writeLocal(KEYS.ITEMS, list);
    }
  }

  // ===========================================================================
  // 3. SECURE FILE UPLOAD VIA SUPABASE STORAGE
  // ===========================================================================
  static async uploadFile(
    file: File,
    user?: { id?: string }
  ): Promise<{ url: string; name: string; size: string; mimeType: string }> {
    // 1. Validate size
    const isVideo = file.type.startsWith('video');
    const maxSize = isVideo ? 100 * 1024 * 1024 : 30 * 1024 * 1024; // 100MB video, 30MB other
    if (file.size > maxSize) {
      throw new Error(`File exceeds maximum permitted size of ${isVideo ? '100MB' : '30MB'}.`);
    }

    // 2. Format size
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const formattedSize = `${sizeInMb} MB`;

    // 3. Upload to Supabase Storage if available
    try {
      if (supabase) {
        const fileExt = file.name.split('.').pop() || 'bin';
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `gallery/${Date.now()}_${cleanName}`;

        // Attempt upload to 'fni-chat-media' (which is proven live and working)
        const { error: uploadError } = await supabase.storage
          .from('fni-chat-media')
          .upload(storagePath, file, { contentType: file.type, upsert: true });

        if (!uploadError) {
          const { data: pubData } = supabase.storage
            .from('fni-chat-media')
            .getPublicUrl(storagePath);

          if (pubData?.publicUrl) {
            return {
              url: pubData.publicUrl,
              name: file.name,
              size: formattedSize,
              mimeType: file.type,
            };
          }
        }
      }
    } catch (e) {
      console.warn('Supabase storage upload fallback to local URL:', e);
    }

    // Fallback: create browser object URL
    const localUrl = URL.createObjectURL(file);
    return {
      url: localUrl,
      name: file.name,
      size: formattedSize,
      mimeType: file.type,
    };
  }
}
