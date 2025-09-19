import { NextRequest } from 'next/server'
import { createClient } from '@affiliate-factory/sdk/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tier = searchParams.get('tier')

    let query = supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (tier) {
      query = query.eq('tier', tier)
    }

    const { data: brands, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ brands })
  } catch (error) {
    console.error('Error fetching brands:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      name,
      description,
      logo_url,
      website_url,
      commission_rate,
      exclusive_rate,
      contact_email,
      api_endpoint,
      tier = 'standard'
    } = body

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const { data: brand, error } = await supabase
      .from('brands')
      .insert({
        name,
        slug,
        description,
        logo_url,
        website_url,
        commission_rate,
        exclusive_rate,
        contact_email,
        api_endpoint,
        tier,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ brand }, { status: 201 })
  } catch (error) {
    console.error('Error creating brand:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}