/**
 * Site Valuation Calculator
 * 
 * Comprehensive valuation system for affiliate sites using multiple methodologies:
 * - Revenue Multiple Method (industry standard 24x-48x monthly revenue)
 * - Asset-Based Valuation (content, domain, traffic assets)
 * - Traffic-Based Valuation (monetizable pageviews)
 * - Comparable Site Analysis
 * 
 * @module valuation
 */

import { createClient } from './supabase/client.js';

// =============================================================================
// Types
// =============================================================================

export type ValuationMethod = 'revenue_multiple' | 'asset_based' | 'traffic_based' | 'comparable';
export type ValuationConfidence = 'low' | 'medium' | 'high';
export type TrafficSource = 'organic' | 'direct' | 'referral' | 'social' | 'paid';

export interface ValuationMetrics {
  // Revenue metrics
  monthlyRevenue: number;
  yearlyRevenue: number;
  revenueGrowthRate: number; // % growth month-over-month
  revenueConsistency: number; // 0-1 score for revenue stability
  
  // Traffic metrics
  monthlyPageviews: number;
  uniqueVisitors: number;
  averageSessionDuration: number; // seconds
  bounceRate: number; // 0-1
  conversionRate: number; // 0-1
  
  // Content metrics
  totalPosts: number;
  publishingFrequency: number; // posts per month
  averageWordCount: number;
  contentQualityScore: number; // 0-1
  
  // SEO metrics
  domainAuthority: number; // 0-100
  backlinks: number;
  rankingKeywords: number;
  organicTrafficPercentage: number; // 0-1
  
  // Technical metrics
  pagespeedScore: number; // 0-100
  uptimePercentage: number; // 0-1
  mobileOptimization: number; // 0-1
  
  // Business metrics
  operatingExpenses: number; // monthly
  timeInvestment: number; // hours per week
  dependencyRisk: number; // 0-1 (higher = more risky)
  diversificationScore: number; // 0-1 (higher = more diversified)
}

export interface ValuationRange {
  low: number;
  mid: number;
  high: number;
  confidence: ValuationConfidence;
}

export interface ValuationResult {
  totalValuation: ValuationRange;
  methodBreakdown: Record<ValuationMethod, ValuationRange>;
  confidence: ValuationConfidence;
  factors: {
    positive: string[];
    negative: string[];
    recommendations: string[];
  };
  comparables: ComparableSite[];
  lastCalculatedAt: string;
}

export interface ComparableSite {
  domain: string;
  niche: string;
  monthlyRevenue: number;
  monthlyPageviews: number;
  salePrice: number;
  saleDate: string;
  multipleAchieved: number;
  source: string; // flippa, empire-flippers, etc.
}

