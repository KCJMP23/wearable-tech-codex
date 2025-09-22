import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { linearRegression } from 'simple-statistics';
import { subDays } from 'date-fns';
import { PricingRecommendation } from './types';

interface ProductRow {
  id: string;
  price: number;
  category: string;
  asin?: string | null;
}

interface PriceHistoryRow {
  price: number;
  timestamp: string;
  conversions: number | null;
}

interface CompetitorPriceRow {
  price: number | null;
}

export class PricingOptimizer {
  private supabase: SupabaseClient;
  private elasticityCache: Map<string, number> = new Map();
  private competitorPriceCache: Map<string, number[]> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async optimizePricing(
    productIds: string[], 
    strategy: 'maximize_revenue' | 'maximize_volume' | 'competitive' = 'maximize_revenue'
  ): Promise<PricingRecommendation[]> {
    const recommendations: PricingRecommendation[] = [];

    for (const productId of productIds) {
      try {
        // Fetch product and historical data
        const { data: product } = await this.supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .maybeSingle();

        const productRow = product as ProductRow | null;

        if (!productRow) continue;

        // Get price history and performance
        const priceHistory = await this.fetchPriceHistory(productId);
        const elasticity = await this.calculatePriceElasticity(productId, priceHistory);
        const competitorPrices = await this.fetchCompetitorPrices(productRow.category, productRow.asin ?? undefined);

        // Calculate optimal price based on strategy
        const recommendedPrice = await this.calculateOptimalPrice(
          productRow,
          elasticity,
          competitorPrices,
          strategy
        );

        // Estimate revenue impact
        const expectedRevenueLift = this.estimateRevenueLift(
          productRow.price,
          recommendedPrice,
          elasticity
        );

        recommendations.push({
          productId,
          currentPrice: productRow.price,
          recommendedPrice,
          elasticity,
          expectedRevenueLift,
          competitorPrices,
          priceHistory: priceHistory.slice(0, 10) // Last 10 price points
        });

      } catch (error) {
        console.error(`Error optimizing price for ${productId}:`, error);
      }
    }

    return recommendations;
  }

  private async fetchPriceHistory(productId: string): Promise<Array<{
    date: Date;
    price: number;
    conversions: number;
  }>> {
    const { data, error } = await this.supabase
      .from('price_history')
      .select('price, timestamp, conversions')
      .eq('product_id', productId)
      .gte('timestamp', subDays(new Date(), 90).toISOString())
      .order('timestamp', { ascending: false });

    if (error || !data?.length) {
      // Fallback to current price if no history
      const { data: product } = await this.supabase
        .from('products')
        .select('price')
        .eq('id', productId)
        .maybeSingle();

      return [{
        date: new Date(),
        price: (product as ProductRow | null)?.price || 0,
        conversions: 0
      }];
    }

    return data.map(row => ({
      date: new Date(row.timestamp),
      price: row.price,
      conversions: row.conversions || 0
    }));
  }

  private async calculatePriceElasticity(
    productId: string, 
    priceHistory: Array<{ date: Date; price: number; conversions: number }>
  ): Promise<number> {
    // Check cache
    const cached = this.elasticityCache.get(productId);
    if (cached !== undefined) return cached;

    if (priceHistory.length < 3) {
      // Default elasticity if insufficient data
      return -1.2;
    }

    // Calculate price elasticity of demand using regression
    const dataPoints: [number, number][] = [];

    for (let i = 0; i < priceHistory.length - 1; i++) {
      const current = priceHistory[i];
      const previous = priceHistory[i + 1];

      if (previous.price !== current.price && previous.conversions > 0) {
        const priceChange = (current.price - previous.price) / previous.price;
        const demandChange = (current.conversions - previous.conversions) / previous.conversions;
        
        if (priceChange !== 0) {
          dataPoints.push([priceChange, demandChange]);
        }
      }
    }

    if (dataPoints.length < 2) {
      return -1.2; // Default elasticity
    }

    // Calculate elasticity coefficient
    const regression = linearRegression(dataPoints);
    const elasticity = regression.m;

    // Cache result
    this.elasticityCache.set(productId, elasticity);

    return elasticity;
  }

