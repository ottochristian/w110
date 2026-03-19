-- Coach insights cache table (AI-generated weekly summaries per coach)
CREATE TABLE IF NOT EXISTS coach_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  summary_text TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coach_profile_id)
);

-- Index for fast lookup by coach
CREATE INDEX IF NOT EXISTS idx_coach_insights_coach ON coach_insights(coach_profile_id);

-- RLS: coaches can read their own insights; admins can read all for their club
ALTER TABLE coach_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_read_own_insights" ON coach_insights
  FOR SELECT USING (coach_profile_id = auth.uid());

CREATE POLICY "admins_read_club_insights" ON coach_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND club_id = coach_insights.club_id
        AND role IN ('admin', 'system_admin')
    )
  );

-- Service role (backend) can insert/update
CREATE POLICY "service_upsert_coach_insights" ON coach_insights
  FOR ALL USING (true)
  WITH CHECK (true);
