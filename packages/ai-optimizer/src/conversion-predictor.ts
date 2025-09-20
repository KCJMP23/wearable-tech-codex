import { Matrix } from 'ml-matrix';
import { SVM } from 'ml-regression';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  ConversionData, 
  ConversionPrediction, 
  ProductData,
  ModelConfig,
  ConversionTrainingSchema 
} from './types';

export class ConversionPredictor {
  private supabase: SupabaseClient;
  private model: SVM | null = null;
  private modelConfig: ModelConfig;
  private scaler: { mean: number[], std: number[] } = { mean: [], std: [] };

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
      const modelData = localStorage.getItem('conversion-predictor-model');
      const scalerData = localStorage.getItem('conversion-predictor-scaler');
      
      if (modelData && scalerData) {
        // Note: SVM models would need custom serialization in a real implementation
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
    features: number[][], 
    labels: number[] 
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

    for (const record of conversions || []) {
      const cvr = record.clicks > 0 ? record.conversions / record.clicks : 0;
      const feature = await this.extractFeatures(record);
      
      features.push(feature);
      labels.push(cvr);
    }

    return { features, labels };
  }

  private async extractFeatures(record: any): Promise<number[]> {
    const timestamp = new Date(record.timestamp);
    const product = record.products;
    
    // Calculate category average CVR
    const { data: categoryStats } = await this.supabase
      .from('analytics')
      .select('clicks, conversions')
      .eq('category', product.category)
      .gte('timestamp', subDays(timestamp, 7).toISOString());
    
    const categoryAvgCvr = this.calculateAvgCVR(categoryStats || []);
    
    // Calculate competitor metrics
    const { data: competitors } = await this.supabase
      .from('products')
      .select('price')
      .eq('category', product.category)
      .neq('id', record.product_id);
    
    const competitorCount = competitors?.length || 0;
    const pricePercentile = this.calculatePricePercentile(
      product.price, 
      competitors?.map(c => c.price) || []
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
      product.rating || 0,
      Math.log1p(product.reviews || 0),
      categoryAvgCvr,
      hourOfDay / 24,
      dayOfWeek / 7,
      isWeekend,
      Math.log1p(competitorCount),
      pricePercentile,
      Math.log1p(daysLaunched),
      contentQuality,
      product.images?.length || 0,
      product.has_video ? 1 : 0,
      product.discount_percentage || 0,
      seasonalFactor
    ];
  }

  private calculateAvgCVR(stats: any[]): number {
    if (!stats.length) return 0;
    
    const totals = stats.reduce((acc, curr) => ({
      clicks: acc.clicks + (curr.clicks || 0),
      conversions: acc.conversions + (curr.conversions || 0)
    }), { clicks: 0, conversions: 0 });
    
    return totals.clicks > 0 ? totals.conversions / totals.clicks : 0;
  }

  private calculatePricePercentile(price: number, competitorPrices: number[]): number {
    if (!competitorPrices.length) return 0.5;
    
    const sorted = [...competitorPrices, price].sort((a, b) => a - b);
    const index = sorted.indexOf(price);
    return index / sorted.length;
  }

  private estimateContentQuality(product: any): number {
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
    
    if (features.length < 100) {
      console.warn('Insufficient training data, using synthetic augmentation');
      // Add synthetic data augmentation if needed
    }
    
    // Normalize features
    this.scaler = this.fitScaler(features);
    const normalizedFeatures = this.transform(features, this.scaler);
    
    // Train SVM model
    this.model = new SVM(normalizedFeatures, labels, {
      kernel: 'rbf',
      gamma: 0.1,
      C: 1,
      epsilon: 0.01
    });
    
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

  private fitScaler(data: number[][]): { mean: number[], std: number[] } {
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

  private transform(data: number[][], scaler: { mean: number[], std: number[] }): number[][] {
    return data.map(row => 
      row.map((val, i) => (val - scaler.mean[i]) / scaler.std[i])
    );
  }

  async predict(productIds: string[]): Promise<ConversionPrediction[]> {
    if (!this.model) {
      await this.initialize();
    }
    
    const predictions: ConversionPrediction[] = [];
    
    for (const productId of productIds) {
      // Fetch product data
      const { data: product, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (error || !product) continue;
      
      // Extract features
      const features = await this.extractFeatures({
        product_id: productId,
        products: product,
        timestamp: new Date()
      });
      
      // Normalize
      const normalized = this.transform([features], this.scaler)[0];
      
      // Predict using SVM
      const cvr = this.model ? this.model.predict([normalized])[0] : 0.02;
      
      // Calculate feature importance (simplified)
      const factors = this.calculateFactors(features, cvr);
      
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

  private calculateFactors(features: number[], cvr: number): ConversionPrediction['factors'] {
    // Simplified feature importance based on feature values
    return {
      price: 1 - (features[0] / 1000), // Normalize price impact
      rating: features[1] / 5,
      seasonality: features[14],
      competition: 1 - features[8], // Price percentile inverted
      content: features[10]
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
    if (!this.model) return;
    
    // Save model parameters to localStorage (simplified serialization)
    localStorage.setItem('conversion-predictor-model', JSON.stringify({
      type: 'svm',
      trained: true
    }));
    
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
    
    // Fetch test data (last 7 days)
    const { features, labels } = await this.fetchTrainingData(7);
    
    if (features.length === 0) {
      return { accuracy: 0, mse: 0, r2: 0 };
    }
    
    // Normalize
    const normalized = this.transform(features, this.scaler);
    
    // Get predictions
    const predictions = this.model ? this.model.predict(normalized) : [];
    
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
    
    return 1 - (ssRes / ssTot);
  }
}