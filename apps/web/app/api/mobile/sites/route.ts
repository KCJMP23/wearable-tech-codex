import { NextRequest } from 'next/server'
import { SupabaseServer } from '@affiliate-factory/sdk'

export async function GET(request: NextRequest) {
  try {
    const supabase = await SupabaseServer.createClient()
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get user's tenants with performance metrics
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        domain,
        amazon_tag,
        active,
        config,
        created_at,
        updated_at
      `)
      .eq('active', true)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Get performance metrics for each tenant
    const enrichedTenants = await Promise.all(
      tenants.map(async (tenant) => {
        // Get recent insights
        const { data: insights } = await supabase
          .from('insights')
          .select('type, value, metadata, created_at')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // Get content stats
        const { count: postsCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('status', 'published')

        // Get products stats
        const { count: productsCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)

        return {
          ...tenant,
          stats: {
            posts_count: postsCount || 0,
            products_count: productsCount || 0,
            recent_insights: insights || []
          }
        }
      })
    )

    return Response.json({ sites: enrichedTenants })
  } catch (error) {
    console.error('Error fetching mobile sites:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      name,
      niche,
      automation_level = 'full',
      target_audience,
      content_frequency = 'daily'
    } = body

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const config = {
      niche,
      automation_level,
      target_audience,
      content_frequency,
      mobile_created: true,
      creation_source: 'mobile_app'
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        name,
        slug,
        domain: `${slug}.wearabletech.ai`,
        config,
        active: true
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Schedule initial setup tasks
    const setupTasks = [
      {
        tenant_id: tenant.id,
        type: 'setup_theme',
        input: { niche, automation_level },
        scheduled_for: new Date().toISOString()
      },
      {
        tenant_id: tenant.id,
        type: 'import_initial_products',
        input: { niche, limit: 50 },
        scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      },
      {
        tenant_id: tenant.id,
        type: 'generate_initial_content',
        input: { content_frequency, posts_count: 5 },
        scheduled_for: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      }
    ]

    await supabase.from('agent_tasks').insert(setupTasks)

    return Response.json({ site: tenant }, { status: 201 })
  } catch (error) {
    console.error('Error creating mobile site:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}