  private async fetchCompetitorPrices(category: string, asin?: string): Promise<number[]> {
    const cacheKey = `${category}-${asin || 'all'}`;
    const cached = this.competitorPriceCache.get(cacheKey);
    if (cached) return cached;

    // Get competitor products in same category
    const { data: competitors } = await this.supabase
      .from('products')
      .select('price')
      .eq('category', category)
      .neq('asin', asin || '')
      .limit(20);

    const prices = (competitors || [])
      .map(entry => entry.price)
      .filter((value): value is number => typeof value === 'number' && value > 0);

    // If we have external price monitoring data
    const { data: externalPrices } = await this.supabase
      .from('competitor_prices')
      .select('price')
      .eq('category', category)
      .gte('timestamp', subDays(new Date(), 1).toISOString());

    if (externalPrices?.length) {
      prices.push(
        ...externalPrices
          .map(entry => entry.price)
          .filter((value): value is number => typeof value === 'number' && value > 0)
      );
    }

    // Cache for 1 hour
    this.competitorPriceCache.set(cacheKey, prices);
    setTimeout(() => this.competitorPriceCache.delete(cacheKey), 3600000);

    return prices;
  }

  private async calculateOptimalPrice(
    product: ProductRow,
    elasticity: number,
    competitorPrices: number[],
    strategy: 'maximize_revenue' | 'maximize_volume' | 'competitive'
  ): Promise<number> {
    const currentPrice = product.price;
    let optimalPrice = currentPrice;

    // Calculate price statistics
    const avgCompetitorPrice = competitorPrices.length > 0
      ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length
      : currentPrice;
    
    const minCompetitorPrice = Math.min(...competitorPrices, currentPrice);
    const maxCompetitorPrice = Math.max(...competitorPrices, currentPrice);

    switch (strategy) {
      case 'maximize_revenue': {
        // Revenue = Price × Quantity
        // Optimal price using elasticity formula: P* = MC × (ε / (ε + 1))
        // Assuming MC ≈ 0.3 × current price for affiliate commission
        const marginalCost = currentPrice * 0.3;
        if (elasticity < -1) {
          optimalPrice = marginalCost * (elasticity / (elasticity + 1));
        } else {
          // If demand is inelastic, increase price
          optimalPrice = currentPrice * 1.1;
        }
        break;
      }

      case 'maximize_volume': {
        // Price below competitors to increase volume
        optimalPrice = Math.max(
          minCompetitorPrice * 0.95,
          currentPrice * 0.9
        );
        break;
      }

      case 'competitive': {
        // Match average competitor price
        optimalPrice = avgCompetitorPrice;
        break;
      }
    }

    // Apply constraints
    optimalPrice = this.applyPriceConstraints(
      optimalPrice,
      currentPrice,
      minCompetitorPrice,
      maxCompetitorPrice
    );

    // Round to psychological pricing
    return this.applyPsychologicalPricing(optimalPrice);
  }

  private applyPriceConstraints(
    price: number,
    currentPrice: number,
    minCompetitor: number,
    maxCompetitor: number
  ): number {
    // Don't change price more than 20% at once
    const maxChange = currentPrice * 0.2;
    price = Math.max(currentPrice - maxChange, Math.min(currentPrice + maxChange, price));

    // Stay within reasonable bounds of competitor prices
    if (minCompetitor > 0) {
      price = Math.max(minCompetitor * 0.8, price);
    }
    if (maxCompetitor > 0) {
      price = Math.min(maxCompetitor * 1.2, price);
    }

    // Minimum price threshold
    price = Math.max(9.99, price);

    return price;
  }

  private applyPsychologicalPricing(price: number): number {
    // Apply charm pricing (.99, .95, etc.)
    if (price < 10) {
      return Math.floor(price) + 0.99;
    } else if (price < 50) {
      return Math.floor(price) + 0.95;
    } else if (price < 100) {
      return Math.round(price / 5) * 5 - 0.01;
    } else {
      return Math.round(price / 10) * 10 - 0.01;
    }
  }

  private estimateRevenueLift(
    currentPrice: number,
    recommendedPrice: number,
    elasticity: number
  ): number {
    if (currentPrice === 0) return 0;

    const priceChange = (recommendedPrice - currentPrice) / currentPrice;
    const quantityChange = priceChange * elasticity;
    
    // Revenue change = (1 + price change) × (1 + quantity change) - 1
    const revenueLift = (1 + priceChange) * (1 + quantityChange) - 1;
    
    return revenueLift;
  }

