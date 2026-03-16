-- Migration: Add function to get club athlete counts (bypasses 1000-row limit)
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New query > paste > Run
-- Required for accurate athlete counts in System Admin > Clubs
-- Created: 2026-03-10

-- Athlete counts: direct (athletes.club_id) OR via registrations
-- An athlete counts for a club if assigned to it OR registered in its programs
CREATE OR REPLACE FUNCTION get_club_athlete_counts()
RETURNS TABLE(club_id UUID, athlete_count BIGINT) AS $$
  WITH athlete_club_pairs AS (
    SELECT a.id AS athlete_id, a.club_id
    FROM athletes a
    WHERE a.club_id IS NOT NULL
    UNION
    SELECT r.athlete_id, r.club_id
    FROM registrations r
    WHERE r.club_id IS NOT NULL
  )
  SELECT 
    acp.club_id,
    COUNT(DISTINCT acp.athlete_id)::BIGINT
  FROM athlete_club_pairs acp
  GROUP BY acp.club_id
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_club_athlete_counts() IS 'Returns athlete count per club. Bypasses 1000-row limit.';