export interface SiteValuation {
  id: string;
  tenantId: string;
  metrics: ValuationMetrics;
  result: ValuationResult;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Industry Standards & Constants
// =============================================================================

const REVENUE_MULTIPLES = {
  // Base multiples by site characteristics
  STARTER_SITE: { min: 20, max: 28 }, // New sites, inconsistent revenue
  ESTABLISHED_SITE: { min: 28, max: 36 }, // 1+ years, consistent revenue
  PREMIUM_SITE: { min: 36, max: 48 }, // High authority, diversified traffic
  
  // Adjustments based on factors
  ADJUSTMENTS: {
    HIGH_GROWTH: 1.2, // 20%+ month-over-month growth
    DECLINING: 0.7, // Declining revenue trend
    AMAZON_DEPENDENT: 0.8, // >80% Amazon affiliate revenue
    DIVERSIFIED_REVENUE: 1.15, // Multiple revenue streams
    HIGH_AUTHORITY: 1.1, // DA 50+
    MOBILE_OPTIMIZED: 1.05, // Mobile-first design
    STRONG_BRAND: 1.1, // Recognizable brand/social following
  }
};

const TRAFFIC_VALUE_PER_PAGEVIEW = {
  ECOMMERCE: 0.003, // $3 per 1000 pageviews
  AFFILIATE: 0.002, // $2 per 1000 pageviews
  INFO: 0.001, // $1 per 1000 pageviews
  NICHE_AUTHORITY: 0.005, // $5 per 1000 pageviews for high-converting niches
};

const CONTENT_VALUE_PER_POST = {
  SHORT_FORM: 50, // < 1000 words
  MEDIUM_FORM: 150, // 1000-3000 words
  LONG_FORM: 300, // 3000+ words
  PILLAR_CONTENT: 500, // Comprehensive guides/resources
};

// =============================================================================
// Core Valuation Class
// =============================================================================

export class SiteValuator {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Calculate comprehensive site valuation using multiple methods
   */
  async calculateValuation(
    tenantId: string, 
    metrics: ValuationMetrics
  ): Promise<ValuationResult> {
    const revenueValuation = this.calculateRevenueMultiple(metrics);
    const assetValuation = this.calculateAssetBased(metrics);
    const trafficValuation = this.calculateTrafficBased(metrics);
    const comparables = await this.findComparableSites(metrics);
    
    // Weight different methods based on data quality
    const weights = this.calculateMethodWeights(metrics);
    const totalValuation = this.calculateWeightedAverage([
      { method: 'revenue_multiple', valuation: revenueValuation, weight: weights.revenue },
      { method: 'asset_based', valuation: assetValuation, weight: weights.asset },
      { method: 'traffic_based', valuation: trafficValuation, weight: weights.traffic },
    ]);

    const confidence = this.assessConfidence(metrics);
    const factors = this.identifyValuationFactors(metrics);

    return {
      totalValuation,
      methodBreakdown: {
        revenue_multiple: revenueValuation,
        asset_based: assetValuation,
        traffic_based: trafficValuation,
        comparable: this.calculateComparableValuation(comparables, metrics),
      },
      confidence,
      factors,
      comparables,
      lastCalculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Revenue Multiple Method - Industry standard approach
   */
  private calculateRevenueMultiple(metrics: ValuationMetrics): ValuationRange {
    const { monthlyRevenue, revenueGrowthRate, revenueConsistency } = metrics;
    
    // Determine base multiple range
    let baseMultiple = REVENUE_MULTIPLES.STARTER_SITE;
    
    if (monthlyRevenue > 5000 && revenueConsistency > 0.8) {
      baseMultiple = REVENUE_MULTIPLES.ESTABLISHED_SITE;
    }
    
    if (monthlyRevenue > 15000 && metrics.domainAuthority > 50 && 
        metrics.organicTrafficPercentage > 0.6) {
      baseMultiple = REVENUE_MULTIPLES.PREMIUM_SITE;
    }

    // Apply adjustments
    let multiplier = 1.0;
    
    if (revenueGrowthRate > 0.2) multiplier *= REVENUE_MULTIPLES.ADJUSTMENTS.HIGH_GROWTH;
    if (revenueGrowthRate < -0.1) multiplier *= REVENUE_MULTIPLES.ADJUSTMENTS.DECLINING;
    if (metrics.dependencyRisk > 0.8) multiplier *= REVENUE_MULTIPLES.ADJUSTMENTS.AMAZON_DEPENDENT;
    if (metrics.diversificationScore > 0.7) multiplier *= REVENUE_MULTIPLES.ADJUSTMENTS.DIVERSIFIED_REVENUE;
    if (metrics.domainAuthority > 50) multiplier *= REVENUE_MULTIPLES.ADJUSTMENTS.HIGH_AUTHORITY;
    if (metrics.mobileOptimization > 0.9) multiplier *= REVENUE_MULTIPLES.ADJUSTMENTS.MOBILE_OPTIMIZED;

    const adjustedLow = baseMultiple.min * multiplier;
    const adjustedHigh = baseMultiple.max * multiplier;
    const adjustedMid = (adjustedLow + adjustedHigh) / 2;

    return {
      low: Math.round(monthlyRevenue * adjustedLow),
      mid: Math.round(monthlyRevenue * adjustedMid),
      high: Math.round(monthlyRevenue * adjustedHigh),
      confidence: revenueConsistency > 0.8 ? 'high' : revenueConsistency > 0.6 ? 'medium' : 'low',
    };
  }

  /**
   * Asset-Based Valuation - Content, domain, and traffic value
   */
  private calculateAssetBased(metrics: ValuationMetrics): ValuationRange {
    // Content asset value
    const avgWordsPerPost = metrics.averageWordCount;
    let contentValuePerPost = CONTENT_VALUE_PER_POST.SHORT_FORM;
    
    if (avgWordsPerPost > 3000) contentValuePerPost = CONTENT_VALUE_PER_POST.LONG_FORM;
    else if (avgWordsPerPost > 1000) contentValuePerPost = CONTENT_VALUE_PER_POST.MEDIUM_FORM;
    
    // Quality adjustment
    contentValuePerPost *= metrics.contentQualityScore;
    
    const contentValue = metrics.totalPosts * contentValuePerPost;

    // Domain and SEO value
    const domainValue = Math.min(metrics.domainAuthority * 500, 50000); // Cap at $50k
    const backlinkValue = Math.min(metrics.backlinks * 10, 25000); // Cap at $25k
    const keywordValue = Math.min(metrics.rankingKeywords * 5, 15000); // Cap at $15k

    // Traffic asset value (12 months of monetizable traffic)
    const monthlyTrafficValue = metrics.monthlyPageviews * TRAFFIC_VALUE_PER_PAGEVIEW.AFFILIATE;
    const trafficAssetValue = monthlyTrafficValue * 12;

    const totalAssetValue = contentValue + domainValue + backlinkValue + 
                           keywordValue + trafficAssetValue;

    return {
      low: Math.round(totalAssetValue * 0.7),
      mid: Math.round(totalAssetValue),
      high: Math.round(totalAssetValue * 1.3),
      confidence: 'medium',
    };
  }

  /**
   * Traffic-Based Valuation - Monetizable pageview approach
   */
  private calculateTrafficBased(metrics: ValuationMetrics): ValuationRange {
    const { monthlyPageviews, conversionRate, averageSessionDuration, bounceRate } = metrics;
    
    // Quality-adjusted pageviews
    const qualityScore = this.calculateTrafficQuality(metrics);
    const qualityAdjustedPageviews = monthlyPageviews * qualityScore;
    
    // Determine value per pageview based on site characteristics
    let valuePerPageview = TRAFFIC_VALUE_PER_PAGEVIEW.AFFILIATE;
    
    if (conversionRate > 0.05 && metrics.domainAuthority > 40) {
      valuePerPageview = TRAFFIC_VALUE_PER_PAGEVIEW.NICHE_AUTHORITY;
    } else if (conversionRate > 0.02) {
      valuePerPageview = TRAFFIC_VALUE_PER_PAGEVIEW.ECOMMERCE;
    }

    // Annual traffic value with 24-month multiple (industry standard)
    const annualTrafficValue = qualityAdjustedPageviews * 12 * valuePerPageview;
    const trafficBasedValue = annualTrafficValue * 2; // 24-month multiple

    return {
      low: Math.round(trafficBasedValue * 0.8),
      mid: Math.round(trafficBasedValue),
      high: Math.round(trafficBasedValue * 1.2),
      confidence: qualityScore > 0.7 ? 'high' : qualityScore > 0.5 ? 'medium' : 'low',
    };
  }

  /**
   * Calculate traffic quality score (0-1)
   */
  private calculateTrafficQuality(metrics: ValuationMetrics): number {
    const organicScore = metrics.organicTrafficPercentage;
    const engagementScore = Math.min(metrics.averageSessionDuration / 180, 1); // Cap at 3 minutes
    const bounceScore = 1 - metrics.bounceRate;
    const conversionScore = Math.min(metrics.conversionRate * 20, 1); // Cap at 5%

    return (organicScore * 0.4 + engagementScore * 0.3 + bounceScore * 0.2 + conversionScore * 0.1);
  }

  /**
   * Calculate method weights based on data quality
   */
  private calculateMethodWeights(metrics: ValuationMetrics): {
    revenue: number;
    asset: number;
    traffic: number;
  } {
    // Higher revenue consistency increases revenue method weight
    const revenueWeight = 0.5 + (metrics.revenueConsistency * 0.3);
    
    // Longer history and more content increases asset method weight
    const contentMaturity = Math.min(metrics.totalPosts / 100, 1);
    const assetWeight = 0.2 + (contentMaturity * 0.2);
    
    // Remaining weight goes to traffic method
    const trafficWeight = 1 - revenueWeight - assetWeight;

    return { revenue: revenueWeight, asset: assetWeight, traffic: trafficWeight };
  }

  /**
   * Calculate weighted average of different valuation methods
   */
  private calculateWeightedAverage(
    valuations: Array<{ method: string; valuation: ValuationRange; weight: number }>
  ): ValuationRange {
    const weightedLow = valuations.reduce((sum, v) => sum + (v.valuation.low * v.weight), 0);
    const weightedMid = valuations.reduce((sum, v) => sum + (v.valuation.mid * v.weight), 0);
    const weightedHigh = valuations.reduce((sum, v) => sum + (v.valuation.high * v.weight), 0);

    // Confidence based on method agreement
    const confidence = this.calculateMethodAgreement(valuations);

    return {
      low: Math.round(weightedLow),
      mid: Math.round(weightedMid),
      high: Math.round(weightedHigh),
      confidence,
    };
  }

  /**
   * Calculate confidence based on agreement between methods
   */
  private calculateMethodAgreement(
    valuations: Array<{ valuation: ValuationRange; weight: number }>
  ): ValuationConfidence {
    const midValues = valuations.map(v => v.valuation.mid);
    const avg = midValues.reduce((sum, val) => sum + val, 0) / midValues.length;
    
    // Calculate coefficient of variation
    const variance = midValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / midValues.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avg;

    if (coefficientOfVariation < 0.2) return 'high';
    if (coefficientOfVariation < 0.4) return 'medium';
    return 'low';
  }

  /**
   * Assess overall confidence in valuation
   */
  private assessConfidence(metrics: ValuationMetrics): ValuationConfidence {
    let score = 0;
    let maxScore = 0;

    // Revenue data quality
    if (metrics.monthlyRevenue > 0) {
      maxScore += 3;
      if (metrics.revenueConsistency > 0.8) score += 3;
      else if (metrics.revenueConsistency > 0.6) score += 2;
      else score += 1;
    }

    // Traffic data quality
    if (metrics.monthlyPageviews > 0) {
      maxScore += 2;
      if (metrics.monthlyPageviews > 50000) score += 2;
      else score += 1;
    }

    // SEO data quality
    if (metrics.domainAuthority > 0) {
      maxScore += 2;
      if (metrics.domainAuthority > 30) score += 2;
      else score += 1;
    }

    // Content data quality
    if (metrics.totalPosts > 0) {
      maxScore += 1;
      score += 1;
    }

    const confidenceRatio = score / maxScore;
    if (confidenceRatio > 0.8) return 'high';
    if (confidenceRatio > 0.6) return 'medium';
    return 'low';
  }

  /**
   * Identify positive and negative valuation factors
   */
  private identifyValuationFactors(metrics: ValuationMetrics): {
    positive: string[];
    negative: string[];
    recommendations: string[];
  } {
    const positive: string[] = [];
    const negative: string[] = [];
    const recommendations: string[] = [];

    // Revenue factors
    if (metrics.revenueGrowthRate > 0.1) {
      positive.push(`Strong revenue growth (${(metrics.revenueGrowthRate * 100).toFixed(1)}% monthly)`);
    } else if (metrics.revenueGrowthRate < -0.05) {
      negative.push(`Declining revenue trend (${(metrics.revenueGrowthRate * 100).toFixed(1)}% monthly)`);
      recommendations.push('Analyze revenue decline causes and implement recovery strategies');
    }

    if (metrics.revenueConsistency > 0.8) {
      positive.push('Highly consistent revenue stream');
    } else if (metrics.revenueConsistency < 0.5) {
      negative.push('Inconsistent revenue pattern');
      recommendations.push('Focus on building more predictable revenue streams');
    }

    // Traffic factors
    if (metrics.organicTrafficPercentage > 0.7) {
      positive.push(`High organic traffic percentage (${(metrics.organicTrafficPercentage * 100).toFixed(0)}%)`);
    } else if (metrics.organicTrafficPercentage < 0.4) {
      negative.push(`Low organic traffic dependency (${(metrics.organicTrafficPercentage * 100).toFixed(0)}%)`);
      recommendations.push('Invest in SEO to increase organic traffic share');
    }

    if (metrics.conversionRate > 0.03) {
      positive.push(`Strong conversion rate (${(metrics.conversionRate * 100).toFixed(2)}%)`);
    } else if (metrics.conversionRate < 0.01) {
      negative.push(`Low conversion rate (${(metrics.conversionRate * 100).toFixed(2)}%)`);
      recommendations.push('Optimize conversion funnel and improve call-to-action placement');
    }

    // SEO factors
    if (metrics.domainAuthority > 50) {
      positive.push(`High domain authority (${metrics.domainAuthority})`);
    } else if (metrics.domainAuthority < 20) {
      negative.push(`Low domain authority (${metrics.domainAuthority})`);
      recommendations.push('Build high-quality backlinks to improve domain authority');
    }

    // Technical factors
    if (metrics.pagespeedScore > 90) {
      positive.push('Excellent page speed performance');
    } else if (metrics.pagespeedScore < 70) {
      negative.push(`Poor page speed (${metrics.pagespeedScore}/100)`);
      recommendations.push('Optimize images, minify code, and improve hosting for better performance');
    }

    if (metrics.mobileOptimization > 0.9) {
      positive.push('Excellent mobile optimization');
    } else if (metrics.mobileOptimization < 0.7) {
      negative.push('Poor mobile user experience');
      recommendations.push('Implement responsive design and mobile-first optimizations');
    }

    // Content factors
    if (metrics.totalPosts > 100 && metrics.averageWordCount > 2000) {
      positive.push('Substantial high-quality content library');
    } else if (metrics.totalPosts < 50) {
      negative.push('Limited content volume');
      recommendations.push('Increase content production and focus on comprehensive articles');
    }

    // Business risk factors
    if (metrics.dependencyRisk > 0.8) {
      negative.push('High dependency risk (single traffic/revenue source)');
      recommendations.push('Diversify traffic sources and revenue streams to reduce risk');
    } else if (metrics.diversificationScore > 0.7) {
      positive.push('Well-diversified traffic and revenue sources');
    }

    return { positive, negative, recommendations };
  }

  /**
   * Find comparable sites for valuation analysis
   */
  private async findComparableSites(metrics: ValuationMetrics): Promise<ComparableSite[]> {
    try {
      // Query comparable sites from database
      const { data: comparables } = await this.supabase
        .from('comparable_sites')
        .select('*')
        .gte('monthly_revenue', metrics.monthlyRevenue * 0.5)
        .lte('monthly_revenue', metrics.monthlyRevenue * 2)
        .gte('monthly_pageviews', metrics.monthlyPageviews * 0.3)
        .lte('monthly_pageviews', metrics.monthlyPageviews * 3)
        .order('sale_date', { ascending: false })
        .limit(10);

      const comparableRows = (comparables ?? []) as Array<{
        domain: string;
        niche: string;
        monthly_revenue: number;
        monthly_pageviews: number;
        sale_price: number;
        sale_date: string;
        source?: string;
      }>;

      return comparableRows.map(comp => ({
        domain: comp.domain,
        niche: comp.niche,
        monthlyRevenue: comp.monthly_revenue,
        monthlyPageviews: comp.monthly_pageviews,
        salePrice: comp.sale_price,
        saleDate: comp.sale_date,
        multipleAchieved: comp.sale_price / comp.monthly_revenue,
        source: comp.source,
      }));
    } catch (error) {
      console.error('Error fetching comparable sites:', error);
      return [];
    }
  }

  /**
   * Calculate valuation based on comparable sites
   */
  private calculateComparableValuation(
    comparables: ComparableSite[], 
    metrics: ValuationMetrics
  ): ValuationRange {
    if (comparables.length === 0) {
      return {
        low: 0,
        mid: 0,
        high: 0,
        confidence: 'low',
      };
    }

    const multiples = comparables.map(comp => comp.multipleAchieved);
    const avgMultiple = multiples.reduce((sum, mult) => sum + mult, 0) / multiples.length;
    const minMultiple = Math.min(...multiples);
    const maxMultiple = Math.max(...multiples);

    return {
      low: Math.round(metrics.monthlyRevenue * minMultiple),
      mid: Math.round(metrics.monthlyRevenue * avgMultiple),
      high: Math.round(metrics.monthlyRevenue * maxMultiple),
      confidence: comparables.length >= 5 ? 'high' : comparables.length >= 3 ? 'medium' : 'low',
    };
  }

  /**
   * Save valuation to database
   */
  async saveValuation(tenantId: string, metrics: ValuationMetrics, result: ValuationResult): Promise<string> {
    const supabase = this.supabase as any;
    const { data, error } = await supabase
      .from('site_valuations')
      .insert({
        tenant_id: tenantId,
        metrics,
        result,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Get valuation history for a tenant
   */
  async getValuationHistory(tenantId: string, limit = 12): Promise<SiteValuation[]> {
    const { data, error } = await this.supabase
      .from('site_valuations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get latest valuation for a tenant
   */
  async getLatestValuation(tenantId: string): Promise<SiteValuation | null> {
    const { data, error } = await this.supabase
      .from('site_valuations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate revenue multiple based on site characteristics
 */
export function calculateRevenueMultiple(
  monthlyRevenue: number,
  characteristics: {
    consistency: number;
    growth: number;
    diversification: number;
    authority: number;
  }
): number {
  let multiple = 24; // Base multiple

  // Consistency bonus
  if (characteristics.consistency > 0.8) multiple += 8;
  else if (characteristics.consistency > 0.6) multiple += 4;

  // Growth bonus
  if (characteristics.growth > 0.2) multiple += 6;
  else if (characteristics.growth > 0.1) multiple += 3;

  // Diversification bonus
  if (characteristics.diversification > 0.7) multiple += 4;
  else if (characteristics.diversification > 0.5) multiple += 2;

  // Authority bonus
  if (characteristics.authority > 0.8) multiple += 4;
  else if (characteristics.authority > 0.6) multiple += 2;

  return Math.min(multiple, 48); // Cap at 48x
}

/**
 * Format valuation as currency string
 */
export function formatValuation(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate confidence score from multiple factors
 */
export function calculateConfidenceScore(factors: Record<string, number>): {
  score: number;
  level: ValuationConfidence;
} {
  const weights = {
    dataQuality: 0.3,
    revenueConsistency: 0.25,
    trafficReliability: 0.2,
    businessMaturity: 0.15,
    methodAgreement: 0.1,
  };

  const score = Object.entries(factors).reduce(
    (sum, [key, value]) => sum + (value * (weights[key as keyof typeof weights] || 0)),
    0
  );

  let level: ValuationConfidence = 'low';
  if (score > 0.8) level = 'high';
  else if (score > 0.6) level = 'medium';

  return { score, level };
}

export default SiteValuator;
