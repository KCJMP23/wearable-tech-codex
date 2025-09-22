import { z } from 'zod';

// Variant Types
export interface Variant {
  id: string;
  name: string;
  weight: number; // 0-100 representing percentage
  config?: Record<string, unknown>;
  isControl?: boolean;
}

// Experiment Types
export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export enum MetricType {
  CONVERSION = 'conversion',
  REVENUE = 'revenue',
  ENGAGEMENT = 'engagement',
  CUSTOM = 'custom'
}

export enum StatisticalTest {
  CHI_SQUARE = 'chi_square',
  T_TEST = 't_test',
  MANN_WHITNEY = 'mann_whitney',
  ANOVA = 'anova'
}

export interface Metric {
  id: string;
  name: string;
  type: MetricType;
  goalValue?: number;
  unit?: string;
  isPrimary?: boolean;
}

// Segmentation Types
export interface Segment {
  id: string;
  name: string;
  conditions: SegmentCondition[];
  operator: 'AND' | 'OR';
}

export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: unknown;
}

export interface UserContext {
  userId?: string;
  sessionId: string;
  attributes?: Record<string, unknown>;
  geo?: {
    country?: string;
    region?: string;
    city?: string;
  };
  device?: {
    type?: 'mobile' | 'tablet' | 'desktop';
    browser?: string;
    os?: string;
  };
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

// Experiment Configuration
export interface Experiment {
  id: string;
  name: string;
  description?: string;
  hypothesis?: string;
  status: ExperimentStatus;
  variants: Variant[];
  metrics: Metric[];
  segments?: Segment[];
  startDate?: Date;
  endDate?: Date;
  minimumSampleSize?: number;
  confidenceLevel?: number; // 0.90, 0.95, 0.99
  statisticalTest?: StatisticalTest;
  allocation: AllocationStrategy;
  winnerSelectionCriteria?: WinnerCriteria;
  featureFlags?: string[];
  tags?: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AllocationStrategy {
  type: 'fixed' | 'dynamic' | 'multi_armed_bandit';
  seed?: string;
  updateInterval?: number; // in seconds for dynamic allocation
}

export interface WinnerCriteria {
  metric: string;
  threshold?: number;
  minimumConversions?: number;
  minimumDuration?: number; // in hours
  autoStop?: boolean;
  autoImplement?: boolean;
}

// Results and Analytics
export interface VariantResult {
  variantId: string;
  variantName: string;
  exposures: number;
  conversions: Record<string, number>;
  revenue?: number;
  metrics: Record<string, MetricResult>;
  confidence?: number;
  uplift?: number;
  isWinner?: boolean;
  isSignificant?: boolean;
}

export interface MetricResult {
  value: number;
  conversions: number;
  conversionRate: number;
  standardError?: number;
  confidenceInterval?: [number, number];
  pValue?: number;
  uplift?: number;
  upliftConfidenceInterval?: [number, number];
}

export interface ExperimentResults {
  experimentId: string;
  experimentName: string;
  status: ExperimentStatus;
  startDate: Date;
  endDate?: Date;
  duration: number; // in hours
  totalExposures: number;
  variants: VariantResult[];
  winner?: VariantResult;
  statisticalPower?: number;
  sampleSizeRecommendation?: number;
  performance: PerformanceMetrics;
  segments?: SegmentResults[];
  funnel?: FunnelAnalysis;
  timeSeries?: TimeSeriesData[];
}

export interface SegmentResults {
  segmentId: string;
  segmentName: string;
  exposures: number;
  variants: VariantResult[];
}

// Performance Monitoring
export interface PerformanceMetrics {
  avgLoadTime: number;
  p50LoadTime: number;
  p75LoadTime: number;
  p95LoadTime: number;
  p99LoadTime: number;
  errorRate: number;
  bounceRate?: number;
  timeToFirstByte?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
  interactionToNextPaint?: number;
}

export interface PerformanceImpact {
  variant: string;
  baseline: PerformanceMetrics;
  current: PerformanceMetrics;
  impact: {
    loadTime: number; // percentage change
    errorRate: number;
    coreWebVitals?: {
      lcp: number;
      fid: number;
      cls: number;
      inp: number;
    };
  };
  isAcceptable: boolean;
}

// Events
export interface ExposureEvent {
  experimentId: string;
  variantId: string;
  userId?: string;
  sessionId: string;
  context?: UserContext;
  timestamp: Date;
}

export interface ConversionEvent {
  experimentId: string;
  variantId: string;
  metricId: string;
  userId?: string;
  sessionId: string;
  value?: number;
  revenue?: number;
  context?: UserContext;
  timestamp: Date;
}

// Feature Flags
export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage?: number;
  experiments?: string[];
  conditions?: SegmentCondition[];
  variations?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Assignment
export interface Assignment {
  experimentId: string;
  experimentName: string;
  variantId: string;
  variantName: string;
  isInExperiment: boolean;
  featureFlags?: Record<string, boolean | unknown>;
  config?: Record<string, unknown>;
}

// Reporting
export interface Report {
  id: string;
  experimentId: string;
  type: 'summary' | 'detailed' | 'segment' | 'funnel' | 'timeseries';
  generatedAt: Date;
  data: ExperimentResults;
  insights: Insight[];
  recommendations: Recommendation[];
}

export interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  description: string;
  metric?: string;
  variant?: string;
  impact?: number;
}

export interface Recommendation {
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact?: string;
}

// Validation Schemas
export const VariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number().min(0).max(100),
  config: z.record(z.unknown()).optional(),
  isControl: z.boolean().optional(),
});

export const MetricSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(MetricType),
  goalValue: z.number().optional(),
  unit: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const ExperimentSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  status: z.nativeEnum(ExperimentStatus),
  variants: z.array(VariantSchema).min(2),
  metrics: z.array(MetricSchema).min(1),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minimumSampleSize: z.number().positive().optional(),
  confidenceLevel: z.number().min(0).max(1).optional().default(0.95),
  statisticalTest: z.nativeEnum(StatisticalTest).optional(),
  allocation: z.object({
    type: z.enum(['fixed', 'dynamic', 'multi_armed_bandit']),
    seed: z.string().optional(),
    updateInterval: z.number().optional(),
  }),
  winnerSelectionCriteria: z.object({
    metric: z.string(),
    threshold: z.number().optional(),
    minimumConversions: z.number().optional(),
    minimumDuration: z.number().optional(),
    autoStop: z.boolean().optional(),
    autoImplement: z.boolean().optional(),
  }).optional(),
  featureFlags: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Error Types
export class ABTestingError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'ABTestingError';
  }
}

export interface TimeSeriesVariantMetrics {
  exposures: number;
  conversions: number;
  conversionRate: number;
}

export interface TimeSeriesData {
  date: Date;
  variants: Record<string, TimeSeriesVariantMetrics>;
}

export interface FunnelVariantMetrics {
  counts: Record<string, number>;
  conversionRates?: Record<string, number>;
}

export interface FunnelAnalysis {
  steps: string[];
  variants: Record<string, FunnelVariantMetrics>;
}

export class AllocationError extends ABTestingError {
  constructor(message: string, details?: unknown) {
    super(message, 'ALLOCATION_ERROR', details);
    this.name = 'AllocationError';
  }
}

export class StatisticalError extends ABTestingError {
  constructor(message: string, details?: unknown) {
    super(message, 'STATISTICAL_ERROR', details);
    this.name = 'StatisticalError';
  }
}
