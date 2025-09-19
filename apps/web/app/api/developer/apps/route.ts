import { NextRequest } from 'next/server'
import { SupabaseServer } from '@affiliate-factory/sdk'
import { createHash, randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const supabase = await SupabaseServer.createClient()
    const { searchParams } = new URL(request.url)
    const developer_id = searchParams.get('developer_id')
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    let query = supabase
      .from('developer_apps')
      .select(`
        *,
        developer_profiles (
          id,
          name,
          company,
          website
        )
      `)
      .order('created_at', { ascending: false })

    if (developer_id) {
      query = query.eq('developer_id', developer_id)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: apps, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ apps })
  } catch (error) {
    console.error('Error fetching developer apps:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      developer_id,
      name,
      description,
      category,
      webhook_url,
      permissions = [],
      pricing_model = 'free',
      pricing_details = {}
    } = body

    // Generate API credentials
    const api_key = `ak_${randomBytes(16).toString('hex')}`
    const secret_key = `sk_${randomBytes(24).toString('hex')}`
    const webhook_secret = randomBytes(32).toString('hex')

    const { data: app, error } = await supabase
      .from('developer_apps')
      .insert({
        developer_id,
        name,
        description,
        category,
        api_key,
        secret_key_hash: createHash('sha256').update(secret_key).digest('hex'),
        webhook_url,
        webhook_secret,
        permissions,
        pricing_model,
        pricing_details,
        status: 'pending_review'
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Return app with secret key (only shown once)
    return Response.json({ 
      app: {
        ...app,
        secret_key // Only returned on creation
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating developer app:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}