-- ============================================================================
-- CLEANUP LOAD TEST DATA
-- ============================================================================
-- This script removes all data created by generate-load-test-data.ts
-- 
-- WARNING: This will permanently delete all load test data!
-- 
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Show what will be deleted
DO $$
DECLARE
  v_club_count BIGINT;
  v_profile_count BIGINT;
  v_athlete_count BIGINT;
  v_household_count BIGINT;
  v_order_count BIGINT;
  v_registration_count BIGINT;
BEGIN
  -- Count records to be deleted
  SELECT COUNT(*) INTO v_club_count 
  FROM clubs 
  WHERE slug ~ '-[0-9]+$';
  
  SELECT COUNT(*) INTO v_profile_count 
  FROM profiles 
  WHERE email LIKE 'loadtest-%@example.com';
  
  SELECT COUNT(*) INTO v_athlete_count 
  FROM athletes a
  JOIN clubs c ON a.club_id = c.id
  WHERE c.slug ~ '-[0-9]+$';
  
  SELECT COUNT(*) INTO v_household_count 
  FROM households h
  JOIN clubs c ON h.club_id = c.id
  WHERE c.slug ~ '-[0-9]+$';
  
  SELECT COUNT(*) INTO v_order_count 
  FROM orders o
  JOIN clubs c ON o.club_id = c.id
  WHERE c.slug ~ '-[0-9]+$';
  
  SELECT COUNT(*) INTO v_registration_count 
  FROM registrations r
  JOIN athletes a ON r.athlete_id = a.id
  JOIN clubs c ON a.club_id = c.id
  WHERE c.slug ~ '-[0-9]+$';
  
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'LOAD TEST DATA CLEANUP SUMMARY';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'Records to be deleted:';
  RAISE NOTICE '  Clubs:          %', v_club_count;
  RAISE NOTICE '  Profiles:       %', v_profile_count;
  RAISE NOTICE '  Athletes:       %', v_athlete_count;
  RAISE NOTICE '  Households:     %', v_household_count;
  RAISE NOTICE '  Orders:         %', v_order_count;
  RAISE NOTICE '  Registrations:  %', v_registration_count;
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- Uncomment the section below to actually delete the data
-- WARNING: This is permanent!

/*
DO $$
DECLARE
  v_load_test_club_ids UUID[];
BEGIN
  -- Get all load test club IDs
  SELECT ARRAY_AGG(id) INTO v_load_test_club_ids
  FROM clubs
  WHERE slug ~ '-[0-9]+$';
  
  IF v_load_test_club_ids IS NULL OR array_length(v_load_test_club_ids, 1) = 0 THEN
    RAISE NOTICE 'No load test clubs found. Nothing to delete.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Deleting load test data...';
  
  -- Delete in dependency order (children before parents)
  
  -- 1. Delete payments
  DELETE FROM payments 
  WHERE order_id IN (
    SELECT id FROM orders WHERE club_id = ANY(v_load_test_club_ids)
  );
  RAISE NOTICE '  ✓ Deleted payments';
  
  -- 2. Delete order_items
  DELETE FROM order_items 
  WHERE order_id IN (
    SELECT id FROM orders WHERE club_id = ANY(v_load_test_club_ids)
  );
  RAISE NOTICE '  ✓ Deleted order items';
  
  -- 3. Delete orders
  DELETE FROM orders 
  WHERE club_id = ANY(v_load_test_club_ids);
  RAISE NOTICE '  ✓ Deleted orders';
  
  -- 4. Delete registrations
  DELETE FROM registrations 
  WHERE athlete_id IN (
    SELECT id FROM athletes WHERE club_id = ANY(v_load_test_club_ids)
  );
  RAISE NOTICE '  ✓ Deleted registrations';
  
  -- 5. Delete webhook_events
  DELETE FROM webhook_events 
  WHERE club_id = ANY(v_load_test_club_ids);
  RAISE NOTICE '  ✓ Deleted webhook events';
  
  -- 6. Delete coach_assignments
  DELETE FROM coach_assignments 
  WHERE coach_id IN (
    SELECT id FROM coaches WHERE club_id = ANY(v_load_test_club_ids)
  );
  RAISE NOTICE '  ✓ Deleted coach assignments';
  
  -- 7. Delete groups
  DELETE FROM groups 
  WHERE sub_program_id IN (
    SELECT sp.id 
    FROM sub_programs sp
    JOIN programs p ON sp.program_id = p.id
    WHERE p.club_id = ANY(v_load_test_club_ids)
  );
  RAISE NOTICE '  ✓ Deleted groups';
  
  -- 8. Delete sub_programs
  DELETE FROM sub_programs 
  WHERE program_id IN (
    SELECT id FROM programs WHERE club_id = ANY(v_load_test_club_ids)
  );
  RAISE NOTICE '  ✓ Deleted sub-programs';
  
  -- 9. Delete programs
  DELETE FROM programs 
  WHERE club_id = ANY(v_load_test_club_ids);
  RAISE NOTICE '  ✓ Deleted programs';
  
  -- 10. Delete athletes
  DELETE FROM athletes 
  WHERE club_id = ANY(v_load_test_club_ids);
  RAISE NOTICE '  ✓ Deleted athletes';
  
  -- 11. Delete household_guardians
  DELETE FROM household_guardians 
  WHERE household_id IN (
    SELECT id FROM households WHERE club_id = ANY(v_load_test_club_ids)
  );
  RAISE NOTICE '  ✓ Deleted household guardians';
  
  -- 12. Delete households
  DELETE FROM households 
  WHERE club_id = ANY(v_load_test_club_ids);
  RAISE NOTICE '  ✓ Deleted households';
  
  -- 13. Delete coaches
  DELETE FROM coaches 
  WHERE club_id = ANY(v_load_test_club_ids);
  RAISE NOTICE '  ✓ Deleted coaches';
  
  -- 14. Delete profiles (load test users only)
  DELETE FROM profiles 
  WHERE email LIKE 'loadtest-%@example.com';
  RAISE NOTICE '  ✓ Deleted profiles';
  
  -- 15. Delete seasons
  DELETE FROM seasons 
  WHERE club_id = ANY(v_load_test_club_ids);
  RAISE NOTICE '  ✓ Deleted seasons';
  
  -- 16. Delete clubs
  DELETE FROM clubs 
  WHERE id = ANY(v_load_test_club_ids);
  RAISE NOTICE '  ✓ Deleted clubs';
  
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ Load test data cleanup complete!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
*/

-- Alternative: Delete specific club by name pattern
-- Uncomment and modify if you want to delete specific clubs only
/*
DO $$
BEGIN
  -- Example: Delete all clubs with "Test" in their name
  DELETE FROM clubs WHERE name LIKE '%Test%' AND slug ~ '-[0-9]+$';
  
  RAISE NOTICE 'Deleted test clubs matching pattern';
END $$;
*/

-- Verify cleanup
SELECT 
  'clubs' as table_name,
  COUNT(*) as remaining_count
FROM clubs 
WHERE slug ~ '-[0-9]+$'
UNION ALL
SELECT 
  'profiles',
  COUNT(*)
FROM profiles 
WHERE email LIKE 'loadtest-%@example.com'
UNION ALL
SELECT 
  'athletes',
  COUNT(*)
FROM athletes a
JOIN clubs c ON a.club_id = c.id
WHERE c.slug ~ '-[0-9]+$';

-- Clean up orphaned records (optional)
-- SELECT * FROM cleanup_orphaned_records();
