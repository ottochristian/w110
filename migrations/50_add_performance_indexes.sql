-- Migration: Add Performance Indexes for Load Testing
-- Purpose: Optimize queries for 200k+ athletes dataset
-- Expected Impact: 2-3x query speed improvement

-- Athletes table indexes
CREATE INDEX IF NOT EXISTS idx_athletes_club_id_created_at 
  ON athletes(club_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_athletes_household_id 
  ON athletes(household_id) WHERE household_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_athletes_first_name_trgm 
  ON athletes USING gin(first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_athletes_last_name_trgm 
  ON athletes USING gin(last_name gin_trgm_ops);

-- Registrations table indexes
CREATE INDEX IF NOT EXISTS idx_registrations_athlete_id 
  ON registrations(athlete_id);

CREATE INDEX IF NOT EXISTS idx_registrations_sub_program_id 
  ON registrations(sub_program_id);

CREATE INDEX IF NOT EXISTS idx_registrations_season_id 
  ON registrations(season_id);

CREATE INDEX IF NOT EXISTS idx_registrations_club_id_status 
  ON registrations(club_id, status);

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_household_id 
  ON orders(household_id);

CREATE INDEX IF NOT EXISTS idx_orders_club_id_status 
  ON orders(club_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at 
  ON orders(created_at DESC);

-- Households table indexes
CREATE INDEX IF NOT EXISTS idx_households_club_id 
  ON households(club_id);

-- Sub-programs table indexes
CREATE INDEX IF NOT EXISTS idx_sub_programs_program_id 
  ON sub_programs(program_id);

CREATE INDEX IF NOT EXISTS idx_sub_programs_season_id 
  ON sub_programs(season_id);

-- Programs table indexes
CREATE INDEX IF NOT EXISTS idx_programs_club_id_season_id 
  ON programs(club_id, season_id);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id 
  ON payments(order_id);

-- Groups table indexes (if needed)
CREATE INDEX IF NOT EXISTS idx_groups_sub_program_id 
  ON groups(sub_program_id);

-- Coach assignments indexes (if needed)
CREATE INDEX IF NOT EXISTS idx_coach_assignments_coach_id 
  ON coach_assignments(coach_id) WHERE coach_assignments IS NOT NULL;

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Analyze tables to update statistics
ANALYZE athletes;
ANALYZE registrations;
ANALYZE orders;
ANALYZE households;
ANALYZE sub_programs;
ANALYZE programs;
ANALYZE payments;

-- Show created indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
