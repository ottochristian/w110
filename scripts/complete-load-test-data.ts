#!/usr/bin/env tsx
/**
 * Complete Load Test Data - Creates Missing Programs and Revenue
 * 
 * This script:
 * 1. Creates programs/sub-programs/groups for all seasons
 * 2. Creates registrations, orders, and payments
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
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
  console.log('\n🚀 Completing Load Test Data');
  console.log('═'.repeat(50));
  
  const startTime = Date.now();
  const supabase = initSupabase();

  // Get all clubs
  const { data: clubs } = await supabase.from('clubs').select('*');
  if (!clubs) return;

  console.log(`\n✅ Found ${clubs.length} clubs`);

  let totalPrograms = 0;
  let totalSubPrograms = 0;
  let totalGroups = 0;
  let totalRegistrations = 0;
  let totalOrders = 0;
  let totalRevenue = 0;

  for (const club of clubs) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🏢 ${club.name}`);
    console.log('='.repeat(50));

    // Get seasons for this club
    const { data: seasons } = await supabase
      .from('seasons')
      .select('*')
      .eq('club_id', club.id)
      .order('start_date', { ascending: false });

    if (!seasons || seasons.length === 0) continue;

    console.log(`  📅 ${seasons.length} seasons found`);

    // For each season, ensure programs exist
    const allSubPrograms = [];
    
    for (const season of seasons) {
      // Check if programs exist for this season
      const { data: existingPrograms } = await supabase
        .from('programs')
        .select('id')
        .eq('season_id', season.id);

      if (!existingPrograms || existingPrograms.length === 0) {
        console.log(`  🏂 Creating programs for ${season.name}...`);
        
        const programTypes = ['Alpine Skiing', 'Nordic Skiing', 'Freestyle', 'Snowboarding', 'Racing'];
        const programCount = season.is_current ? 5 : 3;

        for (let i = 0; i < programCount; i++) {
          const programName = programTypes[i % programTypes.length];
          
          const { data: program } = await supabase
            .from('programs')
            .insert({
              club_id: club.id,
              season_id: season.id,
              name: programName,
              status: season.is_current ? 'active' : 'closed',
            })
            .select()
            .single();

          if (program) {
            totalPrograms++;
            
            // Create sub-programs
            const levels = ['Beginner', 'Intermediate', 'Advanced'];
            for (const level of levels) {
              const { data: subProgram } = await supabase
                .from('sub_programs')
                .insert({
                  program_id: program.id,
                  name: `${program.name} - ${level}`,
                  max_participants: 30,
                  price_cents: faker.number.int({ min: 50000, max: 200000 }),
                  status: 'active',
                })
                .select()
                .single();

              if (subProgram) {
                totalSubPrograms++;
                allSubPrograms.push(subProgram);

                // Create groups
                for (let k = 0; k < 4; k++) {
                  const { data: group } = await supabase
                    .from('groups')
                    .insert({
                      sub_program_id: subProgram.id,
                      name: `Group ${String.fromCharCode(65 + k)}`,
                      max_participants: 15,
                    })
                    .select()
                    .single();
                  
                  if (group) totalGroups++;
                }
              }
            }
          }
        }
      } else {
        // Programs exist, fetch sub-programs
        const { data: subPrograms } = await supabase
          .from('sub_programs')
          .select('*')
          .in('program_id', existingPrograms.map(p => p.id));
        
        if (subPrograms) {
          allSubPrograms.push(...subPrograms);
        }
      }
    }

    if (allSubPrograms.length === 0) {
      console.log(`  ⚠️  No sub-programs available, skipping revenue...`);
      continue;
    }

    console.log(`  📚 ${allSubPrograms.length} sub-programs available`);

    // Get athletes for this club
    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, household_id')
      .eq('club_id', club.id);

    if (!athletes || athletes.length === 0) continue;

    console.log(`  👥 ${athletes.length} athletes found`);

    // Check existing registrations
    const { data: existingRegs } = await supabase
      .from('registrations')
      .select('athlete_id')
      .in('athlete_id', athletes.map(a => a.id));

    const athletesWithRegs = new Set(existingRegs?.map(r => r.athlete_id) || []);
    const athletesNeedingRegs = athletes.filter(a => !athletesWithRegs.has(a.id));

    if (athletesNeedingRegs.length === 0) {
      console.log(`  ✅ All athletes already registered`);
      continue;
    }

    console.log(`  💰 Creating revenue for ${athletesNeedingRegs.length} athletes...`);

    // Select 70% to register
    const athletesToRegister = athletesNeedingRegs.slice(0, Math.floor(athletesNeedingRegs.length * 0.7));

    // Group by household
    const householdMap = new Map<string, any[]>();
    for (const athlete of athletesToRegister) {
      if (!householdMap.has(athlete.household_id)) {
        householdMap.set(athlete.household_id, []);
      }
      householdMap.get(athlete.household_id)!.push(athlete);
    }

    let clubOrders = 0;
    let clubRegistrations = 0;
    let clubRevenue = 0;

    // Create orders
    const householdEntries = Array.from(householdMap.entries());
    for (let i = 0; i < householdEntries.length; i++) {
      const [householdId, householdAthletes] = householdEntries[i];
      const isPaid = Math.random() < 0.85;

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
        let orderTotal = 0;

        for (const athlete of householdAthletes) {
          const subProgram = faker.helpers.arrayElement(allSubPrograms);
          
          await supabase.from('registrations').insert({
            athlete_id: athlete.id,
            sub_program_id: subProgram.id,
            status: 'confirmed',
            price_cents: subProgram.price_cents,
          });

          orderTotal += subProgram.price_cents;
          clubRegistrations++;
        }

        await supabase.from('orders').update({ total_amount_cents: orderTotal }).eq('id', order.id);

        if (isPaid) {
          await supabase.from('payments').insert({
            order_id: order.id,
            amount_cents: orderTotal,
            status: 'succeeded',
            stripe_payment_intent_id: `pi_loadtest_${order.id.substring(0, 16)}`,
          });
          clubRevenue += orderTotal;
        }

        clubOrders++;
      }

      if ((i + 1) % 1000 === 0) {
        console.log(`    Progress: ${((i + 1) / householdEntries.length * 100).toFixed(0)}% (${clubOrders.toLocaleString()} orders)`);
      }
    }

    console.log(`  ✅ Orders: ${clubOrders.toLocaleString()}`);
    console.log(`  ✅ Registrations: ${clubRegistrations.toLocaleString()}`);
    console.log(`  💵 Revenue: $${(clubRevenue / 100).toLocaleString()}`);

    totalOrders += clubOrders;
    totalRegistrations += clubRegistrations;
    totalRevenue += clubRevenue;
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  
  console.log('\n' + '═'.repeat(50));
  console.log('✅ COMPLETE!');
  console.log('═'.repeat(50));
  console.log(`⏱️  Duration: ${duration} minutes`);
  console.log(`🏂 Programs: ${totalPrograms}`);
  console.log(`📚 Sub-Programs: ${totalSubPrograms}`);
  console.log(`👥 Groups: ${totalGroups}`);
  console.log(`📝 Orders: ${totalOrders.toLocaleString()}`);
  console.log(`🎫 Registrations: ${totalRegistrations.toLocaleString()}`);
  console.log(`💰 Revenue: $${(totalRevenue / 100).toLocaleString()}`);
  console.log('═'.repeat(50) + '\n');
}

main().catch(console.error);
