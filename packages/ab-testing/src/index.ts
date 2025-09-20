// Core A/B Testing Framework
export { ExperimentEngine } from './experiment-engine.js';
export { StatisticalAnalyzer } from './statistical-analyzer.js';
export { VariantManager } from './variant-manager.js';
export { FeatureFlagManager } from './feature-flags.js';
export { SegmentationEngine, SegmentBuilder } from './segmentation.js';
export { PerformanceMonitor } from './performance-monitor.js';
export { WinnerSelector } from './winner-selector.js';
export { ReportingEngine } from './reporting.js';
export { ABTestingClient, useABTesting } from './client-sdk.js';

// Types
export type {
  // Variants
  Variant,
  VariantResult,
  
  // Experiments
  Experiment,
  ExperimentResults,
  AllocationStrategy,
  WinnerCriteria,
  
  // Metrics
  Metric,
  MetricResult,
  
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
  StatisticalError,

 } from './types.js';

// Re-export enums
export { 
  ExperimentStatus,
  MetricType,
  StatisticalTest 
} from './types.js';