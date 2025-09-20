import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { subDays, format } from 'date-fns';
import { groupBy, meanBy, orderBy } from 'lodash';
import {
  ConversionData,
  ConversionInsight,
  PrivacyPreservingMetrics,
  IntelligenceConfig,
  IntelligenceError,
  PrivacyError,
  DatabaseTables,
  IntelligenceUpdate
} from './types.js';

/**
 * Conversion Optimizer with Differential Privacy
 * 
 * This class aggregates conversion data across tenants while preserving
 * individual tenant privacy using differential privacy techniques.
 */
export class ConversionOptimizer {
  private supabase: SupabaseClient<DatabaseTables>;
  private config: IntelligenceConfig;
  private privacyBudget: Map<string, number> = new Map();

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: IntelligenceConfig = {
      minDataPoints: 50,
      confidenceThreshold: 0.8,
      privacyNoiseLevel: 0.1,
      updateFrequency: 60
    }
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = config;
  }

  /**
   * Get privacy-preserving conversion insights for a specific segment
   */
  async getConversionInsights(
    segment: {
      page_type?: string;
      traffic_source?: string;
      device_type?: string;
      category?: string;
    },
    timeRange: number = 30 // days
  ): Promise<ConversionInsight> {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, timeRange);

      // Collect conversion data from all tenants
      const rawData = await this.collectConversionData(segment, startDate, endDate);
      
      if (rawData.length < this.config.minDataPoints) {
        throw new PrivacyError(
          'Insufficient data points for privacy-preserving analysis',
          { dataPoints: rawData.length, required: this.config.minDataPoints }
        );
      }

      // Apply differential privacy
      const privacyPreservingMetrics = await this.applyDifferentialPrivacy(rawData);
      
      // Generate benchmarks and insights
      const insights = await this.generateInsights(segment, privacyPreservingMetrics, rawData);
      
      // Store aggregated insights (without individual tenant data)
      await this.storeAggregatedInsights(segment, insights, privacyPreservingMetrics);

      return insights;
    } catch (error) {
      if (error instanceof PrivacyError) {
        throw error;
      }
      throw new IntelligenceError(
        'Failed to generate conversion insights',
        'CONVERSION_ANALYSIS_FAILED',
        { error: error.message, segment }
      );
    }
  }

  /**
   * Collect conversion data from database with privacy controls
   */
  private async collectConversionData(
    segment: any,
    startDate: Date,
    endDate: Date
  ): Promise<ConversionData[]> {
    let query = this.supabase
      .from('insights')
      .select(`
        tenant_id,
        metadata,
        value,
        created_at
      `)
      .eq('type', 'conversion')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Apply segment filters
    if (segment.page_type) {
      query = query.eq('metadata->page_type', segment.page_type);
    }
    if (segment.traffic_source) {
      query = query.eq('metadata->traffic_source', segment.traffic_source);
    }
    if (segment.device_type) {
      query = query.eq('metadata->device_type', segment.device_type);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transform to ConversionData format
    return (data || []).map(item => ({
      tenant_id: item.tenant_id,
      page_type: item.metadata?.page_type || 'unknown',
      traffic_source: item.metadata?.traffic_source || 'unknown',
      device_type: item.metadata?.device_type || 'unknown',
      conversion_rate: parseFloat(item.value) || 0,
      sample_size: parseInt(item.metadata?.sample_size) || 1,
      confidence_interval: [
        parseFloat(item.metadata?.ci_lower) || 0,
        parseFloat(item.metadata?.ci_upper) || 0
      ] as [number, number],
      timestamp: new Date(item.created_at)
    }));
  }

  /**
   * Apply differential privacy to conversion data
   */
  private async applyDifferentialPrivacy(
    data: ConversionData[]
  ): Promise<PrivacyPreservingMetrics> {
    // Group by tenant to calculate individual rates
    const tenantData = groupBy(data, 'tenant_id');
    const tenantRates: number[] = [];
    let totalSampleSize = 0;

    for (const [tenantId, records] of Object.entries(tenantData)) {
      // Check privacy budget for this tenant
      if (!this.hasPrivacyBudget(tenantId)) {
        continue; // Skip this tenant to preserve privacy budget
      }

      // Calculate weighted average for this tenant
      const totalWeight = records.reduce((sum, record) => sum + record.sample_size, 0);
      const weightedRate = records.reduce(
        (sum, record) => sum + (record.conversion_rate * record.sample_size),
        0
      ) / totalWeight;

      tenantRates.push(weightedRate);
      totalSampleSize += totalWeight;
      
      // Consume privacy budget
      this.consumePrivacyBudget(tenantId);
    }

    if (tenantRates.length < 3) {
      throw new PrivacyError(
        'Insufficient number of tenants for privacy-preserving aggregation',
        { tenantCount: tenantRates.length }
      );
    }

    // Calculate aggregated metrics
    const meanRate = meanBy(tenantRates, rate => rate);
    
    // Add calibrated noise for differential privacy
    const epsilon = this.config.privacyNoiseLevel; // Privacy parameter
    const sensitivity = 1.0; // Maximum change one tenant can make
    const noiseScale = sensitivity / epsilon;
    
    // Add Laplace noise
    const noise = this.sampleLaplaceNoise(0, noiseScale);
    const noisyMeanRate = Math.max(0, Math.min(1, meanRate + noise));

    // Calculate confidence level based on sample size and noise
    const confidenceLevel = this.calculateConfidenceLevel(
      tenantRates.length,
      totalSampleSize,
      Math.abs(noise)
    );

    return {
      aggregated_rate: noisyMeanRate,
      noise_added: Math.abs(noise),
      participant_count: tenantRates.length,
      confidence_level: confidenceLevel
    };
  }

  /**
   * Generate insights from privacy-preserving metrics
   */
  private async generateInsights(
    segment: any,
    metrics: PrivacyPreservingMetrics,
    rawData: ConversionData[]
  ): Promise<ConversionInsight> {
    // Calculate benchmarks from historical aggregated data
    const benchmarks = await this.calculateBenchmarks(segment);
    
    // Determine percentile rank
    const percentileRank = this.calculatePercentileRank(
      metrics.aggregated_rate,
      benchmarks
    );

    // Generate recommendations based on performance
    const recommendations = this.generateRecommendations(
      metrics.aggregated_rate,
      percentileRank,
      segment
    );

    return {
      segment: this.formatSegmentString(segment),
      benchmark: metrics.aggregated_rate,
      percentile_rank: percentileRank,
      recommendations,
      privacy_preserved: true
    };
  }

  /**
   * Calculate historical benchmarks for comparison
   */
  private async calculateBenchmarks(segment: any): Promise<number[]> {
    const { data, error } = await this.supabase
      .from('conversion_insights')
      .select('benchmark')
      .eq('segment', this.formatSegmentString(segment))
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    
    return (data || []).map(item => item.benchmark);
  }

  /**
   * Calculate percentile rank against historical data
   */
  private calculatePercentileRank(value: number, benchmarks: number[]): number {
    if (benchmarks.length === 0) return 50; // Default to median

    const sorted = benchmarks.sort((a, b) => a - b);
    let rank = 0;
    
    for (const benchmark of sorted) {
      if (value > benchmark) {
        rank++;
      } else {
        break;
      }
    }

    return (rank / sorted.length) * 100;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    conversionRate: number,
    percentileRank: number,
    segment: any
  ): string[] {
    const recommendations: string[] = [];

    if (percentileRank < 25) {
      recommendations.push('Consider A/B testing different call-to-action buttons');
      recommendations.push('Optimize page loading speed and mobile experience');
      
      if (segment.device_type === 'mobile') {
        recommendations.push('Implement mobile-specific checkout optimization');
      }
      
      if (segment.traffic_source === 'social') {
        recommendations.push('Review social media ad targeting and creative');
      }
    } else if (percentileRank < 50) {
      recommendations.push('Test different product presentation formats');
      recommendations.push('Implement exit-intent popups with offers');
    } else if (percentileRank < 75) {
      recommendations.push('Focus on increasing average order value');
      recommendations.push('Implement personalized product recommendations');
    } else {
      recommendations.push('Maintain current high-performing strategies');
      recommendations.push('Consider expanding successful tactics to other segments');
    }

    // Add segment-specific recommendations
    if (conversionRate < 0.02) {
      recommendations.push('Conversion rate below 2% - review fundamental user experience');
    }

    return recommendations;
  }

  /**
   * Store aggregated insights without exposing individual tenant data
   */
  private async storeAggregatedInsights(
    segment: any,
    insights: ConversionInsight,
    metrics: PrivacyPreservingMetrics
  ): Promise<void> {
    const { error } = await this.supabase
      .from('conversion_insights')
      .insert({
        segment: insights.segment,
        benchmark: insights.benchmark,
        percentile_rank: insights.percentile_rank,
        participant_count: metrics.participant_count,
        confidence_level: metrics.confidence_level,
        privacy_preserved: true,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Check if tenant has remaining privacy budget
   */
  private hasPrivacyBudget(tenantId: string): boolean {
    const budget = this.privacyBudget.get(tenantId) || 1.0;
    return budget > 0.1; // Reserve minimum budget
  }

  /**
   * Consume privacy budget for a tenant
   */
  private consumePrivacyBudget(tenantId: string): void {
    const currentBudget = this.privacyBudget.get(tenantId) || 1.0;
    const consumption = this.config.privacyNoiseLevel;
    this.privacyBudget.set(tenantId, Math.max(0, currentBudget - consumption));
  }

  /**
   * Reset privacy budgets (should be called periodically)
   */
  resetPrivacyBudgets(): void {
    this.privacyBudget.clear();
  }

  /**
   * Sample from Laplace distribution for differential privacy
   */
  private sampleLaplaceNoise(mean: number, scale: number): number {
    const u = Math.random() - 0.5;
    return mean - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Calculate confidence level based on sample size and noise
   */
  private calculateConfidenceLevel(
    participantCount: number,
    sampleSize: number,
    noiseLevel: number
  ): number {
    // Simple heuristic - higher confidence with more participants and less noise
    const participantScore = Math.min(1, participantCount / 10);
    const sampleScore = Math.min(1, sampleSize / 1000);
    const noiseScore = Math.max(0, 1 - noiseLevel * 10);
    
    return (participantScore + sampleScore + noiseScore) / 3;
  }

  /**
   * Format segment object as string
   */
  private formatSegmentString(segment: any): string {
    const parts = [];
    if (segment.page_type) parts.push(`page:${segment.page_type}`);
    if (segment.traffic_source) parts.push(`source:${segment.traffic_source}`);
    if (segment.device_type) parts.push(`device:${segment.device_type}`);
    if (segment.category) parts.push(`category:${segment.category}`);
    
    return parts.join('|') || 'general';
  }

  /**
   * Get optimization opportunities for a tenant
   */
  async getOptimizationOpportunities(
    tenantId: string,
    timeRange: number = 30
  ): Promise<Array<{
    segment: string;
    currentRate: number;
    benchmarkRate: number;
    improvement: number;
    priority: 'high' | 'medium' | 'low';
    recommendations: string[];
  }>> {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, timeRange);

      // Get tenant's conversion data
      const { data: tenantData, error } = await this.supabase
        .from('insights')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'conversion')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const opportunities = [];
      const segments = groupBy(tenantData, item => 
        this.formatSegmentString(item.metadata || {})
      );

      for (const [segmentKey, records] of Object.entries(segments)) {
        const tenantRate = meanBy(records, record => parseFloat(record.value) || 0);
        
        // Get network benchmark for this segment (if available)
        const { data: benchmarkData } = await this.supabase
          .from('conversion_insights')
          .select('benchmark')
          .eq('segment', segmentKey)
          .order('created_at', { ascending: false })
          .limit(1);

        if (benchmarkData?.length) {
          const benchmarkRate = benchmarkData[0].benchmark;
          const improvement = ((benchmarkRate - tenantRate) / tenantRate) * 100;
          
          if (improvement > 10) { // Only show opportunities with >10% improvement potential
            opportunities.push({
              segment: segmentKey,
              currentRate: tenantRate,
              benchmarkRate,
              improvement,
              priority: improvement > 50 ? 'high' : improvement > 25 ? 'medium' : 'low',
              recommendations: this.generateRecommendations(
                tenantRate,
                this.calculatePercentileRank(tenantRate, [benchmarkRate]),
                this.parseSegmentString(segmentKey)
              )
            });
          }
        }
      }

      return orderBy(opportunities, 'improvement', 'desc');
    } catch (error) {
      throw new IntelligenceError(
        'Failed to get optimization opportunities',
        'OPTIMIZATION_ANALYSIS_FAILED',
        { error: error.message, tenantId }
      );
    }
  }

  /**
   * Parse segment string back to object
   */
  private parseSegmentString(segmentString: string): any {
    const segment: any = {};
    const parts = segmentString.split('|');
    
    for (const part of parts) {
      const [key, value] = part.split(':');
      if (key && value) {
        if (key === 'page') segment.page_type = value;
        else if (key === 'source') segment.traffic_source = value;
        else if (key === 'device') segment.device_type = value;
        else if (key === 'category') segment.category = value;
      }
    }
    
    return segment;
  }

  /**
   * Setup real-time conversion monitoring
   */
  async setupRealtimeMonitoring(callback: (update: IntelligenceUpdate) => void): Promise<void> {
    const subscription = this.supabase
      .channel('conversion-updates')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'insights', filter: 'type=eq.conversion' },
        async (payload) => {
          try {
            const { new: newData } = payload;
            
            // Analyze if this conversion data indicates significant changes
            const segment = this.formatSegmentString(newData.metadata || {});
            const conversionRate = parseFloat(newData.value) || 0;
            
            // Get recent benchmark for comparison
            const { data: benchmarkData } = await this.supabase
              .from('conversion_insights')
              .select('benchmark')
              .eq('segment', segment)
              .order('created_at', { ascending: false })
              .limit(1);

            if (benchmarkData?.length) {
              const benchmark = benchmarkData[0].benchmark;
              const deviation = Math.abs(conversionRate - benchmark) / benchmark;
              
              if (deviation > 0.2) { // 20% deviation
                callback({
                  type: 'conversion',
                  data: {
                    tenant_id: newData.tenant_id,
                    segment,
                    current_rate: conversionRate,
                    benchmark,
                    deviation,
                    message: `Conversion rate ${deviation > 0 ? 'above' : 'below'} benchmark by ${(deviation * 100).toFixed(1)}%`
                  },
                  timestamp: new Date(),
                  priority: deviation > 0.5 ? 'high' : 'medium'
                });
              }
            }
          } catch (error) {
            console.error('Error processing real-time conversion update:', error);
          }
        }
      )
      .subscribe();
  }

  /**
   * Get privacy budget status
   */
  getPrivacyBudgetStatus(): Map<string, number> {
    return new Map(this.privacyBudget);
  }
}