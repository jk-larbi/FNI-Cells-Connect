-- ==============================================================================
-- Forerunners Network International (FNI) - Digital Reporting System
-- Migration: Learning Portal Gallery Schema & Security Policies
-- Date: November 18, 2026
-- Description: Media Gallery for Photos, Videos, Documents, and Albums with strict RLS.
-- ==============================================================================

-- 1. GALLERY ALBUMS TABLE
CREATE TABLE IF NOT EXISTS public.gallery_albums (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'training',
  cover_image_url TEXT,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. GALLERY ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'document')),
  category TEXT NOT NULL,
  subcategory TEXT,
  album_id TEXT REFERENCES public.gallery_albums(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT,
  file_size TEXT DEFAULT '1.5 MB',
  file_type TEXT,
  duration_seconds INT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  allow_download BOOLEAN NOT NULL DEFAULT true,
  tutor_access_level TEXT NOT NULL DEFAULT 'all_tutors' CHECK (tutor_access_level IN ('all_tutors', 'cell_leaders_only', 'executives_only')),
  uploaded_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by_name TEXT DEFAULT 'FNI Directorate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning fast searching and filtering
CREATE INDEX IF NOT EXISTS idx_gallery_items_media_type ON public.gallery_items(media_type);
CREATE INDEX IF NOT EXISTS idx_gallery_items_album_id ON public.gallery_items(album_id);
CREATE INDEX IF NOT EXISTS idx_gallery_items_published ON public.gallery_items(is_published);
CREATE INDEX IF NOT EXISTS idx_gallery_items_featured ON public.gallery_items(is_featured);
CREATE INDEX IF NOT EXISTS idx_gallery_items_created_at ON public.gallery_items(created_at DESC);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- Albums Policies
DROP POLICY IF EXISTS gallery_albums_select_policy ON public.gallery_albums;
CREATE POLICY gallery_albums_select_policy ON public.gallery_albums
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS gallery_albums_admin_insert ON public.gallery_albums;
CREATE POLICY gallery_albums_admin_insert ON public.gallery_albums
  FOR INSERT TO authenticated
  WITH CHECK (private.is_fni_admin());

DROP POLICY IF EXISTS gallery_albums_admin_update ON public.gallery_albums;
CREATE POLICY gallery_albums_admin_update ON public.gallery_albums
  FOR UPDATE TO authenticated
  USING (private.is_fni_admin())
  WITH CHECK (private.is_fni_admin());

DROP POLICY IF EXISTS gallery_albums_admin_delete ON public.gallery_albums;
CREATE POLICY gallery_albums_admin_delete ON public.gallery_albums
  FOR DELETE TO authenticated
  USING (private.is_fni_admin());

-- Gallery Items Policies:
-- Tutors can only view published items. Admins can view both published & draft items.
DROP POLICY IF EXISTS gallery_items_select_policy ON public.gallery_items;
CREATE POLICY gallery_items_select_policy ON public.gallery_items
  FOR SELECT TO authenticated
  USING (is_published = true OR private.is_fni_admin());

DROP POLICY IF EXISTS gallery_items_admin_insert ON public.gallery_items;
CREATE POLICY gallery_items_admin_insert ON public.gallery_items
  FOR INSERT TO authenticated
  WITH CHECK (private.is_fni_admin());

DROP POLICY IF EXISTS gallery_items_admin_update ON public.gallery_items;
CREATE POLICY gallery_items_admin_update ON public.gallery_items
  FOR UPDATE TO authenticated
  USING (private.is_fni_admin())
  WITH CHECK (private.is_fni_admin());

DROP POLICY IF EXISTS gallery_items_admin_delete ON public.gallery_items;
CREATE POLICY gallery_items_admin_delete ON public.gallery_items
  FOR DELETE TO authenticated
  USING (private.is_fni_admin());

-- No demo albums, placeholder media, or fabricated resources are seeded.\n