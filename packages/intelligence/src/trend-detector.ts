import * as tf from '@tensorflow/tfjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { groupBy, orderBy, uniqBy } from 'lodash';
import {
  Trend,
  TrendDetectionParams,
  IntelligenceConfig,
  IntelligenceError,
  DatabaseTables,
  SubscriptionConfig,
  IntelligenceUpdate
} from './types.js';

export class TrendDetector {
  private supabase: SupabaseClient<DatabaseTables>;
  private config: IntelligenceConfig;
  private subscriptions: Map<string, any> = new Map();

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: IntelligenceConfig = {
      minDataPoints: 100,
      confidenceThreshold: 0.7,
      privacyNoiseLevel: 0.1,
      updateFrequency: 30
    }
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = config;
  }

  /**
   * Detect emerging trends across the network using collaborative filtering
   */
  async detectTrends(params: TrendDetectionParams): Promise<Trend[]> {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, params.timeWindow);

      // Gather data from multiple sources
      const [contentData, productData, searchData] = await Promise.all([
        this.getContentEngagementData(startDate, endDate, params.categoryFilter),
        this.getProductPerformanceData(startDate, endDate, params.categoryFilter),
        this.getSearchTrendsData(startDate, endDate, params.categoryFilter)
      ]);

      // Extract keywords and patterns
      const keywordTrends = await this.analyzeKeywordTrends(contentData, productData);
      
      // Apply collaborative filtering to identify cross-tenant patterns
      const collaborativeSignals = await this.applyCollaborativeFiltering(
        keywordTrends,
        params.minTenantCount
      );

      // Calculate momentum and velocity using ML
      const trendsWithMomentum = await this.calculateTrendMomentum(
        collaborativeSignals,
        params.momentumThreshold
      );

      // Filter by confidence threshold
      const validTrends = trendsWithMomentum.filter(
        trend => trend.confidence >= this.config.confidenceThreshold
      );

      // Store trends in database
      await this.storeTrends(validTrends);

      // Predict peak timing
      const trendsWithPredictions = await this.predictTrendPeaks(validTrends);

      return trendsWithPredictions;
    } catch (error) {
      throw new IntelligenceError(
        'Failed to detect trends',
        'TREND_DETECTION_FAILED',
        { error: error.message, params }
      );
    }
  }

  /**
   * Get content engagement data across tenants
   */
  private async getContentEngagementData(
    startDate: Date,
    endDate: Date,
    categoryFilter?: string[]
  ): Promise<any[]> {
    let query = this.supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        category,
        tenant_id,
        published_at,
        insights (
          views,
          shares,
          comments,
          time_on_page,
          bounce_rate,
          conversion_rate
        )
      `)
      .gte('published_at', startDate.toISOString())
      .lte('published_at', endDate.toISOString());

    if (categoryFilter?.length) {
      query = query.in('category', categoryFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  /**
   * Get product performance data
   */
  private async getProductPerformanceData(
    startDate: Date,
    endDate: Date,
    categoryFilter?: string[]
  ): Promise<any[]> {
    let query = this.supabase
      .from('products')
      .select(`
        id,
        title,
        category,
        subcategory,
        asin,
        tenant_id,
        insights (
          clicks,
          conversions,
          revenue,
          created_at
        )
      `)
      .gte('insights.created_at', startDate.toISOString())
      .lte('insights.created_at', endDate.toISOString());

    if (categoryFilter?.length) {
      query = query.in('category', categoryFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  /**
   * Get search trends data from insights
   */
  private async getSearchTrendsData(
    startDate: Date,
    endDate: Date,
    categoryFilter?: string[]
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('insights')
      .select('*')
      .eq('type', 'search')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;
    return data || [];
  }

  /**
   * Analyze keyword trends from content and product data
   */
  private async analyzeKeywordTrends(
    contentData: any[],
    productData: any[]
  ): Promise<Map<string, any>> {
    const keywordTrends = new Map();

    // Extract keywords from content titles and product names
    const allText = [
      ...contentData.map(item => ({ text: item.title, data: item })),
      ...productData.map(item => ({ text: item.title, data: item }))
    ];

    // Simple keyword extraction (in production, use NLP libraries)
    for (const item of allText) {
      const keywords = this.extractKeywords(item.text);
      
      for (const keyword of keywords) {
        if (!keywordTrends.has(keyword)) {
          keywordTrends.set(keyword, {
            keyword,
            mentions: 0,
            tenants: new Set(),
            performance: [],
            categories: new Set()
          });
        }

        const trend = keywordTrends.get(keyword);
        trend.mentions += 1;
        trend.tenants.add(item.data.tenant_id);
        trend.categories.add(item.data.category);
        trend.performance.push(this.calculatePerformanceScore(item.data));
      }
    }

    return keywordTrends;
  }

  /**
   * Apply collaborative filtering to identify cross-tenant patterns
   */
  private async applyCollaborativeFiltering(
    keywordTrends: Map<string, any>,
    minTenantCount: number
  ): Promise<any[]> {
    const collaborativeSignals = [];

    for (const [keyword, data] of keywordTrends) {
      if (data.tenants.size >= minTenantCount) {
        const avgPerformance = data.performance.reduce((a: number, b: number) => a + b, 0) / data.performance.length;
        
        collaborativeSignals.push({
          keyword,
          tenant_count: data.tenants.size,
          avg_performance: avgPerformance,
          total_mentions: data.mentions,
          categories: Array.from(data.categories),
          tenants: Array.from(data.tenants)
        });
      }
    }

    return orderBy(collaborativeSignals, ['avg_performance', 'tenant_count'], ['desc', 'desc']);
  }

  /**
   * Calculate trend momentum using TensorFlow.js
   */
  private async calculateTrendMomentum(
    signals: any[],
    momentumThreshold: number
  ): Promise<Trend[]> {
    const trends: Trend[] = [];

    for (const signal of signals) {
      // Prepare time series data for momentum calculation
      const timeSeriesData = await this.getTimeSeriesData(signal.keyword);
      
      if (timeSeriesData.length < 7) continue; // Need at least a week of data

      // Calculate momentum using neural network
      const momentum = await this.calculateMomentumML(timeSeriesData);
      const velocity = this.calculateVelocity(timeSeriesData);
      
      if (momentum >= momentumThreshold) {
        const trend: Trend = {
          id: `trend_${signal.keyword}_${Date.now()}`,
          category: signal.categories[0] || 'general',
          keywords: [signal.keyword],
          momentum,
          confidence: this.calculateConfidence(signal, momentum),
          velocity,
          source_tenants: signal.tenants,
          first_detected: new Date(),
          last_updated: new Date()
        };

        trends.push(trend);
      }
    }

    return trends;
  }

  /**
   * Calculate momentum using ML model
   */
  private async calculateMomentumML(timeSeriesData: number[]): Promise<number> {
    try {
      // Normalize data
      const tensor = tf.tensor1d(timeSeriesData);
      const normalized = tf.div(tensor, tf.max(tensor));
      
      // Simple momentum calculation (slope of recent trend)
      const recent = normalized.slice([-7]); // Last 7 days
      const x = tf.range(0, 7);
      
      // Calculate linear regression slope
      const n = 7;
      const sumX = tf.sum(x);
      const sumY = tf.sum(recent);
      const sumXY = tf.sum(tf.mul(x, recent));
      const sumXX = tf.sum(tf.square(x));
      
      const slope = tf.div(
        tf.sub(tf.mul(n, sumXY), tf.mul(sumX, sumY)),
        tf.sub(tf.mul(n, sumXX), tf.square(sumX))
      );
      
      const momentum = Math.max(0, Math.min(1, (await slope.data())[0] + 0.5));
      
      // Cleanup tensors
      tensor.dispose();
      normalized.dispose();
      recent.dispose();
      x.dispose();
      sumX.dispose();
      sumY.dispose();
      sumXY.dispose();
      sumXX.dispose();
      slope.dispose();
      
      return momentum;
    } catch (error) {
      console.warn('ML momentum calculation failed, using fallback:', error);
      return this.calculateMomentumFallback(timeSeriesData);
    }
  }

  /**
   * Fallback momentum calculation
   */
  private calculateMomentumFallback(timeSeriesData: number[]): number {
    if (timeSeriesData.length < 2) return 0;
    
    const recent = timeSeriesData.slice(-7);
    const older = timeSeriesData.slice(-14, -7);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    
    const growth = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
    return Math.max(0, Math.min(1, (growth + 1) / 2));
  }

  /**
   * Calculate velocity (rate of change)
   */
  private calculateVelocity(timeSeriesData: number[]): number {
    if (timeSeriesData.length < 2) return 0;
    
    const deltas = [];
    for (let i = 1; i < timeSeriesData.length; i++) {
      deltas.push(timeSeriesData[i] - timeSeriesData[i - 1]);
    }
    
    return deltas.reduce((a, b) => a + b, 0) / deltas.length;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(signal: any, momentum: number): number {
    const tenantScore = Math.min(1, signal.tenant_count / 10); // Max confidence at 10+ tenants
    const performanceScore = Math.min(1, signal.avg_performance / 100);
    const mentionScore = Math.min(1, signal.total_mentions / 1000);
    const momentumScore = momentum;
    
    return (tenantScore + performanceScore + mentionScore + momentumScore) / 4;
  }

  /**
   * Get time series data for a keyword
   */
  private async getTimeSeriesData(keyword: string): Promise<number[]> {
    const { data, error } = await this.supabase
      .from('insights')
      .select('value, created_at')
      .ilike('metadata->keyword', `%${keyword}%`)
      .order('created_at', { ascending: true })
      .limit(30);

    if (error) throw error;
    
    return (data || []).map(item => parseFloat(item.value) || 0);
  }

  /**
   * Predict trend peaks using ML
   */
  private async predictTrendPeaks(trends: Trend[]): Promise<Trend[]> {
    for (const trend of trends) {
      try {
        const timeSeriesData = await this.getTimeSeriesData(trend.keywords[0]);
        
        if (timeSeriesData.length >= 14) {
          // Simple peak prediction based on momentum and current trajectory
          const currentVelocity = trend.velocity;
          const momentum = trend.momentum;
          
          let daysToPeak = 7; // Default
          
          if (momentum > 0.8 && currentVelocity > 0) {
            daysTopeak = Math.max(3, 14 - Math.floor(momentum * 10));
          } else if (momentum > 0.6) {
            daysTopage = Math.max(7, 21 - Math.floor(momentum * 15));
          } else {
            daysTopage = Math.max(14, 30 - Math.floor(momentum * 20));
          }
          
          trend.peak_prediction = new Date(Date.now() + daysTopage * 24 * 60 * 60 * 1000);
        }
      } catch (error) {
        console.warn(`Failed to predict peak for trend ${trend.id}:`, error);
      }
    }

    return trends;
  }

  /**
   * Store trends in database
   */
  private async storeTrends(trends: Trend[]): Promise<void> {
    if (trends.length === 0) return;

    const { error } = await this.supabase
      .from('network_trends')
      .upsert(trends, { onConflict: 'id' });

    if (error) throw error;
  }

  /**
   * Extract keywords from text (simple implementation)
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Top 10 words
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(data: any): number {
    const insights = data.insights?.[0];
    if (!insights) return 0;

    const views = insights.views || 0;
    const shares = insights.shares || 0;
    const conversions = insights.conversions || 0;
    const revenue = insights.revenue || 0;

    // Weighted performance score
    return (views * 0.1) + (shares * 2) + (conversions * 10) + (revenue * 0.01);
  }

  /**
   * Setup real-time trend monitoring
   */
  async setupRealtimeMonitoring(callback: (update: IntelligenceUpdate) => void): Promise<void> {
    const subscriptionConfig: SubscriptionConfig = {
      table: 'insights',
      callback: async (payload) => {
        try {
          // Check if this new data indicates a trend change
          const trendUpdate = await this.analyzeRealtimeUpdate(payload);
          
          if (trendUpdate) {
            callback({
              type: 'trend',
              data: trendUpdate,
              timestamp: new Date(),
              priority: 'medium'
            });
          }
        } catch (error) {
          console.error('Error processing real-time trend update:', error);
        }
      }
    };

    const subscription = this.supabase
      .channel('trend-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'insights' },
        subscriptionConfig.callback
      )
      .subscribe();

    this.subscriptions.set('trend-updates', subscription);
  }

  /**
   * Analyze real-time update for trend implications
   */
  private async analyzeRealtimeUpdate(payload: any): Promise<any> {
    // Simple implementation - check if new data shows significant change
    const { new: newData } = payload;
    
    if (!newData || !newData.metadata?.keyword) return null;

    const keyword = newData.metadata.keyword;
    const timeSeriesData = await this.getTimeSeriesData(keyword);
    
    if (timeSeriesData.length < 5) return null;

    const momentum = await this.calculateMomentumML(timeSeriesData);
    
    if (momentum > 0.8) {
      return {
        keyword,
        momentum,
        urgency: 'high',
        message: `Keyword "${keyword}" showing high momentum (${momentum.toFixed(2)})`
      };
    }

    return null;
  }

  /**
   * Get current active trends
   */
  async getActiveTrends(limit: number = 20): Promise<Trend[]> {
    const { data, error } = await this.supabase
      .from('network_trends')
      .select('*')
      .gte('momentum', 0.5)
      .order('momentum', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Clean up subscriptions
   */
  async cleanup(): Promise<void> {
    for (const [name, subscription] of this.subscriptions) {
      await this.supabase.removeChannel(subscription);
    }
    this.subscriptions.clear();
  }
}