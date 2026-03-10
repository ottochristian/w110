-- Migration: Add batch waiver checking function
-- This replaces individual waiver checks with a single batch query

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS check_waivers_batch(UUID[], UUID);

-- Create batch waiver check function
CREATE OR REPLACE FUNCTION check_waivers_batch(
  p_athlete_ids UUID[],
  p_season_id UUID
)
RETURNS TABLE (
  athlete_id UUID,
  has_signed_all_required BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH required_waivers AS (
    -- Get all required waivers for this season
    SELECT id 
    FROM waivers 
    WHERE club_id IN (
      SELECT club_id 
      FROM seasons 
      WHERE id = p_season_id
    )
    AND status = 'active'
    AND required = true
  ),
  athlete_signatures AS (
    -- Get all waiver signatures for the athletes
    SELECT 
      ws.athlete_id,
      ws.waiver_id
    FROM waiver_signatures ws
    JOIN waivers w ON ws.waiver_id = w.id
    WHERE ws.athlete_id = ANY(p_athlete_ids)
    AND w.season_id = p_season_id
  ),
  required_waiver_count AS (
    -- Count total required waivers
    SELECT COUNT(*) as total_required FROM required_waivers
  ),
  athlete_compliance AS (
    -- Check if each athlete has signed all required waivers
    SELECT 
      a.id as athlete_id,
      CASE 
        WHEN (SELECT total_required FROM required_waiver_count) = 0 THEN true  -- No required waivers
        WHEN COUNT(DISTINCT asig.waiver_id) = (SELECT total_required FROM required_waiver_count) THEN true  -- All signed
        ELSE false  -- Missing some
      END as has_signed_all_required
    FROM unnest(p_athlete_ids) a(id)
    LEFT JOIN athlete_signatures asig ON asig.athlete_id = a.id
    GROUP BY a.id
  )
  SELECT * FROM athlete_compliance;
END;
$$;

-- Add comment
COMMENT ON FUNCTION check_waivers_batch IS 
'Batch check waiver compliance for multiple athletes. Returns athlete_id and compliance status for each.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_waivers_batch TO authenticated;
