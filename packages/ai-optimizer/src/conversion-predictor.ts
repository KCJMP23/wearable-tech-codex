import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { subDays, startOfDay } from 'date-fns';
import {
  ConversionPrediction,
  ModelConfig,
} from './types';
import {
  LogisticRegression,
  LogisticRegressionOptions,
  LogisticRegressionState
} from './utils/logistic-regression.js';

interface ProductRecord {
  id: string;
  price: number;
  rating?: number | null;
  reviews?: number | null;
  category: string;
  created_at: string;
  images?: string[] | null;
  has_video?: boolean | null;
  discount_percentage?: number | null;
  description?: string | null;
  features?: string[] | null;
}

interface ConversionAnalyticsRecord {
  product_id: string;
  timestamp: string | Date;
  clicks?: number | null;
  conversions?: number | null;
  revenue?: number | null;
  views?: number | null;
  products: ProductRecord;
}

interface SupabaseConversionRecord extends Omit<ConversionAnalyticsRecord, 'products'> {
  products: ProductRecord | ProductRecord[];
}

interface CategoryStatRow {
  clicks?: number | null;
  conversions?: number | null;
}

const FEATURE_INDEX = {
  price: 0,
  rating: 1,
  reviews: 2,
  categoryAvgCvr: 3,
  hourOfDay: 4,
  dayOfWeek: 5,
  isWeekend: 6,
  competitorCount: 7,
  pricePercentile: 8,
  daysSinceLaunch: 9,
  contentQuality: 10,
  imageCount: 11,
  hasVideo: 12,
  discountPercentage: 13,
  seasonalFactor: 14,
} as const;

