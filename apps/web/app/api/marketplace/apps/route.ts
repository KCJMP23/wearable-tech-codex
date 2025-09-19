import { NextRequest } from 'next/server'
import { createClient } from '@affiliate-factory/sdk/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'popular'

    let query = supabase
      .from('developer_apps')
      .select(`
        *,
        developer_profiles (
          id,
          name,
          company,
          verified
        )
      `)
      .eq('status', 'approved')

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Sort options
    switch (sort) {
      case 'popular':
        query = query.order('installs_count', { ascending: false })
        break
      case 'rating':
        query = query.order('rating', { ascending: false })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'name':
        query = query.order('name', { ascending: true })
        break
      default:
        query = query.order('installs_count', { ascending: false })
    }

    const { data: apps, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Get categories for filtering
    const { data: categories } = await supabase
      .from('developer_apps')
      .select('category')
      .eq('status', 'approved')
      .not('category', 'is', null)

    const uniqueCategories = [...new Set(categories?.map(c => c.category))].sort()

    return Response.json({ 
      apps,
      categories: uniqueCategories,
      total: apps?.length || 0
    })
  } catch (error) {
    console.error('Error fetching marketplace apps:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Install an app to a tenant
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      tenant_id,
      app_id,
      config = {}
    } = body

    // Check if app exists and is approved
    const { data: app, error: appError } = await supabase
      .from('developer_apps')
      .select('*')
      .eq('id', app_id)
      .eq('status', 'approved')
      .single()

    if (appError || !app) {
      return Response.json({ error: 'App not found or not approved' }, { status: 404 })
    }

    // Check if already installed
    const { data: existing } = await supabase
      .from('app_installations')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('app_id', app_id)
      .single()

    if (existing) {
      return Response.json({ error: 'App already installed' }, { status: 409 })
    }

    // Install the app
    const { data: installation, error } = await supabase
      .from('app_installations')
      .insert({
        tenant_id,
        app_id,
        config,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Increment install count
    await supabase
      .from('developer_apps')
      .update({ 
        installs_count: app.installs_count + 1 
      })
      .eq('id', app_id)

    // Trigger webhook for app installation
    const webhookPayload = {
      installation_id: installation.id,
      tenant_id,
      app_id,
      config
    }

    // Here you would trigger the webhook system
    // triggerWebhook(tenant_id, 'app.installed', webhookPayload)

    return Response.json({ installation }, { status: 201 })
  } catch (error) {
    console.error('Error installing app:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}