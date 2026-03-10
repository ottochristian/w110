#!/usr/bin/env tsx
/**
 * Create Programs/Sub-Programs/Groups for All Clubs
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
  console.log('\n🏂 Creating Programs for All Clubs');
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

  let totalPrograms = 0;
  let totalSubPrograms = 0;
  let totalGroups = 0;

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

    if (!seasons || seasons.length === 0) {
      console.log(`  ⚠️  No seasons found, skipping...`);
      continue;
    }

    console.log(`  📅 ${seasons.length} seasons found`);

    // For each season, create programs
    for (const season of seasons) {
      // Check if programs already exist for this season
      const { data: existingPrograms, count } = await supabase
        .from('programs')
        .select('id', { count: 'exact', head: false })
        .eq('season_id', season.id);

      if (existingPrograms && existingPrograms.length > 0) {
        console.log(`  ✓ ${season.name}: ${existingPrograms.length} programs already exist`);
        continue;
      }

      console.log(`  🏂 Creating programs for ${season.name}...`);
      
      const programTypes = ['Alpine Skiing', 'Nordic Skiing', 'Freestyle', 'Snowboarding', 'Racing'];
      const programCount = season.is_current ? 5 : 3;

      for (let i = 0; i < programCount; i++) {
        const programName = programTypes[i % programTypes.length];
        
        const { data: program, error: programError } = await supabase
          .from('programs')
          .insert({
            club_id: club.id,
            season_id: season.id,
            name: programName,
            status: season.is_current ? 'ACTIVE' : 'INACTIVE',
          })
          .select()
          .single();

        if (programError || !program) {
          console.error(`    ❌ Error creating program: ${programError?.message}`);
          continue;
        }

        totalPrograms++;
        
        // Create sub-programs
        const levels = ['Beginner', 'Intermediate', 'Advanced'];
        for (const level of levels) {
          const { data: subProgram, error: subError } = await supabase
            .from('sub_programs')
            .insert({
              club_id: club.id,
              season_id: season.id,
              program_id: program.id,
              name: `${program.name} - ${level}`,
              max_capacity: 30,
              registration_fee: faker.number.int({ min: 500, max: 2000 }),
              is_active: true,
              status: 'ACTIVE',
            })
            .select()
            .single();

          if (subError || !subProgram) {
            console.error(`      ❌ Error creating sub-program: ${subError?.message}`);
            continue;
          }

          totalSubPrograms++;
        }
      }
    }

    console.log(`  ✅ Done with ${club.name}`);
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  
  console.log('\n' + '═'.repeat(50));
  console.log('✅ PROGRAM CREATION COMPLETE!');
  console.log('═'.repeat(50));
  console.log(`⏱️  Duration: ${duration} minutes`);
  console.log(`🏂 Total Programs: ${totalPrograms}`);
  console.log(`📚 Total Sub-Programs: ${totalSubPrograms}`);
  console.log(`👥 Total Groups: ${totalGroups}`);
  console.log('═'.repeat(50) + '\n');
}

main().catch(console.error);
