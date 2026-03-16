-- Migration: Add aggregation functions (bypasses 1000-row limit)
-- Run in Supabase SQL Editor: Dashboard > SQL Editor > New query > paste > Run
-- Created: 2026-03-10

-- 1. Athlete gender counts (system admin overview)
-- Normalizes M/m/male -> male, F/f/female -> female so API receives consistent keys
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

-- 2. Program counts by name (system admin overview - programs table has name, not sport)
CREATE OR REPLACE FUNCTION get_program_sport_counts()
RETURNS TABLE(sport TEXT, count BIGINT) AS $$
  SELECT 
    COALESCE(NULLIF(TRIM(p.name), ''), 'unknown')::TEXT AS sport,
    COUNT(*)::BIGINT
  FROM programs p
  GROUP BY COALESCE(NULLIF(TRIM(p.name), ''), 'unknown')
$$ LANGUAGE sql STABLE;

-- 3. Registration revenue summary for last N days (system admin overview)
CREATE OR REPLACE FUNCTION get_registration_revenue_summary(p_since TIMESTAMPTZ)
  RETURNS TABLE(
    total_revenue NUMERIC,
    paid_count BIGINT,
    total_count BIGINT
  ) AS $$
    SELECT 
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount_paid ELSE 0 END), 0)::NUMERIC,
      COUNT(*) FILTER (WHERE payment_status = 'paid')::BIGINT,
      COUNT(*)::BIGINT
    FROM registrations
    WHERE created_at >= p_since
$$ LANGUAGE sql STABLE;

-- 4. Payment status counts for last N days (system admin overview)
CREATE OR REPLACE FUNCTION get_payment_status_counts(p_since TIMESTAMPTZ)
  RETURNS TABLE(payment_status TEXT, count BIGINT) AS $$
    SELECT 
      COALESCE(r.payment_status, 'unknown')::TEXT,
      COUNT(*)::BIGINT
    FROM registrations r
    WHERE r.created_at >= p_since
    GROUP BY r.payment_status
$$ LANGUAGE sql STABLE;

-- 5. Athletes by program (admin analytics - club/season scoped)
CREATE OR REPLACE FUNCTION get_athletes_by_program(
    p_season_id UUID,
    p_club_id UUID,
    p_program_id UUID DEFAULT NULL,
    p_gender TEXT DEFAULT NULL
  )
  RETURNS TABLE(program_id UUID, program_name TEXT, athlete_count BIGINT) AS $$
    SELECT 
      p.id AS program_id,
      p.name AS program_name,
      COUNT(DISTINCT r.athlete_id)::BIGINT AS athlete_count
    FROM registrations r
    JOIN sub_programs sp ON sp.id = r.sub_program_id
    JOIN programs p ON p.id = sp.program_id
    JOIN athletes a ON a.id = r.athlete_id
    WHERE r.season_id = p_season_id
      AND r.club_id = p_club_id
      AND r.status = 'confirmed'
      AND (p_program_id IS NULL OR p.id = p_program_id)
      AND (p_gender IS NULL OR p_gender = 'all' OR LOWER(a.gender) = LOWER(p_gender))
    GROUP BY p.id, p.name
    ORDER BY athlete_count DESC
$$ LANGUAGE sql STABLE;

-- 6. Athletes by gender (admin analytics - club/season scoped)
CREATE OR REPLACE FUNCTION get_athletes_by_gender(
    p_season_id UUID,
    p_club_id UUID,
    p_program_id UUID DEFAULT NULL
  )
  RETURNS TABLE(gender TEXT, count BIGINT) AS $$
    SELECT 
      CASE 
        WHEN LOWER(COALESCE(a.gender, '')) IN ('male', 'm') THEN 'Male'
        WHEN LOWER(COALESCE(a.gender, '')) IN ('female', 'f') THEN 'Female'
        WHEN COALESCE(TRIM(a.gender), '') != '' THEN 'Other'
        ELSE 'Unknown'
      END::TEXT AS gender,
      COUNT(DISTINCT r.athlete_id)::BIGINT AS count
    FROM registrations r
    JOIN sub_programs sp ON sp.id = r.sub_program_id
    JOIN athletes a ON a.id = r.athlete_id
    WHERE r.season_id = p_season_id
      AND r.club_id = p_club_id
      AND r.status = 'confirmed'
      AND (p_program_id IS NULL OR sp.program_id = p_program_id)
    GROUP BY 
      CASE 
        WHEN LOWER(COALESCE(a.gender, '')) IN ('male', 'm') THEN 'Male'
        WHEN LOWER(COALESCE(a.gender, '')) IN ('female', 'f') THEN 'Female'
        WHEN COALESCE(TRIM(a.gender), '') != '' THEN 'Other'
        ELSE 'Unknown'
      END
    ORDER BY count DESC
$$ LANGUAGE sql STABLE;

