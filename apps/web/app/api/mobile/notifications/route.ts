import { NextRequest } from 'next/server'
import { SupabaseServer } from '@affiliate-factory/sdk'

// Mobile push notification system
export async function GET(request: NextRequest) {
  try {
    const supabase = await SupabaseServer.createClient()
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const type = searchParams.get('type')

    if (!user_id) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get user's tenants to fetch notifications for
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .eq('active', true)

    const tenantIds = tenants?.map(t => t.id) || []

    if (tenantIds.length === 0) {
      return Response.json({ notifications: [] })
    }

    // Get recent insights that warrant notifications
    let query = supabase
      .from('insights')
      .select('*')
      .in('tenant_id', tenantIds)
      .order('created_at', { ascending: false })
      .limit(50)

    if (type) {
      query = query.eq('type', type)
    }

    const { data: insights, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Transform insights into mobile notifications
    const notifications = insights?.map(insight => {
      let title = 'Update from your site'
      let body = insight.headline || 'New activity detected'
      let priority = 'normal'
      let category = 'general'

      switch (insight.type) {
        case 'revenue':
          title = '💰 Revenue Alert'
          body = `You earned $${insight.value}!`
          priority = 'high'
          category = 'revenue'
          break
        case 'traffic':
          title = '📈 Traffic Spike'
          body = insight.headline || 'Your site is getting more visitors'
          category = 'traffic'
          break
        case 'conversion':
          title = '🎯 New Conversion'
          body = 'Someone purchased through your affiliate link!'
          priority = 'high'
          category = 'conversion'
          break
        case 'trend':
          title = '🔥 Trending Topic'
          body = insight.headline || 'New trend detected in your niche'
          category = 'trend'
          break
        case 'content':
          title = '📝 Content Published'
          body = insight.headline || 'New content was published on your site'
          category = 'content'
          break
        case 'error':
          title = '⚠️ Site Issue'
          body = insight.headline || 'Action may be required on your site'
          priority = 'high'
          category = 'error'
          break
      }

      return {
        id: insight.id,
        title,
        body,
        category,
        priority,
        type: insight.type,
        tenant_id: insight.tenant_id,
        data: {
          value: insight.value,
          metadata: insight.metadata
        },
        created_at: insight.created_at,
        read: false // Default to unread
      }
    }) || []

    return Response.json({ notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      device_token,
      user_id,
      tenant_id,
      notification_preferences = {
        revenue: true,
        traffic: true,
        conversions: true,
        trends: true,
        content: false,
        errors: true
      }
    } = body

    // Store device token and preferences
    // In a real implementation, you'd store this in a notifications table
    const { data: notification_settings, error } = await supabase
      .from('tenant_settings')
      .upsert({
        tenant_id,
        setting_key: 'mobile_notifications',
        setting_value: {
          device_token,
          user_id,
          preferences: notification_preferences,
          enabled: true,
          registered_at: new Date().toISOString()
        }
      }, {
        onConflict: 'tenant_id,setting_key'
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ 
      message: 'Notification preferences saved',
      settings: notification_settings 
    })
  } catch (error) {
    console.error('Error saving notification preferences:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add tenant_settings table to schema if it doesn't exist
// This would typically be in a migration file