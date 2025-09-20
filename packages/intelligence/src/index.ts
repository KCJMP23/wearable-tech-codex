/**
 * @affiliate-factory/intelligence
 * 
 * ML-powered network intelligence system for AffiliateOS
 * 
 * This package provides comprehensive intelligence capabilities including:
 * - Cross-tenant trend detection using collaborative filtering
 * - Privacy-preserving conversion optimization insights
 * - Product performance analytics and recommendations
 * - Viral content detection and pattern analysis
 * - Network-wide insights and health monitoring
 * - ML-powered predictions for new site success
 */

// Core Intelligence Classes
export { TrendDetector } from './trend-detector.js';
export { ConversionOptimizer } from './conversion-optimizer.js';
export { ProductAnalytics } from './product-analytics.js';
export { ViralDetector } from './viral-detector.js';
export { NetworkInsights } from './network-insights.js';
export { Predictor } from './predictor.js';

// Type Definitions
export type {
  // Configuration Types
  IntelligenceConfig,
  SubscriptionConfig,
  IntelligenceUpdate,

  // Trend Detection Types
  Trend,
  TrendDetectionParams,

  // Conversion Optimization Types
  ConversionData,
  ConversionInsight,
  PrivacyPreservingMetrics,

  // Product Analytics Types
  ProductMetrics,
  ProductPerformanceInsight,

  // Viral Content Types
  ContentEngagement,
  ViralPattern,

  // Network Insights Types
  NetworkInsight,
  NetworkMetrics,

  // Prediction Types
  PredictionInput,
  SitePrediction,
  MLModelConfig,
  ModelPrediction,

  // Database Types
  DatabaseTables,

  // Error Types
  IntelligenceError,
  PrivacyError,
  ModelError
} from './types.js';

// Utility Functions and Constants
export const INTELLIGENCE_DEFAULTS = {
  MIN_DATA_POINTS: 25,
  CONFIDENCE_THRESHOLD: 0.7,
  PRIVACY_NOISE_LEVEL: 0.05,
  UPDATE_FREQUENCY: 180, // 3 hours
  TREND_MOMENTUM_THRESHOLD: 0.6,
  VIRAL_ENGAGEMENT_THRESHOLD: 60,
  NETWORK_HEALTH_THRESHOLDS: {
    EXCELLENT: 80,
    GOOD: 60,
    FAIR: 40
  }
} as const;

/**
 * Intelligence Hub - Main orchestrator class
 * 
 * Provides a unified interface to all intelligence modules with
 * coordinated real-time monitoring and centralized configuration.
 */
