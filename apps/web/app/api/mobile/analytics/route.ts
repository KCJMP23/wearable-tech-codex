import { NextRequest } from 'next/server'
import { createClient } from '@affiliate-factory/sdk/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')
    const timeframe = searchParams.get('timeframe') || '7d'

    if (!tenant_id) {
      return Response.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    // Calculate date range
    const now = new Date()
    const daysAgo = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 7
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    // Get insights for the timeframe
    const { data: insights, error } = await supabase
      .from('insights')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Process insights into mobile-friendly format
    const analytics = {
      overview: {
        total_revenue: 0,
        total_clicks: 0,
        conversion_rate: 0,
        avg_order_value: 0
      },
      trends: {
        revenue: [],
        traffic: [],
        conversions: []
      },
      top_products: [],
      recent_activity: []
    }

    // Process revenue insights
    const revenueInsights = insights?.filter(i => i.type === 'revenue') || []
    analytics.overview.total_revenue = revenueInsights.reduce((sum, insight) => {
      return sum + (parseFloat(insight.value) || 0)
    }, 0)

    // Process traffic insights
    const trafficInsights = insights?.filter(i => i.type === 'traffic') || []
    analytics.overview.total_clicks = trafficInsights.reduce((sum, insight) => {
      const clicks = insight.metadata?.clicks || 0
      return sum + clicks
    }, 0)

    // Process conversion insights
    const conversionInsights = insights?.filter(i => i.type === 'conversion') || []
    const totalConversions = conversionInsights.length
    analytics.overview.conversion_rate = analytics.overview.total_clicks > 0 
      ? (totalConversions / analytics.overview.total_clicks) * 100 
      : 0

    // Calculate average order value
    analytics.overview.avg_order_value = totalConversions > 0 
      ? analytics.overview.total_revenue / totalConversions 
      : 0

    // Build trends data (group by day)
    const trendsByDate = insights?.reduce((acc, insight) => {
      const date = new Date(insight.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { revenue: 0, traffic: 0, conversions: 0 }
      }
      
      if (insight.type === 'revenue') {
        acc[date].revenue += parseFloat(insight.value) || 0
      } else if (insight.type === 'traffic') {
        acc[date].traffic += insight.metadata?.clicks || 0
      } else if (insight.type === 'conversion') {
        acc[date].conversions += 1
      }
      
      return acc
    }, {} as Record<string, { revenue: number; traffic: number; conversions: number }>)

    // Convert to arrays for charts
    analytics.trends.revenue = Object.entries(trendsByDate || {}).map(([date, data]) => ({
      date,
      value: data.revenue
    }))

    analytics.trends.traffic = Object.entries(trendsByDate || {}).map(([date, data]) => ({
      date,
      value: data.traffic
    }))

    analytics.trends.conversions = Object.entries(trendsByDate || {}).map(([date, data]) => ({
      date,
      value: data.conversions
    }))

    // Get top products
    const productInsights = insights?.filter(i => i.metadata?.product_id) || []
    const productPerformance = productInsights.reduce((acc, insight) => {
      const productId = insight.metadata.product_id
      if (!acc[productId]) {
        acc[productId] = { 
          id: productId, 
          revenue: 0, 
          clicks: 0, 
          conversions: 0,
          title: insight.metadata.product_title || 'Unknown Product'
        }
      }
      
      if (insight.type === 'revenue') {
        acc[productId].revenue += parseFloat(insight.value) || 0
      } else if (insight.type === 'traffic') {
        acc[productId].clicks += insight.metadata?.clicks || 0
      } else if (insight.type === 'conversion') {
        acc[productId].conversions += 1
      }
      
      return acc
    }, {} as Record<string, any>)

    analytics.top_products = Object.values(productPerformance)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5)

    // Recent activity
    analytics.recent_activity = insights?.slice(0, 10).map(insight => ({
      id: insight.id,
      type: insight.type,
      headline: insight.headline,
      value: insight.value,
      timestamp: insight.created_at
    })) || []

    return Response.json({ analytics })
  } catch (error) {
    console.error('Error fetching mobile analytics:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}