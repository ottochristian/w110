#!/usr/bin/env tsx
/**
 * Load Test Data Generator
 * 
 * Generates comprehensive test data for load testing:
 * - Multiple clubs
 * - Thousands of parents with households and athletes
 * - Programs, sub-programs, and groups
 * - Registrations with orders and payments (revenue data)
 * 
 * Usage:
 *   npx tsx scripts/generate-load-test-data.ts --clubs 10 --athletes 100000
 *   npx tsx scripts/generate-load-test-data.ts --clubs 5 --athletes 50000 --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Configuration
interface Config {
  totalAthletes: number;
  clubCount: number;
  dryRun: boolean;
  batchSize: number;
  athletesPerHousehold: { min: number; max: number };
  adminsPerClub: number;
  coachesPerClub: number;
  programsPerClub: number;
  subProgramsPerProgram: number;
  groupsPerSubProgram: number;
  registrationRate: number; // 0-1, percentage of athletes that register
  paymentRate: number; // 0-1, percentage of registrations that are paid
  seasonsPerClub: number; // Number of seasons to create (1 current + N historical)
  historicalDataRate: number; // 0-1, percentage of historical season data to create
}

const defaultConfig: Config = {
  totalAthletes: 100000,
  clubCount: 10,
  dryRun: false,
  batchSize: 500,
  athletesPerHousehold: { min: 1, max: 4 },
  adminsPerClub: 2,
  coachesPerClub: 10,
  programsPerClub: 5,
  subProgramsPerProgram: 3,
  groupsPerSubProgram: 4,
  registrationRate: 0.7, // 70% of athletes register
  paymentRate: 0.85, // 85% of registrations are paid
  seasonsPerClub: 3, // 1 current + 2 historical seasons
  historicalDataRate: 0.4, // 40% of data in historical seasons
};

// Parse command line arguments
function parseArgs(): Partial<Config> {
  const args = process.argv.slice(2);
  const config: Partial<Config> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--clubs':
        config.clubCount = parseInt(args[++i]);
        break;
      case '--athletes':
        config.totalAthletes = parseInt(args[++i]);
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--batch-size':
        config.batchSize = parseInt(args[++i]);
        break;
      case '--seasons':
        config.seasonsPerClub = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
Usage: npx tsx scripts/generate-load-test-data.ts [options]

Options:
  --clubs <number>       Number of clubs to create (default: 10)
  --athletes <number>    Total number of athletes (default: 100000)
  --seasons <number>     Seasons per club (1 current + N-1 historical, default: 3)
  --batch-size <number>  Batch size for inserts (default: 500)
  --dry-run             Show plan without executing
  --help                Show this help message
        `);
        process.exit(0);
    }
  }

  return config;
}

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

// Generate statistics and plan
function generatePlan(config: Config) {
  const athletesPerClub = Math.floor(config.totalAthletes / config.clubCount);
  const avgAthletesPerHousehold =
    (config.athletesPerHousehold.min + config.athletesPerHousehold.max) / 2;
  const householdsPerClub = Math.ceil(athletesPerClub / avgAthletesPerHousehold);
  const totalHouseholds = householdsPerClub * config.clubCount;
  const totalParents = totalHouseholds; // 1 parent per household
  const totalAdmins = config.adminsPerClub * config.clubCount;
  const totalCoaches = config.coachesPerClub * config.clubCount;
  const totalPrograms = config.programsPerClub * config.clubCount;
  const totalSubPrograms = totalPrograms * config.subProgramsPerProgram;
  const totalGroups = totalSubPrograms * config.groupsPerSubProgram;
  const totalRegistrations = Math.floor(config.totalAthletes * config.registrationRate);
  const totalOrders = Math.floor(totalRegistrations * 0.8); // Some athletes have multiple registrations in one order
  const paidOrders = Math.floor(totalOrders * config.paymentRate);

  return {
    config,
    calculated: {
      athletesPerClub,
      householdsPerClub,
      totalHouseholds,
      totalParents,
      totalAdmins,
      totalCoaches,
      totalPrograms,
      totalSubPrograms,
      totalGroups,
      totalRegistrations,
      totalOrders,
      paidOrders,
      totalRevenue: paidOrders * faker.number.int({ min: 50000, max: 200000 }), // in cents
    },
  };
}

// Create clubs
async function createClubs(supabase: any, count: number): Promise<any[]> {
  console.log(`\n📍 Creating ${count} clubs...`);
  const clubs = [];

  for (let i = 0; i < count; i++) {
    const clubName = `${faker.location.city()} Ski Club`;
    const slug = clubName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) + `-${i}`;

    const { data, error } = await supabase
      .from('clubs')
      .insert({
        name: clubName,
        slug,
        contact_email: faker.internet.email().toLowerCase(),
        address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`,
        timezone: 'America/Denver',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating club ${i}:`, error);
      throw error;
    }

    clubs.push(data);
    console.log(`  ✓ Created club: ${data.name} (${data.slug})`);
  }

  return clubs;
}

// Create seasons for a club
async function createSeasons(supabase: any, clubId: string, clubName: string, count: number) {
  console.log(`  📅 Creating ${count} seasons for ${clubName}...`);
  
  const seasons = [];
  const currentYear = new Date().getFullYear();

  // Create seasons starting from oldest to newest
  for (let i = count - 1; i >= 0; i--) {
    const startYear = currentYear - i;
    const endYear = startYear + 1;
    
    const seasonStart = new Date(startYear, 8, 1); // September 1st
    const seasonEnd = new Date(endYear, 4, 31); // May 31st
    
    const isCurrent = i === 0; // Most recent season is current
    const status = isCurrent ? 'active' : 'closed';

    const { data: season, error } = await supabase
      .from('seasons')
      .insert({
        club_id: clubId,
        name: `${startYear}-${endYear} Season`,
        start_date: seasonStart.toISOString().split('T')[0],
        end_date: seasonEnd.toISOString().split('T')[0],
        is_current: isCurrent,
        status: status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating season:', error);
      throw error;
    }

    seasons.push(season);
    console.log(`    ✓ ${season.name} (${status})`);
  }

  return seasons;
}

// Create admins for a club
async function createAdmins(supabase: any, clubId: string, count: number, clubName: string) {
  console.log(`  👤 Creating ${count} admins for ${clubName}...`);
  const admins = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `loadtest-admin-${clubId.substring(0, 8)}-${i}@example.com`;

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
        club_id: clubId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating admin:`, error);
      throw error;
    }

    admins.push(data);
  }

  return admins;
}

// Create coaches for a club
async function createCoaches(supabase: any, clubId: string, count: number, clubName: string) {
  console.log(`  👨‍🏫 Creating ${count} coaches for ${clubName}...`);
  const coachProfiles = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `loadtest-coach-${clubId.substring(0, 8)}-${i}@example.com`;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'coach',
        club_id: clubId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error(`Error creating coach profile:`, profileError);
      throw profileError;
    }

    // Create coach record
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .insert({
        profile_id: profile.id,
        club_id: clubId,
        bio: faker.lorem.paragraph(),
        specialties: faker.helpers.arrayElements(
          ['Alpine', 'Nordic', 'Freestyle', 'Snowboarding', 'Racing'],
          { min: 1, max: 3 }
        ),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (coachError) {
      console.error(`Error creating coach record:`, coachError);
      throw coachError;
    }

    coachProfiles.push({ profile, coach });
  }

  return coachProfiles;
}

// Create programs for a club and season
async function createPrograms(
  supabase: any,
  clubId: string,
  season: any,
  count: number,
  clubName: string
) {
  const programs = [];
  const programTypes = ['Alpine Skiing', 'Nordic Skiing', 'Freestyle', 'Snowboarding', 'Racing'];
  
  // Historical seasons get fewer programs (simulating program evolution)
  const programCount = season.is_current ? count : Math.max(2, Math.floor(count * 0.6));

  for (let i = 0; i < programCount; i++) {
    const programName = programTypes[i % programTypes.length];
    const level = i < programTypes.length ? '' : ` Level ${Math.floor(i / programTypes.length) + 1}`;
    
    // Historical programs are closed
    const status = season.is_current ? 'active' : 'closed';

    const { data, error } = await supabase
      .from('programs')
      .insert({
        club_id: clubId,
        season_id: season.id,
        name: `${programName}${level}`,
        description: faker.lorem.paragraph(),
        status: status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating program:`, error);
      throw error;
    }

    programs.push(data);
  }

  return programs;
}

// Create sub-programs for a program
async function createSubPrograms(supabase: any, program: any, count: number) {
  const subPrograms = [];
  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Elite'];

  for (let i = 0; i < count; i++) {
    const { data, error } = await supabase
      .from('sub_programs')
      .insert({
        program_id: program.id,
        name: `${program.name} - ${levels[i % levels.length]}`,
        description: faker.lorem.sentence(),
        max_participants: faker.number.int({ min: 20, max: 50 }),
        price_cents: faker.number.int({ min: 50000, max: 200000 }),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating sub-program:`, error);
      throw error;
    }

    subPrograms.push(data);
  }

  return subPrograms;
}

// Create groups for a sub-program
async function createGroups(supabase: any, subProgram: any, count: number) {
  const groups = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let i = 0; i < count; i++) {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        sub_program_id: subProgram.id,
        name: `Group ${String.fromCharCode(65 + i)} - ${days[i % days.length]}`,
        max_participants: faker.number.int({ min: 10, max: 20 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating group:`, error);
      throw error;
    }

    groups.push(data);
  }

  return groups;
}

// Create parents with households and athletes (uses database function for atomicity)
async function createParentsWithHouseholds(
  supabase: any,
  clubId: string,
  count: number,
  athletesPerHousehold: { min: number; max: number },
  clubName: string
) {
  console.log(`  👨‍👩‍👧‍👦 Creating ${count} households with athletes for ${clubName}...`);
  const households = [];
  const batchSize = 100;

  for (let i = 0; i < count; i += batchSize) {
    const batch = Math.min(batchSize, count - i);
    const batchPromises = [];

    for (let j = 0; j < batch; j++) {
      const index = i + j;
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = `loadtest-parent-${clubId.substring(0, 8)}-${index}@example.com`;
      const athleteCount = faker.number.int(athletesPerHousehold);

      batchPromises.push(
        supabase.rpc('create_parent_with_household', {
          p_club_id: clubId,
          p_email: email,
          p_first_name: firstName,
          p_last_name: lastName,
          p_athlete_count: athleteCount,
        })
      );
    }

    const results = await Promise.all(batchPromises);

    for (const result of results) {
      if (result.error) {
        console.error('Error creating household:', result.error);
        throw result.error;
      }
      if (result.data && result.data.length > 0) {
        households.push(result.data[0]);
      }
    }

    const progress = ((i + batch) / count) * 100;
    console.log(`    Progress: ${progress.toFixed(1)}% (${i + batch}/${count})`);
  }

  return households;
}

// Create registrations with orders and payments
async function createRegistrations(
  supabase: any,
  clubId: string,
  subPrograms: any[],
  athleteIds: string[],
  registrationRate: number,
  paymentRate: number,
  clubName: string
) {
  console.log(`  💰 Creating registrations and orders for ${clubName}...`);

  // Get athletes for this club
  const { data: athletes, error: athleteError } = await supabase
    .from('athletes')
    .select('id, household_id')
    .eq('club_id', clubId);

  if (athleteError) {
    console.error('Error fetching athletes:', athleteError);
    throw athleteError;
  }

  const athletesToRegister = faker.helpers.arrayElements(
    athletes,
    Math.floor(athletes.length * registrationRate)
  );

  // Group athletes by household to create realistic orders
  const householdGroups = new Map<string, any[]>();
  for (const athlete of athletesToRegister) {
    if (!householdGroups.has(athlete.household_id)) {
      householdGroups.set(athlete.household_id, []);
    }
    householdGroups.get(athlete.household_id)!.push(athlete);
  }

  let orderCount = 0;
  let registrationCount = 0;

  // Create orders for each household
  for (const [householdId, householdAthletes] of householdGroups) {
    // Create order
    const orderStatus = Math.random() < paymentRate ? 'paid' : 'pending';
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        household_id: householdId,
        club_id: clubId,
        status: orderStatus,
        total_amount_cents: 0, // Will calculate
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      continue;
    }

    let totalAmount = 0;
    const registrations = [];

    // Create registrations for each athlete in the household
    for (const athlete of householdAthletes) {
      const subProgram = faker.helpers.arrayElement(subPrograms);

      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .insert({
          athlete_id: athlete.id,
          sub_program_id: subProgram.id,
          status: 'confirmed',
          price_cents: subProgram.price_cents,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (regError) {
        console.error('Error creating registration:', regError);
        continue;
      }

      registrations.push(registration);
      totalAmount += subProgram.price_cents;
      registrationCount++;
    }

    // Update order with total amount
    await supabase
      .from('orders')
      .update({ total_amount_cents: totalAmount })
      .eq('id', order.id);

    // Create payment if order is paid
    if (orderStatus === 'paid') {
      await supabase.from('payments').insert({
        order_id: order.id,
        amount_cents: totalAmount,
        status: 'succeeded',
        stripe_payment_intent_id: `pi_loadtest_${order.id.substring(0, 16)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    orderCount++;

    if (orderCount % 100 === 0) {
      console.log(`    Created ${orderCount} orders, ${registrationCount} registrations...`);
    }
  }

  console.log(`  ✓ Created ${orderCount} orders and ${registrationCount} registrations`);

  return { orderCount, registrationCount };
}

// Main execution
async function main() {
  const args = parseArgs();
  const config = { ...defaultConfig, ...args };
  const plan = generatePlan(config);

  console.log('\n🚀 Load Test Data Generation Plan');
  console.log('═'.repeat(50));
  console.log('\n📊 Configuration:');
  console.log(`  Clubs: ${config.clubCount}`);
  console.log(`  Total Athletes: ${config.totalAthletes.toLocaleString()}`);
  console.log(`  Athletes per Club: ~${plan.calculated.athletesPerClub.toLocaleString()}`);
  console.log(`  Athletes per Household: ${config.athletesPerHousehold.min}-${config.athletesPerHousehold.max}`);
  console.log(`  Seasons per Club: ${config.seasonsPerClub} (1 current + ${config.seasonsPerClub - 1} historical)`);
  console.log(`  Batch Size: ${config.batchSize}`);
  console.log(
    `  Registration Rate: ${(config.registrationRate * 100).toFixed(0)}%`
  );
  console.log(`  Payment Rate: ${(config.paymentRate * 100).toFixed(0)}%`);

  console.log('\n📈 Estimated Totals:');
  console.log(`  Total Households: ${plan.calculated.totalHouseholds.toLocaleString()}`);
  console.log(`  Total Parents: ${plan.calculated.totalParents.toLocaleString()}`);
  console.log(`  Total Admins: ${plan.calculated.totalAdmins.toLocaleString()}`);
  console.log(`  Total Coaches: ${plan.calculated.totalCoaches.toLocaleString()}`);
  console.log(`  Total Programs: ${plan.calculated.totalPrograms}`);
  console.log(`  Total Sub-Programs: ${plan.calculated.totalSubPrograms}`);
  console.log(`  Total Groups: ${plan.calculated.totalGroups}`);
  console.log(`  Total Registrations: ${plan.calculated.totalRegistrations.toLocaleString()}`);
  console.log(`  Total Orders: ${plan.calculated.totalOrders.toLocaleString()}`);
  console.log(`  Paid Orders: ${plan.calculated.paidOrders.toLocaleString()}`);
  console.log(
    `  Estimated Revenue: $${(plan.calculated.totalRevenue / 100).toLocaleString()}`
  );

  if (config.dryRun) {
    console.log('\n✋ Dry run mode - no data will be created');
    return;
  }

  console.log('\n⚠️  WARNING: This will create a large amount of data!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const supabase = initSupabase();
  const startTime = Date.now();

  try {
    // Create clubs
    const clubs = await createClubs(supabase, config.clubCount);

    // For each club, create all related data
    for (let i = 0; i < clubs.length; i++) {
      const club = clubs[i];
      console.log(
        `\n${'='.repeat(50)}\n🏢 Processing Club ${i + 1}/${clubs.length}: ${club.name}\n${'='.repeat(50)}`
      );

      // Create seasons (current + historical)
      const seasons = await createSeasons(supabase, club.id, club.name, config.seasonsPerClub);
      const currentSeason = seasons.find(s => s.is_current)!;

      // Create admins (once per club, not per season)
      await createAdmins(supabase, club.id, config.adminsPerClub, club.name);

      // Create coaches (once per club, not per season)
      await createCoaches(supabase, club.id, config.coachesPerClub, club.name);

      // Create parents with households and athletes (once per club)
      const householdsPerClub = plan.calculated.householdsPerClub;
      await createParentsWithHouseholds(
        supabase,
        club.id,
        householdsPerClub,
        config.athletesPerHousehold,
        club.name
      );

      // For each season, create programs, sub-programs, groups, and registrations
      console.log(`  🏂 Creating programs and registrations for ${seasons.length} seasons...`);
      
      for (const season of seasons) {
        const isCurrentSeason = season.is_current;
        const seasonLabel = isCurrentSeason ? '(current)' : '(historical)';
        console.log(`    Processing ${season.name} ${seasonLabel}`);

        // Create programs for this season
        const programs = await createPrograms(
          supabase,
          club.id,
          season,
          config.programsPerClub,
          club.name
        );

        const allSubPrograms = [];
        for (const program of programs) {
          const subPrograms = await createSubPrograms(
            supabase,
            program,
            config.subProgramsPerProgram
          );
          allSubPrograms.push(...subPrograms);

          for (const subProgram of subPrograms) {
            await createGroups(supabase, subProgram, config.groupsPerSubProgram);
          }
        }

        // Create registrations based on season type
        // Current season: full registration rate
        // Historical seasons: reduced rate (simulates older data)
        const seasonRegistrationRate = isCurrentSeason 
          ? config.registrationRate 
          : config.registrationRate * config.historicalDataRate;
        
        const athleteIds: string[] = []; // Will be fetched in createRegistrations
        await createRegistrations(
          supabase,
          club.id,
          allSubPrograms,
          athleteIds,
          seasonRegistrationRate,
          config.paymentRate,
          `${club.name} - ${season.name}`
        );
      }
    }

    // Validate data integrity
    console.log('\n🔍 Validating data integrity...');
    const { data: validationResults, error: validationError } = await supabase.rpc(
      'validate_data_integrity'
    );

    if (validationError) {
      console.error('Error running validation:', validationError);
    } else {
      console.log('\nValidation Results:');
      const issues = validationResults.filter((r: any) => r.issue_count > 0);
      if (issues.length === 0) {
        console.log('  ✅ All checks passed!');
      } else {
        console.log('  ⚠️  Issues found:');
        for (const issue of issues) {
          console.log(
            `    - ${issue.check_name}: ${issue.issue_count} issues (${issue.severity})`
          );
          console.log(`      ${issue.description}`);
        }
      }
    }

    // Get final statistics
    console.log('\n📊 Final Statistics:');
    const { data: stats } = await supabase.rpc('get_data_statistics');
    if (stats) {
      const categories = ['core', 'users', 'family', 'programs', 'activity'];
      for (const category of categories) {
        const categoryStats = stats.filter((s: any) => s.category === category);
        if (categoryStats.length > 0) {
          console.log(`\n  ${category.toUpperCase()}:`);
          for (const stat of categoryStats) {
            console.log(
              `    ${stat.metric.padEnd(25)}: ${stat.count.toLocaleString()}`
            );
          }
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\n✅ Load test data generation complete in ${duration} minutes!`);
  } catch (error) {
    console.error('\n❌ Error generating data:', error);
    process.exit(1);
  }
}

main();
