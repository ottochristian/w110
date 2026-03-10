// Script to explore Supabase database structure
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://hlclvdddefuwggwtmlzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsY2x2ZGRkZWZ1d2dnd3RtbHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIyMjM2MiwiZXhwIjoyMDc4Nzk4MzYyfQ.xz5ZJrzdGUFQQg97lo_Ule0AH297t9BIO4DdIsU4Cn4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function exploreDatabase() {
  console.log('🔍 EXPLORING DATABASE STRUCTURE\n')
  console.log('=' .repeat(80))
  
  // 1. Check clubs
  const { data: clubs, error: clubsError } = await supabase
    .from('clubs')
    .select('id, name, slug')
  
  console.log('\n📍 CLUBS:')
  if (clubsError) {
    console.log('Error:', clubsError.message)
  } else {
    console.log(`Found ${clubs.length} club(s):`)
    clubs.forEach(c => console.log(`  - ${c.name} (${c.slug})`))
  }
  
  // 2. Check seasons
  const { data: seasons, error: seasonsError } = await supabase
    .from('seasons')
    .select('id, name, club_id, is_current, status, start_date, end_date')
    .order('start_date', { ascending: false })
  
  console.log('\n📅 SEASONS:')
  if (seasonsError) {
    console.log('Error:', seasonsError.message)
  } else {
    console.log(`Found ${seasons.length} season(s):`)
    seasons.forEach(s => {
      const club = clubs?.find(c => c.id === s.club_id)
      console.log(`  - ${s.name} | ${club?.name || 'Unknown'} | ${s.status} ${s.is_current ? '(CURRENT)' : ''}`)
    })
  }
  
  // 3. Check if there's a sports table
  const { data: sports, error: sportsError } = await supabase
    .from('sports')
    .select('id, name, club_id, season_id')
    .limit(10)
  
  console.log('\n⛷️  SPORTS:')
  if (sportsError) {
    console.log('No sports table or error:', sportsError.message)
  } else if (sports && sports.length > 0) {
    console.log(`Found ${sports.length} sport(s):`)
    sports.forEach(s => console.log(`  - ${s.name}`))
  } else {
    console.log('No sports found in database')
  }
  
  // 4. Check programs structure
  const { data: programs, error: programsError } = await supabase
    .from('programs')
    .select('id, name, club_id, season_id')
    .limit(10)
  
  console.log('\n🎿 PROGRAMS:')
  if (programsError) {
    console.log('Error:', programsError.message)
  } else {
    console.log(`Found ${programs.length} program(s) (showing first 10):`)
    programs.forEach(p => {
      const season = seasons?.find(s => s.id === p.season_id)
      const club = clubs?.find(c => c.id === p.club_id)
      console.log(`  - ${p.name} | ${club?.name || 'Unknown'} | ${season?.name || 'No season'}`)
    })
  }
  
  // 5. Check sub_programs
  const { data: subPrograms, error: subProgramsError } = await supabase
    .from('sub_programs')
    .select('id, name, program_id, club_id, season_id, registration_fee')
    .limit(10)
  
  console.log('\n📋 SUB-PROGRAMS:')
  if (subProgramsError) {
    console.log('Error:', subProgramsError.message)
  } else {
    console.log(`Found ${subPrograms.length} sub-program(s) (showing first 10):`)
    subPrograms.forEach(sp => {
      const program = programs?.find(p => p.id === sp.program_id)
      console.log(`  - ${sp.name} | Program: ${program?.name || 'Unknown'} | Fee: $${sp.registration_fee || 0}`)
    })
  }
  
  // 6. Check groups
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, name, sub_program_id, club_id')
    .limit(10)
  
  console.log('\n👥 GROUPS:')
  if (groupsError) {
    console.log('Error:', groupsError.message)
  } else {
    console.log(`Found ${groups.length} group(s) (showing first 10):`)
    groups.forEach(g => {
      const subProgram = subPrograms?.find(sp => sp.id === g.sub_program_id)
      console.log(`  - ${g.name} | Sub-Program: ${subProgram?.name || 'Unknown'}`)
    })
  }
  
  // 7. Check registrations
  const { data: registrations, count: regCount, error: regError } = await supabase
    .from('registrations')
    .select('id, athlete_id, sub_program_id, season_id, status, payment_status, amount_paid', { count: 'exact' })
    .limit(5)
  
  console.log('\n📝 REGISTRATIONS:')
  if (regError) {
    console.log('Error:', regError.message)
  } else {
    console.log(`Total registrations: ${regCount}`)
    console.log(`Sample (first 5):`)
    registrations?.forEach(r => {
      console.log(`  - Status: ${r.status} | Payment: ${r.payment_status} | Amount: $${r.amount_paid || 0}`)
    })
  }
  
  // 8. Check athletes
  const { data: athletes, count: athleteCount, error: athleteError } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, date_of_birth, gender', { count: 'exact' })
    .limit(1)
  
  console.log('\n🏃 ATHLETES:')
  if (athleteError) {
    console.log('Error:', athleteError.message)
  } else {
    console.log(`Total athletes: ${athleteCount}`)
  }
  
  // 9. Summary stats
  console.log('\n' + '='.repeat(80))
  console.log('📊 SUMMARY:')
  console.log(`  Clubs: ${clubs?.length || 0}`)
  console.log(`  Seasons: ${seasons?.length || 0}`)
  console.log(`  Programs: ${programs?.length || 0}`)
  console.log(`  Sub-Programs: ${subPrograms?.length || 0}`)
  console.log(`  Groups: ${groups?.length || 0}`)
  console.log(`  Athletes: ${athleteCount || 0}`)
  console.log(`  Registrations: ${regCount || 0}`)
  console.log('='.repeat(80))
}

exploreDatabase().catch(console.error)
