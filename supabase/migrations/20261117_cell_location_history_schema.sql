-- ==============================================================================
-- Forerunners Network International (FNI) - Digital Reporting System
-- Migration: Cell Location History Schema & Security Policies
-- Date: November 17, 2026
-- Description: Maintains a permanent chronological historical record of physical
--              meeting locations and venues for every registered cell.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.cell_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id UUID NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
  cell_name TEXT NOT NULL,
  venue TEXT NOT NULL,
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  leader_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for lightning-fast chronological lookups and cell filtering
CREATE INDEX IF NOT EXISTS idx_cell_location_cell_id ON public.cell_location_history(cell_id);
CREATE INDEX IF NOT EXISTS idx_cell_location_meeting_date ON public.cell_location_history(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_cell_location_created_at ON public.cell_location_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.cell_location_history ENABLE ROW LEVEL SECURITY;

-- Policies:
-- 1. Admins have complete read/write access to manage historical location records
CREATE POLICY "Admins have full access to cell_location_history"
  ON public.cell_location_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. Tutors can view location history for their assigned cell
CREATE POLICY "Tutors can view their assigned cell location history"
  ON public.cell_location_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.cell_id = cell_location_history.cell_id
        OR profiles.id = cell_location_history.leader_id
      )
    )
  );
