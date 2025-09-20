import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { subDays, startOfDay, endOfDay, format, differenceInDays } from 'date-fns';
import { groupBy, orderBy, meanBy, sumBy, maxBy, minBy } from 'lodash';
import {
  NetworkInsight,
  NetworkMetrics,
  IntelligenceConfig,
  IntelligenceError,
  DatabaseTables,
  IntelligenceUpdate
} from './types.js';
import { TrendDetector } from './trend-detector.js';
import { ConversionOptimizer } from './conversion-optimizer.js';
import { ProductAnalytics } from './product-analytics.js';
import { ViralDetector } from './viral-detector.js';

/**
 * Network Insights Generator
 * 
 * Aggregates insights from all intelligence modules to provide
 * comprehensive network-wide analytics and recommendations.
 */
export class NetworkInsights {
  private supabase: SupabaseClient<DatabaseTables>;
  private config: IntelligenceConfig;
  private trendDetector: TrendDetector;
  private conversionOptimizer: ConversionOptimizer;
  private productAnalytics: ProductAnalytics;
  private viralDetector: ViralDetector;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: IntelligenceConfig = {
      minDataPoints: 100,
      confidenceThreshold: 0.75,
      privacyNoiseLevel: 0.05,
      updateFrequency: 180 // 3 hours
    }
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = config;
    
