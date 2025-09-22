import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { subDays } from 'date-fns';
import { PlacementOptimization } from './types';
import { LogisticRegression } from './utils/logistic-regression.js';

interface CTRTrainingRow {
  product_id: string;
  position: number;
  clicked: boolean;
  page_type: string;
  timestamp: string;
  products?: {
    price?: number | null;
    rating?: number | null;
    reviews?: number | null;
  } | Array<{
    price?: number | null;
    rating?: number | null;
    reviews?: number | null;
  }>;
}

interface ProductStatsRow {
  price?: number | null;
  rating?: number | null;
  reviews?: number | null;
}

export class PlacementEngine {
  private supabase: SupabaseClient;
  private clickModel: LogisticRegression | null = null;
  private positionBiasFactors: Map<number, number> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializePositionBias();
  }

  private initializePositionBias(): void {
    // Position bias factors based on eye-tracking studies
    const biasFactors = [
      1.0,   // Position 1
      0.7,   // Position 2
      0.5,   // Position 3
      0.35,  // Position 4
      0.25,  // Position 5
      0.18,  // Position 6
      0.12,  // Position 7
      0.08,  // Position 8
      0.05,  // Position 9
      0.03   // Position 10+
    ];

    biasFactors.forEach((factor, index) => {
      this.positionBiasFactors.set(index + 1, factor);
    });
  }

  async optimizePlacements(
    productIds: string[],
    pageType: 'home' | 'category' | 'search' | 'article',
    userSegments?: string[]
  ): Promise<PlacementOptimization[]> {
    // Fetch click-through data for products
    const clickData = await this.fetchClickData(productIds, pageType);
    
    // Calculate relevance scores
    const relevanceScores = await this.calculateRelevanceScores(
      productIds,
      pageType,
      userSegments
    );

    // Run optimization algorithm
    const optimizedOrder = this.runOptimizationAlgorithm(
      productIds,
      clickData,
      relevanceScores
    );

    // Generate recommendations
    return this.generatePlacementRecommendations(
      optimizedOrder,
      clickData,
      pageType,
      userSegments || []
    );
  }

  private async fetchClickData(
    productIds: string[],
    pageType: string
  ): Promise<Map<string, { clicks: number; impressions: number; position: number }>> {
    const clickMap = new Map();

    const { data, error } = await this.supabase
      .from('placement_analytics')
      .select('product_id, position, clicks, impressions')
      .in('product_id', productIds)
      .eq('page_type', pageType)
      .gte('timestamp', subDays(new Date(), 30).toISOString());

    if (error) {
      console.error('Error fetching click data:', error);
      return clickMap;
    }

    // Aggregate by product
    for (const record of data || []) {
      const existing = clickMap.get(record.product_id) || {
        clicks: 0,
        impressions: 0,
        position: record.position
      };

      clickMap.set(record.product_id, {
        clicks: existing.clicks + record.clicks,
        impressions: existing.impressions + record.impressions,
        position: record.position // Keep latest position
      });
    }

    return clickMap;
  }

  private async calculateRelevanceScores(
    productIds: string[],
    pageType: string,
    userSegments?: string[]
  ): Promise<Map<string, number>> {
    const scores = new Map();

    for (const productId of productIds) {
      let score = 0;

      // Fetch product data
      const { data: product } = await this.supabase
        .from('products')
        .select('rating, reviews, price, category, created_at')
        .eq('id', productId)
        .single();

      if (!product) continue;

      // Base relevance factors
      score += (product.rating || 0) / 5 * 0.3; // Rating component
      score += Math.min(Math.log1p(product.reviews || 0) / 10, 1) * 0.2; // Reviews component
      
      // Recency factor
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyScore = Math.exp(-daysSinceCreated / 30); // Decay over 30 days
      score += recencyScore * 0.1;

      // Page-specific relevance
      if (pageType === 'home') {
        // Boost bestsellers and featured products
        const { data: salesData } = await this.supabase
          .from('analytics')
          .select('conversions')
          .eq('product_id', productId)
          .gte('timestamp', subDays(new Date(), 7).toISOString());

        const totalConversions = salesData?.reduce((sum, d) => sum + d.conversions, 0) || 0;
        score += Math.min(totalConversions / 100, 1) * 0.2;
      }

      // User segment relevance
      if (userSegments?.length) {
        const segmentScore = await this.calculateSegmentRelevance(productId, userSegments);
        score += segmentScore * 0.2;
      }

      scores.set(productId, score);
    }

    return scores;
  }

  private async calculateSegmentRelevance(
    productId: string,
    segments: string[]
  ): Promise<number> {
    // Check historical performance for these segments
    const { data } = await this.supabase
      .from('segment_product_performance')
      .select('conversion_rate')
      .eq('product_id', productId)
      .in('segment_id', segments);

    if (!data?.length) return 0.5;

    const avgConversionRate = data.reduce((sum, d) => sum + d.conversion_rate, 0) / data.length;
    return Math.min(avgConversionRate * 10, 1); // Normalize to 0-1
  }

  private runOptimizationAlgorithm(
    productIds: string[],
    clickData: Map<string, { clicks: number; impressions: number; position: number }>,
    relevanceScores: Map<string, number>
  ): string[] {
    // Calculate expected CTR for each product
    const productScores = productIds.map(productId => {
      const clicks = clickData.get(productId);
      const relevance = relevanceScores.get(productId) || 0;
      
      // Historical CTR (corrected for position bias)
      let historicalCTR = 0;
      if (clicks && clicks.impressions > 0) {
        const rawCTR = clicks.clicks / clicks.impressions;
        const positionBias = this.positionBiasFactors.get(clicks.position) || 0.03;
        historicalCTR = rawCTR / positionBias; // Normalize by position
      }

      // Combined score
      const score = historicalCTR * 0.6 + relevance * 0.4;

      return { productId, score };
    });

    // Sort by score descending
    productScores.sort((a, b) => b.score - a.score);

    // Apply diversification
    return this.applyDiversification(productScores.map(p => p.productId));
  }

  private applyDiversification(orderedProducts: string[]): string[] {
    // Prevent too many similar products in top positions
    // This is simplified - in production, would check actual categories/attributes
    const diversified: string[] = [];
    const seen = new Set<string>();

    for (const productId of orderedProducts) {
      // In production, would check product category/brand
      // For now, just ensure spacing between duplicates
      if (!seen.has(productId)) {
        diversified.push(productId);
        seen.add(productId);
      }
    }

    return diversified;
  }

  private async generatePlacementRecommendations(
    optimizedOrder: string[],
    clickData: Map<string, { clicks: number; impressions: number; position: number }>,
    pageType: 'home' | 'category' | 'search' | 'article',
    segments: string[]
  ): Promise<PlacementOptimization[]> {
    const recommendations: PlacementOptimization[] = [];

    for (let i = 0; i < optimizedOrder.length; i++) {
      const productId = optimizedOrder[i];
      const newPosition = i + 1;
      const currentData = clickData.get(productId);
      const currentPosition = currentData?.position || 999;

      // Calculate expected CTR lift
      const expectedCTRLift = this.calculateExpectedCTRLift(
        currentPosition,
        newPosition,
        currentData
      );

      recommendations.push({
        productId,
        currentPosition,
        recommendedPosition: newPosition,
        expectedCTRLift,
        pageType,
        segments
      });
    }

    return recommendations;
  }

  private calculateExpectedCTRLift(
    currentPosition: number,
    newPosition: number,
    clickStats?: { clicks: number; impressions: number; position: number }
  ): number {
    const currentBias = this.positionBiasFactors.get(currentPosition) || 0.03;
    const newBias = this.positionBiasFactors.get(newPosition) || 0.03;

    if (currentBias === 0) return 0;

    const lift = ((newBias - currentBias) / currentBias) * 100;

    if (clickStats && clickStats.impressions > 0) {
      const historicalCtr = clickStats.clicks / clickStats.impressions;
      const stabilityFactor = Math.min(1.5, Math.max(0.5, historicalCtr * 10));
      return lift * stabilityFactor;
    }

    return lift;
  }

  async trainClickModel(): Promise<void> {
    console.log('Training click prediction model...');

    // Fetch training data
    const { data, error } = await this.supabase
      .from('user_interactions')
      .select(`
        product_id,
        position,
        clicked,
        page_type,
        user_segment,
        timestamp,
        products!inner(
          price,
          rating,
          reviews,
          category
        )
      `)
      .gte('timestamp', subDays(new Date(), 30).toISOString())
      .limit(10000);

    if (error || !data?.length) {
      console.error('Insufficient training data');
      return;
    }

    // Prepare features and labels
    const features: number[][] = [];
    const labels: number[] = [];

    for (const row of data as CTRTrainingRow[]) {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      if (!product) continue;

      const feature = [
        row.position / 10,
        (product.rating ?? 0) / 5,
        Math.log1p(product.reviews ?? 0) / 10,
        Math.log1p(product.price ?? 0) / 10,
        this.encodePageType(row.page_type),
        new Date(row.timestamp).getHours() / 24
      ];

      features.push(feature);
      labels.push(row.clicked ? 1 : 0);
    }

    if (!features.length) {
      console.warn('No usable interactions for CTR model');
      return;
    }

    this.clickModel = new LogisticRegression({ learningRate: 0.2, iterations: 250, l2: 0.01 });
    this.clickModel.train(features, labels);

    console.log('Click model training completed');
  }

  private encodePageType(pageType: string): number {
    const mapping: Record<string, number> = {
      'home': 0,
      'category': 0.33,
      'search': 0.66,
      'article': 1
    };
    return mapping[pageType] || 0.5;
  }

  async predictCTR(
    productId: string,
    position: number,
    pageType: string
  ): Promise<number> {
    if (!this.clickModel) {
      await this.trainClickModel();
    }

    if (!this.clickModel) return 0;

    // Fetch product data
    const { data: product } = await this.supabase
      .from('products')
      .select('price, rating, reviews')
      .eq('id', productId)
      .single();

    const productRow = product as ProductStatsRow | null;

    if (!productRow) return 0;

    const rating = typeof productRow.rating === 'number' ? productRow.rating : 0;
    const reviews = typeof productRow.reviews === 'number' ? productRow.reviews : 0;
    const price = typeof productRow.price === 'number' ? productRow.price : 0;

    const features = [
      position / 10,
      rating / 5,
      Math.log1p(reviews) / 10,
      Math.log1p(price) / 10,
      this.encodePageType(pageType),
      new Date().getHours() / 24
    ];

    const [ctrRaw] = this.clickModel.predict([features]);
    return Math.min(Math.max(ctrRaw ?? 0, 0), 1);
  }

  async personalizeLayout(
    userId: string,
    productIds: string[],
    pageType: string
  ): Promise<string[]> {
    // Fetch user preferences
    const { data: userPrefs } = await this.supabase
      .from('user_preferences')
      .select('preferred_categories, price_range, brand_affinity')
      .eq('user_id', userId)
      .single();

    // Fetch user interaction history
    const { data: interactions } = await this.supabase
      .from('user_interactions')
      .select('product_id, action, timestamp')
      .eq('user_id', userId)
      .gte('timestamp', subDays(new Date(), 30).toISOString());

    // Score products based on user preferences
    const scores = new Map<string, number>();

    for (const productId of productIds) {
      let score = 0;

      // Check if user has interacted with this product
      const userInteraction = interactions?.find(i => i.product_id === productId);
      if (userInteraction) {
        if (userInteraction.action === 'purchase') score += 1.0;
        else if (userInteraction.action === 'click') score += 0.5;
        else if (userInteraction.action === 'view') score += 0.2;
      }

      // Adjust for page context to diversify layouts per surface
      switch (pageType) {
        case 'home':
          score += 0.05;
          break;
        case 'search':
          score += 0.1;
          break;
        case 'article':
          score += 0.08;
          break;
        default:
          score += 0.04;
      }

      // Fetch product details
      const { data: product } = await this.supabase
        .from('products')
        .select('category, price, brand')
        .eq('id', productId)
        .single();

      if (product && userPrefs) {
        // Category preference
        if (userPrefs.preferred_categories?.includes(product.category)) {
          score += 0.3;
        }

        // Price range preference
        const [minPrice, maxPrice] = userPrefs.price_range || [0, Infinity];
        if (product.price >= minPrice && product.price <= maxPrice) {
          score += 0.2;
        }

        // Brand affinity
        if (userPrefs.brand_affinity?.[product.brand] > 0) {
          score += userPrefs.brand_affinity[product.brand] * 0.2;
        }
      }

      scores.set(productId, score);
    }

    // Sort by personalized score
    return productIds.sort((a, b) => 
      (scores.get(b) || 0) - (scores.get(a) || 0)
    );
  }

  async getHeatmapData(
    pageType: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{
    position: number;
    avgCTR: number;
    avgConversionRate: number;
    revenue: number;
  }>> {
    const { data, error } = await this.supabase
      .from('placement_analytics')
      .select('position, clicks, impressions, conversions, revenue')
      .eq('page_type', pageType)
      .gte('timestamp', timeRange.start.toISOString())
      .lte('timestamp', timeRange.end.toISOString());

    if (error || !data) return [];

    // Aggregate by position
    const positionMap = new Map();

    for (const record of data) {
      const existing = positionMap.get(record.position) || {
        clicks: 0,
        impressions: 0,
        conversions: 0,
        revenue: 0
      };

      positionMap.set(record.position, {
        clicks: existing.clicks + record.clicks,
        impressions: existing.impressions + record.impressions,
        conversions: existing.conversions + record.conversions,
        revenue: existing.revenue + record.revenue
      });
    }

    // Calculate metrics
    const results: Array<{
      position: number;
      avgCTR: number;
      avgConversionRate: number;
      revenue: number;
    }> = [];

    positionMap.forEach((stats, position) => {
      results.push({
        position,
        avgCTR: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
        avgConversionRate: stats.clicks > 0 ? stats.conversions / stats.clicks : 0,
        revenue: stats.revenue
      });
    });

    return results.sort((a, b) => a.position - b.position);
  }
}
