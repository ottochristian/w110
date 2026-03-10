#!/usr/bin/env tsx
/**
 * Revenue Data Generator
 * 
 * Adds registrations, orders, and payments to existing athletes
 * Creates realistic revenue data without regenerating athletes
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

interface Config {
  registrationRate: number;
  paymentRate: number;
  batchSize: number;
}

const config: Config = {
  registrationRate: 0.7, // 70% of athletes register
  paymentRate: 0.85, // 85% of orders are paid
  batchSize: 100,
};

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
  console.log('\n💰 Revenue Data Generation');
  console.log('═'.repeat(50));
  
  const startTime = Date.now();
  const supabase = initSupabase();

  // Get all clubs
  const { data: clubs } = await supabase.from('clubs').select('*');
  
  if (!clubs || clubs.length === 0) {
    console.log('No clubs found');
    return;
  }

  console.log(`\n✅ Found ${clubs.length} clubs`);
  console.log(`📊 Creating registrations and revenue data...\n`);

  let totalOrders = 0;
  let totalRegistrations = 0;
  let totalRevenue = 0;

  for (const club of clubs) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🏢 Processing: ${club.name}`);
    console.log('='.repeat(50));

    // Get all sub-programs for this club (across all seasons)
    const { data: subPrograms } = await supabase
      .from('sub_programs')
      .select(`
        id,
        price_cents,
        program_id,
        programs!inner(
          id,
          club_id,
          season_id,
          seasons!inner(id, name, is_current)
        )
      `)
      .eq('programs.club_id', club.id);

    if (!subPrograms || subPrograms.length === 0) {
      console.log(`  ⚠️  No programs found, skipping...`);
      continue;
    }

    console.log(`  📚 Found ${subPrograms.length} sub-programs`);

    // Get all athletes for this club
    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, household_id')
      .eq('club_id', club.id);

    if (!athletes || athletes.length === 0) {
      console.log(`  ⚠️  No athletes found, skipping...`);
      continue;
    }

    console.log(`  👥 Found ${athletes.length} athletes`);

    // Check which athletes already have registrations
    const { data: existingRegs } = await supabase
      .from('registrations')
      .select('athlete_id')
      .in('athlete_id', athletes.map(a => a.id));

    const athletesWithRegs = new Set(existingRegs?.map(r => r.athlete_id) || []);
    const athletesNeedingRegs = athletes.filter(a => !athletesWithRegs.has(a.id));

    if (athletesNeedingRegs.length === 0) {
      console.log(`  ✅ All athletes already have registrations`);
      continue;
    }

    console.log(`  🎯 Creating registrations for ${athletesNeedingRegs.length} athletes...`);

    // Select athletes to register (70% rate)
    const athletesToRegister = faker.helpers.shuffle(athletesNeedingRegs)
      .slice(0, Math.floor(athletesNeedingRegs.length * config.registrationRate));

    // Group by household
    const householdMap = new Map<string, any[]>();
    for (const athlete of athletesToRegister) {
      if (!householdMap.has(athlete.household_id)) {
        householdMap.set(athlete.household_id, []);
      }
      householdMap.get(athlete.household_id)!.push(athlete);
    }

    console.log(`  📦 Creating ${householdMap.size} orders...`);

    let clubOrders = 0;
    let clubRegistrations = 0;
    let clubRevenue = 0;

    // Process in batches
    const householdEntries = Array.from(householdMap.entries());
    for (let i = 0; i < householdEntries.length; i += config.batchSize) {
      const batch = householdEntries.slice(i, i + config.batchSize);

      for (const [householdId, householdAthletes] of batch) {
        const isPaid = Math.random() < config.paymentRate;

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            household_id: householdId,
            club_id: club.id,
            status: isPaid ? 'paid' : 'pending',
            total_amount_cents: 0,
          })
          .select()
          .single();

        if (orderError || !order) {
          console.error(`    ❌ Error creating order:`, orderError?.message);
          continue;
        }

        let orderTotal = 0;

        // Create registrations for each athlete
        for (const athlete of householdAthletes) {
          const subProgram = faker.helpers.arrayElement(subPrograms);
          
          const { error: regError } = await supabase
            .from('registrations')
            .insert({
              athlete_id: athlete.id,
              sub_program_id: subProgram.id,
              status: 'confirmed',
              price_cents: subProgram.price_cents || 100000,
            });

          if (!regError) {
            orderTotal += subProgram.price_cents || 100000;
            clubRegistrations++;
          }
        }

        // Update order total
        await supabase
          .from('orders')
          .update({ total_amount_cents: orderTotal })
          .eq('id', order.id);

        // Create payment if paid
        if (isPaid) {
          await supabase.from('payments').insert({
            order_id: order.id,
            amount_cents: orderTotal,
            status: 'succeeded',
            stripe_payment_intent_id: `pi_loadtest_${order.id.substring(0, 16)}`,
            created_at: new Date().toISOString(),
          });
          
          clubRevenue += orderTotal;
        }

        clubOrders++;
      }

      // Progress update
      const progress = Math.min(100, ((i + config.batchSize) / householdEntries.length * 100));
      if (i % (config.batchSize * 5) === 0) {
        console.log(`    Progress: ${progress.toFixed(0)}% (${clubOrders} orders, ${clubRegistrations} registrations)`);
      }
    }

    console.log(`  ✅ Created ${clubOrders.toLocaleString()} orders`);
    console.log(`  ✅ Created ${clubRegistrations.toLocaleString()} registrations`);
    console.log(`  💵 Revenue: $${(clubRevenue / 100).toLocaleString()}`);

    totalOrders += clubOrders;
    totalRegistrations += clubRegistrations;
    totalRevenue += clubRevenue;
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  
  console.log('\n' + '═'.repeat(50));
  console.log('✅ REVENUE GENERATION COMPLETE!');
  console.log('═'.repeat(50));
  console.log(`⏱️  Duration: ${duration} minutes`);
  console.log(`📝 Total Orders: ${totalOrders.toLocaleString()}`);
  console.log(`🎫 Total Registrations: ${totalRegistrations.toLocaleString()}`);
  console.log(`💰 Total Revenue: $${(totalRevenue / 100).toLocaleString()}`);
  console.log('═'.repeat(50) + '\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
