import { z } from 'zod';

// Base Intelligence Types
export interface IntelligenceConfig {
  minDataPoints: number;
  confidenceThreshold: number;
  privacyNoiseLevel: number;
  updateFrequency: number; // minutes
}

// Trend Detection Types
export const TrendSchema = z.object({
  id: z.string(),
  category: z.string(),
  keywords: z.array(z.string()),
  momentum: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  velocity: z.number(),
  peak_prediction: z.date().optional(),
  source_tenants: z.array(z.string()),
  first_detected: z.date(),
  last_updated: z.date(),
});

export type Trend = z.infer<typeof TrendSchema>;

export interface TrendDetectionParams {
  timeWindow: number; // days
  minTenantCount: number;
  categoryFilter?: string[];
  momentumThreshold: number;
}

// Conversion Optimization Types
export const ConversionDataSchema = z.object({
  tenant_id: z.string(),
  page_type: z.string(),
  traffic_source: z.string(),
  device_type: z.string(),
  conversion_rate: z.number().min(0).max(1),
  sample_size: z.number().int().positive(),
  confidence_interval: z.tuple([z.number(), z.number()]),
  timestamp: z.date(),
});

export type ConversionData = z.infer<typeof ConversionDataSchema>;

export interface PrivacyPreservingMetrics {
  aggregated_rate: number;
  noise_added: number;
  participant_count: number;
  confidence_level: number;
}

export interface ConversionInsight {
  segment: string;
  benchmark: number;
  percentile_rank: number;
  recommendations: string[];
  privacy_preserved: boolean;
}

// Product Analytics Types
export const ProductMetricsSchema = z.object({
  product_id: z.string(),
  asin: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  price_range: z.string(),
  avg_rating: z.number().min(0).max(5),
  review_count: z.number().int().nonnegative(),
  click_through_rate: z.number().min(0).max(1),
  conversion_rate: z.number().min(0).max(1),
  revenue_per_click: z.number().nonnegative(),
  trending_score: z.number().min(0).max(100),
  seasonal_factor: z.number().optional(),
  competition_level: z.enum(['low', 'medium', 'high']),
  last_updated: z.date(),
});

export type ProductMetrics = z.infer<typeof ProductMetricsSchema>;

export interface ProductPerformanceInsight {
  product_id: string;
  performance_tier: 'top' | 'good' | 'average' | 'poor';
  network_percentile: number;
  optimization_opportunities: string[];
  predicted_trend: 'rising' | 'stable' | 'declining';
}

// Viral Content Detection Types
export const ContentEngagementSchema = z.object({
  content_id: z.string(),
  tenant_id: z.string(),
  content_type: z.enum(['article', 'review', 'comparison', 'guide', 'list']),
  title: z.string(),
  category: z.string(),
  engagement_score: z.number().min(0).max(100),
  views: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  time_on_page: z.number().positive(),
  bounce_rate: z.number().min(0).max(1),
  conversion_rate: z.number().min(0).max(1),
  viral_coefficient: z.number().nonnegative(),
  content_length: z.number().int().positive(),
  readability_score: z.number().min(0).max(100),
  keyword_density: z.number().min(0).max(1),
  published_at: z.date(),
  peak_engagement_time: z.date().optional(),
});

export type ContentEngagement = z.infer<typeof ContentEngagementSchema>;

export interface ViralPattern {
  pattern_id: string;
  content_type: string;
  engagement_threshold: number;
  viral_indicators: string[];
  success_probability: number;
  optimal_timing: string[];
  content_attributes: Record<string, any>;
}

// Network Insights Types
export interface NetworkInsight {
  insight_id: string;
  type: 'trend' | 'opportunity' | 'warning' | 'recommendation';
  title: string;
  description: string;
  impact_score: number;
  confidence: number;
  affected_tenants: string[];
  actionable_steps: string[];
  data_sources: string[];
  generated_at: Date;
  expires_at: Date;
}

