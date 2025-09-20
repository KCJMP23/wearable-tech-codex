export * from './types';
export { ConversionPredictor } from './conversion-predictor';
export { PricingOptimizer } from './pricing-optimizer';
export { PlacementEngine } from './placement-engine';
export { ContentScorer } from './content-scorer';
export { BehaviorAnalyzer } from './behavior-analyzer';
export { ExperimentRunner } from './experiment-runner';
export { RevenueTracker } from './revenue-tracker';

import { ConversionPredictor } from './conversion-predictor';
import { PricingOptimizer } from './pricing-optimizer';
import { PlacementEngine } from './placement-engine';
import { ContentScorer } from './content-scorer';
import { BehaviorAnalyzer } from './behavior-analyzer';
import { ExperimentRunner } from './experiment-runner';
import { RevenueTracker } from './revenue-tracker';
import { OptimizerConfig, OptimizationStrategy } from './types';

/**
 * Main AI Optimizer class that orchestrates all ML revenue optimization components
 */
export class AIOptimizer {
  private config: OptimizerConfig;
  private conversionPredictor: ConversionPredictor;
  private pricingOptimizer: PricingOptimizer;
  private placementEngine: PlacementEngine;
  private contentScorer: ContentScorer;
  private behaviorAnalyzer: BehaviorAnalyzer;
  private experimentRunner: ExperimentRunner;
  private revenueTracker: RevenueTracker;

  constructor(config: OptimizerConfig) {
    this.config = config;
    
    // Initialize all components
    this.conversionPredictor = new ConversionPredictor(
      config.supabaseUrl,
      config.supabaseKey
    );
    
    this.pricingOptimizer = new PricingOptimizer(
      config.supabaseUrl,
      config.supabaseKey
    );
    
    this.placementEngine = new PlacementEngine(
      config.supabaseUrl,
      config.supabaseKey
    );
    
    this.contentScorer = new ContentScorer(
      config.supabaseUrl,
      config.supabaseKey,
      config.openaiKey
    );
    
    this.behaviorAnalyzer = new BehaviorAnalyzer(
      config.supabaseUrl,
      config.supabaseKey
    );
    
    this.experimentRunner = new ExperimentRunner(
      config.supabaseUrl,
      config.supabaseKey,
      config.confidenceThreshold
    );
    
    this.revenueTracker = new RevenueTracker(
      config.supabaseUrl,
      config.supabaseKey
    );
  }

  /**
   * Initialize all ML models and start background processes
   */
  async initialize(): Promise<void> {
    console.log('Initializing AI Optimizer...');
    
    // Initialize conversion prediction model
    await this.conversionPredictor.initialize();
    
    // Train placement click model if needed
    await this.placementEngine.trainClickModel();
    
    // Start model update schedule
    this.scheduleModelUpdates();
    
    console.log('AI Optimizer initialized successfully');
  }

  /**
   * Run full optimization pipeline for given products
   */
  async optimizeProducts(
    productIds: string[],
    strategy: OptimizationStrategy = 'maximize_revenue'
  ): Promise<{
    conversions: any[];
    pricing: any[];
    placements: any[];
    experiments: string[];
  }> {
    console.log(`Running optimization for ${productIds.length} products with strategy: ${strategy}`);
    
    // Run all optimizations in parallel
    const [conversions, pricing, placements] = await Promise.all([
      this.conversionPredictor.predict(productIds),
      this.pricingOptimizer.optimizePricing(productIds, this.mapStrategy(strategy)),
      this.placementEngine.optimizePlacements(productIds, 'home')
    ]);
    
    // Create experiments for top opportunities
    const experiments = await this.createOptimizationExperiments(
      productIds.slice(0, 5), // Top 5 products
      strategy
    );
    
    return {
      conversions,
      pricing,
      placements,
      experiments
    };
  }

  /**
   * Analyze user behavior and generate personalized recommendations
   */
  async analyzeUser(userId: string): Promise<{
    behavior: any;
    recommendations: string[];
    experiments: string[];
  }> {
    const behavior = await this.behaviorAnalyzer.analyzeUserBehavior(userId);
    
    // Generate personalized product recommendations
    const recommendations = await this.generatePersonalizedRecommendations(
      userId,
      behavior
    );
    
    // Assign user to relevant experiments
    const experiments = await this.assignUserToExperiments(userId);
    
    return {
      behavior,
      recommendations,
      experiments
    };
  }

  /**
   * Score and optimize content
   */
  async optimizeContent(
    content: string,
    contentType: 'article' | 'review' | 'comparison' | 'guide',
    targetMetric: 'engagement' | 'conversion' | 'readability' = 'conversion'
  ): Promise<{
    score: any;
    optimized: string | undefined;
    suggestions: string[];
  }> {
    const score = await this.contentScorer.scoreContent('temp', content, contentType);
    const optimization = await this.contentScorer.optimizeContent(content, targetMetric);
    
    return {
      score,
      optimized: optimization.optimized,
      suggestions: optimization.suggestions
    };
  }

