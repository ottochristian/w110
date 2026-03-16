-- Test data for Season Setup Checklist feature
-- Creates 3 seasons in different completion states (for dev/testing only)
-- Run this manually in Supabase SQL editor against your test club
--
-- INSTRUCTIONS:
-- 1. Replace 'YOUR_CLUB_ID' with your actual club_id from the clubs table
-- 2. Optionally set v_max_athletes to cap how many athletes each sub-program can take (NULL = unlimited)
-- 3. Run in Supabase SQL editor

DO $$
DECLARE
  v_club_id    UUID    := 'YOUR_CLUB_ID'; -- REPLACE THIS
  v_max_athletes INT   := 20;             -- max_capacity per sub-program, set NULL for unlimited

  -- Season IDs
  v_season_empty    UUID;
  v_season_partial  UUID;
  v_season_complete UUID;

  -- Program IDs
  v_prog1 UUID;
  v_prog2 UUID;

BEGIN
  -- ----------------------------------------------------------------
  -- Season A: Empty / brand new (no programs, no sub-programs)
  -- ----------------------------------------------------------------
  INSERT INTO seasons (name, start_date, end_date, is_current, status, club_id)
  VALUES ('Test 2024-2025 (Empty)', '2024-11-01', '2025-04-30', false, 'draft', v_club_id)
  RETURNING id INTO v_season_empty;

  -- ----------------------------------------------------------------
  -- Season B: Partially configured (programs exist, sub-programs have no pricing)
  -- ----------------------------------------------------------------
  INSERT INTO seasons (name, start_date, end_date, is_current, status, club_id)
  VALUES ('Test 2025-2026 (Partial)', '2025-11-01', '2026-04-30', false, 'draft', v_club_id)
  RETURNING id INTO v_season_partial;

  INSERT INTO programs (name, status, season_id, club_id)
  VALUES ('Test Racing', 'ACTIVE', v_season_partial, v_club_id)
  RETURNING id INTO v_prog1;

  INSERT INTO programs (name, status, season_id, club_id)
  VALUES ('Test Freestyle', 'ACTIVE', v_season_partial, v_club_id)
  RETURNING id INTO v_prog2;

  -- Sub-programs WITHOUT pricing (price_cents = NULL)
  INSERT INTO sub_programs (name, status, season_id, club_id, program_id, registration_fee, max_capacity)
  VALUES
    ('U10 Racing',  'ACTIVE', v_season_partial, v_club_id, v_prog1, NULL, v_max_athletes),
    ('U14 Racing',  'ACTIVE', v_season_partial, v_club_id, v_prog1, NULL, v_max_athletes),
    ('U10 Moguls',  'ACTIVE', v_season_partial, v_club_id, v_prog2, NULL, v_max_athletes);

  -- ----------------------------------------------------------------
  -- Season C: Fully configured and active (programs, sub-programs, pricing, active)
  -- ----------------------------------------------------------------
  INSERT INTO seasons (name, start_date, end_date, is_current, status, club_id)
  VALUES ('Test 2026-2027 (Complete)', '2026-11-01', '2027-04-30', false, 'active', v_club_id)
  RETURNING id INTO v_season_complete;

  INSERT INTO programs (name, status, season_id, club_id)
  VALUES ('Test Alpine', 'ACTIVE', v_season_complete, v_club_id)
  RETURNING id INTO v_prog1;

  -- Sub-programs WITH pricing and capacity
  INSERT INTO sub_programs (name, status, season_id, club_id, program_id, registration_fee, max_capacity)
  VALUES
    ('Beginner',     'ACTIVE', v_season_complete, v_club_id, v_prog1, 500.00, v_max_athletes),  -- $500
    ('Intermediate', 'ACTIVE', v_season_complete, v_club_id, v_prog1, 750.00, v_max_athletes),  -- $750
    ('Advanced',     'ACTIVE', v_season_complete, v_club_id, v_prog1, 900.00, v_max_athletes);  -- $900

  RAISE NOTICE 'Created test seasons:';
  RAISE NOTICE '  Empty season:    % (no programs)', v_season_empty;
  RAISE NOTICE '  Partial season:  % (programs, no pricing)', v_season_partial;
  RAISE NOTICE '  Complete season: % (fully active)', v_season_complete;
  RAISE NOTICE 'max_capacity per sub-program: %', v_max_athletes;
END;
$$;
