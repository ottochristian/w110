-- Add ai_insights_enabled flag to clubs
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS ai_insights_enabled BOOLEAN NOT NULL DEFAULT false;

-- Cache table: one row per club, upserted on each generate
CREATE TABLE IF NOT EXISTS club_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  summary_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT club_insights_club_id_key UNIQUE (club_id)
);

ALTER TABLE club_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_club_insights"
ON club_insights FOR ALL TO authenticated
USING (club_id = get_my_club_id() AND get_my_role() IN ('admin', 'system_admin'));
