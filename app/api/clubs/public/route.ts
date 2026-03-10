import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const id = searchParams.get('id')
  const supabase = createSupabaseAdminClient()

  const baseQuery = supabase.from('clubs').select('id, name, slug, logo_url, primary_color')
  const query = slug
    ? baseQuery.eq('slug', slug).single()
    : id
      ? baseQuery.eq('id', id).single()
      : baseQuery.order('name', { ascending: true })

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: slug || id ? 404 : 500 })
  }

  // Return single club if slug/id provided, else list
  if (slug || id) {
    return NextResponse.json({ club: data ?? null })
  }

  return NextResponse.json({ clubs: (data as any[]) ?? [] })
}

