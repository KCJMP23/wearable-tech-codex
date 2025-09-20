// Core A/B Testing Framework
export { ExperimentEngine } from './experiment-engine.js';
export { StatisticalAnalyzer } from './statistical-analyzer.js';
export { VariantManager } from './variant-manager.js';
export { FeatureFlagManager } from './feature-flags.js';
export { SegmentationEngine, SegmentBuilder } from './segmentation.js';
export { PerformanceMonitor } from './performance-monitor.js';
export { WinnerSelector } from './winner-selector.js';
export { ReportingEngine } from './reporting.js';
export { ABTestingClient, useABTesting, Variant } from './client-sdk.js';

// Types
export type {
  // Variants
  Variant,
  VariantResult,
  
  // Experiments
  Experiment,
  ExperimentStatus,
  ExperimentResults,
  AllocationStrategy,
  WinnerCriteria,
  
  // Metrics
  Metric,
  MetricType,
  MetricResult,
  
  // Statistical
  StatisticalTest,
  
  // Segmentation
  Segment,
  SegmentCondition,
  SegmentResults,
  UserContext,
  
  // Performance
  PerformanceMetrics,
  PerformanceImpact,
  
  // Events
  ExposureEvent,
  ConversionEvent,
  Assignment,
  
  // Feature Flags
  FeatureFlag,
  
  // Reporting
  Report,
  Insight,
  Recommendation,
  
  // Errors
  ABTestingError,
  AllocationError,
  StatisticalError
} from './types.js';

// Re-export enums
export { 
  ExperimentStatus,
  MetricType,
  StatisticalTest 
} from './types.js';

// Factory function to create a complete A/B testing system
export function createABTestingSystem(config: ABTestingSystemConfig) {
  const experimentEngine = new ExperimentEngine(
    config.supabaseUrl,
    config.supabaseKey,
    config.experimentOptions
  );

  const variantManager = new VariantManager(
    experimentEngine['supabase'],
    config.variantOptions
  );

  const featureFlagManager = new FeatureFlagManager(
    experimentEngine['supabase'],
    config.featureFlagOptions
  );

  const segmentationEngine = new SegmentationEngine(
    experimentEngine['supabase'],
    config.segmentationOptions
  );

  const performanceMonitor = new PerformanceMonitor(
    experimentEngine['supabase'],
    config.performanceOptions
  );

  const winnerSelector = new WinnerSelector(
    experimentEngine['supabase'],
    config.winnerSelectionOptions
  );

  const reportingEngine = new ReportingEngine(
    experimentEngine['supabase'],
    config.reportingOptions
  );

  const statisticalAnalyzer = new StatisticalAnalyzer(
    config.statisticalOptions?.confidenceLevel,
    config.statisticalOptions?.minimumSampleSize
  );

  return {
    experimentEngine,
    variantManager,
    featureFlagManager,
    segmentationEngine,
    performanceMonitor,
    winnerSelector,
    reportingEngine,
    statisticalAnalyzer,
    
    // Convenience methods
    async createExperiment(experiment: any) {
      return experimentEngine.createExperiment(experiment);
    },
    
    async getAssignment(experimentId: string, context: any) {
      return experimentEngine.getAssignment(experimentId, context);
    },
    
    async trackConversion(experimentId: string, metricId: string, context: any, value?: number) {
      return experimentEngine.trackConversion(experimentId, metricId, context, value);
    },
    
    async selectWinner(experimentId: string) {
      const experiment = await experimentEngine['experiments'].get(experimentId);
      if (!experiment) throw new Error('Experiment not found');
      return winnerSelector.selectWinner(experiment);
    },
    
    async generateReport(experimentId: string, type?: any) {
      return reportingEngine.generateReport(experimentId, type);
    },
    
    async evaluateFeatureFlag(flagId: string, context: any) {
      return featureFlagManager.evaluate(flagId, context);
    },
    
    // Cleanup
    destroy() {
      experimentEngine.destroy();
      featureFlagManager.destroy();
      performanceMonitor.destroy();
    }
  };
}

// Configuration interfaces
export interface ABTestingSystemConfig {
  supabaseUrl: string;
  supabaseKey: string;
  
  experimentOptions?: {
    flushIntervalMs?: number;
    refreshIntervalMs?: number;
    bufferSize?: number;
    enableRealtime?: boolean;
  };
  
  variantOptions?: {
    dynamicUpdateInterval?: number;
    multiArmedBanditAlgorithm?: 'thompson' | 'ucb' | 'epsilon_greedy';
    epsilonGreedyRate?: number;
    ucbExplorationFactor?: number;
  };
  
  featureFlagOptions?: {
    refreshIntervalMs?: number;
    enableRealtime?: boolean;
    cacheEvaluations?: boolean;
    defaultValue?: boolean;
  };
  
  segmentationOptions?: {
    cacheResults?: boolean;
    cacheTTLMs?: number;
  };
  
  performanceOptions?: {
    flushIntervalMs?: number;
    bufferSize?: number;
    enableWebVitals?: boolean;
    thresholds?: any;
  };
  
  winnerSelectionOptions?: {
    confidenceLevel?: number;
    minimumSampleSize?: number;
    minimumDuration?: number;
    bayesianPriorAlpha?: number;
    bayesianPriorBeta?: number;
    multiMetricStrategy?: 'weighted' | 'all_must_win' | 'primary_only';
  };
  
  reportingOptions?: {
    defaultDateRange?: number;
    insightThresholds?: any;
  };
  
  statisticalOptions?: {
    confidenceLevel?: number;
    minimumSampleSize?: number;
  };
}

// Default export for convenience
export default createABTestingSystem;