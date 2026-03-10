// Test script to verify analytics API endpoints work
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://hlclvdddefuwggwtmlzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsY2x2ZGRkZWZ1d2dnd3RtbHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIyMjM2MiwiZXhwIjoyMDc4Nzk4MzYyfQ.xz5ZJrzdGUFQQg97lo_Ule0AH297t9BIO4DdIsU4Cn4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAnalyticsData() {
  console.log('🧪 TESTING ANALYTICS DATA AVAILABILITY\n')
  console.log('=' .repeat(80))
  
  try {
    // 1. Get a current season
    console.log('\n1️⃣ Fetching current season...')
    const { data: seasons, error: seasonError } = await supabase
      .from('seasons')
      .select('id, name, club_id, is_current, status')
      .eq('is_current', true)
      .limit(1)
    
    if (seasonError) throw seasonError
    
    if (!seasons || seasons.length === 0) {
      console.log('❌ No current season found. You need at least one season marked as is_current.')
      return
    }
    
    const season = seasons[0]
    const clubId = season.club_id
    
    console.log(`✅ Found season: ${season.name} (${season.id})`)
    console.log(`   Club ID: ${clubId}`)
    
    // 2. Count registrations for this season
    console.log('\n2️⃣ Counting registrations...')
    const { count: regCount, error: regError } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', season.id)
      .eq('club_id', clubId)
    
    if (regError) throw regError
    
    console.log(`✅ Found ${regCount} registrations`)
    
    if (regCount === 0) {
      console.log('⚠️  No registrations exist. Analytics will show empty charts.')
      console.log('   Create some test registrations via the parent portal.')
    }
    
    // 3. Get a sample registration with joins
    console.log('\n3️⃣ Testing data relationships...')
    const { data: sampleReg, error: sampleError } = await supabase
      .from('registrations')
      .select(`
        id,
        status,
        payment_status,
        amount_paid,
        athletes(id, first_name, last_name, date_of_birth, gender),
        sub_programs(id, name, program_id, programs(id, name))
      `)
      .eq('season_id', season.id)
      .eq('club_id', clubId)
      .limit(1)
    
    if (sampleError) throw sampleError
    
    if (sampleReg && sampleReg.length > 0) {
      const reg = sampleReg[0]
      console.log('✅ Data relationships working:')
      console.log(`   Athlete: ${reg.athletes?.first_name} ${reg.athletes?.last_name}`)
      console.log(`   Program: ${reg.sub_programs?.programs?.name}`)
      console.log(`   Sub-Program: ${reg.sub_programs?.name}`)
      console.log(`   Status: ${reg.status}`)
      console.log(`   Payment: ${reg.payment_status} ($${reg.amount_paid || 0})`)
    }
    
    // 4. Get programs for this season/club
    console.log('\n4️⃣ Checking programs...')
    const { data: programs, error: progError } = await supabase
      .from('programs')
      .select('id, name')
      .eq('season_id', season.id)
      .eq('club_id', clubId)
    
    if (progError) throw progError
    
    console.log(`✅ Found ${programs?.length || 0} programs:`)
    programs?.slice(0, 5).forEach(p => console.log(`   - ${p.name}`))
    if (programs && programs.length > 5) {
      console.log(`   ... and ${programs.length - 5} more`)
    }
    
    // 5. Count athletes
    console.log('\n5️⃣ Counting athletes...')
    const { count: athleteCount, error: athleteError } = await supabase
      .from('athletes')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
    
    if (athleteError) throw athleteError
    
    console.log(`✅ Found ${athleteCount} athletes`)
    
    // 6. Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 ANALYTICS READINESS CHECK:')
    console.log('')
    
    if (regCount && regCount > 0) {
      console.log('✅ READY: You have data to visualize!')
      console.log('')
      console.log('   Navigate to: http://localhost:3000/clubs/{your-club-slug}/admin/analytics')
      console.log('')
      console.log(`   Expected to see:`)
      console.log(`   - ${regCount} registrations`)
      console.log(`   - ${programs?.length || 0} programs`)
      console.log(`   - ${athleteCount} athletes`)
      console.log(`   - Revenue metrics`)
      console.log(`   - Status breakdown`)
    } else {
      console.log('⚠️  NOT READY: No registration data exists')
      console.log('')
      console.log('   Next steps:')
      console.log('   1. Log in as a parent')
      console.log('   2. Add an athlete')
      console.log('   3. Register for a program')
      console.log('   4. Complete checkout')
      console.log('   5. Return to analytics page')
    }
    
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error('   Check your Supabase connection and RLS policies')
  }
}

testAnalyticsData()
