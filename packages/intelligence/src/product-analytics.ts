import * as tf from '@tensorflow/tfjs-node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { subDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { groupBy, orderBy, meanBy, maxBy, minBy } from 'lodash';
import {
  ProductMetrics,
  ProductPerformanceInsight,
  IntelligenceConfig,
  IntelligenceError,
  DatabaseTables,
  IntelligenceUpdate
} from './types.js';

/**
 * Product Analytics Engine
 * 
 * Aggregates product performance metrics across the network to identify
 * top-performing products, optimization opportunities, and market trends.
 */
export class ProductAnalytics {
  private supabase: SupabaseClient<DatabaseTables>;
  private config: IntelligenceConfig;
  private performanceModel: tf.LayersModel | null = null;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: IntelligenceConfig = {
      minDataPoints: 25,
      confidenceThreshold: 0.75,
      privacyNoiseLevel: 0.05,
      updateFrequency: 120 // 2 hours
    }
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = config;
    this.initializePerformanceModel();
  }

  /**
   * Aggregate product performance metrics across the network
   */
  async aggregateProductMetrics(
    category?: string,
    timeRange: number = 30
  ): Promise<ProductMetrics[]> {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, timeRange);

      // Collect product data from all tenants
      const productData = await this.collectProductData(category, startDate, endDate);
      
      // Group by product identifier (ASIN or product title similarity)
      const groupedProducts = await this.groupSimilarProducts(productData);
      
      // Calculate aggregated metrics for each product group
      const aggregatedMetrics = await this.calculateAggregatedMetrics(groupedProducts);
      
      // Calculate trending scores using ML
      const metricsWithTrending = await this.calculateTrendingScores(aggregatedMetrics);
      
      // Determine competition levels
      const finalMetrics = await this.analyzeCompetition(metricsWithTrending);
      
      // Store aggregated metrics
      await this.storeProductMetrics(finalMetrics);

      return orderBy(finalMetrics, 'trending_score', 'desc');
    } catch (error) {
      throw new IntelligenceError(
        'Failed to aggregate product metrics',
        'PRODUCT_AGGREGATION_FAILED',
        { error: error.message, category }
      );
    }
  }

  /**
   * Collect product data from database
   */
  private async collectProductData(
    category: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    let productQuery = this.supabase
      .from('products')
      .select(`
        id,
        title,
        category,
        subcategory,
        asin,
        price,
        rating,
        review_count,
        tenant_id,
        created_at
      `);

    if (category) {
      productQuery = productQuery.eq('category', category);
    }

    let insightsQuery = this.supabase
      .from('insights')
      .select(`
        product_id,
        type,
        value,
        metadata,
        created_at
      `)
      .in('type', ['click', 'conversion', 'revenue'])
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const [{ data: products, error: productError }, { data: insights, error: insightError }] = 
      await Promise.all([productQuery, insightsQuery]);

    if (productError) throw productError;
    if (insightError) throw insightError;

    // Combine products with their insights
    const productInsights = groupBy(insights || [], 'product_id');
    
    return (products || []).map(product => ({
      ...product,
      insights: productInsights[product.id] || []
    }));
  }

  /**
   * Group similar products using ASIN or title similarity
   */
  private async groupSimilarProducts(productData: any[]): Promise<Map<string, any[]>> {
    const groups = new Map<string, any[]>();

    for (const product of productData) {
      let groupKey = product.asin || null;
      
      // If no ASIN, try to find similar products by title
      if (!groupKey) {
        groupKey = await this.findSimilarProductGroup(product, groups);
      }
      
      if (!groupKey) {
        groupKey = `unique_${product.id}`;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey)!.push(product);
    }

    return groups;
  }

  /**
   * Find similar product group using title similarity
   */
  private async findSimilarProductGroup(
    product: any,
    existingGroups: Map<string, any[]>
  ): Promise<string | null> {
    const productTitle = product.title.toLowerCase();
    const threshold = 0.7; // Similarity threshold

    for (const [groupKey, groupProducts] of existingGroups) {
      if (groupKey.startsWith('unique_')) continue;
      
      for (const groupProduct of groupProducts) {
        const similarity = this.calculateTitleSimilarity(
          productTitle,
          groupProduct.title.toLowerCase()
        );
        
        if (similarity >= threshold) {
          return groupKey;
        }
      }
    }

    return null;
  }

  /**
   * Calculate title similarity using Jaccard index
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(title1.split(/\s+/));
    const words2 = new Set(title2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate aggregated metrics for product groups
   */
  private async calculateAggregatedMetrics(
    groupedProducts: Map<string, any[]>
  ): Promise<ProductMetrics[]> {
    const metrics: ProductMetrics[] = [];

    for (const [groupKey, products] of groupedProducts) {
      if (products.length === 0) continue;

      // Use the product with the most insights as the representative
      const representativeProduct = maxBy(products, p => p.insights.length) || products[0];
      
      // Aggregate insights across all products in the group
      const allInsights = products.flatMap(p => p.insights);
      const insightsByType = groupBy(allInsights, 'type');

      // Calculate performance metrics
      const clicks = (insightsByType.click || []).reduce(
        (sum, insight) => sum + (parseFloat(insight.value) || 0), 0
      );
      const conversions = (insightsByType.conversion || []).reduce(
        (sum, insight) => sum + (parseFloat(insight.value) || 0), 0
      );
      const revenue = (insightsByType.revenue || []).reduce(
        (sum, insight) => sum + (parseFloat(insight.value) || 0), 0
      );

      const clickThroughRate = clicks > 0 ? clicks / (clicks + 1000) : 0; // Assume base impressions
      const conversionRate = clicks > 0 ? conversions / clicks : 0;
      const revenuePerClick = clicks > 0 ? revenue / clicks : 0;

      // Calculate aggregated ratings and reviews
      const validProducts = products.filter(p => p.rating && p.review_count);
      const avgRating = validProducts.length > 0 ? 
        meanBy(validProducts, 'rating') : 0;
      const totalReviews = validProducts.reduce(
        (sum, p) => sum + (p.review_count || 0), 0
      );

      // Determine price range
      const prices = products.map(p => p.price).filter(p => p);
      const priceRange = this.determinePriceRange(prices);

      // Calculate seasonal factor
      const seasonalFactor = await this.calculateSeasonalFactor(
        representativeProduct.category,
        allInsights
      );

      const productMetrics: ProductMetrics = {
        product_id: groupKey,
        asin: representativeProduct.asin || undefined,
        category: representativeProduct.category,
        subcategory: representativeProduct.subcategory || undefined,
        price_range: priceRange,
        avg_rating: avgRating,
        review_count: totalReviews,
        click_through_rate: clickThroughRate,
        conversion_rate: conversionRate,
        revenue_per_click: revenuePerClick,
        trending_score: 0, // Will be calculated later
        seasonal_factor: seasonalFactor,
        competition_level: 'medium', // Will be determined later
        last_updated: new Date()
      };

      metrics.push(productMetrics);
    }

    return metrics;
  }

  /**
   * Calculate trending scores using ML model
   */
  private async calculateTrendingScores(metrics: ProductMetrics[]): Promise<ProductMetrics[]> {
    if (!this.performanceModel) {
      return this.calculateTrendingScoresFallback(metrics);
    }

    try {
      // Prepare features for ML model
      const features = metrics.map(metric => [
        metric.click_through_rate,
        metric.conversion_rate,
        metric.revenue_per_click,
        metric.avg_rating,
        Math.log(metric.review_count + 1),
        metric.seasonal_factor || 0
      ]);

      if (features.length === 0) return metrics;

      const inputTensor = tf.tensor2d(features);
      const predictions = this.performanceModel.predict(inputTensor) as tf.Tensor;
      const scores = await predictions.data();

      // Update metrics with ML-calculated trending scores
      metrics.forEach((metric, index) => {
        metric.trending_score = Math.max(0, Math.min(100, scores[index] * 100));
      });

      // Cleanup tensors
      inputTensor.dispose();
      predictions.dispose();

      return metrics;
    } catch (error) {
      console.warn('ML trending score calculation failed, using fallback:', error);
      return this.calculateTrendingScoresFallback(metrics);
    }
  }

  /**
   * Fallback trending score calculation
   */
  private calculateTrendingScoresFallback(metrics: ProductMetrics[]): ProductMetrics[] {
    metrics.forEach(metric => {
      // Weighted score based on multiple factors
      const conversionScore = metric.conversion_rate * 40;
      const revenueScore = Math.min(metric.revenue_per_click * 10, 30);
      const ratingScore = (metric.avg_rating / 5) * 15;
      const reviewScore = Math.min(Math.log(metric.review_count + 1) * 2, 10);
      const seasonalScore = (metric.seasonal_factor || 0) * 5;

      metric.trending_score = conversionScore + revenueScore + ratingScore + reviewScore + seasonalScore;
    });

    return metrics;
  }

  /**
   * Analyze competition levels
   */
  private async analyzeCompetition(metrics: ProductMetrics[]): Promise<ProductMetrics[]> {
    // Group by category to analyze competition within categories
    const categoryGroups = groupBy(metrics, 'category');

    for (const [category, categoryMetrics] of Object.entries(categoryGroups)) {
      const sortedByPerformance = orderBy(
        categoryMetrics,
        ['trending_score', 'conversion_rate'],
        ['desc', 'desc']
      );

      sortedByPerformance.forEach((metric, index) => {
        const totalInCategory = sortedByPerformance.length;
        const percentile = (totalInCategory - index) / totalInCategory;

        if (percentile >= 0.8) {
          metric.competition_level = 'high';
        } else if (percentile >= 0.4) {
          metric.competition_level = 'medium';
        } else {
          metric.competition_level = 'low';
        }
      });
    }

    return metrics;
  }

  /**
   * Store product metrics in database
   */
  private async storeProductMetrics(metrics: ProductMetrics[]): Promise<void> {
    if (metrics.length === 0) return;

    const { error } = await this.supabase
      .from('product_intelligence')
      .upsert(
        metrics.map(metric => ({ ...metric, id: metric.product_id })),
        { onConflict: 'product_id' }
      );

    if (error) throw error;
  }

  /**
   * Calculate seasonal factor
   */
  private async calculateSeasonalFactor(
    category: string,
    insights: any[]
  ): Promise<number> {
    if (insights.length < 7) return 0;

    // Get historical data for this category
    const { data: historicalData } = await this.supabase
      .from('product_intelligence')
      .select('trending_score, last_updated')
      .eq('category', category)
      .gte('last_updated', subDays(new Date(), 365).toISOString());

    if (!historicalData || historicalData.length < 12) return 0;

    // Calculate current month's performance vs average
    const currentMonth = new Date().getMonth();
    const monthlyPerformance = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);

    historicalData.forEach(record => {
      const month = new Date(record.last_updated).getMonth();
      monthlyPerformance[month] += record.trending_score;
      monthlyCounts[month]++;
    });

    // Calculate averages
    const monthlyAverages = monthlyPerformance.map((sum, index) => 
      monthlyCounts[index] > 0 ? sum / monthlyCounts[index] : 0
    );

    const overallAverage = monthlyAverages.reduce((a, b) => a + b, 0) / 12;
    const currentMonthAverage = monthlyAverages[currentMonth];

    if (overallAverage === 0) return 0;

    return (currentMonthAverage - overallAverage) / overallAverage;
  }

  /**
   * Determine price range category
   */
  private determinePriceRange(prices: number[]): string {
    if (prices.length === 0) return 'unknown';

    const avgPrice = meanBy(prices, p => p);

    if (avgPrice < 25) return 'budget';
    if (avgPrice < 100) return 'mid-range';
    if (avgPrice < 500) return 'premium';
    return 'luxury';
  }

  /**
   * Get performance insights for specific products
   */
  async getProductInsights(
    productIds: string[],
    timeRange: number = 30
  ): Promise<ProductPerformanceInsight[]> {
    try {
      const { data: metrics, error } = await this.supabase
        .from('product_intelligence')
        .select('*')
        .in('product_id', productIds);

      if (error) throw error;

      const insights: ProductPerformanceInsight[] = [];

      for (const metric of metrics || []) {
        // Get network percentile
        const { data: networkData } = await this.supabase
          .from('product_intelligence')
          .select('trending_score')
          .eq('category', metric.category);

        const networkScores = (networkData || []).map(d => d.trending_score);
        const percentile = this.calculatePercentile(metric.trending_score, networkScores);

        // Determine performance tier
        let performanceTier: 'top' | 'good' | 'average' | 'poor';
        if (percentile >= 90) performanceTier = 'top';
        else if (percentile >= 70) performanceTier = 'good';
        else if (percentile >= 40) performanceTier = 'average';
        else performanceTier = 'poor';

        // Generate optimization opportunities
        const optimizationOpportunities = this.generateOptimizationOpportunities(metric);

        // Predict trend direction
        const predictedTrend = await this.predictTrendDirection(metric);

        insights.push({
          product_id: metric.product_id,
          performance_tier: performanceTier,
          network_percentile: percentile,
          optimization_opportunities: optimizationOpportunities,
          predicted_trend: predictedTrend
        });
      }

      return insights;
    } catch (error) {
      throw new IntelligenceError(
        'Failed to generate product insights',
        'PRODUCT_INSIGHTS_FAILED',
        { error: error.message, productIds }
      );
    }
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentile(value: number, values: number[]): number {
    const sorted = values.sort((a, b) => a - b);
    let rank = 0;
    
    for (const v of sorted) {
      if (value > v) rank++;
      else break;
    }

    return (rank / sorted.length) * 100;
  }

  /**
   * Generate optimization opportunities
   */
  private generateOptimizationOpportunities(metric: ProductMetrics): string[] {
    const opportunities: string[] = [];

    if (metric.conversion_rate < 0.02) {
      opportunities.push('Improve product page conversion rate');
    }

    if (metric.avg_rating < 4.0) {
      opportunities.push('Focus on improving product quality and reviews');
    }

    if (metric.click_through_rate < 0.01) {
      opportunities.push('Optimize product titles and images for better CTR');
    }

    if (metric.competition_level === 'high' && metric.trending_score < 70) {
      opportunities.push('Consider focusing on less competitive products');
    }

    if (metric.seasonal_factor && metric.seasonal_factor > 0.2) {
      opportunities.push('Leverage seasonal trends with targeted campaigns');
    }

    return opportunities;
  }

  /**
   * Predict trend direction using historical data
   */
  private async predictTrendDirection(metric: ProductMetrics): Promise<'rising' | 'stable' | 'declining'> {
    // Get historical data for this product
    const { data: historicalData } = await this.supabase
      .from('product_intelligence')
      .select('trending_score, last_updated')
      .eq('product_id', metric.product_id)
      .order('last_updated', { ascending: false })
      .limit(10);

    if (!historicalData || historicalData.length < 3) {
      return 'stable';
    }

    const scores = historicalData.map(d => d.trending_score);
    const recent = scores.slice(0, 3);
    const older = scores.slice(3, 6);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return 'rising';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Initialize ML model for performance prediction
   */
  private async initializePerformanceModel(): Promise<void> {
    try {
      // Create a simple neural network for trending score prediction
      const model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [6], // 6 input features
            units: 12,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 8,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 1,
            activation: 'sigmoid'
          })
        ]
      });

      model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      this.performanceModel = model;
    } catch (error) {
      console.warn('Failed to initialize ML model, using fallback calculations:', error);
    }
  }

  /**
   * Setup real-time product monitoring
   */
  async setupRealtimeMonitoring(callback: (update: IntelligenceUpdate) => void): Promise<void> {
    const subscription = this.supabase
      .channel('product-updates')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'insights', filter: 'type=in.(click,conversion,revenue)' },
        async (payload) => {
          try {
            const { new: newData } = payload;
            
            if (newData.product_id) {
              // Check if this update indicates significant performance change
              const performanceUpdate = await this.analyzePerformanceUpdate(newData);
              
              if (performanceUpdate) {
                callback({
                  type: 'product',
                  data: performanceUpdate,
                  timestamp: new Date(),
                  priority: 'medium'
                });
              }
            }
          } catch (error) {
            console.error('Error processing real-time product update:', error);
          }
        }
      )
      .subscribe();
  }

  /**
   * Analyze performance update for significant changes
   */
  private async analyzePerformanceUpdate(newData: any): Promise<any> {
    const { data: recentMetrics } = await this.supabase
      .from('product_intelligence')
      .select('*')
      .eq('product_id', newData.product_id)
      .order('last_updated', { ascending: false })
      .limit(1);

    if (!recentMetrics?.length) return null;

    const metric = recentMetrics[0];
    
    // Check for significant performance changes
    if (newData.type === 'conversion' && parseFloat(newData.value) > metric.conversion_rate * 1.5) {
      return {
        product_id: newData.product_id,
        type: 'performance_spike',
        old_value: metric.conversion_rate,
        new_value: parseFloat(newData.value),
        message: 'Significant conversion rate increase detected'
      };
    }

    return null;
  }

  /**
   * Get top performing products by category
   */
  async getTopProducts(
    category?: string,
    limit: number = 10
  ): Promise<ProductMetrics[]> {
    let query = this.supabase
      .from('product_intelligence')
      .select('*')
      .order('trending_score', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }
}