  async runPricingExperiment(
    productId: string,
    testPrices: number[],
    duration: number = 7 // days
  ): Promise<{ 
    winner: number; 
    results: Array<{ price: number; revenue: number; conversions: number }> 
  }> {
    // This would implement A/B testing for different price points
    // For now, return simulated results based on elasticity
    const { data: product } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product) throw new Error('Product not found');

    const priceHistory = await this.fetchPriceHistory(productId);
    const elasticity = await this.calculatePriceElasticity(productId, priceHistory);

    const durationFactor = Math.max(1, duration / 7);

    const results = testPrices.map(price => {
      const priceChange = (price - product.price) / product.price;
      const quantityChange = 1 + (priceChange * elasticity);
      const estimatedConversions = Math.max(0, 100 * quantityChange * durationFactor);
      const revenue = price * estimatedConversions;

      return {
        price,
        revenue,
        conversions: Math.round(estimatedConversions)
      };
    });

    // Find winner by revenue
    const winner = results.reduce((max, curr) => 
      curr.revenue > max.revenue ? curr : max
    );

    return {
      winner: winner.price,
      results
    };
  }

  async monitorPriceCompetitiveness(productIds: string[]): Promise<Map<string, {
    isCompetitive: boolean;
    position: number;
    recommendation: string;
  }>> {
    const results = new Map();

    for (const productId of productIds) {
      const { data: product } = await this.supabase
        .from('products')
        .select('price, category')
        .eq('id', productId)
        .single();

      if (!product) continue;

      const competitorPrices = await this.fetchCompetitorPrices(product.category);
      
      if (competitorPrices.length === 0) {
        results.set(productId, {
          isCompetitive: true,
          position: 1,
          recommendation: 'No competitors found'
        });
        continue;
      }

      const sorted = [...competitorPrices, product.price].sort((a, b) => a - b);
      const position = sorted.indexOf(product.price) + 1;
      const percentile = position / sorted.length;

      let recommendation = '';
      let isCompetitive = true;

      if (percentile > 0.75) {
        isCompetitive = false;
        recommendation = 'Price is in top 25% - consider reducing';
      } else if (percentile < 0.25) {
        recommendation = 'Price is in bottom 25% - room to increase';
      } else {
        recommendation = 'Price is competitive';
      }

      results.set(productId, {
        isCompetitive,
        position,
        recommendation
      });
    }

    return results;
  }

  async getDynamicPricing(
    productId: string,
    context: {
      timeOfDay: number;
      dayOfWeek: number;
      isHoliday: boolean;
      inventory?: number;
      competitorActivity?: 'high' | 'normal' | 'low';
    }
  ): Promise<number> {
    const { data: product } = await this.supabase
      .from('products')
      .select('price')
      .eq('id', productId)
      .single();

    if (!product) throw new Error('Product not found');

    let multiplier = 1.0;

    // Time-based adjustments
    if (context.timeOfDay >= 18 && context.timeOfDay <= 22) {
      multiplier *= 1.05; // Evening premium
    } else if (context.timeOfDay >= 2 && context.timeOfDay <= 6) {
      multiplier *= 0.95; // Late night discount
    }

    // Day of week adjustments
    if (context.dayOfWeek === 0 || context.dayOfWeek === 6) {
      multiplier *= 1.03; // Weekend premium
    }

    // Holiday adjustments
    if (context.isHoliday) {
      multiplier *= 1.1;
    }

    // Inventory-based adjustments
    if (context.inventory !== undefined) {
      if (context.inventory < 10) {
        multiplier *= 1.08; // Scarcity pricing
      } else if (context.inventory > 100) {
        multiplier *= 0.97; // Clear inventory
      }
    }

    // Competitor activity adjustments
    if (context.competitorActivity === 'high') {
      multiplier *= 0.98; // More competitive
    } else if (context.competitorActivity === 'low') {
      multiplier *= 1.02; // Less pressure
    }

    const dynamicPrice = product.price * multiplier;
    return this.applyPsychologicalPricing(dynamicPrice);
  }
}
