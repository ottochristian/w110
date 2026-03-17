-- Migration 73: Add events table for coach-entered schedule
-- Events are club-scoped, optionally season/sub_program scoped

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  sub_program_id UUID REFERENCES sub_programs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'training'
    CHECK (event_type IN ('training', 'race', 'camp', 'meeting', 'other')),
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX events_club_season_idx ON events(club_id, season_id);
CREATE INDEX events_start_at_idx ON events(start_at);
CREATE INDEX events_sub_program_idx ON events(sub_program_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_events" ON events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.club_id = events.club_id
    )
  );

CREATE POLICY "coaches_manage_events" ON events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'coach'
        AND profiles.club_id = events.club_id
    )
  );

CREATE POLICY "parents_view_events" ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.club_id = events.club_id
    )
  );