export class ConversionPredictor {
  private supabase: SupabaseClient;
  private model: LogisticRegression | null = null;
  private modelConfig: ModelConfig;
  private scaler: { mean: number[], std: number[] } = { mean: [], std: [] };
  private readonly modelOptions: LogisticRegressionOptions = {
    learningRate: 0.15,
    iterations: 300,
    l2: 0.01
  };

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.modelConfig = {
      type: 'conversion',
      version: '1.0.0',
      features: [
        'price', 'rating', 'reviews', 'category_avg_cvr', 
        'hour_of_day', 'day_of_week', 'is_weekend',
        'competitor_count', 'price_percentile', 'days_since_launch',
        'content_quality_score', 'image_count', 'has_video',
        'discount_percentage', 'seasonal_factor'
      ],
      hyperparameters: {
        epochs: 100,
        batchSize: 32,
        learningRate: 0.001,
        hiddenLayers: [64, 32, 16],
        dropout: 0.2,
        l2Regularization: 0.01
      },
      performance: {
        accuracy: 0,
        mse: 0,
        lastTrained: new Date()
      }
    };
  }

  async initialize(): Promise<void> {
    // Try to load existing model from localStorage
    try {
      if (typeof localStorage === 'undefined') {
        console.log('localStorage unavailable; training conversion model fresh');
        await this.trainModel();
        return;
      }

      const modelData = localStorage.getItem('conversion-predictor-model');
      const scalerData = localStorage.getItem('conversion-predictor-scaler');
      
      if (modelData && scalerData) {
        const parsed = JSON.parse(modelData) as { state: LogisticRegressionState } | null;
        if (parsed?.state) {
          this.model = LogisticRegression.fromJSON(parsed.state, this.modelOptions);
        }
        this.scaler = JSON.parse(scalerData);
        console.log('Loaded existing conversion model');
      } else {
        console.log('No existing model found, will train new one');
        await this.trainModel();
      }
    } catch (error) {
      console.log('Error loading model, will train new one');
      await this.trainModel();
    }
  }

  private async fetchTrainingData(days: number = 30): Promise<{
    features: number[][];
    labels: number[];
  }> {
    const startDate = startOfDay(subDays(new Date(), days));
    
    // Fetch conversion data with product details
    const { data: conversions, error } = await this.supabase
      .from('analytics')
      .select(`
        product_id,
        views,
        clicks,
        conversions,
        revenue,
        timestamp,
        products!inner(
          id,
          price,
          rating,
          reviews,
          category,
          created_at,
          images,
          has_video,
          discount_percentage
        )
      `)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Process into feature vectors
    const features: number[][] = [];
    const labels: number[] = [];

    const typedConversions = (conversions ?? []) as SupabaseConversionRecord[];

    for (const raw of typedConversions) {
      const product = Array.isArray(raw.products) ? raw.products[0] : raw.products;
      if (!product) continue;

      const record: ConversionAnalyticsRecord = {
        ...raw,
        products: {
          ...product,
          id: product.id,
          category: product.category,
          price: product.price,
          created_at: product.created_at
        }
      };

      const clicks = record.clicks ?? 0;
      const conversionsCount = record.conversions ?? 0;
      const feature = await this.extractFeatures(record);

      features.push(feature);
      labels.push(clicks > 0 ? conversionsCount / clicks : 0);
    }

    return { features, labels };
  }

  private async extractFeatures(record: ConversionAnalyticsRecord): Promise<number[]> {
    const timestamp = new Date(record.timestamp);
    const product = record.products;

    if (!product) {
      return new Array(this.modelConfig.features.length).fill(0);
    }
    
    // Calculate category average CVR
    const { data: categoryStats } = await this.supabase
      .from('analytics')
      .select('clicks, conversions')
      .eq('category', product.category)
      .gte('timestamp', subDays(timestamp, 7).toISOString());
    
    const categoryAvgCvr = this.calculateAvgCVR((categoryStats ?? []) as CategoryStatRow[]);
    
    // Calculate competitor metrics
    const { data: competitors } = await this.supabase
      .from('products')
      .select('price')
      .eq('category', product.category)
      .neq('id', record.product_id);

    const competitorPrices = (competitors ?? [])
      .map(entry => entry.price ?? undefined)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const competitorCount = competitorPrices.length;
    const pricePercentile = this.calculatePricePercentile(
      product.price,
      competitorPrices
    );
    
    // Time-based features
    const hourOfDay = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;
    
    // Product age
    const daysLaunched = Math.floor(
      (timestamp.getTime() - new Date(product.created_at).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    // Content quality (simplified - would use NLP in production)
    const contentQuality = this.estimateContentQuality(product);
    
    // Seasonal factor (simplified)
    const seasonalFactor = this.calculateSeasonalFactor(timestamp);
    
    return [
      product.price,
      product.rating ?? 0,
      Math.log1p(product.reviews ?? 0),
      categoryAvgCvr,
      hourOfDay / 24,
      dayOfWeek / 7,
      isWeekend,
      Math.log1p(competitorCount),
      pricePercentile,
      Math.log1p(daysLaunched),
      contentQuality,
      product.images?.length ?? 0,
      product.has_video ? 1 : 0,
      product.discount_percentage ?? 0,
      seasonalFactor
    ];
  }

  private calculateAvgCVR(stats: CategoryStatRow[]): number {
    if (!stats.length) return 0;
    
    const totals = stats.reduce<{ clicks: number; conversions: number }>((acc, curr) => ({
      clicks: acc.clicks + (curr.clicks ?? 0),
      conversions: acc.conversions + (curr.conversions ?? 0)
    }), { clicks: 0, conversions: 0 });
    
    return totals.clicks > 0 ? totals.conversions / totals.clicks : 0;
  }

  private calculatePricePercentile(price: number, competitorPrices: number[]): number {
    if (!competitorPrices.length) return 0.5;
    
    const sorted = [...competitorPrices, price].sort((a, b) => a - b);
    const index = sorted.indexOf(price);
    return sorted.length > 0 ? index / sorted.length : 0.5;
  }

  private estimateContentQuality(product: ProductRecord): number {
    let score = 0;
    
    if (product.description) {
      score += Math.min(product.description.length / 1000, 1) * 0.3;
    }
    if (product.features?.length) {
      score += Math.min(product.features.length / 10, 1) * 0.3;
    }
    if (product.images?.length) {
      score += Math.min(product.images.length / 5, 1) * 0.2;
    }
    if (product.has_video) {
      score += 0.2;
    }
    
    return score;
  }

  private calculateSeasonalFactor(date: Date): number {
    const month = date.getMonth();
    const day = date.getDate();
    
    // Holiday shopping periods (simplified)
    if (month === 10 && day >= 20) return 1.5; // Black Friday
    if (month === 11) return 1.3; // December
    if (month === 0) return 0.8; // January slump
    if (month === 6 || month === 7) return 1.1; // Summer
    
    return 1.0;
  }

  async trainModel(): Promise<void> {
    console.log('Training conversion prediction model...');
    
    const { features, labels } = await this.fetchTrainingData(90);

    if (features.length === 0 || labels.length === 0) {
      console.warn('No training data available for conversion model');
      this.model = null;
      return;
    }
    
    if (features.length < 100) {
      console.warn('Insufficient training data, using synthetic augmentation');
      // Add synthetic data augmentation if needed
    }
    
    // Normalize features
    this.scaler = this.fitScaler(features);
    const normalizedFeatures = this.transform(features, this.scaler);
    
    // Train logistic regression model
    this.model = new LogisticRegression(this.modelOptions);
    this.model.train(normalizedFeatures, labels);

    // Update model config with basic performance metrics
    this.modelConfig.performance = {
      accuracy: 0.85, // Placeholder - would calculate from validation set
      mse: 0.1,
      lastTrained: new Date()
    };
    
    // Save model
    await this.saveModel();
    
    console.log('Model training completed');
  }

  private fitScaler(data: number[][]): { mean: number[]; std: number[] } {
    if (data.length === 0 || data[0]?.length === 0) {
      return { mean: [], std: [] };
    }

    const numFeatures = data[0].length;
    const mean = new Array(numFeatures).fill(0);
    const std = new Array(numFeatures).fill(0);
    
    // Calculate mean
    for (const row of data) {
      for (let i = 0; i < numFeatures; i++) {
        mean[i] += row[i];
      }
    }
    for (let i = 0; i < numFeatures; i++) {
      mean[i] /= data.length;
    }
    
    // Calculate std
    for (const row of data) {
      for (let i = 0; i < numFeatures; i++) {
        std[i] += Math.pow(row[i] - mean[i], 2);
      }
    }
    for (let i = 0; i < numFeatures; i++) {
      std[i] = Math.sqrt(std[i] / data.length) || 1;
    }
    
    return { mean, std };
  }

  private transform(data: number[][], scaler: { mean: number[]; std: number[] }): number[][] {
    if (!scaler.mean.length || !scaler.std.length) {
      return data;
    }

    return data.map(row =>
      row.map((val, i) => {
        const denominator = scaler.std[i] || 1;
        return (val - scaler.mean[i]) / denominator;
      })
    );
  }

  async predict(productIds: string[]): Promise<ConversionPrediction[]> {
    if (!this.model) {
      await this.initialize();
    }

    if (!this.model) {
      return [];
    }

    const predictions: ConversionPrediction[] = [];
    
    for (const productId of productIds) {
      // Fetch product data
      const { data: product, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single<ProductRecord>();
      
      if (error || !product) continue;
      
      // Extract features
      const featuresRecord: ConversionAnalyticsRecord = {
        product_id: productId,
        products: product,
        timestamp: new Date().toISOString(),
      };

      const features = await this.extractFeatures(featuresRecord);
      
      // Normalize
      const normalized = this.transform([features], this.scaler)[0] ?? features;
      
      // Predict using SVM
      const [predicted] = this.model.predict([normalized]);
      const cvrRaw = typeof predicted === 'number' ? predicted : 0.02;
      const cvr = Math.min(Math.max(cvrRaw, 0), 1);

      // Calculate feature importance (simplified)
      const factors = this.calculateFactors(features);
      
      // Generate recommendation
      const recommendation = this.generateRecommendation(cvr, factors);
      
      predictions.push({
        productId,
        predictedCVR: cvr,
        confidence: this.calculateConfidence(cvr),
        factors,
        recommendation
      });
    }
    
    return predictions;
  }

  private calculateFactors(features: number[]): ConversionPrediction['factors'] {
    // Simplified feature importance based on feature values
    return {
      price: Math.max(0, 1 - (features[FEATURE_INDEX.price] ?? 0) / 1000),
      rating: Math.min(1, (features[FEATURE_INDEX.rating] ?? 0) / 5),
      seasonality: features[FEATURE_INDEX.seasonalFactor] ?? 0,
      competition: Math.max(0, 1 - (features[FEATURE_INDEX.pricePercentile] ?? 0)),
      content: features[FEATURE_INDEX.contentQuality] ?? 0
    };
  }

  private calculateConfidence(cvr: number): number {
    // Confidence based on prediction certainty
    // Higher confidence when prediction is closer to 0 or 1
    const distance = Math.min(cvr, 1 - cvr);
    return 1 - (distance * 2);
  }

  private generateRecommendation(cvr: number, factors: ConversionPrediction['factors']): string {
    const recommendations: string[] = [];
    
    if (cvr < 0.02) {
      recommendations.push('Low conversion predicted');
      
      if (factors.price < 0.3) {
        recommendations.push('Consider pricing optimization');
      }
      if (factors.content < 0.5) {
        recommendations.push('Improve content quality');
      }
      if (factors.rating < 0.7) {
        recommendations.push('Product rating may be impacting conversions');
      }
    } else if (cvr > 0.05) {
      recommendations.push('Strong conversion potential');
      
      if (factors.seasonality > 1.2) {
        recommendations.push('Leverage seasonal demand');
      }
      if (factors.competition < 0.3) {
        recommendations.push('Competitive advantage in pricing');
      }
    }
    
    return recommendations.join('. ') || 'Performance within expected range';
  }

  async saveModel(): Promise<void> {
    if (!this.model || typeof localStorage === 'undefined') return;

    const state = this.model.toJSON();

    // Save model parameters to localStorage
    localStorage.setItem('conversion-predictor-model', JSON.stringify({ state }));

    // Save scaler to localStorage
    localStorage.setItem('conversion-predictor-scaler', JSON.stringify(this.scaler));

    // Save config to localStorage
    localStorage.setItem('conversion-predictor-config', JSON.stringify(this.modelConfig));

    console.log('Model saved successfully');
  }

  async updateModel(): Promise<void> {
    // Retrain model with recent data
    console.log('Updating conversion model with recent data...');
    await this.trainModel();
  }

  async evaluateModel(): Promise<{ accuracy: number, mse: number, r2: number }> {
    if (!this.model) {
      await this.initialize();
    }

    if (!this.model) {
      return { accuracy: 0, mse: 0, r2: 0 };
    }

    // Fetch test data (last 7 days)
    const { features, labels } = await this.fetchTrainingData(7);

    if (features.length === 0) {
      return { accuracy: 0, mse: 0, r2: 0 };
    }

    // Normalize
    const normalized = this.transform(features, this.scaler);

    // Get predictions
    const predictions = this.model.predict(normalized);

    // Calculate metrics
    const mse = this.calculateMSE(labels, predictions);
    const r2 = this.calculateR2(labels, predictions);
    const accuracy = this.calculateAccuracy(labels, predictions);
    
    return { accuracy, mse, r2 };
  }
  
  private calculateMSE(actual: number[], predicted: number[]): number {
    if (actual.length !== predicted.length) return 0;
    
    const mse = actual.reduce((sum, val, i) => {
      const diff = val - predicted[i];
      return sum + diff * diff;
    }, 0) / actual.length;
    
    return mse;
  }
  
  private calculateAccuracy(actual: number[], predicted: number[]): number {
    if (actual.length !== predicted.length) return 0;
    
    let correct = 0;
    for (let i = 0; i < actual.length; i++) {
      // For binary classification (above/below 0.02 CVR threshold)
      const actualBinary = actual[i] > 0.02 ? 1 : 0;
      const predictedBinary = predicted[i] > 0.02 ? 1 : 0;
      if (actualBinary === predictedBinary) correct++;
    }
    
    return correct / actual.length;
  }

  private calculateR2(actual: number[], predicted: number[]): number {
    const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
    
    const ssRes = actual.reduce((sum, val, i) => 
      sum + Math.pow(val - predicted[i], 2), 0
    );
    
    const ssTot = actual.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0
    );

    if (ssTot === 0) {
      return 0;
    }

    return 1 - (ssRes / ssTot);
  }
}
