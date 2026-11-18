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
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
  is_published BOOLEAN NOT NULL DEFAULT true,
  allow_download BOOLEAN NOT NULL DEFAULT true,
  tutor_access_level TEXT NOT NULL DEFAULT 'all_tutors' CHECK (tutor_access_level IN ('all_tutors', 'cell_leaders_only', 'executives_only')),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

-- Helper to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()::text AND role = 'admin'
  );
$$;

-- Albums Policies
DROP POLICY IF EXISTS gallery_albums_select_policy ON public.gallery_albums;
CREATE POLICY gallery_albums_select_policy ON public.gallery_albums
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS gallery_albums_admin_insert ON public.gallery_albums;
CREATE POLICY gallery_albums_admin_insert ON public.gallery_albums
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS gallery_albums_admin_update ON public.gallery_albums;
CREATE POLICY gallery_albums_admin_update ON public.gallery_albums
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS gallery_albums_admin_delete ON public.gallery_albums;
CREATE POLICY gallery_albums_admin_delete ON public.gallery_albums
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Gallery Items Policies:
-- Tutors can only view published items. Admins can view both published & draft items.
DROP POLICY IF EXISTS gallery_items_select_policy ON public.gallery_items;
CREATE POLICY gallery_items_select_policy ON public.gallery_items
  FOR SELECT TO authenticated
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS gallery_items_admin_insert ON public.gallery_items;
CREATE POLICY gallery_items_admin_insert ON public.gallery_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS gallery_items_admin_update ON public.gallery_items;
CREATE POLICY gallery_items_admin_update ON public.gallery_items
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS gallery_items_admin_delete ON public.gallery_items;
CREATE POLICY gallery_items_admin_delete ON public.gallery_items
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 4. DEFAULT SEED ALBUMS & ITEMS
INSERT INTO public.gallery_albums (id, title, description, category, cover_image_url)
VALUES
  ('alb-tutor-training', 'Tutor Training', 'Comprehensive discipleship methodology, cell ministry foundations, and pedagogy for cell tutors.', 'training', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80'),
  ('alb-leadership-classes', 'Leadership Classes', 'Executive leadership, pastoral governance, vision casting, and team building workshops.', 'leadership', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80'),
  ('alb-bible-studies', 'Bible Studies', 'Expository teachings, Old & New Testament surveys, and systematic biblical hermeneutics.', 'biblical', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80'),
  ('alb-workshops', 'Workshops', 'Hands-on practical ministry drills, evangelism outreach clinics, and follow-up strategies.', 'practical', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80'),
  ('alb-conference-materials', 'Conference Materials', 'National annual conference presentations, keynote recordings, and executive digests.', 'conference', 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80')
ON CONFLICT (id) DO NOTHING;

-- Seed Gallery Items
INSERT INTO public.gallery_items (
  id, title, description, media_type, category, subcategory, album_id, file_url, thumbnail_url, file_name, file_size, file_type, duration_seconds, is_featured, is_published, allow_download
) VALUES
  -- Photos
  (
    'item-photo-1',
    'National Cell Leaders Leadership Induction',
    'Commissioning and dedication of newly appointed fellowship tutors at the Regional Cathedral.',
    'photo',
    'photos',
    'Ministry Events',
    'alb-leadership-classes',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80',
    'induction-2026.jpg',
    '3.2 MB',
    'image/jpeg',
    NULL,
    true,
    true,
    true
  ),
  (
    'item-photo-2',
    'Evangelism Harvest & Community Outreach Clinic',
    'Tutors participating in practical neighborhood soul-winning and prayer walk assignments.',
    'photo',
    'photos',
    'Workshops & Conferences',
    'alb-workshops',
    'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=600&q=80',
    'harvest-outreach.jpg',
    '2.8 MB',
    'image/jpeg',
    NULL,
    false,
    true,
    true
  ),
  (
    'item-photo-3',
    'Themelios Discipleship Class Practical Workshop',
    'Interactive table discussion during the discipleship modules on building relational small groups.',
    'photo',
    'photos',
    'Class Activities',
    'alb-tutor-training',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
    'themelios-workshop.jpg',
    '4.1 MB',
    'image/jpeg',
    NULL,
    true,
    true,
    true
  ),

  -- Videos
  (
    'item-video-1',
    'Mastering Biblical Hermeneutics for Cell Tutors',
    'Executive masterclass on dissecting and interpreting scriptural texts for small group discussions.',
    'video',
    'videos',
    'Recorded Lessons',
    'alb-bible-studies',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    'masterclass-hermeneutics.mp4',
    '45.2 MB',
    'video/mp4',
    596,
    true,
    true,
    true
  ),
  (
    'item-video-2',
    'Cell Growth & Multiplication Masterclass',
    'Strategic demonstration of how to transition an active cell group into healthy split multiplication.',
    'video',
    'videos',
    'Demonstrations',
    'alb-tutor-training',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    'cell-multiplication.mp4',
    '68.0 MB',
    'video/mp4',
    653,
    false,
    true,
    true
  ),

  -- Documents
  (
    'item-doc-1',
    'FNI Cell Leader Official Field Handbook 2026',
    'Complete operational manual, soul-winning follow-up protocols, weekly report procedures, and code of conduct.',
    'document',
    'documents',
    'PDF Materials',
    'alb-tutor-training',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
    'FNI_Cell_Leader_Handbook_2026.pdf',
    '3.5 MB',
    'application/pdf',
    NULL,
    true,
    true,
    true
  ),
  (
    'item-doc-2',
    'Evangelism Soul-Winning Strategy & Follow-Up Guide',
    'Actionable framework covering initial gospel presentation, prayer counseling, and 72-hour visitation.',
    'document',
    'documents',
    'Study Guides',
    'alb-workshops',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
    'Evangelism_Strategy_Guide.pdf',
    '1.9 MB',
    'application/pdf',
    NULL,
    false,
    true,
    true
  )
ON CONFLICT (id) DO NOTHING;
