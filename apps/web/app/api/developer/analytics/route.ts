import { NextRequest } from 'next/server'
import { SupabaseServer } from '@affiliate-factory/sdk'

export async function GET(request: NextRequest) {
  try {
    const supabase = await SupabaseServer.createClient()
    const { searchParams } = new URL(request.url)
    const app_id = searchParams.get('app_id')
    const timeframe = searchParams.get('timeframe') || '7d'

    if (!app_id) {
      return Response.json({ error: 'App ID required' }, { status: 400 })
    }

    // Calculate date range
    const now = new Date()
    const daysAgo = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 7
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    // Get app info
    const { data: app, error: appError } = await supabase
      .from('developer_apps')
      .select(`
        *,
        developer_profiles (
          name,
          company
        )
      `)
      .eq('id', app_id)
      .single()

    if (appError || !app) {
      return Response.json({ error: 'App not found' }, { status: 404 })
    }

    // Get API usage logs
    const { data: usageLogs, error: usageError } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('app_id', app_id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (usageError) {
      return Response.json({ error: usageError.message }, { status: 500 })
    }

    // Get installations
    const { data: installations, error: installError } = await supabase
      .from('app_installations')
      .select(`
        *,
        tenants (
          id,
          name,
          slug
        )
      `)
      .eq('app_id', app_id)

    if (installError) {
      return Response.json({ error: installError.message }, { status: 500 })
    }

    // Process analytics
    const analytics = {
      app: {
        id: app.id,
        name: app.name,
        installs_count: app.installs_count,
        rating: app.rating,
        rating_count: app.rating_count,
        developer: app.developer_profiles
      },
      usage: {
        total_requests: usageLogs?.length || 0,
        success_rate: 0,
        avg_response_time: 0,
        error_rate: 0
      },
      installations: {
        total: installations?.length || 0,
        active: installations?.filter(i => i.status === 'active').length || 0,
        suspended: installations?.filter(i => i.status === 'suspended').length || 0
      },
      trends: {
        requests_by_day: [],
        errors_by_day: [],
        installs_by_day: []
      },
      top_endpoints: [],
      top_tenants: []
    }

    if (usageLogs && usageLogs.length > 0) {
      // Calculate success rate
      const successfulRequests = usageLogs.filter(log => log.status_code >= 200 && log.status_code < 400)
      analytics.usage.success_rate = (successfulRequests.length / usageLogs.length) * 100

      // Calculate average response time
      const responseTimes = usageLogs.filter(log => log.response_time_ms).map(log => log.response_time_ms)
      analytics.usage.avg_response_time = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0

      // Calculate error rate
      const errorRequests = usageLogs.filter(log => log.status_code >= 400)
      analytics.usage.error_rate = (errorRequests.length / usageLogs.length) * 100

      // Group by day for trends
      const requestsByDay = usageLogs.reduce((acc, log) => {
        const date = new Date(log.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      analytics.trends.requests_by_day = Object.entries(requestsByDay).map(([date, count]) => ({
        date,
        count
      }))

      const errorsByDay = errorRequests.reduce((acc, log) => {
        const date = new Date(log.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      analytics.trends.errors_by_day = Object.entries(errorsByDay).map(([date, count]) => ({
        date,
        count
      }))

      // Top endpoints
      const endpointCounts = usageLogs.reduce((acc, log) => {
        const endpoint = `${log.method} ${log.endpoint}`
        acc[endpoint] = (acc[endpoint] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      analytics.top_endpoints = Object.entries(endpointCounts)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Top tenants by usage
      const tenantCounts = usageLogs.reduce((acc, log) => {
        if (log.tenant_id) {
          acc[log.tenant_id] = (acc[log.tenant_id] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      analytics.top_tenants = Object.entries(tenantCounts)
        .map(([tenant_id, count]) => {
          const installation = installations?.find(i => i.tenant_id === tenant_id)
          return {
            tenant_id,
            tenant_name: installation?.tenants?.name || 'Unknown',
            request_count: count
          }
        })
        .sort((a, b) => b.request_count - a.request_count)
        .slice(0, 10)
    }

    return Response.json({ analytics })
  } catch (error) {
    console.error('Error fetching developer analytics:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}