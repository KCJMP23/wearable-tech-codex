import * as tf from '@tensorflow/tfjs-node';
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
  private model: tf.Sequential | null = null;
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
    // Try to load existing model
    const modelPath = './models/conversion-predictor';
    try {
      this.model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
      console.log('Loaded existing conversion model');
    } catch (error) {
      console.log('No existing model found, will train new one');
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
    
    // Convert to tensors
    const xTrain = tf.tensor2d(normalizedFeatures);
    const yTrain = tf.tensor1d(labels);
    
    // Build model
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [this.modelConfig.features.length],
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });
    
    // Compile
    this.model.compile({
      optimizer: tf.train.adam(this.modelConfig.hyperparameters.learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'mse']
    });
    
    // Train
    const history = await this.model.fit(xTrain, yTrain, {
      epochs: this.modelConfig.hyperparameters.epochs,
      batchSize: this.modelConfig.hyperparameters.batchSize,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, accuracy=${logs?.acc?.toFixed(4)}`);
          }
        }
      }
    });
    
    // Update model config with performance metrics
    const finalLogs = history.history;
    this.modelConfig.performance = {
      accuracy: finalLogs.acc[finalLogs.acc.length - 1] as number,
      mse: finalLogs.mse?.[finalLogs.mse.length - 1] as number || 0,
      lastTrained: new Date()
    };
    
    // Save model
    await this.saveModel();
    
    // Cleanup
    xTrain.dispose();
    yTrain.dispose();
    
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
      
      // Predict
      const inputTensor = tf.tensor2d([normalized]);
      const prediction = this.model!.predict(inputTensor) as tf.Tensor;
      const cvr = (await prediction.data())[0];
      
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
      
      // Cleanup
      inputTensor.dispose();
      prediction.dispose();
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
    
    const modelPath = './models/conversion-predictor';
    await this.model.save(`file://${modelPath}`);
    
    // Save scaler
    const fs = require('fs').promises;
    await fs.writeFile(
      `${modelPath}/scaler.json`,
      JSON.stringify(this.scaler)
    );
    
    // Save config
    await fs.writeFile(
      `${modelPath}/config.json`,
      JSON.stringify(this.modelConfig)
    );
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
    
    // Evaluate
    const xTest = tf.tensor2d(normalized);
    const yTest = tf.tensor1d(labels);
    
    const evaluation = this.model!.evaluate(xTest, yTest) as tf.Scalar[];
    const [loss, accuracy, mse] = await Promise.all(
      evaluation.map(metric => metric.data())
    );
    
    // Calculate R²
    const predictions = this.model!.predict(xTest) as tf.Tensor;
    const predArray = await predictions.data();
    const r2 = this.calculateR2(labels, Array.from(predArray));
    
    // Cleanup
    xTest.dispose();
    yTest.dispose();
    predictions.dispose();
    evaluation.forEach(t => t.dispose());
    
    return {
      accuracy: accuracy[0],
      mse: mse[0],
      r2
    };
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