  /**
   * Start real-time revenue monitoring with alerts
   */
  async startMonitoring(
    onUpdate: (metrics: any) => void,
    onAlert: (alert: string) => void
  ): Promise<void> {
    await this.revenueTracker.startRealtimeTracking(onUpdate, onAlert);
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<{
    realtime: any;
    forecast: any;
    experiments: any[];
    segments: any[];
    alerts: string[];
  }> {
    const [realtime, forecast, experiments, segments, insights] = await Promise.all([
      this.revenueTracker.getCurrentMetrics(),
      this.revenueTracker.getRevenueForecacast(7),
      this.experimentRunner.getActiveExperiments(),
      this.behaviorAnalyzer.segmentUsers(),
      this.behaviorAnalyzer.getRealTimeInsights()
    ]);
    
    const alerts = await this.revenueTracker.checkAlerts(realtime);
    
    return {
      realtime,
      forecast,
      experiments,
      segments,
      alerts: [...alerts, ...insights.alerts]
    };
  }

  /**
   * Create and run revenue experiments
   */
  async runExperiment(
    name: string,
    type: 'pricing' | 'placement' | 'content' | 'ui',
    productIds: string[],
    duration: number = 14
  ): Promise<string> {
    const variants = await this.generateExperimentVariants(type, productIds);
    
    const experiment = await this.experimentRunner.createExperiment({
      name,
      type,
      variants,
      metrics: ['conversionRate', 'revenue', 'clickRate'],
      startDate: new Date(),
      endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
      sampleSize: this.config.experimentMinSampleSize,
      confidence: this.config.confidenceThreshold
    });
    
    await this.experimentRunner.startExperiment(experiment.id);
    
    return experiment.id;
  }

  /**
   * Analyze experiment results
   */
  async analyzeExperiment(experimentId: string): Promise<any> {
    return await this.experimentRunner.analyzeExperiment(experimentId);
  }

  // Private helper methods

  private scheduleModelUpdates(): void {
    const frequency = this.config.modelUpdateFrequency;
    const interval = frequency === 'hourly' ? 3600000 :
                    frequency === 'daily' ? 86400000 :
                    604800000; // weekly
    
    setInterval(async () => {
      console.log('Updating ML models...');
      try {
        await Promise.all([
          this.conversionPredictor.updateModel(),
          this.placementEngine.trainClickModel()
        ]);
        console.log('Models updated successfully');
      } catch (error) {
        console.error('Error updating models:', error);
      }
    }, interval);
  }

  private mapStrategy(strategy: OptimizationStrategy): 'maximize_revenue' | 'maximize_volume' | 'competitive' {
    switch (strategy) {
      case 'maximize_revenue':
        return 'maximize_revenue';
      case 'maximize_conversion':
        return 'maximize_volume';
      case 'maximize_aov':
        return 'maximize_revenue';
      case 'balanced':
      default:
        return 'competitive';
    }
  }

  private async createOptimizationExperiments(
    productIds: string[],
    strategy: OptimizationStrategy
  ): Promise<string[]> {
    const experimentIds: string[] = [];
    
    // Create pricing experiment for top product
    if (productIds.length > 0) {
      const pricingExp = await this.runExperiment(
        `Pricing optimization - ${strategy}`,
        'pricing',
        [productIds[0]],
        14
      );
      experimentIds.push(pricingExp);
    }
    
    // Create placement experiment
    if (productIds.length > 2) {
      const placementExp = await this.runExperiment(
        'Placement optimization',
        'placement',
        productIds.slice(0, 3),
        7
      );
      experimentIds.push(placementExp);
    }
    
    return experimentIds;
  }

  private async generatePersonalizedRecommendations(
    userId: string,
    behavior: any
  ): Promise<string[]> {
    // This would use collaborative filtering or content-based filtering
    // For now, return top products from preferred categories
    return behavior.patterns.preferredCategories.slice(0, 5);
  }

  private async assignUserToExperiments(userId: string): Promise<string[]> {
    const activeExperiments = await this.experimentRunner.getActiveExperiments();
    const assignments: string[] = [];
    
    for (const experiment of activeExperiments) {
      const variantId = await this.experimentRunner.assignUserToVariant(
        experiment.id,
        userId
      );
      assignments.push(`${experiment.id}:${variantId}`);
    }
    
    return assignments;
  }

  private async generateExperimentVariants(
    type: string,
    productIds: string[]
  ): Promise<any[]> {
    switch (type) {
      case 'pricing':
        return [
          { id: 'control', name: 'Current Price', allocation: 0.5, config: {} },
          { id: 'test_5', name: '5% Increase', allocation: 0.25, config: { priceMultiplier: 1.05 } },
          { id: 'test_10', name: '10% Decrease', allocation: 0.25, config: { priceMultiplier: 0.9 } }
        ];
      
      case 'placement':
        return [
          { id: 'control', name: 'Current Order', allocation: 0.5, config: {} },
          { id: 'optimized', name: 'ML Optimized', allocation: 0.5, config: { algorithm: 'ml_optimized' } }
        ];
      
      case 'content':
        return [
          { id: 'control', name: 'Original', allocation: 0.5, config: {} },
          { id: 'optimized', name: 'AI Optimized', allocation: 0.5, config: { optimized: true } }
        ];
      
      default:
        return [
          { id: 'control', name: 'Control', allocation: 0.5, config: {} },
          { id: 'variant', name: 'Test Variant', allocation: 0.5, config: {} }
        ];
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.revenueTracker.stopRealtimeTracking();
  }
}

// Export convenience function
export function createAIOptimizer(config: OptimizerConfig): AIOptimizer {
  return new AIOptimizer(config);
}