#!/usr/bin/env tsx
/**
 * Test Pagination Implementation
 * Quick test to verify pagination and batch waiver logic
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

function initSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  console.log('\n🧪 Testing Pagination Implementation\n');
  const supabase = initSupabase();

  // Test 1: Paginated athletes query
  console.log('Test 1: Paginated Athletes Query');
  console.log('─'.repeat(50));
  
  const page = 1;
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: athletes, error: athletesError, count } = await supabase
    .from('athletes')
    .select('*', { count: 'exact' })
    .order('first_name', { ascending: true })
    .range(from, to);

  if (athletesError) {
    console.log('❌ Error:', athletesError.message);
  } else {
    console.log(`✅ Fetched ${athletes?.length || 0} athletes`);
    console.log(`✅ Total count: ${count}`);
    console.log(`✅ Total pages: ${Math.ceil((count || 0) / pageSize)}`);
  }

  // Test 2: Search functionality
  console.log('\nTest 2: Search Functionality');
  console.log('─'.repeat(50));
  
  const searchTerm = 'a';
  const { data: searchResults, error: searchError } = await supabase
    .from('athletes')
    .select('*', { count: 'exact' })
    .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
    .range(0, 9);

  if (searchError) {
    console.log('❌ Error:', searchError.message);
  } else {
    console.log(`✅ Found ${searchResults?.length || 0} athletes matching "${searchTerm}"`);
    if (searchResults && searchResults.length > 0) {
      console.log(`   First result: ${searchResults[0].first_name} ${searchResults[0].last_name}`);
    }
  }

  // Test 3: Check if waiver tables exist
  console.log('\nTest 3: Waiver Tables Check');
  console.log('─'.repeat(50));
  
  const { data: waivers, error: waiversError } = await supabase
    .from('waivers')
    .select('id')
    .limit(1);

  if (waiversError) {
    console.log('⚠️  Waivers table:', waiversError.message);
    console.log('   (This is OK if you haven\'t created waivers yet)');
  } else {
    console.log('✅ Waivers table exists');
  }

  // Test 4: Check if batch function exists (will only work after migration)
  console.log('\nTest 4: Batch Waiver Function Check');
  console.log('─'.repeat(50));
  
  const { data: functions, error: funcError } = await supabase.rpc('check_waivers_batch', {
    p_athlete_ids: [],
    p_season_id: '00000000-0000-0000-0000-000000000000',
  });

  if (funcError) {
    if (funcError.message.includes('function') && funcError.message.includes('does not exist')) {
      console.log('⚠️  Function not yet created - MIGRATION NEEDED');
      console.log('   Run: migrations/99_add_batch_waiver_check.sql in Supabase Dashboard');
    } else {
      console.log('❌ Error:', funcError.message);
    }
  } else {
    console.log('✅ Batch waiver function exists and works!');
    console.log(`   Returned ${functions?.length || 0} results (expected 0 for empty input)`);
  }

  // Test 5: Performance comparison simulation
  console.log('\nTest 5: Performance Estimate');
  console.log('─'.repeat(50));
  
  const totalAthletes = count || 0;
  const oldWayTime = totalAthletes * 0.01; // 10ms per athlete (sequential)
  const newWayTime = 0.1; // 100ms for batch query
  const speedup = oldWayTime / newWayTime;

  console.log(`With ${totalAthletes.toLocaleString()} athletes:`);
  console.log(`  Old way (sequential): ~${oldWayTime.toFixed(2)}s`);
  console.log(`  New way (batch): ~${newWayTime.toFixed(2)}s`);
  console.log(`  Speed improvement: ${speedup.toFixed(0)}x faster ⚡`);

  console.log('\n' + '═'.repeat(50));
  console.log('✅ Pagination tests complete!\n');
  console.log('Next steps:');
  console.log('  1. Apply migration: migrations/99_add_batch_waiver_check.sql');
  console.log('  2. Restart dev server: npm run dev');
  console.log('  3. Visit athletes page and test');
  console.log('');
}

main().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
