#!/usr/bin/env tsx
/**
 * Simplified Load Test Data Generator (No Auth Required)
 * 
 * Generates test data without creating auth users - focuses on:
 * - Households and athletes (the bulk of the data)
 * - Programs, sub-programs, groups
 * - Registrations and orders (revenue data)
 * 
 * Uses existing clubs and profiles, so run this on a database that already has:
 * - At least one club
 * - At least one admin profile per club
 * - At least a few coach profiles
 * 
 * Usage:
 *   npx tsx scripts/generate-load-test-data-simple.ts --athletes 100000
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

interface Config {
  totalAthletes: number;
  dryRun: boolean;
  batchSize: number;
  athletesPerHousehold: { min: number; max: number };
  programsPerClubPerSeason: number;
  subProgramsPerProgram: number;
  groupsPerSubProgram: number;
  registrationRate: number;
  paymentRate: number;
  seasonsPerClub: number;
  historicalDataRate: number;
}

const defaultConfig: Config = {
  totalAthletes: 100000,
  dryRun: false,
  batchSize: 500,
  athletesPerHousehold: { min: 1, max: 4 },
  programsPerClubPerSeason: 5,
  subProgramsPerProgram: 3,
  groupsPerSubProgram: 4,
  registrationRate: 0.7,
  paymentRate: 0.85,
  seasonsPerClub: 3,
  historicalDataRate: 0.4,
};

function parseArgs(): Partial<Config> {
  const args = process.argv.slice(2);
  const config: Partial<Config> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--athletes':
        config.totalAthletes = parseInt(args[++i]);
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--seasons':
        config.seasonsPerClub = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
Usage: npx tsx scripts/generate-load-test-data-simple.ts [options]

Options:
  --athletes <number>    Total number of athletes (default: 100000)
  --seasons <number>     Seasons per club (default: 3)
  --dry-run             Show plan without executing
  --help                Show this help message
        `);
        process.exit(0);
    }
  }

  return config;
}

function initSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  const args = parseArgs();
  const config = { ...defaultConfig, ...args };
  
  console.log('\n🚀 Simplified Load Test Data Generation');
  console.log('═'.repeat(50));
  console.log('\n📊 Configuration:');
  console.log(`  Total Athletes: ${config.totalAthletes.toLocaleString()}`);
  console.log(`  Seasons per Club: ${config.seasonsPerClub} (1 current + ${config.seasonsPerClub - 1} historical)`);
  console.log(`  Athletes per Household: ${config.athletesPerHousehold.min}-${config.athletesPerHousehold.max}`);
  console.log(`  Registration Rate: ${(config.registrationRate * 100).toFixed(0)}%`);
  console.log(`  Payment Rate: ${(config.paymentRate * 100).toFixed(0)}%`);

  if (config.dryRun) {
    console.log('\n✋ Dry run mode - no data will be created');
    return;
  }

  const supabase = initSupabase();

  // Get existing clubs
  const { data: clubs, error: clubsError } = await supabase
    .from('clubs')
    .select('*');

  if (clubsError || !clubs || clubs.length === 0) {
    console.error('\n❌ No clubs found. Please create at least one club first.');
    process.exit(1);
  }

  console.log(`\n✅ Found ${clubs.length} existing clubs`);
  console.log(`\n⚠️  This will create ~${config.totalAthletes.toLocaleString()} athletes!`);
  console.log('Press Ctrl+C to cancel, or wait 5 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const startTime = Date.now();
  const athletesPerClub = Math.floor(config.totalAthletes / clubs.length);
  
  for (const club of clubs) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🏢 Processing: ${club.name}`);
    console.log('='.repeat(50));

    // Create seasons
    console.log(`\n  📅 Creating ${config.seasonsPerClub} seasons...`);
    const seasons = [];
    const currentYear = new Date().getFullYear();
    
    for (let i = config.seasonsPerClub - 1; i >= 0; i--) {
      const startYear = currentYear - i;
      const { data: season } = await supabase.from('seasons').insert({
        club_id: club.id,
        name: `${startYear}-${startYear + 1} Season`,
        start_date: `${startYear}-09-01`,
        end_date: `${startYear + 1}-05-31`,
        is_current: i === 0,
        status: i === 0 ? 'active' : 'closed',
      }).select().single();
      
      if (season) {
        seasons.push(season);
        console.log(`    ✓ ${season.name} (${season.status})`);
      }
    }

    //Create programs for each season
    for (const season of seasons) {
      console.log(`\n  🏂 Creating programs for ${season.name}...`);
      const programCount = season.is_current ? config.programsPerClubPerSeason : Math.max(2, Math.floor(config.programsPerClubPerSeason * 0.6));
      const programTypes = ['Alpine Skiing', 'Nordic Skiing', 'Freestyle', 'Snowboarding', 'Racing'];
      
      for (let i = 0; i < programCount; i++) {
        const programName = programTypes[i % programTypes.length];
        const { data: program } = await supabase.from('programs').insert({
          club_id: club.id,
          season_id: season.id,
          name: `${programName}`,
          status: season.is_current ? 'active' : 'closed',
        }).select().single();

        if (program) {
          // Create sub-programs
          for (let j = 0; j < config.subProgramsPerProgram; j++) {
            const level = ['Beginner', 'Intermediate', 'Advanced'][j];
            const { data: subProgram } = await supabase.from('sub_programs').insert({
              program_id: program.id,
              name: `${program.name} - ${level}`,
              max_participants: faker.number.int({ min: 20, max: 50 }),
              price_cents: faker.number.int({ min: 50000, max: 200000 }),
              status: 'active',
            }).select().single();

            if (subProgram) {
              // Create groups
              for (let k = 0; k < config.groupsPerSubProgram; k++) {
                await supabase.from('groups').insert({
                  sub_program_id: subProgram.id,
                  name: `Group ${String.fromCharCode(65 + k)}`,
                  max_participants: faker.number.int({ min: 10, max: 20 }),
                });
              }
            }
          }
        }
      }
    }

    // Create households with athletes
    console.log(`\n  👨‍👩‍👧‍👦 Creating ~${athletesPerClub.toLocaleString()} athletes in households...`);
    const avgAthletesPerHousehold = (config.athletesPerHousehold.min + config.athletesPerHousehold.max) / 2;
    const householdsToCreate = Math.ceil(athletesPerClub / avgAthletesPerHousehold);
    
    let created = 0;
    for (let i = 0; i < householdsToCreate; i++) {
      const { data: household } = await supabase.from('households').insert({
        club_id: club.id,
      }).select().single();

      if (household) {
        const athleteCount = faker.number.int(config.athletesPerHousehold);
        const lastName = faker.person.lastName();
        
        for (let j = 0; j < athleteCount; j++) {
          await supabase.from('athletes').insert({
            household_id: household.id,
            club_id: club.id,
            first_name: faker.person.firstName(),
            last_name: lastName,
            date_of_birth: faker.date.birthdate({ min: 5, max: 18, mode: 'age' }).toISOString().split('T')[0],
          });
          created++;
        }
      }

      if ((i + 1) % 500 === 0) {
        const progress = ((i + 1) / householdsToCreate * 100).toFixed(1);
        console.log(`    Progress: ${progress}% (${created.toLocaleString()} athletes)`);
      }
    }
    
    console.log(`    ✓ Created ${created.toLocaleString()} athletes`);

    // Create registrations and orders with revenue data
    console.log(`\n  💰 Creating registrations and revenue data...`);
    
    // Get all sub-programs for this club
    const { data: subPrograms } = await supabase
      .from('sub_programs')
      .select('id, price_cents, program_id, programs!inner(club_id, season_id)')
      .eq('programs.club_id', club.id);

    if (subPrograms && subPrograms.length > 0) {
      // Get all athletes for this club
      const { data: athletes } = await supabase
        .from('athletes')
        .select('id, household_id')
        .eq('club_id', club.id);

      if (athletes && athletes.length > 0) {
        // Determine how many athletes should register (70% rate)
        const athletesToRegister = athletes.slice(0, Math.floor(athletes.length * config.registrationRate));
        
        // Group by household for realistic orders
        const householdMap = new Map<string, any[]>();
        for (const athlete of athletesToRegister) {
          if (!householdMap.has(athlete.household_id)) {
            householdMap.set(athlete.household_id, []);
          }
          householdMap.get(athlete.household_id)!.push(athlete);
        }

        let orderCount = 0;
        let registrationCount = 0;

        // Create orders per household
        for (const [householdId, householdAthletes] of householdMap) {
          const isPaid = Math.random() < config.paymentRate;
          
          // Create order
          const { data: order } = await supabase
            .from('orders')
            .insert({
              household_id: householdId,
              club_id: club.id,
              status: isPaid ? 'paid' : 'pending',
              total_amount_cents: 0,
            })
            .select()
            .single();

          if (order) {
            let totalAmount = 0;

            // Create registrations for each athlete in household
            for (const athlete of householdAthletes) {
              const subProgram = faker.helpers.arrayElement(subPrograms);
              
              await supabase.from('registrations').insert({
                athlete_id: athlete.id,
                sub_program_id: subProgram.id,
                status: 'confirmed',
                price_cents: subProgram.price_cents,
              });

              totalAmount += subProgram.price_cents;
              registrationCount++;
            }

            // Update order total
            await supabase
              .from('orders')
              .update({ total_amount_cents: totalAmount })
              .eq('id', order.id);

            // Create payment if paid
            if (isPaid) {
              await supabase.from('payments').insert({
                order_id: order.id,
                amount_cents: totalAmount,
                status: 'succeeded',
                stripe_payment_intent_id: `pi_loadtest_${order.id.substring(0, 16)}`,
              });
            }

            orderCount++;
          }

          if (orderCount % 100 === 0) {
            console.log(`    Progress: ${orderCount} orders, ${registrationCount} registrations...`);
          }
        }

        console.log(`    ✓ Created ${orderCount.toLocaleString()} orders and ${registrationCount.toLocaleString()} registrations`);
        const revenue = Array.from(householdMap.values()).reduce((sum, athletes) => {
          return sum + (athletes.length * faker.number.int({ min: 50000, max: 200000 }));
        }, 0);
        console.log(`    💵 Estimated revenue: $${(revenue / 100).toLocaleString()}`);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  console.log(`\n✅ Generation complete in ${duration} minutes!`);
  console.log('\nRun validation: npm run validate:data');
}

main().catch(console.error);
