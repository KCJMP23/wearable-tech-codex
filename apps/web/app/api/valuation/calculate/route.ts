import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { SiteValuationCalculator } from '@/lib/valuation';
import type { SiteMetrics } from '@/lib/valuation';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get tenant from request or session
    const body = await request.json();
    const { tenantId, saveToHistory = false } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    // Verify user has access to this tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found or access denied' },
        { status: 403 }
      );
    }

    // Fetch comprehensive metrics from multiple sources
    const metrics = await fetchSiteMetrics(supabase, tenantId);
    
    // Calculate valuation
    const valuation = SiteValuationCalculator.calculate(metrics);
    
    // Find comparable sites
    const { data: comparables } = await supabase.rpc(
      'find_comparable_sites',
      {
        p_monthly_revenue: metrics.monthly_revenue,
        p_monthly_pageviews: metrics.monthly_visitors,
        p_niche: tenant.category || 'general',
        p_limit: 5
      }
    );

    if (comparables && comparables.length > 0) {
      valuation.comparables = comparables.map((comp: any) => ({
        site: comp.domain,
        niche: comp.niche,
        sold_price: comp.sale_price,
        multiple: comp.revenue_multiple,
        date: comp.sale_date,
      }));
    }

    // Save to history if requested
    if (saveToHistory) {
      const { error: insertError } = await supabase
        .from('site_valuations')
        .insert({
          tenant_id: tenantId,
          metrics: {
            monthlyRevenue: metrics.monthly_revenue,
            yearlyRevenue: metrics.monthly_revenue * 12,
            revenueGrowthRate: 0, // Will be calculated from historical data
            revenueConsistency: 0.8, // Default value
            monthlyPageviews: metrics.monthly_visitors,
            uniqueVisitors: Math.floor(metrics.monthly_visitors * 0.6),
            averageSessionDuration: 180,
            bounceRate: 0.45,
            conversionRate: metrics.conversion_rate,
            totalPosts: metrics.content_count.posts,
            publishingFrequency: 4, // posts per week
            averageWordCount: 1500,
            contentQualityScore: 0.75,
            domainAuthority: metrics.domain_authority,
            backlinks: metrics.seo_metrics.backlinks,
            rankingKeywords: metrics.seo_metrics.ranking_keywords,
            organicTrafficPercentage: metrics.seo_metrics.organic_traffic_percentage,
            pagespeedScore: 85,
            uptimePercentage: 99.9,
            mobileOptimization: 0.9,
            operatingExpenses: metrics.monthly_revenue * 0.3,
            timeInvestment: 20, // hours per week
            dependencyRisk: 0.3,
            diversificationScore: 0.7
          },
          result: {
            totalValuation: {
              low: valuation.value_range.low,
              mid: valuation.value_range.mid,
              high: valuation.value_range.high,
              confidence: getConfidenceLevel(valuation.confidence_score)
            },
            methodBreakdown: {
              revenue_multiple: {
                low: valuation.value_range.low,
                mid: valuation.value_range.mid,
                high: valuation.value_range.high,
                confidence: getConfidenceLevel(valuation.confidence_score)
              },
              asset_based: {
                low: valuation.value_range.low * 0.8,
                mid: valuation.value_range.mid * 0.8,
                high: valuation.value_range.high * 0.8,
                confidence: getConfidenceLevel(valuation.confidence_score * 0.9)
              },
              traffic_based: {
                low: metrics.monthly_visitors * 12 * 0.3,
                mid: metrics.monthly_visitors * 12 * 0.5,
                high: metrics.monthly_visitors * 12 * 0.7,
                confidence: getConfidenceLevel(valuation.confidence_score * 0.85)
              },
              comparable: {
                low: valuation.value_range.low,
                mid: valuation.value_range.mid,
                high: valuation.value_range.high,
                confidence: getConfidenceLevel(valuation.confidence_score)
              }
            },
            confidence: getConfidenceLevel(valuation.confidence_score),
            factors: {
              positive: valuation.breakdown.adjustments
                .filter(adj => adj.impact > 0)
                .map(adj => adj.reason),
              negative: valuation.breakdown.adjustments
                .filter(adj => adj.impact < 0)
                .map(adj => adj.reason),
              recommendations: valuation.exit_readiness.recommendations
            },
            comparables: valuation.comparables || [],
            lastCalculatedAt: new Date().toISOString()
          },
          calculation_method: 'comprehensive'
        });

      if (insertError) {
        console.error('Failed to save valuation to history:', insertError);
        // Don't fail the request if history save fails
      }
    }

    return NextResponse.json({
      success: true,
      valuation,
      tenant: {
        name: tenant.name,
        domain: tenant.domain,
        category: tenant.category
      },
      calculatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Valuation calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate valuation' },
      { status: 500 }
    );
  }
}

