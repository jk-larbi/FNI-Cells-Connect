-- Keep the soul-winning target in the existing canonical table.
-- The app must not depend on the absent legacy soul_targets table.
CREATE UNIQUE INDEX IF NOT EXISTS soul_target_configs_year_uidx
  ON public.soul_target_configs (year);

INSERT INTO public.soul_target_configs (
  id, year, annual_target, updated_by, audit_history
)
VALUES (
  'target-2026', 2026, 5000, 'System Administrator',
  '[{"previousTarget":1000,"newTarget":5000,"changedBy":"General Overseer","reason":"Territorial kingdom expansion across cell fellowships and harvest outreaches","timestamp":"2026-01-01T00:00:00Z"}]'::jsonb
)
ON CONFLICT (year) DO NOTHING;