export class IntelligenceHub {
  private trendDetector: TrendDetector;
  private conversionOptimizer: ConversionOptimizer;
  private productAnalytics: ProductAnalytics;
  private viralDetector: ViralDetector;
  private networkInsights: NetworkInsights;
  private predictor: Predictor;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config?: Partial<IntelligenceConfig>
  ) {
    const finalConfig: IntelligenceConfig = {
      minDataPoints: config?.minDataPoints ?? INTELLIGENCE_DEFAULTS.MIN_DATA_POINTS,
      confidenceThreshold: config?.confidenceThreshold ?? INTELLIGENCE_DEFAULTS.CONFIDENCE_THRESHOLD,
      privacyNoiseLevel: config?.privacyNoiseLevel ?? INTELLIGENCE_DEFAULTS.PRIVACY_NOISE_LEVEL,
      updateFrequency: config?.updateFrequency ?? INTELLIGENCE_DEFAULTS.UPDATE_FREQUENCY
    };

    // Initialize all intelligence modules
    this.trendDetector = new TrendDetector(supabaseUrl, supabaseKey, finalConfig);
    this.conversionOptimizer = new ConversionOptimizer(supabaseUrl, supabaseKey, finalConfig);
    this.productAnalytics = new ProductAnalytics(supabaseUrl, supabaseKey, finalConfig);
    this.viralDetector = new ViralDetector(supabaseUrl, supabaseKey, finalConfig);
    this.networkInsights = new NetworkInsights(supabaseUrl, supabaseKey, finalConfig);
    this.predictor = new Predictor(supabaseUrl, supabaseKey, finalConfig);
  }

  /**
   * Get all intelligence modules
   */
  getModules() {
    return {
      trends: this.trendDetector,
      conversion: this.conversionOptimizer,
      products: this.productAnalytics,
      viral: this.viralDetector,
      network: this.networkInsights,
      predictor: this.predictor
    };
  }

  /**
   * Get comprehensive network overview
   */
  async getNetworkOverview(timeRange: number = 30) {
    const [
      dashboard,
      healthScore,
      topTrends,
      topProducts,
      viralContent
    ] = await Promise.all([
      this.networkInsights.getNetworkDashboard(timeRange),
      this.networkInsights.getNetworkHealthScore(),
      this.trendDetector.getActiveTrends(10),
      this.productAnalytics.getTopProducts(undefined, 10),
      this.viralDetector.detectViralContent(7)
    ]);

    return {
      dashboard,
      healthScore,
      topTrends,
      topProducts,
      viralContent: viralContent.viralContent.slice(0, 5)
    };
  }

  /**
   * Get tenant-specific insights
   */
  async getTenantInsights(
    tenantId: string,
    timeRange: number = 30
  ) {
    const [
      optimizationOpportunities,
      productInsights,
      viralPotential
    ] = await Promise.all([
      this.conversionOptimizer.getOptimizationOpportunities(tenantId, timeRange),
      this.productAnalytics.getProductInsights([tenantId], timeRange),
      // Get tenant's recent content for viral analysis
      this.getTenantViralPotential(tenantId)
    ]);

    return {
      optimization: optimizationOpportunities,
      products: productInsights,
      viral: viralPotential
    };
  }

  /**
   * Predict success for new tenant
   */
  async predictNewTenantSuccess(input: PredictionInput) {
    return await this.predictor.predictSiteSuccess(input);
  }

  /**
   * Setup comprehensive real-time monitoring
   */
  async setupRealtimeMonitoring(
    callback: (update: IntelligenceUpdate) => void
  ) {
    // Setup monitoring for all modules
    await Promise.all([
      this.trendDetector.setupRealtimeMonitoring(callback),
      this.conversionOptimizer.setupRealtimeMonitoring(callback),
      this.productAnalytics.setupRealtimeMonitoring(callback),
      this.viralDetector.setupRealtimeMonitoring(callback),
      this.networkInsights.setupRealtimeMonitoring(callback)
    ]);
  }

  /**
   * Train all ML models with latest data
   */
  async trainModels() {
    return await this.predictor.trainModels();
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.trendDetector.cleanup();
    // Other modules don't currently have cleanup methods
  }

  /**
   * Get tenant viral potential (helper method)
   */
  private async getTenantViralPotential(tenantId: string) {
    // This would need to be implemented based on tenant's recent content
    // For now, return empty structure
    return {
      potential_score: 0,
      recommendations: [],
      optimal_timing: []
    };
  }
}

/**
 * Create Intelligence Hub instance with default configuration
 */
export function createIntelligenceHub(
  supabaseUrl: string,
  supabaseKey: string,
  config?: Partial<IntelligenceConfig>
): IntelligenceHub {
  return new IntelligenceHub(supabaseUrl, supabaseKey, config);
}

/**
 * Utility function to validate intelligence configuration
 */
export function validateIntelligenceConfig(
  config: Partial<IntelligenceConfig>
): IntelligenceConfig {
  const validated: IntelligenceConfig = {
    minDataPoints: Math.max(1, config.minDataPoints ?? INTELLIGENCE_DEFAULTS.MIN_DATA_POINTS),
    confidenceThreshold: Math.max(0.1, Math.min(0.99, config.confidenceThreshold ?? INTELLIGENCE_DEFAULTS.CONFIDENCE_THRESHOLD)),
    privacyNoiseLevel: Math.max(0.01, Math.min(0.5, config.privacyNoiseLevel ?? INTELLIGENCE_DEFAULTS.PRIVACY_NOISE_LEVEL)),
    updateFrequency: Math.max(60, config.updateFrequency ?? INTELLIGENCE_DEFAULTS.UPDATE_FREQUENCY)
  };

  return validated;
}