async function fetchSiteMetrics(supabase: any, tenantId: string): Promise<SiteMetrics> {
  // Fetch revenue data from affiliate networks
  const { data: revenueData } = await supabase
    .from('affiliate_revenue')
    .select('network, amount')
    .eq('tenant_id', tenantId)
    .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('date', { ascending: false });

  const monthlyRevenue = revenueData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
  
  // Calculate revenue sources distribution
  const revenueSources = {
    amazon: 0,
    shareAsale: 0,
    cj_affiliate: 0,
    other: 0
  };

  if (revenueData) {
    const total = revenueData.reduce((sum, item) => sum + item.amount, 0);
    revenueData.forEach(item => {
      const network = item.network.toLowerCase();
      const percentage = (item.amount / total) * 100;
      
      if (network.includes('amazon')) {
        revenueSources.amazon += percentage;
      } else if (network.includes('shareasale')) {
        revenueSources.shareAsale += percentage;
      } else if (network.includes('cj') || network.includes('commission')) {
        revenueSources.cj_affiliate += percentage;
      } else {
        revenueSources.other += percentage;
      }
    });
  }

  // Fetch traffic data from insights
  const { data: trafficData } = await supabase
    .from('insights')
    .select('kpi, value')
    .eq('tenant_id', tenantId)
    .in('kpi', ['unique_visitors', 'page_views', 'bounce_rate', 'session_duration'])
    .gte('computed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const monthlyVisitors = trafficData?.find(d => d.kpi === 'unique_visitors')?.value || 10000;
  const conversionRate = monthlyRevenue > 0 ? (monthlyRevenue / (monthlyVisitors * 50)) * 100 : 2.5;

  // Fetch content data
  const { data: contentData } = await supabase
    .from('posts')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('status', 'published');

  const { data: productsData } = await supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Fetch email subscribers
  const { data: subscribersData } = await supabase
    .from('email_contacts')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  // Fetch social followers (mock data for now - would integrate with social APIs)
  const socialFollowers = {
    facebook: Math.floor(Math.random() * 5000) + 1000,
    twitter: Math.floor(Math.random() * 3000) + 500,
    instagram: Math.floor(Math.random() * 8000) + 2000,
    youtube: Math.floor(Math.random() * 2000) + 100
  };

  // Fetch tenant details for site age
  const { data: tenantDetails } = await supabase
    .from('tenants')
    .select('created_at')
    .eq('id', tenantId)
    .single();

  const siteAgeMonths = tenantDetails?.created_at 
    ? Math.floor((Date.now() - new Date(tenantDetails.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : 12;

  return {
    monthly_revenue: monthlyRevenue || 1000,
    monthly_visitors: monthlyVisitors || 10000,
    conversion_rate: conversionRate || 2.5,
    email_subscribers: subscribersData?.count || 0,
    domain_authority: Math.floor(Math.random() * 30) + 20, // Mock DA - would integrate with MOZ/Ahrefs API
    site_age_months: siteAgeMonths,
    revenue_sources: revenueSources,
    content_count: {
      posts: contentData?.count || 0,
      products: productsData?.count || 0,
      pages: 10 // Default static pages
    },
    social_followers: socialFollowers,
    seo_metrics: {
      organic_traffic_percentage: 65 + Math.random() * 20,
      backlinks: Math.floor(Math.random() * 1000) + 200,
      ranking_keywords: Math.floor(Math.random() * 500) + 100
    }
  };
}

function getConfidenceLevel(score: number): string {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    // Fetch valuation history
    const { data: history, error } = await supabase
      .from('site_valuations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    // Fetch valuation trends
    const { data: trends } = await supabase.rpc(
      'get_valuation_trends',
      {
        p_tenant_id: tenantId,
        p_months: 12
      }
    );

    return NextResponse.json({
      success: true,
      history: history || [],
      trends: trends || []
    });

  } catch (error) {
    console.error('Failed to fetch valuation history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch valuation history' },
      { status: 500 }
    );
  }
}