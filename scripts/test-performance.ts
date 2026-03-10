#!/usr/bin/env tsx
/**
 * Performance Testing Script
 * Tests database query performance with the large dataset
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

async function testQuery(name: string, query: () => Promise<any>) {
  const start = Date.now();
  try {
    const result = await query();
    const duration = Date.now() - start;
    
    const status = duration < 100 ? '✅' : duration < 500 ? '⚠️ ' : '❌';
    const count = result?.data?.length || 0;
    
    console.log(`${status} ${name.padEnd(40)} ${duration.toString().padStart(5)}ms (${count} records)`);
    return { name, duration, count, success: true };
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${name.padEnd(40)} ${duration.toString().padStart(5)}ms ERROR`);
    console.error(`   ${error}`);
    return { name, duration, count: 0, success: false };
  }
}

async function main() {
  console.log('\n🔍 Performance Testing Suite');
  console.log('═'.repeat(70));
  console.log('Target: < 100ms (✅)  < 500ms (⚠️)  > 500ms (❌)\n');
  
  const supabase = initSupabase();
  const results: any[] = [];

  // Get a random club for testing
  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name')
    .limit(1)
    .single();

  if (!clubs) {
    console.error('No clubs found!');
    return;
  }

  console.log(`Testing with club: ${clubs.name}\n`);
  console.log('Database Queries:');
  console.log('-'.repeat(70));

  // 1. Paginated athletes query (what the UI uses)
  results.push(await testQuery(
    'Paginated athletes (page 1, 50 records)',
    () => supabase
      .from('athletes')
      .select('*, household:households(id)')
      .eq('club_id', clubs.id)
      .order('created_at', { ascending: false })
      .range(0, 49)
  ));

  // 2. Deep pagination test
  results.push(await testQuery(
    'Paginated athletes (page 10, 50 records)',
    () => supabase
      .from('athletes')
      .select('*, household:households(id)')
      .eq('club_id', clubs.id)
      .order('created_at', { ascending: false })
      .range(450, 499)
  ));

  // 3. Search query
  results.push(await testQuery(
    'Search athletes by name',
    () => supabase
      .from('athletes')
      .select('*')
      .eq('club_id', clubs.id)
      .ilike('first_name', 'A%')
      .limit(50)
  ));

  // 4. Count query
  results.push(await testQuery(
    'Count total athletes',
    () => supabase
      .from('athletes')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubs.id)
  ));

  // 5. Registrations with joins
  results.push(await testQuery(
    'Registrations with athlete & program',
    () => supabase
      .from('registrations')
      .select(`
        *,
        athlete:athletes(first_name, last_name),
        sub_program:sub_programs(name)
      `)
      .eq('club_id', clubs.id)
      .limit(50)
  ));

  // 6. Orders with household
  results.push(await testQuery(
    'Orders with household data',
    () => supabase
      .from('orders')
      .select('*, household:households(*)')
      .eq('club_id', clubs.id)
      .limit(50)
  ));

  // 7. Programs with sub-programs
  results.push(await testQuery(
    'Programs with sub-programs',
    () => supabase
      .from('programs')
      .select('*, sub_programs(*)')
      .eq('club_id', clubs.id)
  ));

  // 8. Get athletes with registrations
  const { data: sampleAthletes } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubs.id)
    .limit(50);

  if (sampleAthletes && sampleAthletes.length > 0) {
    results.push(await testQuery(
      'Athletes with all registrations (50 athletes)',
      () => supabase
        .from('athletes')
        .select('*, registrations(*)')
        .in('id', sampleAthletes.map(a => a.id))
    ));
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('Summary:');
  console.log('-'.repeat(70));
  
  const successful = results.filter(r => r.success).length;
  const fast = results.filter(r => r.success && r.duration < 100).length;
  const medium = results.filter(r => r.success && r.duration >= 100 && r.duration < 500).length;
  const slow = results.filter(r => r.success && r.duration >= 500).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Fast (< 100ms):    ${fast}`);
  console.log(`⚠️  Medium (< 500ms):  ${medium}`);
  console.log(`❌ Slow (> 500ms):    ${slow}`);
  console.log(`❌ Failed:            ${results.length - successful}`);
  
  const avgDuration = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.duration, 0) / successful;
  
  console.log(`\nAverage query time: ${avgDuration.toFixed(0)}ms`);
  
  if (slow > 0) {
    console.log('\n⚠️  Optimization needed for slow queries!');
  } else if (medium > 2) {
    console.log('\n✓ Good performance, consider optimizing medium queries');
  } else {
    console.log('\n🎉 Excellent performance across all queries!');
  }
  
  console.log('\n');
}

main().catch(console.error);
