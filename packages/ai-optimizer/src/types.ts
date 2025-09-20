import { z } from 'zod';

// Core data types
export interface ProductData {
  id: string;
  asin: string;
  title: string;
  price: number;
  category: string;
  rating?: number;
  reviews?: number;
  features?: string[];
  description?: string;
  images?: string[];
}

export interface UserBehavior {
  userId: string;
  sessionId: string;
  timestamp: Date;
  action: 'view' | 'click' | 'add_to_cart' | 'purchase' | 'bounce';
  productId?: string;
  duration?: number;
  deviceType?: string;
  referrer?: string;
  metadata?: Record<string, any>;
}

export interface ConversionData {
  productId: string;
  views: number;
  clicks: number;
  conversions: number;
  revenue: number;
  timeframe: 'hour' | 'day' | 'week' | 'month';
  timestamp: Date;
}

// ML Model Types
export interface ConversionPrediction {
  productId: string;
  predictedCVR: number;
  confidence: number;
  factors: {
    price: number;
    rating: number;
    seasonality: number;
    competition: number;
    content: number;
  };
  recommendation: string;
}

export interface PricingRecommendation {
  productId: string;
  currentPrice: number;
  recommendedPrice: number;
  elasticity: number;
  expectedRevenueLift: number;
  competitorPrices?: number[];
  priceHistory: Array<{
    date: Date;
    price: number;
    conversions: number;
  }>;
}

export interface PlacementOptimization {
  productId: string;
  currentPosition: number;
  recommendedPosition: number;
  expectedCTRLift: number;
  pageType: 'home' | 'category' | 'search' | 'article';
  segments: string[];
}

export interface ContentPerformance {
  contentId: string;
  type: 'article' | 'review' | 'comparison' | 'guide';
  predictedEngagement: number;
  predictedConversions: number;
  topicRelevance: number;
  readability: number;
  sentiment: number;
  keywords: string[];
}

export interface UserSegment {
  segmentId: string;
  name: string;
  characteristics: {
    avgOrderValue: number;
    purchaseFrequency: number;
    preferredCategories: string[];
    priceRange: [number, number];
    deviceTypes: string[];
  };
  size: number;
  value: number;
  churnRisk: number;
}

export interface ExperimentConfig {
  id: string;
  name: string;
  type: 'pricing' | 'placement' | 'content' | 'ui';
  status: 'planning' | 'running' | 'completed' | 'failed';
  variants: Array<{
    id: string;
    name: string;
    allocation: number;
    config: Record<string, any>;
  }>;
  metrics: string[];
  startDate: Date;
  endDate?: Date;
  sampleSize: number;
  confidence: number;
}

export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  metrics: Record<string, {
    value: number;
    lift: number;
    confidence: number;
    significant: boolean;
  }>;
  winner?: string;
  recommendation: string;
}

// Revenue Tracking
export interface RevenueMetrics {
  timestamp: Date;
  revenue: number;
  transactions: number;
  avgOrderValue: number;
  conversionRate: number;
  clickThroughRate: number;
  bounceRate: number;
  topProducts: Array<{
    productId: string;
    revenue: number;
    units: number;
  }>;
  bySegment: Record<string, {
    revenue: number;
    transactions: number;
  }>;
}

// ML Model Configurations
export interface ModelConfig {
  type: 'conversion' | 'pricing' | 'placement' | 'content';
  version: string;
  features: string[];
  hyperparameters: Record<string, any>;
  performance: {
    accuracy?: number;
    mse?: number;
    r2?: number;
    lastTrained: Date;
  };
}

// Training Data Schemas
export const ConversionTrainingSchema = z.object({
  features: z.array(z.number()),
  label: z.number(),
  weight: z.number().optional(),
});

export const PricingTrainingSchema = z.object({
  price: z.number(),
  demand: z.number(),
  competitor_avg: z.number(),
  seasonality: z.number(),
  revenue: z.number(),
});

// API Response Types
export interface OptimizationResponse {
  success: boolean;
  predictions?: ConversionPrediction[];
  recommendations?: PricingRecommendation[];
  experiments?: ExperimentConfig[];
  error?: string;
}

export interface AnalyticsEvent {
  type: 'impression' | 'click' | 'conversion' | 'revenue';
  productId?: string;
  userId?: string;
  value?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Configuration
export interface OptimizerConfig {
  supabaseUrl: string;
  supabaseKey: string;
  openaiKey: string;
  modelUpdateFrequency: 'hourly' | 'daily' | 'weekly';
  experimentMinSampleSize: number;
  confidenceThreshold: number;
  revenueGoal?: number;
}

export type ModelType = 'tensorflow' | 'regression' | 'clustering' | 'nlp';
export type OptimizationStrategy = 'maximize_revenue' | 'maximize_conversion' | 'maximize_aov' | 'balanced';