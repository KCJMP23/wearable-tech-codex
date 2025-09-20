import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { SiteMetrics, ValuationResult } from '@/lib/valuation';
import { SiteValuationCalculator } from '@/lib/valuation';

export class ValuationService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(supabaseClient: ReturnType<typeof createClient<Database>>) {
    this.supabase = supabaseClient;
  }

  /**
   * Fetch comprehensive site metrics from various data sources
   */
  async fetchComprehensiveMetrics(tenantId: string): Promise<SiteMetrics> {
    const [
      revenueData,
      trafficData,
      contentData,
      emailData,
      seoData,
      tenantData
    ] = await Promise.all([
      this.fetchRevenueMetrics(tenantId),
      this.fetchTrafficMetrics(tenantId),
      this.fetchContentMetrics(tenantId),
      this.fetchEmailMetrics(tenantId),
      this.fetchSEOMetrics(tenantId),
      this.fetchTenantData(tenantId)
    ]);

    return {
      monthly_revenue: revenueData.monthly_revenue,
      monthly_visitors: trafficData.monthly_visitors,
      conversion_rate: this.calculateConversionRate(revenueData, trafficData),
      email_subscribers: emailData.subscriber_count,
      domain_authority: seoData.domain_authority,
      site_age_months: this.calculateSiteAge(tenantData.created_at),
      revenue_sources: revenueData.sources,
      content_count: contentData,
      social_followers: await this.fetchSocialMetrics(tenantId),
      seo_metrics: seoData.metrics
    };
  }

  /**
   * Fetch revenue metrics from affiliate networks
   */
  private async fetchRevenueMetrics(tenantId: string) {
    // Fetch last 30 days of revenue
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get revenue from affiliate_revenue table
    const { data: revenueData, error } = await this.supabase
      .from('affiliate_revenue')
      .select('network, amount, date')
      .eq('tenant_id', tenantId)
      .gte('date', thirtyDaysAgo.toISOString())
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching revenue data:', error);
      return {
        monthly_revenue: 0,
        sources: {
          amazon: 0,
          shareAsale: 0,
          cj_affiliate: 0,
          other: 0
        }
      };
    }

    // Calculate total and breakdown
    const totalRevenue = revenueData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    
    const sources = {
      amazon: 0,
      shareAsale: 0,
      cj_affiliate: 0,
      other: 0
    };

    if (revenueData && totalRevenue > 0) {
      revenueData.forEach(item => {
        const network = item.network.toLowerCase();
        const percentage = (item.amount / totalRevenue) * 100;
        
        if (network.includes('amazon')) {
          sources.amazon += percentage;
        } else if (network.includes('shareasale')) {
          sources.shareAsale += percentage;
        } else if (network.includes('cj') || network.includes('commission')) {
          sources.cj_affiliate += percentage;
        } else {
          sources.other += percentage;
        }
      });
    }

    return {
      monthly_revenue: totalRevenue,
      sources
    };
  }

  /**
   * Fetch traffic metrics from analytics
   */
  private async fetchTrafficMetrics(tenantId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch from insights table
    const { data: insightsData } = await this.supabase
      .from('insights')
      .select('kpi, value')
      .eq('tenant_id', tenantId)
      .in('kpi', ['unique_visitors', 'page_views', 'bounce_rate', 'session_duration', 'organic_traffic_percentage'])
      .gte('computed_at', thirtyDaysAgo.toISOString());

    const metrics = {
      monthly_visitors: 10000, // default
      page_views: 30000,
      bounce_rate: 0.45,
      session_duration: 180,
      organic_percentage: 0.65
    };

    if (insightsData) {
      insightsData.forEach(insight => {
        switch(insight.kpi) {
          case 'unique_visitors':
            metrics.monthly_visitors = insight.value;
            break;
          case 'page_views':
            metrics.page_views = insight.value;
            break;
          case 'bounce_rate':
            metrics.bounce_rate = insight.value;
            break;
          case 'session_duration':
            metrics.session_duration = insight.value;
            break;
          case 'organic_traffic_percentage':
            metrics.organic_percentage = insight.value;
            break;
        }
      });
    }

    return metrics;
  }

  /**
   * Fetch content metrics
   */
  private async fetchContentMetrics(tenantId: string) {
    const [posts, products, pages] = await Promise.all([
      this.supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'published'),
      
      this.supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      
      this.supabase
        .from('pages')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'published')
    ]);

    return {
      posts: posts.count || 0,
      products: products.count || 0,
      pages: pages.count || 10 // Default for static pages
    };
  }

  /**
   * Fetch email metrics
   */
  private async fetchEmailMetrics(tenantId: string) {
    const { data, count } = await this.supabase
      .from('email_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    return {
      subscriber_count: count || 0
    };
  }

  /**
   * Fetch SEO metrics (would integrate with external APIs in production)
   */
  private async fetchSEOMetrics(tenantId: string) {
    // In production, this would call Moz, Ahrefs, or SEMrush APIs
    // For now, we'll use estimated values based on site age and content
    
    const { data: tenant } = await this.supabase
      .from('tenants')
      .select('created_at, domain')
      .eq('id', tenantId)
      .single();

    const siteAge = this.calculateSiteAge(tenant?.created_at || new Date().toISOString());
    
    // Estimate DA based on site age
    const estimatedDA = Math.min(50, 15 + (siteAge * 1.5));
    
    // Estimate backlinks and keywords
    const estimatedBacklinks = Math.floor(100 + (siteAge * 50) + Math.random() * 500);
    const estimatedKeywords = Math.floor(50 + (siteAge * 25) + Math.random() * 200);

    return {
      domain_authority: estimatedDA,
      metrics: {
        organic_traffic_percentage: 0.65 + (Math.random() * 0.2),
        backlinks: estimatedBacklinks,
        ranking_keywords: estimatedKeywords
      }
    };
  }

  /**
   * Fetch social media metrics (would integrate with social APIs in production)
   */
  private async fetchSocialMetrics(tenantId: string) {
    // In production, this would call social media APIs
    // For now, return estimated values
    return {
      facebook: Math.floor(Math.random() * 5000) + 1000,
      twitter: Math.floor(Math.random() * 3000) + 500,
      instagram: Math.floor(Math.random() * 8000) + 2000,
      youtube: Math.floor(Math.random() * 2000) + 100
    };
  }

  /**
   * Fetch tenant data
   */
  private async fetchTenantData(tenantId: string) {
    const { data } = await this.supabase
      .from('tenants')
      .select('created_at, name, domain, category')
      .eq('id', tenantId)
      .single();

    return data || { created_at: new Date().toISOString() };
  }

  /**
   * Calculate conversion rate
   */
  private calculateConversionRate(revenueData: any, trafficData: any): number {
    if (trafficData.monthly_visitors === 0) return 2.5; // Default
    
    // Estimate based on typical affiliate conversion rates
    const estimatedOrderValue = 50; // Average order value
    const estimatedCommission = 0.05; // 5% commission rate
    const estimatedOrders = revenueData.monthly_revenue / (estimatedOrderValue * estimatedCommission);
    
    return Math.min(10, (estimatedOrders / trafficData.monthly_visitors) * 100);
  }

  /**
   * Calculate site age in months
   */
  private calculateSiteAge(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const months = (now.getFullYear() - created.getFullYear()) * 12 + 
                   (now.getMonth() - created.getMonth());
    return Math.max(1, months);
  }

  /**
   * Save valuation to history
   */
  async saveValuation(
    tenantId: string, 
    metrics: SiteMetrics, 
    result: ValuationResult
  ): Promise<void> {
    const valuationRecord = {
      tenant_id: tenantId,
      metrics: this.formatMetricsForDB(metrics),
      result: this.formatResultForDB(result),
      calculation_method: 'comprehensive' as const,
      created_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('site_valuations')
      .insert(valuationRecord);

    if (error) {
      console.error('Failed to save valuation:', error);
      throw new Error('Failed to save valuation to history');
    }
  }

  /**
   * Format metrics for database storage
   */
  private formatMetricsForDB(metrics: SiteMetrics) {
    return {
      monthlyRevenue: metrics.monthly_revenue,
      yearlyRevenue: metrics.monthly_revenue * 12,
      revenueGrowthRate: 0, // Calculate from historical data
      revenueConsistency: 0.8,
      monthlyPageviews: metrics.monthly_visitors,
      uniqueVisitors: Math.floor(metrics.monthly_visitors * 0.6),
      averageSessionDuration: 180,
      bounceRate: 0.45,
      conversionRate: metrics.conversion_rate / 100,
      totalPosts: metrics.content_count.posts,
      publishingFrequency: 4,
      averageWordCount: 1500,
      contentQualityScore: 0.75,
      domainAuthority: metrics.domain_authority,
      backlinks: metrics.seo_metrics.backlinks,
      rankingKeywords: metrics.seo_metrics.ranking_keywords,
      organicTrafficPercentage: metrics.seo_metrics.organic_traffic_percentage / 100,
      pagespeedScore: 85,
      uptimePercentage: 0.999,
      mobileOptimization: 0.9,
      operatingExpenses: metrics.monthly_revenue * 0.3,
      timeInvestment: 20,
      dependencyRisk: 0.3,
      diversificationScore: 0.7
    };
  }

  /**
   * Format result for database storage
   */
  private formatResultForDB(result: ValuationResult) {
    return {
      totalValuation: {
        low: result.value_range.low,
        mid: result.value_range.mid,
        high: result.value_range.high,
        confidence: this.getConfidenceLevel(result.confidence_score)
      },
      methodBreakdown: {
        revenue_multiple: {
          low: result.value_range.low,
          mid: result.value_range.mid,
          high: result.value_range.high,
          confidence: this.getConfidenceLevel(result.confidence_score)
        },
        asset_based: {
          low: result.value_range.low * 0.8,
          mid: result.value_range.mid * 0.8,
          high: result.value_range.high * 0.8,
          confidence: this.getConfidenceLevel(result.confidence_score * 0.9)
        },
        traffic_based: {
          low: result.value_range.low * 0.6,
          mid: result.value_range.mid * 0.6,
          high: result.value_range.high * 0.6,
          confidence: this.getConfidenceLevel(result.confidence_score * 0.85)
        },
        comparable: {
          low: result.value_range.low,
          mid: result.value_range.mid,
          high: result.value_range.high,
          confidence: this.getConfidenceLevel(result.confidence_score)
        }
      },
      confidence: this.getConfidenceLevel(result.confidence_score),
      factors: {
        positive: result.breakdown.adjustments
          .filter(adj => adj.impact > 0)
          .map(adj => adj.reason),
        negative: result.breakdown.adjustments
          .filter(adj => adj.impact < 0)
          .map(adj => adj.reason),
        recommendations: result.exit_readiness.recommendations
      },
      comparables: result.comparables || [],
      lastCalculatedAt: new Date().toISOString()
    };
  }

  /**
   * Get confidence level string from score
   */
  private getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  /**
   * Get valuation history for a tenant
   */
  async getValuationHistory(tenantId: string, limit: number = 10) {
    const { data, error } = await this.supabase
      .from('site_valuations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching valuation history:', error);
      return [];
    }

    return data;
  }

  /**
   * Get valuation trends for charts
   */
  async getValuationTrends(tenantId: string, months: number = 12) {
    const { data, error } = await this.supabase.rpc(
      'get_valuation_trends',
      {
        p_tenant_id: tenantId,
        p_months: months
      }
    );

    if (error) {
      console.error('Error fetching valuation trends:', error);
      return [];
    }

    return data;
  }

  /**
   * Find comparable sites
   */
  async findComparableSites(
    monthlyRevenue: number,
    monthlyPageviews: number,
    niche?: string,
    limit: number = 10
  ) {
    const { data, error } = await this.supabase.rpc(
      'find_comparable_sites',
      {
        p_monthly_revenue: monthlyRevenue,
        p_monthly_pageviews: monthlyPageviews,
        p_niche: niche || null,
        p_limit: limit
      }
    );

    if (error) {
      console.error('Error finding comparable sites:', error);
      return [];
    }

    return data;
  }
}