export interface NetworkMetrics {
  total_tenants: number;
  active_tenants: number;
  total_products: number;
  total_content: number;
  network_conversion_rate: number;
  network_revenue: number;
  trending_categories: string[];
  growth_rate: number;
  churn_rate: number;
}

// Prediction Types
export const PredictionInputSchema = z.object({
  tenant_category: z.string(),
  target_audience: z.string(),
  geographic_focus: z.string(),
  content_strategy: z.string(),
  initial_products: z.array(z.string()),
  marketing_budget: z.number().nonnegative(),
  team_size: z.number().int().positive(),
  technical_expertise: z.enum(['beginner', 'intermediate', 'advanced']),
});

export type PredictionInput = z.infer<typeof PredictionInputSchema>;

export interface SitePrediction {
  predicted_revenue: {
    month_1: number;
    month_3: number;
    month_6: number;
    month_12: number;
  };
  predicted_traffic: {
    month_1: number;
    month_3: number;
    month_6: number;
    month_12: number;
  };
  success_probability: number;
  risk_factors: string[];
  growth_opportunities: string[];
  recommended_strategies: string[];
  similar_successful_tenants: string[];
  confidence_intervals: {
    revenue: [number, number];
    traffic: [number, number];
  };
}

// ML Model Types
export interface MLModelConfig {
  model_type: 'neural_network' | 'linear_regression' | 'decision_tree' | 'ensemble';
  input_features: string[];
  output_features: string[];
  training_data_size: number;
  validation_split: number;
  hyperparameters: Record<string, any>;
  last_trained: Date;
  accuracy_metrics: Record<string, number>;
}

export interface ModelPrediction {
  prediction: any;
  confidence: number;
  feature_importance?: Record<string, number>;
  explanation?: string;
}

// Real-time Update Types
export interface SubscriptionConfig {
  table: string;
  filter?: string;
  callback: (payload: any) => void;
  error_handler?: (error: Error) => void;
}

export interface IntelligenceUpdate {
  type: 'trend' | 'conversion' | 'product' | 'viral' | 'network' | 'prediction';
  data: any;
  timestamp: Date;
  tenant_ids?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Database Schema Types for Supabase
export interface DatabaseTables {
  network_trends: {
    Row: Trend;
    Insert: Omit<Trend, 'id' | 'first_detected' | 'last_updated'>;
    Update: Partial<Omit<Trend, 'id'>>;
  };
  conversion_insights: {
    Row: ConversionData & { id: string };
    Insert: ConversionData;
    Update: Partial<ConversionData>;
  };
  product_intelligence: {
    Row: ProductMetrics & { id: string };
    Insert: ProductMetrics;
    Update: Partial<ProductMetrics>;
  };
  viral_content: {
    Row: ContentEngagement & { id: string };
    Insert: ContentEngagement;
    Update: Partial<ContentEngagement>;
  };
  network_insights: {
    Row: NetworkInsight;
    Insert: Omit<NetworkInsight, 'insight_id' | 'generated_at'>;
    Update: Partial<Omit<NetworkInsight, 'insight_id'>>;
  };
  site_predictions: {
    Row: {
      id: string;
      tenant_id: string;
      prediction_input: PredictionInput;
      prediction_output: SitePrediction;
      created_at: Date;
      accuracy_score?: number;
    };
    Insert: {
      tenant_id: string;
      prediction_input: PredictionInput;
      prediction_output: SitePrediction;
    };
    Update: {
      prediction_output?: SitePrediction;
      accuracy_score?: number;
    };
  };
}

// Error Types
export class IntelligenceError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'IntelligenceError';
  }
}

export class PrivacyError extends IntelligenceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PRIVACY_VIOLATION', context);
    this.name = 'PrivacyError';
  }
}

export class ModelError extends IntelligenceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'MODEL_ERROR', context);
    this.name = 'ModelError';
  }
}