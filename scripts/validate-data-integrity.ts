#!/usr/bin/env tsx
/**
 * Data Integrity Validation Script
 * 
 * Runs comprehensive data integrity checks on the database.
 * Can be run anytime to ensure data quality.
 * 
 * Usage:
 *   npx tsx scripts/validate-data-integrity.ts
 *   npm run validate:data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Supabase client
function initSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Display validation results
function displayResults(results: any[]) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                  DATA INTEGRITY VALIDATION                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const criticalIssues = results.filter(
    (r) => r.severity === 'CRITICAL' && r.issue_count > 0
  );
  const highIssues = results.filter(
    (r) => r.severity === 'HIGH' && r.issue_count > 0
  );
  const allPassed = criticalIssues.length === 0 && highIssues.length === 0;

  if (allPassed) {
    console.log('✅ SUCCESS - All validation checks passed!\n');
  } else {
    console.log('⚠️  ISSUES FOUND - Please review the details below:\n');
  }

  // Display results by severity
  if (criticalIssues.length > 0) {
    console.log('🔴 CRITICAL ISSUES:');
    console.log('─'.repeat(65));
    for (const issue of criticalIssues) {
      console.log(`\n  Check: ${issue.check_name}`);
      console.log(`  Issues: ${issue.issue_count}`);
      console.log(`  Description: ${issue.description}`);
    }
    console.log('\n');
  }

  if (highIssues.length > 0) {
    console.log('🟡 HIGH PRIORITY ISSUES:');
    console.log('─'.repeat(65));
    for (const issue of highIssues) {
      console.log(`\n  Check: ${issue.check_name}`);
      console.log(`  Issues: ${issue.issue_count}`);
      console.log(`  Description: ${issue.description}`);
    }
    console.log('\n');
  }

  // Display all checks for transparency
  console.log('📋 ALL CHECKS:');
  console.log('─'.repeat(65));
  console.log(
    `${'Check Name'.padEnd(35)} ${'Count'.padStart(8)}  ${'Status'.padEnd(8)}`
  );
  console.log('─'.repeat(65));

  for (const result of results) {
    const status = result.issue_count === 0 ? '✅ PASS' : '❌ FAIL';
    const icon =
      result.severity === 'CRITICAL'
        ? '🔴'
        : result.severity === 'HIGH'
        ? '🟡'
        : '🟢';

    console.log(
      `${icon} ${result.check_name.padEnd(32)} ${result.issue_count
        .toString()
        .padStart(8)}  ${status}`
    );
  }

  console.log('─'.repeat(65));
  console.log('');

  return allPassed;
}

// Display statistics
async function displayStatistics(supabase: any) {
  console.log('📊 DATABASE STATISTICS:');
  console.log('─'.repeat(65));

  const { data: stats, error } = await supabase.rpc('get_data_statistics');

  if (error) {
    console.error('Error fetching statistics:', error);
    return;
  }

  const categories = ['core', 'users', 'family', 'programs', 'activity'];

  for (const category of categories) {
    const categoryStats = stats.filter((s: any) => s.category === category);
    if (categoryStats.length > 0) {
      console.log(`\n${category.toUpperCase()}:`);
      for (const stat of categoryStats) {
        const count = stat.count.toLocaleString();
        console.log(`  ${stat.metric.padEnd(25)}: ${count.padStart(12)}`);
      }
    }
  }

  console.log('\n');
}

// Main execution
async function main() {
  console.log('\n🔍 Starting data integrity validation...\n');

  try {
    const supabase = initSupabase();

    // Run validation
    const { data: results, error } = await supabase.rpc('validate_data_integrity');

    if (error) {
      console.error('❌ Error running validation:', error);
      process.exit(1);
    }

    if (!results || results.length === 0) {
      console.log('⚠️  No validation results returned');
      process.exit(1);
    }

    // Display results
    const allPassed = displayResults(results);

    // Display statistics
    await displayStatistics(supabase);

    // Recommendations
    if (!allPassed) {
      console.log('💡 RECOMMENDATIONS:');
      console.log('─'.repeat(65));
      console.log('  1. Review the issues listed above');
      console.log('  2. Run cleanup if needed:');
      console.log('     SELECT * FROM cleanup_orphaned_records();');
      console.log('  3. Check specific tables for problematic records');
      console.log('  4. Consider re-running data generation if issues persist');
      console.log('');
    }

    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

main();
