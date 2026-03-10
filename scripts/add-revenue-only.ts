#!/usr/bin/env tsx
/**
 * Add Revenue Data Only - Fast registration/order/payment creation
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
  console.log('\n💰 Adding Revenue Data');
  console.log('═'.repeat(50));
  
  const startTime = Date.now();
  const supabase = initSupabase();

  // Get all clubs
  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name')
    .order('name');
  
  if (!clubs) return;

  console.log(`\n✅ Found ${clubs.length} clubs\n`);

  let totalOrders = 0;
  let totalRegistrations = 0;
  let totalRevenue = 0;

  for (const club of clubs) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🏢 ${club.name}`);
    console.log('='.repeat(50));

    // Get sub-programs for this club with season info
    const { data: subPrograms } = await supabase
      .from('sub_programs')
      .select('id, registration_fee, season_id, program:programs!inner(club_id, season:seasons!inner(is_current, name))')
      .eq('program.club_id', club.id);

    if (!subPrograms || subPrograms.length === 0) {
      console.log(`  ⚠️  No sub-programs found, skipping...`);
      continue;
    }

    console.log(`  📚 ${subPrograms.length} sub-programs available`);

    // Get athletes without registrations
    const { data: athletes } = await supabase
      .from('athletes')
      .select(`
        id,
        household_id,
        registrations!left(id)
      `)
      .eq('club_id', club.id);

    if (!athletes || athletes.length === 0) continue;

    const athletesNeedingRegs = athletes.filter(a => !a.registrations || a.registrations.length === 0);

    if (athletesNeedingRegs.length === 0) {
      console.log(`  ✅ All athletes already registered`);
      continue;
    }

    console.log(`  👥 ${athletesNeedingRegs.length} athletes need registrations`);

    // Register 70% of athletes
    const athletesToRegister = athletesNeedingRegs.slice(0, Math.floor(athletesNeedingRegs.length * 0.7));
    
    console.log(`  💰 Creating revenue for ${athletesToRegister.length.toLocaleString()} athletes...`);

    // Group by household
    const householdMap = new Map<string, any[]>();
    for (const athlete of athletesToRegister) {
      if (!householdMap.has(athlete.household_id)) {
        householdMap.set(athlete.household_id, []);
      }
      householdMap.get(athlete.household_id)!.push(athlete);
    }

    console.log(`  🏠 ${householdMap.size.toLocaleString()} households`);

    let clubOrders = 0;
    let clubRegistrations = 0;
    let clubRevenue = 0;

    // Create orders per household
    const households = Array.from(householdMap.entries());
    
    for (let i = 0; i < households.length; i++) {
      const [householdId, householdAthletes] = households[i];
      const isPaid = Math.random() < 0.85;

      // Calculate order total first
      let orderTotal = 0;
      const registrationsToCreate = [];

      for (const athlete of householdAthletes) {
        const subProgram = faker.helpers.arrayElement(subPrograms);
        const amountPaid = Number(subProgram.registration_fee || 1000);
        const seasonName = subProgram.program?.season?.name || '2026-2027';
        registrationsToCreate.push({
          athlete_id: athlete.id,
          sub_program_id: subProgram.id,
          season_id: subProgram.season_id,
          season: seasonName,
          club_id: club.id,
          status: 'confirmed',
          payment_status: isPaid ? 'paid' : 'unpaid',
          amount_paid: isPaid ? amountPaid.toFixed(2) : '0.00',
        });
        orderTotal += amountPaid * 100; // Convert to cents for revenue tracking
      }

      // Create order (calculate total in dollars before creating order)
      const orderTotalDollars = registrationsToCreate.reduce((sum, r) => sum + Number(r.amount_paid), 0);
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          household_id: householdId,
          club_id: club.id,
          status: isPaid ? 'paid' : 'unpaid',
          total_amount: orderTotalDollars.toFixed(2),
        })
        .select()
        .single();

      if (orderError || !order) {
        console.error(`    ❌ Order error: ${orderError?.message}`);
        continue;
      }

      // Create registrations
      const { error: regError } = await supabase
        .from('registrations')
        .insert(registrationsToCreate);

      if (regError) {
        console.error(`    ❌ Registration error: ${regError.message}`);
        continue;
      }

      // Create payment if paid
      if (isPaid) {
        await supabase.from('payments').insert({
          order_id: order.id,
          amount: orderTotalDollars.toFixed(2),
          status: 'succeeded',
          stripe_payment_intent_id: `pi_loadtest_${order.id.substring(0, 16)}`,
        });
        clubRevenue += orderTotalDollars * 100; // Track in cents
      }

      clubOrders++;
      clubRegistrations += registrationsToCreate.length;

      // Progress update
      if ((i + 1) % 500 === 0) {
        console.log(`    Progress: ${((i + 1) / households.length * 100).toFixed(0)}% (${clubOrders.toLocaleString()} orders, ${clubRegistrations.toLocaleString()} registrations)`);
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

main().catch(console.error);
