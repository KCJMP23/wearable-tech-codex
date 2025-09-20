import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { differenceInDays, addDays } from 'date-fns';
import { 
  ExperimentConfig, 
  ExperimentResult,
  AnalyticsEvent 
} from './types';

export class ExperimentRunner {
  private supabase: SupabaseClient;
  private activeExperiments: Map<string, ExperimentConfig> = new Map();
  private confidenceLevel: number = 0.95;
  private minimumSampleSize: number = 100;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    confidenceLevel: number = 0.95
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.confidenceLevel = confidenceLevel;
  }

  async createExperiment(config: Omit<ExperimentConfig, 'id' | 'status'>): Promise<ExperimentConfig> {
    const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const experiment: ExperimentConfig = {
      ...config,
      id: experimentId,
      status: 'planning',
      startDate: config.startDate || new Date()
    };

    // Validate experiment configuration
    this.validateExperiment(experiment);

    // Store in database
    const { error } = await this.supabase
      .from('experiments')
      .insert({
        id: experimentId,
        name: experiment.name,
        type: experiment.type,
        status: experiment.status,
        variants: experiment.variants,
        metrics: experiment.metrics,
        start_date: experiment.startDate,
        end_date: experiment.endDate,
        sample_size: experiment.sampleSize,
        confidence: experiment.confidence
      });

    if (error) throw error;

    // Cache active experiment
    this.activeExperiments.set(experimentId, experiment);

    return experiment;
  }

  private validateExperiment(experiment: ExperimentConfig): void {
    // Ensure variant allocations sum to 1
    const totalAllocation = experiment.variants.reduce((sum, v) => sum + v.allocation, 0);
    if (Math.abs(totalAllocation - 1) > 0.01) {
      throw new Error('Variant allocations must sum to 1');
    }

    // Ensure minimum 2 variants
    if (experiment.variants.length < 2) {
      throw new Error('Experiment must have at least 2 variants');
    }

    // Ensure sample size is sufficient
    if (experiment.sampleSize < this.minimumSampleSize) {
      throw new Error(`Sample size must be at least ${this.minimumSampleSize}`);
    }
  }

  async startExperiment(experimentId: string): Promise<void> {
    const experiment = await this.getExperiment(experimentId);
    
    if (experiment.status !== 'planning') {
      throw new Error('Experiment is not in planning state');
    }

    // Update status
    experiment.status = 'running';
    experiment.startDate = new Date();

    // Update database
    await this.supabase
      .from('experiments')
      .update({
        status: 'running',
        start_date: experiment.startDate
      })
      .eq('id', experimentId);

    // Initialize tracking
    await this.initializeTracking(experiment);

    this.activeExperiments.set(experimentId, experiment);
  }

  private async initializeTracking(experiment: ExperimentConfig): Promise<void> {
    // Create tracking records for each variant
    for (const variant of experiment.variants) {
      await this.supabase
        .from('experiment_tracking')
        .insert({
          experiment_id: experiment.id,
          variant_id: variant.id,
          impressions: 0,
          conversions: 0,
          revenue: 0,
          metrics: {}
        });
    }
  }

  async assignUserToVariant(
    experimentId: string,
    userId: string
  ): Promise<string> {
    const experiment = await this.getExperiment(experimentId);
    
    if (experiment.status !== 'running') {
      throw new Error('Experiment is not running');
    }

    // Check if user already assigned
    const { data: existing } = await this.supabase
      .from('experiment_assignments')
      .select('variant_id')
      .eq('experiment_id', experimentId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return existing.variant_id;
    }

    // Assign based on allocation
    const variantId = this.selectVariant(experiment.variants);

    // Store assignment
    await this.supabase
      .from('experiment_assignments')
      .insert({
        experiment_id: experimentId,
        user_id: userId,
        variant_id: variantId,
        assigned_at: new Date()
      });

    return variantId;
  }

  private selectVariant(variants: ExperimentConfig['variants']): string {
    const random = Math.random();
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.allocation;
      if (random < cumulative) {
        return variant.id;
      }
    }

    // Fallback to last variant
    return variants[variants.length - 1].id;
  }

  async trackEvent(
    experimentId: string,
    userId: string,
    event: AnalyticsEvent
  ): Promise<void> {
    // Get user's variant
    const { data: assignment } = await this.supabase
      .from('experiment_assignments')
      .select('variant_id')
      .eq('experiment_id', experimentId)
      .eq('user_id', userId)
      .single();

    if (!assignment) return;

    // Update tracking metrics
    const updates: any = {};
    
    switch (event.type) {
      case 'impression':
        updates.impressions = 1;
        break;
      case 'click':
        updates.clicks = 1;
        break;
      case 'conversion':
        updates.conversions = 1;
        break;
      case 'revenue':
        updates.revenue = event.value || 0;
        break;
    }

    // Store event
    await this.supabase
      .from('experiment_events')
      .insert({
        experiment_id: experimentId,
        variant_id: assignment.variant_id,
        user_id: userId,
        event_type: event.type,
        event_value: event.value,
        metadata: event.metadata,
        timestamp: event.timestamp
      });

    // Update aggregate metrics
    await this.updateVariantMetrics(experimentId, assignment.variant_id, updates);
  }

  private async updateVariantMetrics(
    experimentId: string,
    variantId: string,
    updates: any
  ): Promise<void> {
    const { data: current } = await this.supabase
      .from('experiment_tracking')
      .select('*')
      .eq('experiment_id', experimentId)
      .eq('variant_id', variantId)
      .single();

    if (!current) return;

    const newMetrics = {
      impressions: current.impressions + (updates.impressions || 0),
      clicks: current.clicks + (updates.clicks || 0),
      conversions: current.conversions + (updates.conversions || 0),
      revenue: current.revenue + (updates.revenue || 0)
    };

    await this.supabase
      .from('experiment_tracking')
      .update(newMetrics)
      .eq('experiment_id', experimentId)
      .eq('variant_id', variantId);
  }

  async analyzeExperiment(experimentId: string): Promise<ExperimentResult> {
    const experiment = await this.getExperiment(experimentId);
    
    // Fetch variant performance
    const { data: tracking } = await this.supabase
      .from('experiment_tracking')
      .select('*')
      .eq('experiment_id', experimentId);

    if (!tracking || tracking.length < 2) {
      throw new Error('Insufficient data for analysis');
    }

    // Calculate metrics for each variant
    const variantMetrics: Record<string, any> = {};
    let controlVariant: any = null;

    for (const variant of tracking) {
      const metrics = this.calculateVariantMetrics(variant);
      variantMetrics[variant.variant_id] = metrics;

      // Assume first variant is control
      if (!controlVariant) {
        controlVariant = variant;
      }
    }

    // Perform statistical significance testing
    const results: ExperimentResult = {
      experimentId,
      variantId: '',
      metrics: {},
      recommendation: ''
    };

    for (const variantId in variantMetrics) {
      if (variantId === controlVariant.variant_id) continue;

      const control = variantMetrics[controlVariant.variant_id];
      const variant = variantMetrics[variantId];

      results.metrics[variantId] = {};

      for (const metric of experiment.metrics) {
        const controlValue = control[metric];
        const variantValue = variant[metric];

        const lift = controlValue > 0 
          ? ((variantValue - controlValue) / controlValue) * 100
          : 0;

        const significance = await this.calculateSignificance(
          controlVariant,
          tracking.find(t => t.variant_id === variantId),
          metric
        );

        results.metrics[variantId][metric] = {
          value: variantValue,
          lift,
          confidence: significance.confidence,
          significant: significance.significant
        };
      }
    }

    // Determine winner
    results.winner = this.determineWinner(results.metrics, experiment.metrics);
    results.recommendation = this.generateRecommendation(results, experiment);

    return results;
  }

  private calculateVariantMetrics(tracking: any): Record<string, number> {
    const metrics: Record<string, number> = {};

    // Calculate conversion rate
    metrics.conversionRate = tracking.impressions > 0
      ? tracking.conversions / tracking.impressions
      : 0;

    // Calculate click-through rate
    metrics.clickRate = tracking.impressions > 0
      ? tracking.clicks / tracking.impressions
      : 0;

    // Calculate average order value
    metrics.averageOrderValue = tracking.conversions > 0
      ? tracking.revenue / tracking.conversions
      : 0;

    // Calculate revenue per impression
    metrics.revenuePerImpression = tracking.impressions > 0
      ? tracking.revenue / tracking.impressions
      : 0;

    // Add raw metrics
    metrics.impressions = tracking.impressions;
    metrics.conversions = tracking.conversions;
    metrics.revenue = tracking.revenue;

    return metrics;
  }

  private async calculateSignificance(
    control: any,
    variant: any,
    metric: string
  ): Promise<{ significant: boolean; confidence: number }> {
    // Use Chi-square test for conversion metrics
    if (metric === 'conversionRate' || metric === 'clickRate') {
      return this.chiSquareTest(control, variant, metric);
    }

    // Use t-test for continuous metrics
    if (metric === 'averageOrderValue' || metric === 'revenuePerImpression') {
      return this.tTest(control, variant, metric);
    }

    return { significant: false, confidence: 0 };
  }

  private chiSquareTest(
    control: any,
    variant: any,
    metric: string
  ): { significant: boolean; confidence: number } {
    const controlSuccess = metric === 'conversionRate' 
      ? control.conversions 
      : control.clicks;
    const controlTotal = control.impressions;

    const variantSuccess = metric === 'conversionRate'
      ? variant.conversions
      : variant.clicks;
    const variantTotal = variant.impressions;

    // Calculate chi-square statistic
    const pooledProbability = (controlSuccess + variantSuccess) / 
                             (controlTotal + variantTotal);
    
    const controlExpected = controlTotal * pooledProbability;
    const variantExpected = variantTotal * pooledProbability;

    const chiSquare = 
      Math.pow(controlSuccess - controlExpected, 2) / controlExpected +
      Math.pow(variantSuccess - variantExpected, 2) / variantExpected;

    // For 1 degree of freedom, critical value at 95% confidence is 3.841
    const significant = chiSquare > 3.841;
    
    // Approximate p-value to confidence
    const confidence = significant ? 0.95 : chiSquare / 3.841 * 0.95;

    return { significant, confidence };
  }

  private tTest(
    control: any,
    variant: any,
    metric: string
  ): { significant: boolean; confidence: number } {
    // Simplified t-test implementation
    // In production, would use proper statistical library
    
    const controlMean = metric === 'averageOrderValue'
      ? control.revenue / Math.max(1, control.conversions)
      : control.revenue / Math.max(1, control.impressions);

    const variantMean = metric === 'averageOrderValue'
      ? variant.revenue / Math.max(1, variant.conversions)
      : variant.revenue / Math.max(1, variant.impressions);

    // Estimate standard deviation (simplified)
    const controlStd = Math.abs(controlMean) * 0.3;
    const variantStd = Math.abs(variantMean) * 0.3;

    const controlN = metric === 'averageOrderValue' 
      ? control.conversions 
      : control.impressions;
    const variantN = metric === 'averageOrderValue'
      ? variant.conversions
      : variant.impressions;

    if (controlN < 30 || variantN < 30) {
      return { significant: false, confidence: 0 };
    }

    // Calculate t-statistic
    const pooledStd = Math.sqrt(
      (Math.pow(controlStd, 2) / controlN) +
      (Math.pow(variantStd, 2) / variantN)
    );

    const tStatistic = Math.abs((variantMean - controlMean) / pooledStd);

    // For large samples, t > 1.96 indicates significance at 95% confidence
    const significant = tStatistic > 1.96;
    const confidence = significant ? 0.95 : Math.min(0.94, tStatistic / 1.96 * 0.95);

    return { significant, confidence };
  }

  private determineWinner(
    metrics: ExperimentResult['metrics'],
    primaryMetrics: string[]
  ): string {
    let bestVariant = '';
    let bestScore = -Infinity;

    for (const variantId in metrics) {
      let score = 0;
      let significantWins = 0;

      for (const metric of primaryMetrics) {
        const data = metrics[variantId][metric];
        
        if (data.significant && data.lift > 0) {
          significantWins++;
          score += data.lift;
        }
      }

      // Only consider if has at least one significant win
      if (significantWins > 0 && score > bestScore) {
        bestScore = score;
        bestVariant = variantId;
      }
    }

    return bestVariant || 'control';
  }

  private generateRecommendation(
    results: ExperimentResult,
    experiment: ExperimentConfig
  ): string {
    const recommendations: string[] = [];

    if (!results.winner || results.winner === 'control') {
      recommendations.push('No variant significantly outperformed the control.');
      
      // Check if more time is needed
      const daysSinceStart = differenceInDays(new Date(), experiment.startDate);
      if (daysSinceStart < 7) {
        recommendations.push('Consider running the experiment longer for more conclusive results.');
      }
    } else {
      const winnerMetrics = results.metrics[results.winner];
      const significantMetrics = Object.entries(winnerMetrics)
        .filter(([_, data]) => data.significant && data.lift > 0)
        .map(([metric, data]) => `${metric} (+${data.lift.toFixed(1)}%)`);

      recommendations.push(
        `Variant ${results.winner} is the winner with significant improvements in: ${significantMetrics.join(', ')}`
      );

      // Revenue impact
      if (winnerMetrics.revenue) {
        recommendations.push(
          `Estimated revenue impact: +${winnerMetrics.revenue.lift.toFixed(1)}%`
        );
      }
    }

    return recommendations.join(' ');
  }

  async stopExperiment(experimentId: string): Promise<ExperimentResult> {
    const experiment = await this.getExperiment(experimentId);
    
    if (experiment.status !== 'running') {
      throw new Error('Experiment is not running');
    }

    // Analyze final results
    const results = await this.analyzeExperiment(experimentId);

    // Update status
    await this.supabase
      .from('experiments')
      .update({
        status: 'completed',
        end_date: new Date(),
        results: results
      })
      .eq('id', experimentId);

    // Remove from active experiments
    this.activeExperiments.delete(experimentId);

    return results;
  }

  async getExperiment(experimentId: string): Promise<ExperimentConfig> {
    // Check cache first
    const cached = this.activeExperiments.get(experimentId);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await this.supabase
      .from('experiments')
      .select('*')
      .eq('id', experimentId)
      .single();

    if (error || !data) {
      throw new Error('Experiment not found');
    }

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      status: data.status,
      variants: data.variants,
      metrics: data.metrics,
      startDate: new Date(data.start_date),
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      sampleSize: data.sample_size,
      confidence: data.confidence
    };
  }

  async getActiveExperiments(): Promise<ExperimentConfig[]> {
    const { data } = await this.supabase
      .from('experiments')
      .select('*')
      .eq('status', 'running');

    return (data || []).map(exp => ({
      id: exp.id,
      name: exp.name,
      type: exp.type,
      status: exp.status,
      variants: exp.variants,
      metrics: exp.metrics,
      startDate: new Date(exp.start_date),
      endDate: exp.end_date ? new Date(exp.end_date) : undefined,
      sampleSize: exp.sample_size,
      confidence: exp.confidence
    }));
  }

  async scheduleMutliVariateTest(
    name: string,
    factors: Array<{ name: string; levels: any[] }>,
    metrics: string[],
    duration: number // days
  ): Promise<string[]> {
    // Generate all combinations (full factorial design)
    const combinations = this.generateCombinations(factors);
    
    // Create experiment for each combination
    const experimentIds: string[] = [];

    for (let i = 0; i < combinations.length; i++) {
      const combination = combinations[i];
      
      const config = await this.createExperiment({
        name: `${name}_variant_${i}`,
        type: 'multivariate' as any,
        variants: [
          { id: 'control', name: 'Control', allocation: 0.5, config: {} },
          { id: `variant_${i}`, name: `Variant ${i}`, allocation: 0.5, config: combination }
        ],
        metrics,
        startDate: addDays(new Date(), i * 2), // Stagger starts
        endDate: addDays(new Date(), i * 2 + duration),
        sampleSize: this.minimumSampleSize * 2,
        confidence: this.confidenceLevel
      });

      experimentIds.push(config.id);
    }

    return experimentIds;
  }

  private generateCombinations(
    factors: Array<{ name: string; levels: any[] }>
  ): any[] {
    if (factors.length === 0) return [{}];

    const [first, ...rest] = factors;
    const restCombinations = this.generateCombinations(rest);
    const combinations: any[] = [];

    for (const level of first.levels) {
      for (const combo of restCombinations) {
        combinations.push({
          [first.name]: level,
          ...combo
        });
      }
    }

    return combinations;
  }
}