/**
 * Utility function to calculate network health status
 */
export function getHealthStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= INTELLIGENCE_DEFAULTS.NETWORK_HEALTH_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= INTELLIGENCE_DEFAULTS.NETWORK_HEALTH_THRESHOLDS.GOOD) return 'good';
  if (score >= INTELLIGENCE_DEFAULTS.NETWORK_HEALTH_THRESHOLDS.FAIR) return 'fair';
  return 'poor';
}

/**
 * Utility function to format intelligence insights for display
 */
export function formatInsightForDisplay(insight: NetworkInsight): {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  urgency: 'immediate' | 'soon' | 'later';
  actions: string[];
} {
  const impact = insight.impact_score >= 80 ? 'high' : 
                insight.impact_score >= 60 ? 'medium' : 'low';
  
  const urgency = insight.type === 'warning' ? 'immediate' :
                 insight.impact_score >= 80 ? 'soon' : 'later';

  return {
    title: insight.title,
    description: insight.description,
    impact,
    urgency,
    actions: insight.actionable_steps
  };
}

/**
 * Utility function to calculate trend strength
 */
export function calculateTrendStrength(trend: Trend): 'weak' | 'moderate' | 'strong' | 'explosive' {
  const score = (trend.momentum * 0.4) + (trend.confidence * 0.3) + (Math.min(1, trend.velocity / 10) * 0.3);
  
  if (score >= 0.8) return 'explosive';
  if (score >= 0.6) return 'strong';
  if (score >= 0.4) return 'moderate';
  return 'weak';
}

/**
 * Utility function to generate intelligence summary
 */
export function generateIntelligenceSummary(data: {
  trends: Trend[];
  viralContent: ContentEngagement[];
  networkMetrics: NetworkMetrics;
  healthScore: number;
}): {
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
} {
  const { trends, viralContent, networkMetrics, healthScore } = data;
  
  const highlights: string[] = [];
  const concerns: string[] = [];
  const recommendations: string[] = [];

  // Health assessment
  const healthStatus = getHealthStatus(healthScore);
  const summary = `Network health is ${healthStatus} with a score of ${healthScore.toFixed(1)}. ` +
    `${networkMetrics.active_tenants} active tenants generating ${networkMetrics.network_revenue.toLocaleString()} in revenue.`;

  // Trending highlights
  const strongTrends = trends.filter(trend => calculateTrendStrength(trend) === 'strong' || calculateTrendStrength(trend) === 'explosive');
  if (strongTrends.length > 0) {
    highlights.push(`${strongTrends.length} strong trending topics detected`);
  }

  // Viral content highlights
  if (viralContent.length > 0) {
    highlights.push(`${viralContent.length} pieces of viral content identified`);
  }

  // Performance concerns
  if (networkMetrics.churn_rate > 15) {
    concerns.push(`High churn rate: ${networkMetrics.churn_rate.toFixed(1)}%`);
  }
  
  if (networkMetrics.network_conversion_rate < 0.015) {
    concerns.push(`Low network conversion rate: ${(networkMetrics.network_conversion_rate * 100).toFixed(2)}%`);
  }

  // Growth assessment
  if (networkMetrics.growth_rate > 10) {
    highlights.push(`Strong growth rate: ${networkMetrics.growth_rate.toFixed(1)}%`);
  } else if (networkMetrics.growth_rate < 0) {
    concerns.push(`Negative growth: ${networkMetrics.growth_rate.toFixed(1)}%`);
  }

  // Recommendations
  if (concerns.length > 0) {
    recommendations.push('Address performance concerns immediately');
  }
  
  if (strongTrends.length > 0) {
    recommendations.push('Capitalize on trending topics for content strategy');
  }
  
  if (viralContent.length > 0) {
    recommendations.push('Analyze and replicate viral content patterns');
  }

  return {
    summary,
    highlights,
    concerns,
    recommendations
  };
}

// Default export for convenience
export default IntelligenceHub;