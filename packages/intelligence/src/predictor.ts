import * as tf from '@tensorflow/tfjs-node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { subDays, addDays, differenceInDays } from 'date-fns';
import { groupBy, orderBy, meanBy, maxBy, minBy } from 'lodash';
import {
  PredictionInput,
  SitePrediction,
  MLModelConfig,
  ModelPrediction,
  IntelligenceConfig,
  IntelligenceError,
  ModelError,
  DatabaseTables
} from './types.js';

/**
 * ML Predictor for New Site Success
 * 
 * Uses machine learning models trained on historical tenant data
 * to predict success metrics for new affiliate sites.
 */
export class Predictor {
  private supabase: SupabaseClient<DatabaseTables>;
  private config: IntelligenceConfig;
  private revenueModel: tf.LayersModel | null = null;
  private trafficModel: tf.LayersModel | null = null;
  private successModel: tf.LayersModel | null = null;
  private featureScalers: Map<string, { min: number; max: number }> = new Map();
  private categoryEncoders: Map<string, number> = new Map();

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: IntelligenceConfig = {
      minDataPoints: 50,
      confidenceThreshold: 0.7,
      privacyNoiseLevel: 0.05,
      updateFrequency: 720 // 12 hours
    }
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = config;
    this.initializeModels();
  }

  /**
   * Predict success metrics for a new site
   */
  async predictSiteSuccess(input: PredictionInput): Promise<SitePrediction> {
    try {
      // Validate input
      this.validatePredictionInput(input);

      // Get similar successful tenants for reference
      const similarTenants = await this.findSimilarTenants(input);
      
      if (similarTenants.length < 3) {
        throw new ModelError(
          'Insufficient similar tenant data for reliable predictions',
          { similarCount: similarTenants.length, required: 3 }
        );
      }

      // Prepare features for ML models
      const features = await this.preparePredictionFeatures(input, similarTenants);

      // Generate predictions
      const [revenuePrediction, trafficPrediction, successProbability] = await Promise.all([
        this.predictRevenue(features),
        this.predictTraffic(features),
        this.predictSuccessProbability(features)
      ]);

      // Calculate confidence intervals
      const confidenceIntervals = this.calculateConfidenceIntervals(
        revenuePrediction,
        trafficPrediction,
        similarTenants
      );

      // Identify risk factors and opportunities
      const riskFactors = await this.identifyRiskFactors(input, similarTenants);
      const growthOpportunities = await this.identifyGrowthOpportunities(input, similarTenants);
      const recommendedStrategies = this.generateRecommendedStrategies(input, similarTenants);

      // Get similar successful tenant references
      const similarSuccessfulTenants = similarTenants
        .filter(tenant => tenant.success_score > 0.7)
        .slice(0, 3)
        .map(tenant => tenant.tenant_id);

      const prediction: SitePrediction = {
        predicted_revenue: revenuePrediction,
        predicted_traffic: trafficPrediction,
        success_probability: successProbability,
        risk_factors: riskFactors,
        growth_opportunities: growthOpportunities,
        recommended_strategies: recommendedStrategies,
        similar_successful_tenants: similarSuccessfulTenants,
        confidence_intervals: confidenceIntervals
      };

      // Store prediction for future accuracy tracking
      await this.storePrediction(input, prediction);

      return prediction;
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      throw new IntelligenceError(
        'Failed to predict site success',
        'PREDICTION_FAILED',
        { error: error.message, input }
      );
    }
  }

  /**
   * Find tenants similar to the prediction input
   */
  private async findSimilarTenants(input: PredictionInput): Promise<any[]> {
    // Get historical tenant data with success metrics
    const { data: tenants, error } = await this.supabase
      .from('tenants')
      .select(`
        id,
        metadata,
        created_at,
        insights (
          type,
          value,
          created_at
        )
      `)
      .not('metadata', 'is', null);

    if (error) throw error;

    const enrichedTenants = await Promise.all(
      (tenants || []).map(async (tenant) => {
        const tenantMetadata = tenant.metadata || {};
        
        // Calculate success score based on historical performance
        const successScore = await this.calculateTenantSuccessScore(tenant.id, tenant.insights);
        
        // Calculate similarity score
        const similarityScore = this.calculateSimilarityScore(input, tenantMetadata);

        return {
          tenant_id: tenant.id,
          metadata: tenantMetadata,
          success_score: successScore,
          similarity_score: similarityScore,
          insights: tenant.insights,
          age_days: differenceInDays(new Date(), new Date(tenant.created_at))
        };
      })
    );

    // Filter and sort by similarity
    return enrichedTenants
      .filter(tenant => 
        tenant.similarity_score > 0.3 && 
        tenant.age_days > 90 && // At least 3 months of data
        tenant.insights.length > 10 // Sufficient data points
      )
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 20); // Top 20 similar tenants
  }

  /**
   * Calculate similarity score between input and existing tenant
   */
  private calculateSimilarityScore(input: PredictionInput, tenantMetadata: any): number {
    let score = 0;
    let factors = 0;

    // Category similarity
    if (tenantMetadata.category && input.tenant_category) {
      score += input.tenant_category === tenantMetadata.category ? 1 : 0;
      factors++;
    }

    // Target audience similarity
    if (tenantMetadata.target_audience && input.target_audience) {
      const audienceOverlap = this.calculateTextSimilarity(
        input.target_audience,
        tenantMetadata.target_audience
      );
      score += audienceOverlap;
      factors++;
    }

    // Geographic focus similarity
    if (tenantMetadata.geographic_focus && input.geographic_focus) {
      score += input.geographic_focus === tenantMetadata.geographic_focus ? 1 : 0;
      factors++;
    }

    // Team size similarity
    if (tenantMetadata.team_size && input.team_size) {
      const teamSizeDiff = Math.abs(input.team_size - tenantMetadata.team_size);
      score += Math.max(0, 1 - teamSizeDiff / 10);
      factors++;
    }

    // Marketing budget similarity
    if (tenantMetadata.marketing_budget && input.marketing_budget) {
      const budgetRatio = Math.min(
        input.marketing_budget / tenantMetadata.marketing_budget,
        tenantMetadata.marketing_budget / input.marketing_budget
      );
      score += Math.max(0, budgetRatio);
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate tenant success score
   */
  private async calculateTenantSuccessScore(tenantId: string, insights: any[]): Promise<number> {
    if (insights.length < 10) return 0;

    const insightsByType = groupBy(insights, 'type');
    
    // Calculate revenue trend
    const revenueInsights = (insightsByType.revenue || [])
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    let revenueScore = 0;
    if (revenueInsights.length > 0) {
      const totalRevenue = revenueInsights.reduce(
        (sum, insight) => sum + (parseFloat(insight.value) || 0), 0
      );
      revenueScore = Math.min(1, totalRevenue / 10000); // Normalize to $10k
    }

    // Calculate conversion rate
    const conversionInsights = insightsByType.conversion || [];
    const avgConversion = conversionInsights.length > 0 ? 
      meanBy(conversionInsights, insight => parseFloat(insight.value) || 0) : 0;
    const conversionScore = Math.min(1, avgConversion / 0.03); // Normalize to 3%

    // Calculate growth trend
    const growthScore = this.calculateGrowthTrend(revenueInsights);

    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(insights);

    // Weighted success score
    return (revenueScore * 0.4) + (conversionScore * 0.3) + (growthScore * 0.2) + (consistencyScore * 0.1);
  }

  /**
   * Calculate growth trend from revenue insights
   */
  private calculateGrowthTrend(revenueInsights: any[]): number {
    if (revenueInsights.length < 4) return 0;

    const recent = revenueInsights.slice(-3);
    const older = revenueInsights.slice(-6, -3);

    if (older.length === 0) return 0;

    const recentAvg = meanBy(recent, insight => parseFloat(insight.value) || 0);
    const olderAvg = meanBy(older, insight => parseFloat(insight.value) || 0);

    if (olderAvg === 0) return recentAvg > 0 ? 1 : 0;

    const growthRate = (recentAvg - olderAvg) / olderAvg;
    return Math.max(0, Math.min(1, (growthRate + 0.5) / 1.5)); // Normalize -50% to 100% growth
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistencyScore(insights: any[]): number {
    if (insights.length < 10) return 0;

    // Group by month and calculate coefficient of variation
    const monthlyData = groupBy(insights, insight => 
      new Date(insight.created_at).toISOString().substring(0, 7)
    );

    const monthlyValues = Object.values(monthlyData).map(monthInsights => 
      monthInsights.reduce((sum, insight) => sum + (parseFloat(insight.value) || 0), 0)
    );

    if (monthlyValues.length < 3) return 0;

    const mean = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
    const variance = monthlyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monthlyValues.length;
    const stdDev = Math.sqrt(variance);

    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    return Math.max(0, 1 - coefficientOfVariation); // Lower variation = higher consistency
  }

  /**
   * Prepare features for ML prediction
   */
  private async preparePredictionFeatures(
    input: PredictionInput,
    similarTenants: any[]
  ): Promise<number[]> {
    // Encode categorical features
    const categoryEncoded = this.encodeCategorical('category', input.tenant_category);
    const audienceEncoded = this.encodeCategorical('audience', input.target_audience);
    const geoEncoded = this.encodeCategorical('geographic', input.geographic_focus);
    const strategyEncoded = this.encodeCategorical('strategy', input.content_strategy);
    const expertiseEncoded = this.encodeExpertiseLevel(input.technical_expertise);

    // Normalize numerical features
    const teamSizeNorm = this.normalizeFeature('team_size', input.team_size, 1, 50);
    const budgetNorm = this.normalizeFeature('budget', input.marketing_budget, 0, 100000);
    const productCountNorm = this.normalizeFeature('products', input.initial_products.length, 1, 100);

    // Calculate market competitiveness
    const marketCompetitiveness = await this.calculateMarketCompetitiveness(input);

    // Calculate similar tenant performance metrics
    const avgSimilarSuccess = meanBy(similarTenants, 'success_score');
    const similarTenantCount = Math.min(1, similarTenants.length / 10);

    return [
      categoryEncoded,
      audienceEncoded,
      geoEncoded,
      strategyEncoded,
      expertiseEncoded,
      teamSizeNorm,
      budgetNorm,
      productCountNorm,
      marketCompetitiveness,
      avgSimilarSuccess,
      similarTenantCount
    ];
  }

  /**
   * Predict revenue using ML model or fallback
   */
  private async predictRevenue(features: number[]): Promise<{
    month_1: number;
    month_3: number;
    month_6: number;
    month_12: number;
  }> {
    try {
      if (this.revenueModel) {
        const inputTensor = tf.tensor2d([features]);
        const predictions = this.revenueModel.predict(inputTensor) as tf.Tensor;
        const results = await predictions.data();
        
        inputTensor.dispose();
        predictions.dispose();

        return {
          month_1: Math.max(0, results[0] * 1000),
          month_3: Math.max(0, results[1] * 1000),
          month_6: Math.max(0, results[2] * 1000),
          month_12: Math.max(0, results[3] * 1000)
        };
      }
    } catch (error) {
      console.warn('ML revenue prediction failed, using fallback:', error);
    }

    // Fallback prediction based on features
    return this.predictRevenueFallback(features);
  }

  /**
   * Predict traffic using ML model or fallback
   */
  private async predictTraffic(features: number[]): Promise<{
    month_1: number;
    month_3: number;
    month_6: number;
    month_12: number;
  }> {
    try {
      if (this.trafficModel) {
        const inputTensor = tf.tensor2d([features]);
        const predictions = this.trafficModel.predict(inputTensor) as tf.Tensor;
        const results = await predictions.data();
        
        inputTensor.dispose();
        predictions.dispose();

        return {
          month_1: Math.max(0, results[0] * 10000),
          month_3: Math.max(0, results[1] * 10000),
          month_6: Math.max(0, results[2] * 10000),
          month_12: Math.max(0, results[3] * 10000)
        };
      }
    } catch (error) {
      console.warn('ML traffic prediction failed, using fallback:', error);
    }

    return this.predictTrafficFallback(features);
  }

  /**
   * Predict success probability
   */
  private async predictSuccessProbability(features: number[]): Promise<number> {
    try {
      if (this.successModel) {
        const inputTensor = tf.tensor2d([features]);
        const prediction = this.successModel.predict(inputTensor) as tf.Tensor;
        const result = (await prediction.data())[0];
        
        inputTensor.dispose();
        prediction.dispose();

        return Math.max(0.1, Math.min(0.95, result));
      }
    } catch (error) {
      console.warn('ML success prediction failed, using fallback:', error);
    }

    // Fallback based on feature analysis
    return this.predictSuccessFallback(features);
  }

  /**
   * Fallback revenue prediction
   */
  private predictRevenueFallback(features: number[]): {
    month_1: number;
    month_3: number;
    month_6: number;
    month_12: number;
  } {
    const baseRevenue = features[6] * 1000; // Budget influence
    const teamMultiplier = 1 + (features[5] * 0.5); // Team size influence
    const expertiseMultiplier = 1 + (features[4] * 0.3); // Expertise influence
    const marketMultiplier = 1 - (features[8] * 0.2); // Market competitiveness

    const multiplier = teamMultiplier * expertiseMultiplier * marketMultiplier;

    return {
      month_1: baseRevenue * 0.1 * multiplier,
      month_3: baseRevenue * 0.3 * multiplier,
      month_6: baseRevenue * 0.6 * multiplier,
      month_12: baseRevenue * 1.0 * multiplier
    };
  }

  /**
   * Fallback traffic prediction
   */
  private predictTrafficFallback(features: number[]): {
    month_1: number;
    month_3: number;
    month_6: number;
    month_12: number;
  } {
    const baseTraffic = features[7] * 1000; // Product count influence
    const budgetMultiplier = 1 + (features[6] * 2); // Budget influence
    const expertiseMultiplier = 1 + (features[4] * 0.5); // Expertise influence

    const multiplier = budgetMultiplier * expertiseMultiplier;

    return {
      month_1: baseTraffic * 0.2 * multiplier,
      month_3: baseTraffic * 0.5 * multiplier,
      month_6: baseTraffic * 0.8 * multiplier,
      month_12: baseTraffic * 1.2 * multiplier
    };
  }

  /**
   * Fallback success probability prediction
   */
  private predictSuccessFallback(features: number[]): number {
    // Weighted success probability based on features
    const categoryScore = features[0] * 0.15;
    const expertiseScore = features[4] * 0.25;
    const teamScore = features[5] * 0.15;
    const budgetScore = features[6] * 0.20;
    const marketScore = (1 - features[8]) * 0.15; // Inverse of competitiveness
    const similarSuccessScore = features[9] * 0.10;

    const totalScore = categoryScore + expertiseScore + teamScore + budgetScore + marketScore + similarSuccessScore;
    return Math.max(0.1, Math.min(0.95, totalScore));
  }

  /**
   * Calculate confidence intervals
   */
  private calculateConfidenceIntervals(
    revenuePrediction: any,
    trafficPrediction: any,
    similarTenants: any[]
  ): {
    revenue: [number, number];
    traffic: [number, number];
  } {
    if (similarTenants.length === 0) {
      return {
        revenue: [revenuePrediction.month_12 * 0.5, revenuePrediction.month_12 * 1.5],
        traffic: [trafficPrediction.month_12 * 0.5, trafficPrediction.month_12 * 1.5]
      };
    }

    // Calculate variance from similar tenants
    const tenantRevenues = similarTenants.map(tenant => 
      tenant.insights
        .filter((insight: any) => insight.type === 'revenue')
        .reduce((sum: number, insight: any) => sum + (parseFloat(insight.value) || 0), 0)
    );

    const tenantTraffics = similarTenants.map(tenant => 
      tenant.insights
        .filter((insight: any) => insight.type === 'view')
        .reduce((sum: number, insight: any) => sum + (parseFloat(insight.value) || 0), 0)
    );

    const revenueStdDev = this.calculateStandardDeviation(tenantRevenues);
    const trafficStdDev = this.calculateStandardDeviation(tenantTraffics);

    return {
      revenue: [
        Math.max(0, revenuePrediction.month_12 - revenueStdDev * 1.96),
        revenuePrediction.month_12 + revenueStdDev * 1.96
      ],
      traffic: [
        Math.max(0, trafficPrediction.month_12 - trafficStdDev * 1.96),
        trafficPrediction.month_12 + trafficStdDev * 1.96
      ]
    };
  }

  /**
   * Identify risk factors
   */
  private async identifyRiskFactors(
    input: PredictionInput,
    similarTenants: any[]
  ): Promise<string[]> {
    const riskFactors: string[] = [];

    // Team size risks
    if (input.team_size < 2) {
      riskFactors.push('Small team size may limit growth potential');
    }

    // Budget risks
    if (input.marketing_budget < 1000) {
      riskFactors.push('Limited marketing budget may slow customer acquisition');
    }

    // Experience risks
    if (input.technical_expertise === 'beginner') {
      riskFactors.push('Limited technical expertise may impact site optimization');
    }

    // Market competition risks
    const marketCompetitiveness = await this.calculateMarketCompetitiveness(input);
    if (marketCompetitiveness > 0.7) {
      riskFactors.push('High market competition in selected category');
    }

    // Historical performance risks
    const failedSimilarTenants = similarTenants.filter(tenant => tenant.success_score < 0.3);
    if (failedSimilarTenants.length > similarTenants.length * 0.5) {
      riskFactors.push('Similar tenant profiles show mixed success rates');
    }

    // Product diversity risks
    if (input.initial_products.length < 5) {
      riskFactors.push('Limited initial product selection may reduce conversion opportunities');
    }

    return riskFactors;
  }

  /**
   * Identify growth opportunities
   */
  private async identifyGrowthOpportunities(
    input: PredictionInput,
    similarTenants: any[]
  ): Promise<string[]> {
    const opportunities: string[] = [];

    // Successful similar tenant opportunities
    const successfulTenants = similarTenants.filter(tenant => tenant.success_score > 0.7);
    if (successfulTenants.length > 0) {
      opportunities.push('Strong similar tenant success rate indicates good market potential');
    }

    // Budget opportunities
    if (input.marketing_budget > 5000) {
      opportunities.push('Substantial marketing budget allows for aggressive growth strategies');
    }

    // Team opportunities
    if (input.team_size > 3) {
      opportunities.push('Larger team size enables faster content production and optimization');
    }

    // Category opportunities
    const { data: trendingCategories } = await this.supabase
      .from('network_trends')
      .select('category')
      .eq('category', input.tenant_category)
      .gte('momentum', 0.7)
      .limit(1);

    if (trendingCategories && trendingCategories.length > 0) {
      opportunities.push('Category shows strong trending momentum in the network');
    }

    // Geographic opportunities
    if (input.geographic_focus === 'global') {
      opportunities.push('Global focus allows access to diverse markets and audiences');
    }

    return opportunities;
  }

  /**
   * Generate recommended strategies
   */
  private generateRecommendedStrategies(
    input: PredictionInput,
    similarTenants: any[]
  ): string[] {
    const strategies: string[] = [];

    // Budget-based strategies
    if (input.marketing_budget > 10000) {
      strategies.push('Implement paid advertising campaigns for faster customer acquisition');
    } else {
      strategies.push('Focus on organic SEO and content marketing for cost-effective growth');
    }

    // Team-based strategies
    if (input.team_size > 2) {
      strategies.push('Assign specialized roles: content creation, SEO, and conversion optimization');
    } else {
      strategies.push('Use automation tools to maximize efficiency with limited team resources');
    }

    // Experience-based strategies
    if (input.technical_expertise === 'beginner') {
      strategies.push('Partner with technical consultants for site optimization');
      strategies.push('Use managed hosting and optimization services');
    } else {
      strategies.push('Implement advanced tracking and optimization techniques');
    }

    // Category-specific strategies
    const successfulCategoryTenants = similarTenants
      .filter(tenant => 
        tenant.metadata.category === input.tenant_category && 
        tenant.success_score > 0.7
      );

    if (successfulCategoryTenants.length > 0) {
      strategies.push('Study and replicate successful strategies from similar category leaders');
    }

    // Product strategy
    if (input.initial_products.length > 20) {
      strategies.push('Focus on top-performing products to optimize conversion rates');
    } else {
      strategies.push('Gradually expand product catalog based on performance data');
    }

    return strategies;
  }

  /**
   * Calculate market competitiveness
   */
  private async calculateMarketCompetitiveness(input: PredictionInput): Promise<number> {
    // Count tenants in the same category
    const { data: categoryTenants, error } = await this.supabase
      .from('tenants')
      .select('id')
      .eq('metadata->>category', input.tenant_category);

    if (error) return 0.5; // Default medium competitiveness

    const tenantCount = categoryTenants?.length || 0;
    
    // Normalize competitiveness (0-1 scale)
    return Math.min(1, tenantCount / 50); // High competition at 50+ tenants
  }

  /**
   * Helper methods for feature encoding and normalization
   */
  private encodeCategorical(type: string, value: string): number {
    if (!this.categoryEncoders.has(`${type}_${value}`)) {
      const currentSize = Array.from(this.categoryEncoders.keys())
        .filter(key => key.startsWith(`${type}_`))
        .length;
      this.categoryEncoders.set(`${type}_${value}`, currentSize * 0.1);
    }
    return this.categoryEncoders.get(`${type}_${value}`) || 0;
  }

  private encodeExpertiseLevel(level: 'beginner' | 'intermediate' | 'advanced'): number {
    const mapping = { beginner: 0.2, intermediate: 0.6, advanced: 1.0 };
    return mapping[level];
  }

  private normalizeFeature(name: string, value: number, min: number, max: number): number {
    if (!this.featureScalers.has(name)) {
      this.featureScalers.set(name, { min, max });
    }
    const scaler = this.featureScalers.get(name)!;
    return Math.max(0, Math.min(1, (value - scaler.min) / (scaler.max - scaler.min)));
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Validate prediction input
   */
  private validatePredictionInput(input: PredictionInput): void {
    if (!input.tenant_category || input.tenant_category.trim() === '') {
      throw new ModelError('Tenant category is required');
    }
    if (!input.target_audience || input.target_audience.trim() === '') {
      throw new ModelError('Target audience is required');
    }
    if (input.team_size < 1) {
      throw new ModelError('Team size must be at least 1');
    }
    if (input.marketing_budget < 0) {
      throw new ModelError('Marketing budget cannot be negative');
    }
    if (input.initial_products.length === 0) {
      throw new ModelError('At least one initial product is required');
    }
  }

  /**
   * Store prediction for accuracy tracking
   */
  private async storePrediction(input: PredictionInput, prediction: SitePrediction): Promise<void> {
    const { error } = await this.supabase
      .from('site_predictions')
      .insert({
        tenant_id: 'prediction_' + Date.now(), // Placeholder for new tenants
        prediction_input: input,
        prediction_output: prediction
      });

    if (error) {
      console.warn('Failed to store prediction:', error);
    }
  }

  /**
   * Initialize ML models
   */
  private async initializeModels(): Promise<void> {
    try {
      // Initialize revenue prediction model
      this.revenueModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [11], // 11 input features
            units: 24,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 16,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 4, // 4 time periods
            activation: 'linear'
          })
        ]
      });

      this.revenueModel.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      // Initialize traffic prediction model
      this.trafficModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [11],
            units: 20,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 12,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 4, // 4 time periods
            activation: 'linear'
          })
        ]
      });

      this.trafficModel.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      // Initialize success probability model
      this.successModel = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [11],
            units: 16,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 8,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 1,
            activation: 'sigmoid'
          })
        ]
      });

      this.successModel.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

    } catch (error) {
      console.warn('Failed to initialize ML models, using fallback predictions:', error);
    }
  }

  /**
   * Train models with historical data
   */
  async trainModels(): Promise<{
    revenue_accuracy: number;
    traffic_accuracy: number;
    success_accuracy: number;
    training_samples: number;
  }> {
    try {
      // Get historical tenant data for training
      const trainingData = await this.collectTrainingData();
      
      if (trainingData.length < this.config.minDataPoints) {
        throw new ModelError(
          'Insufficient training data',
          { available: trainingData.length, required: this.config.minDataPoints }
        );
      }

      // Prepare training datasets
      const { features, revenueTargets, trafficTargets, successTargets } = 
        await this.prepareTrainingData(trainingData);

      // Train models
      const revenueHistory = await this.trainRevenueModel(features, revenueTargets);
      const trafficHistory = await this.trainTrafficModel(features, trafficTargets);
      const successHistory = await this.trainSuccessModel(features, successTargets);

      return {
        revenue_accuracy: this.getModelAccuracy(revenueHistory),
        traffic_accuracy: this.getModelAccuracy(trafficHistory),
        success_accuracy: this.getModelAccuracy(successHistory),
        training_samples: trainingData.length
      };
    } catch (error) {
      throw new IntelligenceError(
        'Failed to train ML models',
        'MODEL_TRAINING_FAILED',
        { error: error.message }
      );
    }
  }

  /**
   * Collect training data from historical tenants
   */
  private async collectTrainingData(): Promise<any[]> {
    const { data: tenants, error } = await this.supabase
      .from('tenants')
      .select(`
        id,
        metadata,
        created_at,
        insights (
          type,
          value,
          created_at
        )
      `)
      .not('metadata', 'is', null)
      .gte('created_at', subDays(new Date(), 365).toISOString()); // Last year

    if (error) throw error;

    return (tenants || []).filter(tenant => 
      tenant.insights.length > 20 && // Sufficient data
      differenceInDays(new Date(), new Date(tenant.created_at)) > 90 // At least 3 months old
    );
  }

  /**
   * Prepare training data for ML models
   */
  private async prepareTrainingData(tenants: any[]): Promise<{
    features: tf.Tensor2D;
    revenueTargets: tf.Tensor2D;
    trafficTargets: tf.Tensor2D;
    successTargets: tf.Tensor1D;
  }> {
    const allFeatures: number[][] = [];
    const allRevenueTargets: number[][] = [];
    const allTrafficTargets: number[][] = [];
    const allSuccessTargets: number[] = [];

    for (const tenant of tenants) {
      // Prepare input features
      const input = this.tenantToInput(tenant);
      const features = await this.preparePredictionFeatures(input, []);
      
      // Calculate actual outcomes
      const revenueOutcomes = this.calculateActualRevenue(tenant.insights);
      const trafficOutcomes = this.calculateActualTraffic(tenant.insights);
      const successOutcome = await this.calculateTenantSuccessScore(tenant.id, tenant.insights);

      allFeatures.push(features);
      allRevenueTargets.push(revenueOutcomes);
      allTrafficTargets.push(trafficOutcomes);
      allSuccessTargets.push(successOutcome > 0.5 ? 1 : 0);
    }

    return {
      features: tf.tensor2d(allFeatures),
      revenueTargets: tf.tensor2d(allRevenueTargets),
      trafficTargets: tf.tensor2d(allTrafficTargets),
      successTargets: tf.tensor1d(allSuccessTargets)
    };
  }

  /**
   * Convert tenant data to prediction input format
   */
  private tenantToInput(tenant: any): PredictionInput {
    const metadata = tenant.metadata || {};
    
    return {
      tenant_category: metadata.category || 'general',
      target_audience: metadata.target_audience || 'general',
      geographic_focus: metadata.geographic_focus || 'us',
      content_strategy: metadata.content_strategy || 'mixed',
      initial_products: metadata.initial_products || ['product1'],
      marketing_budget: metadata.marketing_budget || 1000,
      team_size: metadata.team_size || 1,
      technical_expertise: metadata.technical_expertise || 'intermediate'
    };
  }

  /**
   * Calculate actual revenue outcomes from insights
   */
  private calculateActualRevenue(insights: any[]): number[] {
    const revenueInsights = insights
      .filter(insight => insight.type === 'revenue')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Calculate cumulative revenue for different time periods
    const periods = [30, 90, 180, 365]; // days
    const outcomes: number[] = [];

    for (const days of periods) {
      const cutoffDate = addDays(new Date(insights[0]?.created_at || new Date()), days);
      const periodRevenue = revenueInsights
        .filter(insight => new Date(insight.created_at) <= cutoffDate)
        .reduce((sum, insight) => sum + (parseFloat(insight.value) || 0), 0);
      outcomes.push(periodRevenue / 1000); // Normalize
    }

    return outcomes;
  }

  /**
   * Calculate actual traffic outcomes from insights
   */
  private calculateActualTraffic(insights: any[]): number[] {
    const viewInsights = insights
      .filter(insight => insight.type === 'view')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const periods = [30, 90, 180, 365];
    const outcomes: number[] = [];

    for (const days of periods) {
      const cutoffDate = addDays(new Date(insights[0]?.created_at || new Date()), days);
      const periodTraffic = viewInsights
        .filter(insight => new Date(insight.created_at) <= cutoffDate)
        .reduce((sum, insight) => sum + (parseFloat(insight.value) || 0), 0);
      outcomes.push(periodTraffic / 10000); // Normalize
    }

    return outcomes;
  }

  /**
   * Train revenue model
   */
  private async trainRevenueModel(
    features: tf.Tensor2D,
    targets: tf.Tensor2D
  ): Promise<tf.History> {
    if (!this.revenueModel) throw new Error('Revenue model not initialized');

    return await this.revenueModel.fit(features, targets, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      verbose: 0
    });
  }

  /**
   * Train traffic model
   */
  private async trainTrafficModel(
    features: tf.Tensor2D,
    targets: tf.Tensor2D
  ): Promise<tf.History> {
    if (!this.trafficModel) throw new Error('Traffic model not initialized');

    return await this.trafficModel.fit(features, targets, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      verbose: 0
    });
  }

  /**
   * Train success model
   */
  private async trainSuccessModel(
    features: tf.Tensor2D,
    targets: tf.Tensor1D
  ): Promise<tf.History> {
    if (!this.successModel) throw new Error('Success model not initialized');

    return await this.successModel.fit(features, targets, {
      epochs: 150,
      batchSize: 32,
      validationSplit: 0.2,
      verbose: 0
    });
  }

  /**
   * Get model accuracy from training history
   */
  private getModelAccuracy(history: tf.History): number {
    const losses = history.history.val_loss || history.history.loss;
    if (!losses || losses.length === 0) return 0;
    
    // Return inverse of final loss as accuracy measure
    const finalLoss = losses[losses.length - 1] as number;
    return Math.max(0, 1 - finalLoss);
  }

  /**
   * Evaluate prediction accuracy against actual outcomes
   */
  async evaluateModelAccuracy(tenantId: string): Promise<{
    revenue_accuracy: number;
    traffic_accuracy: number;
    success_accuracy: number;
  }> {
    try {
      // Get stored predictions for this tenant
      const { data: predictions } = await this.supabase
        .from('site_predictions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions found for tenant');
      }

      const prediction = predictions[0];
      
      // Get actual performance data
      const { data: insights } = await this.supabase
        .from('insights')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', prediction.created_at);

      if (!insights || insights.length < 10) {
        throw new Error('Insufficient actual data for evaluation');
      }

      // Calculate actual outcomes
      const actualRevenue = this.calculateActualRevenue(insights);
      const actualTraffic = this.calculateActualTraffic(insights);
      const actualSuccess = await this.calculateTenantSuccessScore(tenantId, insights);

      // Calculate accuracy metrics
      const revenueAccuracy = this.calculatePredictionAccuracy(
        prediction.prediction_output.predicted_revenue.month_12,
        actualRevenue[3] * 1000
      );

      const trafficAccuracy = this.calculatePredictionAccuracy(
        prediction.prediction_output.predicted_traffic.month_12,
        actualTraffic[3] * 10000
      );

      const successAccuracy = Math.abs(
        prediction.prediction_output.success_probability - actualSuccess
      );

      return {
        revenue_accuracy: revenueAccuracy,
        traffic_accuracy: trafficAccuracy,
        success_accuracy: 1 - successAccuracy
      };
    } catch (error) {
      throw new IntelligenceError(
        'Failed to evaluate model accuracy',
        'ACCURACY_EVALUATION_FAILED',
        { error: error.message, tenantId }
      );
    }
  }

  /**
   * Calculate prediction accuracy
   */
  private calculatePredictionAccuracy(predicted: number, actual: number): number {
    if (actual === 0) return predicted === 0 ? 1 : 0;
    const error = Math.abs(predicted - actual) / actual;
    return Math.max(0, 1 - error);
  }
}