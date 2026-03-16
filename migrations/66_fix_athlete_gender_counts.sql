-- Fix: get_athlete_gender_counts was returning raw values (m, f) but API expects (male, female)
-- Athletes with "M"/"F" or "m"/"f" were not counted in the system admin overview
-- Run in Supabase SQL Editor: Dashboard > SQL Editor > New query > paste > Run

CREATE OR REPLACE FUNCTION get_athlete_gender_counts()
  RETURNS TABLE(gender TEXT, count BIGINT) AS $$
    SELECT 
      CASE 
        WHEN LOWER(COALESCE(TRIM(a.gender), '')) IN ('male', 'm') THEN 'male'
        WHEN LOWER(COALESCE(TRIM(a.gender), '')) IN ('female', 'f') THEN 'female'
        WHEN COALESCE(TRIM(a.gender), '') != '' THEN 'other'
        ELSE 'unknown'
      END::TEXT AS gender,
      COUNT(*)::BIGINT
    FROM athletes a
    GROUP BY 
      CASE 
        WHEN LOWER(COALESCE(TRIM(a.gender), '')) IN ('male', 'm') THEN 'male'
        WHEN LOWER(COALESCE(TRIM(a.gender), '')) IN ('female', 'f') THEN 'female'
        WHEN COALESCE(TRIM(a.gender), '') != '' THEN 'other'
        ELSE 'unknown'
      END
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_athlete_gender_counts() IS 'System admin overview: athlete counts by gender (normalizes M/m->male, F/f->female)';