    // Initialize sub-modules
    this.trendDetector = new TrendDetector(supabaseUrl, supabaseKey, config);
    this.conversionOptimizer = new ConversionOptimizer(supabaseUrl, supabaseKey, config);
    this.productAnalytics = new ProductAnalytics(supabaseUrl, supabaseKey, config);
    this.viralDetector = new ViralDetector(supabaseUrl, supabaseKey, config);
  }

  /**
   * Generate comprehensive network insights
   */
  async generateNetworkInsights(timeRange: number = 30): Promise<{
    metrics: NetworkMetrics;
    insights: NetworkInsight[];
    recommendations: string[];
    opportunities: Array<{
      type: string;
      impact: 'high' | 'medium' | 'low';
      description: string;
      actionable_steps: string[];
    }>;
  }> {
    try {
      // Collect network metrics
      const metrics = await this.calculateNetworkMetrics(timeRange);
      
      // Generate insights from all modules
      const [
        trendInsights,
        conversionInsights,
        productInsights,
        viralInsights,
        performanceInsights
      ] = await Promise.all([
        this.generateTrendInsights(timeRange),
        this.generateConversionInsights(timeRange),
        this.generateProductInsights(timeRange),
        this.generateViralInsights(timeRange),
        this.generatePerformanceInsights(timeRange, metrics)
      ]);

      // Combine all insights
      const allInsights = [
        ...trendInsights,
        ...conversionInsights,
        ...productInsights,
        ...viralInsights,
        ...performanceInsights
      ];

      // Prioritize insights by impact score
      const prioritizedInsights = orderBy(allInsights, 'impact_score', 'desc');

      // Generate high-level recommendations
      const recommendations = this.generateNetworkRecommendations(metrics, prioritizedInsights);

      // Identify opportunities
      const opportunities = await this.identifyNetworkOpportunities(metrics, prioritizedInsights);

      // Store insights in database
      await this.storeNetworkInsights(prioritizedInsights);

      return {
        metrics,
        insights: prioritizedInsights.slice(0, 20), // Top 20 insights
        recommendations,
        opportunities
      };
    } catch (error) {
      throw new IntelligenceError(
        'Failed to generate network insights',
        'NETWORK_INSIGHTS_FAILED',
        { error: error.message, timeRange }
      );
    }
  }

  /**
   * Calculate network-wide metrics
   */
  private async calculateNetworkMetrics(timeRange: number): Promise<NetworkMetrics> {
    const endDate = new Date();
    const startDate = subDays(endDate, timeRange);
    const previousStartDate = subDays(startDate, timeRange);

    // Get tenant metrics
    const [
      { data: tenants },
      { data: products },
      { data: posts },
      { data: currentInsights },
      { data: previousInsights }
    ] = await Promise.all([
      this.supabase.from('tenants').select('id, created_at, status'),
      this.supabase.from('products').select('id, tenant_id'),
      this.supabase.from('posts').select('id, tenant_id'),
      this.supabase
        .from('insights')
        .select('type, value, tenant_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      this.supabase
        .from('insights')
        .select('type, value, tenant_id')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString())
    ]);

    // Calculate active tenants (those with activity in the period)
    const activeTenantIds = new Set(
      (currentInsights || []).map(insight => insight.tenant_id)
    );

    // Calculate network conversion rate
    const conversions = (currentInsights || [])
      .filter(insight => insight.type === 'conversion')
      .reduce((sum, insight) => sum + (parseFloat(insight.value) || 0), 0);
    
    const clicks = (currentInsights || [])
      .filter(insight => insight.type === 'click')
      .reduce((sum, insight) => sum + (parseFloat(insight.value) || 0), 0);

    const networkConversionRate = clicks > 0 ? conversions / clicks : 0;

    // Calculate network revenue
    const networkRevenue = (currentInsights || [])
      .filter(insight => insight.type === 'revenue')
      .reduce((sum, insight) => sum + (parseFloat(insight.value) || 0), 0);

    // Calculate growth rate
    const currentRevenue = networkRevenue;
    const previousRevenue = (previousInsights || [])
      .filter(insight => insight.type === 'revenue')
      .reduce((sum, insight) => sum + (parseFloat(insight.value) || 0), 0);

    const growthRate = previousRevenue > 0 ? 
      ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Calculate churn rate
    const currentActiveTenants = activeTenantIds.size;
    const previousActiveTenants = new Set(
      (previousInsights || []).map(insight => insight.tenant_id)
    ).size;

    const churnRate = previousActiveTenants > 0 ?
      Math.max(0, (previousActiveTenants - currentActiveTenants) / previousActiveTenants) * 100 : 0;

    // Get trending categories
    const categoryInsights = groupBy(currentInsights || [], insight => 
      insight.metadata?.category || 'general'
    );
    
    const trendingCategories = Object.entries(categoryInsights)
      .map(([category, insights]) => ({
        category,
        activity: insights.length
      }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 5)
      .map(item => item.category);

    return {
      total_tenants: (tenants || []).length,
      active_tenants: currentActiveTenants,
      total_products: (products || []).length,
      total_content: (posts || []).length,
      network_conversion_rate: networkConversionRate,
      network_revenue: networkRevenue,
      trending_categories: trendingCategories,
      growth_rate: growthRate,
      churn_rate: churnRate
    };
  }

  /**
   * Generate trend-based insights
   */
  private async generateTrendInsights(timeRange: number): Promise<NetworkInsight[]> {
    try {
      const trends = await this.trendDetector.detectTrends({
        timeWindow: timeRange,
        minTenantCount: 3,
        momentumThreshold: 0.6
      });

      const insights: NetworkInsight[] = [];

      // High momentum trends
      const highMomentumTrends = trends.filter(trend => trend.momentum > 0.8);
      if (highMomentumTrends.length > 0) {
        insights.push({
          insight_id: `trend_high_momentum_${Date.now()}`,
          type: 'trend',
          title: 'High Momentum Trends Detected',
          description: `${highMomentumTrends.length} trends showing exceptional momentum across the network`,
          impact_score: 85,
          confidence: meanBy(highMomentumTrends, 'confidence'),
          affected_tenants: highMomentumTrends.flatMap(t => t.source_tenants),
          actionable_steps: [
            'Create content around high-momentum keywords',
            'Optimize existing content for trending topics',
            'Consider paid promotion for trend-related products'
          ],
          data_sources: ['trend_detector'],
          generated_at: new Date(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
      }

      // Cross-category trends
      const crossCategoryTrends = trends.filter(trend => 
        trend.source_tenants.length >= 5 && trend.momentum > 0.7
      );
      
      if (crossCategoryTrends.length > 0) {
        insights.push({
          insight_id: `trend_cross_category_${Date.now()}`,
          type: 'opportunity',
          title: 'Cross-Category Trending Opportunities',
          description: `${crossCategoryTrends.length} trends spanning multiple tenant categories`,
          impact_score: 75,
          confidence: meanBy(crossCategoryTrends, 'confidence'),
          affected_tenants: crossCategoryTrends.flatMap(t => t.source_tenants),
          actionable_steps: [
            'Explore cross-category product opportunities',
            'Consider category expansion for high-performing tenants',
            'Share trend insights across tenant categories'
          ],
          data_sources: ['trend_detector'],
          generated_at: new Date(),
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
        });
      }

      return insights;
    } catch (error) {
      console.warn('Failed to generate trend insights:', error);
      return [];
    }
  }

  /**
   * Generate conversion optimization insights
   */
  private async generateConversionInsights(timeRange: number): Promise<NetworkInsight[]> {
    try {
      const insights: NetworkInsight[] = [];

      // Analyze conversion patterns across segments
      const segments = [
        { device_type: 'mobile' },
        { device_type: 'desktop' },
        { traffic_source: 'organic' },
        { traffic_source: 'paid' },
        { traffic_source: 'social' }
      ];

      for (const segment of segments) {
        try {
          const segmentInsight = await this.conversionOptimizer.getConversionInsights(segment, timeRange);
          
          if (segmentInsight.percentile_rank < 25) {
            insights.push({
              insight_id: `conversion_low_${Object.values(segment).join('_')}_${Date.now()}`,
              type: 'warning',
              title: `Low Conversion Performance: ${segmentInsight.segment}`,
              description: `Conversion rate below 25th percentile for ${segmentInsight.segment}`,
              impact_score: 70,
              confidence: 0.8,
              affected_tenants: [], // Privacy-preserving - no specific tenants
              actionable_steps: segmentInsight.recommendations,
              data_sources: ['conversion_optimizer'],
              generated_at: new Date(),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
          } else if (segmentInsight.percentile_rank > 75) {
            insights.push({
              insight_id: `conversion_high_${Object.values(segment).join('_')}_${Date.now()}`,
              type: 'trend',
              title: `High Conversion Performance: ${segmentInsight.segment}`,
              description: `Conversion rate above 75th percentile for ${segmentInsight.segment}`,
              impact_score: 60,
              confidence: 0.8,
              affected_tenants: [], // Privacy-preserving
              actionable_steps: [
                'Replicate successful strategies across similar segments',
                'Share best practices with underperforming segments',
                'Scale successful tactics'
              ],
              data_sources: ['conversion_optimizer'],
              generated_at: new Date(),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
          }
        } catch (error) {
          // Skip segments with insufficient data
          continue;
        }
      }

      return insights;
    } catch (error) {
      console.warn('Failed to generate conversion insights:', error);
      return [];
    }
  }

  /**
   * Generate product performance insights
   */
  private async generateProductInsights(timeRange: number): Promise<NetworkInsight[]> {
    try {
      const insights: NetworkInsight[] = [];

      // Get top performing products
      const topProducts = await this.productAnalytics.getTopProducts(undefined, 20);
      
      if (topProducts.length > 0) {
        const categories = groupBy(topProducts, 'category');
        const dominantCategories = Object.entries(categories)
          .filter(([_, products]) => products.length >= 3)
          .map(([category, products]) => ({
            category,
            count: products.length,
            avgScore: meanBy(products, 'trending_score')
          }))
          .sort((a, b) => b.avgScore - a.avgScore);

        if (dominantCategories.length > 0) {
          const topCategory = dominantCategories[0];
          insights.push({
            insight_id: `product_category_dominance_${Date.now()}`,
            type: 'trend',
            title: `Category Performance Leader: ${topCategory.category}`,
            description: `${topCategory.category} category shows exceptional performance with ${topCategory.count} top products`,
            impact_score: 80,
            confidence: 0.85,
            affected_tenants: [],
            actionable_steps: [
              `Focus on expanding ${topCategory.category} product lines`,
              'Analyze successful product attributes in this category',
              'Consider cross-promoting category products'
            ],
            data_sources: ['product_analytics'],
            generated_at: new Date(),
            expires_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
          });
        }
      }

      // Identify seasonal opportunities
      const seasonalProducts = topProducts.filter(p => 
        p.seasonal_factor && Math.abs(p.seasonal_factor) > 0.2
      );

      if (seasonalProducts.length > 0) {
        const positiveSeasonalProducts = seasonalProducts.filter(p => p.seasonal_factor! > 0);
        
        if (positiveSeasonalProducts.length > 0) {
          insights.push({
            insight_id: `product_seasonal_opportunity_${Date.now()}`,
            type: 'opportunity',
            title: 'Seasonal Performance Opportunity',
            description: `${positiveSeasonalProducts.length} products showing strong seasonal uptrend`,
            impact_score: 70,
            confidence: 0.75,
            affected_tenants: [],
            actionable_steps: [
              'Increase inventory for seasonally trending products',
              'Launch targeted seasonal marketing campaigns',
              'Optimize content for seasonal keywords'
            ],
            data_sources: ['product_analytics'],
            generated_at: new Date(),
            expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
          });
        }
      }

      return insights;
    } catch (error) {
      console.warn('Failed to generate product insights:', error);
      return [];
    }
  }

  /**
   * Generate viral content insights
   */
  private async generateViralInsights(timeRange: number): Promise<NetworkInsight[]> {
    try {
      const insights: NetworkInsight[] = [];

      const viralData = await this.viralDetector.detectViralContent(timeRange);
      
      if (viralData.viralContent.length > 0) {
        // Analyze viral content patterns
        const contentTypes = groupBy(viralData.viralContent, 'content_type');
        const topContentType = maxBy(
          Object.entries(contentTypes),
          ([_, content]) => meanBy(content, 'engagement_score')
        );

        if (topContentType) {
          const [type, content] = topContentType;
          insights.push({
            insight_id: `viral_content_type_${Date.now()}`,
            type: 'trend',
            title: `Viral Content Format: ${type}`,
            description: `${type} content showing highest viral potential with average ${meanBy(content, 'engagement_score').toFixed(1)} engagement score`,
            impact_score: 75,
            confidence: 0.8,
            affected_tenants: content.map(c => c.tenant_id),
            actionable_steps: [
              `Create more ${type} format content`,
              'Analyze successful content attributes',
              'Share viral content strategies across network'
            ],
            data_sources: ['viral_detector'],
            generated_at: new Date(),
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          });
        }

        // Pattern-based insights
        if (viralData.patterns.length > 0) {
          const highSuccessPatterns = viralData.patterns.filter(p => p.success_probability > 0.7);
          
          if (highSuccessPatterns.length > 0) {
            insights.push({
              insight_id: `viral_patterns_${Date.now()}`,
              type: 'recommendation',
              title: 'High-Success Viral Patterns Identified',
              description: `${highSuccessPatterns.length} content patterns with 70%+ success probability`,
              impact_score: 85,
              confidence: 0.9,
              affected_tenants: [],
              actionable_steps: [
                'Implement identified viral patterns in new content',
                'Train content creators on successful patterns',
                'A/B test pattern variations'
              ],
              data_sources: ['viral_detector'],
              generated_at: new Date(),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
          }
        }
      }

      return insights;
    } catch (error) {
      console.warn('Failed to generate viral insights:', error);
      return [];
    }
  }

  /**
   * Generate performance and growth insights
   */
  private async generatePerformanceInsights(
    timeRange: number,
    metrics: NetworkMetrics
  ): Promise<NetworkInsight[]> {
    const insights: NetworkInsight[] = [];

    // Growth analysis
    if (metrics.growth_rate > 20) {
      insights.push({
        insight_id: `growth_strong_${Date.now()}`,
        type: 'trend',
        title: 'Strong Network Growth',
        description: `Network revenue growing at ${metrics.growth_rate.toFixed(1)}% rate`,
        impact_score: 90,
        confidence: 0.9,
        affected_tenants: [],
        actionable_steps: [
          'Scale successful growth strategies',
          'Invest in high-performing channels',
          'Expand successful tenant models'
        ],
        data_sources: ['network_metrics'],
        generated_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    } else if (metrics.growth_rate < -10) {
      insights.push({
        insight_id: `growth_decline_${Date.now()}`,
        type: 'warning',
        title: 'Network Growth Decline',
        description: `Network revenue declining at ${Math.abs(metrics.growth_rate).toFixed(1)}% rate`,
        impact_score: 95,
        confidence: 0.9,
        affected_tenants: [],
        actionable_steps: [
          'Analyze factors contributing to decline',
          'Implement retention strategies',
          'Review and optimize underperforming segments'
        ],
        data_sources: ['network_metrics'],
        generated_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }

    // Churn analysis
    if (metrics.churn_rate > 15) {
      insights.push({
        insight_id: `churn_high_${Date.now()}`,
        type: 'warning',
        title: 'High Tenant Churn Rate',
        description: `${metrics.churn_rate.toFixed(1)}% tenant churn rate detected`,
        impact_score: 85,
        confidence: 0.8,
        affected_tenants: [],
        actionable_steps: [
          'Implement tenant retention programs',
          'Analyze churn reasons and patterns',
          'Improve onboarding and support processes'
        ],
        data_sources: ['network_metrics'],
        generated_at: new Date(),
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      });
    }

    // Conversion rate analysis
    if (metrics.network_conversion_rate < 0.015) { // Below 1.5%
      insights.push({
        insight_id: `conversion_low_network_${Date.now()}`,
        type: 'warning',
        title: 'Low Network Conversion Rate',
        description: `Network-wide conversion rate at ${(metrics.network_conversion_rate * 100).toFixed(2)}%`,
        impact_score: 80,
        confidence: 0.85,
        affected_tenants: [],
        actionable_steps: [
          'Analyze top-performing tenant strategies',
          'Implement network-wide optimization programs',
          'Share conversion best practices'
        ],
        data_sources: ['network_metrics'],
        generated_at: new Date(),
        expires_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
      });
    }

    return insights;
  }

  /**
   * Generate high-level network recommendations
   */
  private generateNetworkRecommendations(
    metrics: NetworkMetrics,
    insights: NetworkInsight[]
  ): string[] {
    const recommendations: string[] = [];

    // Category-based recommendations
    if (metrics.trending_categories.length > 0) {
      recommendations.push(
        `Focus expansion efforts on trending categories: ${metrics.trending_categories.slice(0, 3).join(', ')}`
      );
    }

    // Growth-based recommendations
    if (metrics.growth_rate > 15) {
      recommendations.push('Scale successful growth strategies across underperforming segments');
    } else if (metrics.growth_rate < 5) {
      recommendations.push('Implement growth acceleration initiatives and analyze high-performing tenants');
    }

    // Conversion optimization
    if (metrics.network_conversion_rate < 0.02) {
      recommendations.push('Prioritize network-wide conversion rate optimization initiatives');
    }

    // Insight-based recommendations
    const highImpactInsights = insights.filter(insight => insight.impact_score > 80);
    if (highImpactInsights.length > 0) {
      recommendations.push('Address high-impact insights immediately for maximum network benefit');
    }

    // Active tenant ratio
    const activeRatio = metrics.active_tenants / metrics.total_tenants;
    if (activeRatio < 0.7) {
      recommendations.push('Implement tenant activation and engagement programs');
    }

    return recommendations;
  }

  /**
   * Identify network opportunities
   */
  private async identifyNetworkOpportunities(
    metrics: NetworkMetrics,
    insights: NetworkInsight[]
  ): Promise<Array<{
    type: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
    actionable_steps: string[];
  }>> {
    const opportunities: Array<{
      type: string;
      impact: 'high' | 'medium' | 'low';
      description: string;
      actionable_steps: string[];
    }> = [];

    // Market expansion opportunities
    if (metrics.growth_rate > 10 && metrics.trending_categories.length > 0) {
      opportunities.push({
        type: 'market_expansion',
        impact: 'high',
        description: `Expand into ${metrics.trending_categories[0]} category with strong growth momentum`,
        actionable_steps: [
          'Recruit high-quality tenants in trending categories',
          'Develop category-specific tools and resources',
          'Create targeted marketing campaigns'
        ]
      });
    }

    // Cross-pollination opportunities
    const trendInsights = insights.filter(insight => insight.type === 'trend');
    if (trendInsights.length > 2) {
      opportunities.push({
        type: 'cross_pollination',
        impact: 'medium',
        description: 'Share successful strategies across tenant segments',
        actionable_steps: [
          'Create best practice sharing sessions',
          'Develop cross-tenant collaboration tools',
          'Implement mentorship programs'
        ]
      });
    }

    // Technology optimization opportunities
    if (metrics.network_conversion_rate < 0.025) {
      opportunities.push({
        type: 'technology_optimization',
        impact: 'high',
        description: 'Implement network-wide conversion optimization technology',
        actionable_steps: [
          'Deploy AI-powered personalization across network',
          'Implement advanced A/B testing platform',
          'Optimize site speed and mobile experience'
        ]
      });
    }

    // Data monetization opportunities
    const highConfidenceInsights = insights.filter(insight => insight.confidence > 0.8);
    if (highConfidenceInsights.length > 5) {
      opportunities.push({
        type: 'data_monetization',
        impact: 'medium',
        description: 'Leverage high-quality insights for competitive advantage',
        actionable_steps: [
          'Develop premium analytics offerings',
          'Create industry benchmarking services',
          'License aggregated insights to partners'
        ]
      });
    }

    return opportunities;
  }

  /**
   * Store network insights in database
   */
  private async storeNetworkInsights(insights: NetworkInsight[]): Promise<void> {
    if (insights.length === 0) return;

    const { error } = await this.supabase
      .from('network_insights')
      .upsert(
        insights.map(insight => ({
          insight_id: insight.insight_id,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          impact_score: insight.impact_score,
          confidence: insight.confidence,
          affected_tenants: insight.affected_tenants,
          actionable_steps: insight.actionable_steps,
          data_sources: insight.data_sources,
          generated_at: insight.generated_at.toISOString(),
          expires_at: insight.expires_at.toISOString()
        })),
        { onConflict: 'insight_id' }
      );

    if (error) throw error;
  }

  /**
   * Get real-time network health score
   */
  async getNetworkHealthScore(): Promise<{
    overall_score: number;
    component_scores: {
      growth: number;
      conversion: number;
      engagement: number;
      retention: number;
    };
    health_status: 'excellent' | 'good' | 'fair' | 'poor';
    critical_issues: string[];
  }> {
    try {
      const metrics = await this.calculateNetworkMetrics(7); // Last 7 days
      
      // Calculate component scores (0-100)
      const growthScore = Math.max(0, Math.min(100, (metrics.growth_rate + 20) * 2.5));
      const conversionScore = Math.min(100, metrics.network_conversion_rate * 2500);
      const engagementScore = Math.min(100, (metrics.active_tenants / metrics.total_tenants) * 100);
      const retentionScore = Math.max(0, 100 - metrics.churn_rate * 5);

      const componentScores = {
        growth: growthScore,
        conversion: conversionScore,
        engagement: engagementScore,
        retention: retentionScore
      };

      // Calculate overall score
      const overallScore = (growthScore + conversionScore + engagementScore + retentionScore) / 4;

      // Determine health status
      let healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
      if (overallScore >= 80) healthStatus = 'excellent';
      else if (overallScore >= 60) healthStatus = 'good';
      else if (overallScore >= 40) healthStatus = 'fair';
      else healthStatus = 'poor';

      // Identify critical issues
      const criticalIssues: string[] = [];
      if (metrics.growth_rate < -10) criticalIssues.push('Negative growth trend');
      if (metrics.churn_rate > 20) criticalIssues.push('High tenant churn');
      if (metrics.network_conversion_rate < 0.01) criticalIssues.push('Very low conversion rate');
      if (engagementScore < 50) criticalIssues.push('Low tenant engagement');

      return {
        overall_score: overallScore,
        component_scores: componentScores,
        health_status: healthStatus,
        critical_issues: criticalIssues
      };
    } catch (error) {
      throw new IntelligenceError(
        'Failed to calculate network health score',
        'HEALTH_SCORE_FAILED',
        { error: error.message }
      );
    }
  }

  /**
   * Setup real-time network monitoring
   */
  async setupRealtimeMonitoring(callback: (update: IntelligenceUpdate) => void): Promise<void> {
    // Monitor critical network metrics
    const subscription = this.supabase
      .channel('network-monitoring')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'insights' },
        async (payload) => {
          try {
            const { new: newData } = payload;
            
            // Check for significant network-level changes
            const networkUpdate = await this.analyzeNetworkUpdate(newData);
            
            if (networkUpdate) {
              callback({
                type: 'network',
                data: networkUpdate,
                timestamp: new Date(),
                priority: networkUpdate.severity === 'critical' ? 'critical' : 'medium'
              });
            }
          } catch (error) {
            console.error('Error processing real-time network update:', error);
          }
        }
      )
      .subscribe();

    // Setup monitoring for sub-modules
    await Promise.all([
      this.trendDetector.setupRealtimeMonitoring(callback),
      this.viralDetector.setupRealtimeMonitoring(callback)
    ]);
  }

  /**
   * Analyze network-level updates
   */
  private async analyzeNetworkUpdate(newData: any): Promise<any> {
    // Check for significant network-wide events
    if (newData.type === 'revenue') {
      const revenueValue = parseFloat(newData.value) || 0;
      
      // Check for unusually high or low revenue events
      const { data: recentRevenue } = await this.supabase
        .from('insights')
        .select('value')
        .eq('type', 'revenue')
        .gte('created_at', subDays(new Date(), 7).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (recentRevenue && recentRevenue.length > 10) {
        const avgRevenue = meanBy(recentRevenue, r => parseFloat(r.value) || 0);
        const deviation = Math.abs(revenueValue - avgRevenue) / avgRevenue;
        
        if (deviation > 0.5) { // 50% deviation
          return {
            type: 'revenue_anomaly',
            value: revenueValue,
            average: avgRevenue,
            deviation,
            severity: deviation > 1.0 ? 'critical' : 'warning',
            message: `Revenue event deviates ${(deviation * 100).toFixed(1)}% from recent average`
          };
        }
      }
    }

    return null;
  }

  /**
   * Get network summary dashboard data
   */
  async getNetworkDashboard(timeRange: number = 30): Promise<{
    metrics: NetworkMetrics;
    healthScore: number;
    topInsights: NetworkInsight[];
    quickStats: {
      totalRevenue: number;
      averageConversion: number;
      topCategory: string;
      activeTenants: number;
    };
    alerts: Array<{
      type: 'success' | 'warning' | 'error';
      message: string;
      priority: number;
    }>;
  }> {
    try {
      const [metrics, healthData, insights] = await Promise.all([
        this.calculateNetworkMetrics(timeRange),
        this.getNetworkHealthScore(),
        this.supabase
          .from('network_insights')
          .select('*')
          .gte('generated_at', subDays(new Date(), 7).toISOString())
          .order('impact_score', { ascending: false })
          .limit(5)
      ]);

      const quickStats = {
        totalRevenue: metrics.network_revenue,
        averageConversion: metrics.network_conversion_rate,
        topCategory: metrics.trending_categories[0] || 'N/A',
        activeTenants: metrics.active_tenants
      };

      const alerts: Array<{
        type: 'success' | 'warning' | 'error';
        message: string;
        priority: number;
      }> = [];

      // Generate alerts based on health score and metrics
      if (healthData.health_status === 'excellent') {
        alerts.push({
          type: 'success',
          message: 'Network performance is excellent',
          priority: 1
        });
      } else if (healthData.health_status === 'poor') {
        alerts.push({
          type: 'error',
          message: 'Network performance needs immediate attention',
          priority: 10
        });
      }

      // Add critical issue alerts
      healthData.critical_issues.forEach((issue, index) => {
        alerts.push({
          type: 'error',
          message: issue,
          priority: 8 + index
        });
      });

      return {
        metrics,
        healthScore: healthData.overall_score,
        topInsights: insights.data || [],
        quickStats,
        alerts: orderBy(alerts, 'priority', 'desc')
      };
    } catch (error) {
      throw new IntelligenceError(
        'Failed to get network dashboard data',
        'DASHBOARD_FAILED',
        { error: error.message }
      );
    }
  }
}