-- 7. Athletes by age group (admin analytics - club/season scoped)
CREATE OR REPLACE FUNCTION get_athletes_by_age(
    p_season_id UUID,
    p_club_id UUID,
    p_program_id UUID DEFAULT NULL,
    p_gender TEXT DEFAULT NULL
  )
  RETURNS TABLE(age_group TEXT, count BIGINT) AS $$
    WITH age_calc AS (
      SELECT 
        r.athlete_id,
        CASE 
          WHEN a.date_of_birth IS NULL THEN 'Unknown'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_of_birth::DATE)) < 6 THEN 'Under 6'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_of_birth::DATE)) <= 8 THEN '6-8'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_of_birth::DATE)) <= 10 THEN '9-10'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_of_birth::DATE)) <= 12 THEN '11-12'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_of_birth::DATE)) <= 14 THEN '13-14'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_of_birth::DATE)) <= 16 THEN '15-16'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_of_birth::DATE)) <= 18 THEN '17-18'
          ELSE '19+'
        END AS age_group
      FROM registrations r
      JOIN sub_programs sp ON sp.id = r.sub_program_id
      JOIN athletes a ON a.id = r.athlete_id
      WHERE r.season_id = p_season_id
        AND r.club_id = p_club_id
        AND r.status = 'confirmed'
        AND (p_program_id IS NULL OR sp.program_id = p_program_id)
        AND (p_gender IS NULL OR p_gender = 'all' OR LOWER(a.gender) = LOWER(p_gender))
    )
    SELECT age_group, COUNT(DISTINCT athlete_id)::BIGINT
    FROM age_calc
    GROUP BY age_group
    ORDER BY 
      CASE age_group
        WHEN 'Under 6' THEN 1
        WHEN '6-8' THEN 2
        WHEN '9-10' THEN 3
        WHEN '11-12' THEN 4
        WHEN '13-14' THEN 5
        WHEN '15-16' THEN 6
        WHEN '17-18' THEN 7
        WHEN '19+' THEN 8
        ELSE 9
      END
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_athlete_gender_counts() IS 'System admin overview: athlete counts by gender';
COMMENT ON FUNCTION get_program_sport_counts() IS 'System admin overview: program counts by sport';
COMMENT ON FUNCTION get_registration_revenue_summary(TIMESTAMPTZ) IS 'System admin overview: revenue summary since date';
COMMENT ON FUNCTION get_payment_status_counts(TIMESTAMPTZ) IS 'System admin overview: payment status counts since date';
COMMENT ON FUNCTION get_athletes_by_program(UUID, UUID, UUID, TEXT) IS 'Admin analytics: athlete count per program';
COMMENT ON FUNCTION get_athletes_by_gender(UUID, UUID, UUID) IS 'Admin analytics: athlete count per gender';
COMMENT ON FUNCTION get_athletes_by_age(UUID, UUID, UUID, TEXT) IS 'Admin analytics: athlete count per age group';

-- 8. Athlete summary (admin analytics - new vs returning, unique households)
CREATE OR REPLACE FUNCTION get_athlete_summary(
  p_season_id UUID,
  p_club_id UUID,
  p_program_id UUID DEFAULT NULL,
  p_gender TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_athletes BIGINT,
  new_athletes BIGINT,
  returning_athletes BIGINT,
  unique_households BIGINT
) AS $$
  WITH current_athletes AS (
    SELECT DISTINCT r.athlete_id, a.household_id
    FROM registrations r
    JOIN athletes a ON a.id = r.athlete_id
    JOIN sub_programs sp ON sp.id = r.sub_program_id
    WHERE r.season_id = p_season_id
      AND r.club_id = p_club_id
      AND (p_program_id IS NULL OR sp.program_id = p_program_id)
      AND (p_gender IS NULL OR p_gender = 'all' OR LOWER(a.gender) = LOWER(p_gender))
  ),
  prev_season AS (
    SELECT s.id FROM seasons s
    WHERE s.club_id = p_club_id AND s.id != p_season_id
    ORDER BY s.start_date DESC NULLS LAST
    LIMIT 1
  ),
  returning_cnt AS (
    SELECT COUNT(DISTINCT r.athlete_id)::BIGINT AS cnt
    FROM registrations r
    WHERE r.season_id = (SELECT id FROM prev_season)
      AND r.club_id = p_club_id
      AND r.athlete_id IN (SELECT athlete_id FROM current_athletes)
  )
  SELECT
    (SELECT COUNT(DISTINCT athlete_id)::BIGINT FROM current_athletes),
    (SELECT COUNT(DISTINCT athlete_id)::BIGINT FROM current_athletes) - COALESCE((SELECT cnt FROM returning_cnt), 0),
    COALESCE((SELECT cnt FROM returning_cnt), 0),
    (SELECT COUNT(DISTINCT household_id)::BIGINT FROM current_athletes WHERE household_id IS NOT NULL)
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_athlete_summary(UUID, UUID, UUID, TEXT) IS 'Admin analytics: athlete summary (new/returning/households)';
