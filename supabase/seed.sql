-- ==============================================================================
-- FORERUNNERS NETWORK INTERNATIONAL (FNI) - SEED DATA
-- Target: Supabase / PostgreSQL
-- ==============================================================================

-- 1. Insert Regions
INSERT INTO public.regions (id, name, code, country, state_province) VALUES
('b1111111-1111-1111-1111-111111111111', 'Lagos Central Region', 'FNI-REG-LOS', 'Nigeria', 'Lagos'),
('b2222222-2222-2222-2222-222222222222', 'Abuja Capital Region', 'FNI-REG-ABJ', 'Nigeria', 'FCT Abuja'),
('b3333333-3333-3333-3333-333333333333', 'London Diaspora Region', 'FNI-REG-LON', 'United Kingdom', 'Greater London'),
('b4444444-4444-4444-4444-444444444444', 'Accra Hub Region', 'FNI-REG-ACC', 'Ghana', 'Greater Accra')
ON CONFLICT (id) DO NOTHING;

-- 2. Reporting Periods
INSERT INTO public.reporting_periods (id, name, year, week_number, start_date, end_date, submission_deadline, is_open) VALUES
('c1111111-1111-1111-1111-111111111111', '2026 - Week 43', 2026, 43, '2026-10-19', '2026-10-25', '2026-10-27 23:59:59+00', false),
('c2222222-2222-2222-2222-222222222222', '2026 - Week 44', 2026, 44, '2026-10-26', '2026-11-01', '2026-11-03 23:59:59+00', false),
('c3333333-3333-3333-3333-333333333333', '2026 - Week 45', 2026, 45, '2026-11-02', '2026-11-08', '2026-11-10 23:59:59+00', true)
ON CONFLICT (id) DO NOTHING;

-- Note: In production Supabase, profiles are linked to auth.users.
-- The seed data for frontend testing is also mirrored in TypeScript services so that the application is fully demonstrable immediately!
