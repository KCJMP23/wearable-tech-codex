import { SupabaseClient } from '@supabase/supabase-js';
import {
  Variant,
  Experiment,
  VariantResult,
  AllocationError
} from './types.js';

export class VariantManager {
  private allocations: Map<string, number[]> = new Map();
  private performanceCache: Map<string, VariantPerformance> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();

  constructor(
    private supabase: SupabaseClient,
    private options: {
      dynamicUpdateInterval?: number; // milliseconds
      multiArmedBanditAlgorithm?: 'thompson' | 'ucb' | 'epsilon_greedy';
      epsilonGreedyRate?: number;
      ucbExplorationFactor?: number;
    } = {}
  ) {}

  // Validate variant configuration
  public validateVariants(variants: Variant[]): void {
    if (variants.length < 2) {
      throw new AllocationError('At least 2 variants are required');
    }

    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new AllocationError(`Variant weights must sum to 100, got ${totalWeight}`);
    }

    const hasControl = variants.some(v => v.isControl);
    if (!hasControl && variants.length > 0) {
      // Auto-assign first variant as control if not specified
      variants[0].isControl = true;
    }

    const ids = new Set<string>();
    const names = new Set<string>();
    
    for (const variant of variants) {
      if (ids.has(variant.id)) {
        throw new AllocationError(`Duplicate variant ID: ${variant.id}`);
      }
      if (names.has(variant.name)) {
        throw new AllocationError(`Duplicate variant name: ${variant.name}`);
      }
      
      ids.add(variant.id);
      names.add(variant.name);

      if (variant.weight < 0 || variant.weight > 100) {
        throw new AllocationError(
          `Invalid weight for variant ${variant.name}: ${variant.weight}`
        );
      }
    }
  }

  // Update variant allocation dynamically
  public async updateAllocation(
    experiment: Experiment,
    currentResults?: VariantResult[]
  ): Promise<Variant[]> {
    const now = Date.now();
    const lastUpdate = this.lastUpdateTime.get(experiment.id) || 0;
    const updateInterval = this.options.dynamicUpdateInterval || 3600000; // 1 hour default

    if (now - lastUpdate < updateInterval) {
      return experiment.variants; // Too soon to update
    }

    switch (experiment.allocation.type) {
      case 'dynamic':
        return await this.updateDynamicAllocation(experiment, currentResults);
      case 'multi_armed_bandit':
        return await this.updateMultiArmedBanditAllocation(experiment, currentResults);
      default:
        return experiment.variants; // Fixed allocation doesn't change
    }
  }

  private async updateDynamicAllocation(
    experiment: Experiment,
    currentResults?: VariantResult[]
  ): Promise<Variant[]> {
    if (!currentResults || currentResults.length === 0) {
      return experiment.variants;
    }

    // Calculate performance metrics
    const performances = await this.calculateVariantPerformance(
      experiment,
      currentResults
    );

    // Adjust weights based on performance
    const updatedVariants = this.adjustWeightsBasedOnPerformance(
      experiment.variants,
      performances
    );

    // Validate new weights
    this.validateVariants(updatedVariants);

    // Update in database
    await this.saveUpdatedVariants(experiment.id, updatedVariants);

    this.lastUpdateTime.set(experiment.id, Date.now());
    return updatedVariants;
  }

  private async updateMultiArmedBanditAllocation(
    experiment: Experiment,
    currentResults?: VariantResult[]
  ): Promise<Variant[]> {
    if (!currentResults || currentResults.length === 0) {
      return experiment.variants;
    }

    const algorithm = this.options.multiArmedBanditAlgorithm || 'thompson';
    let updatedVariants: Variant[];

    switch (algorithm) {
      case 'thompson':
        updatedVariants = await this.thompsonSampling(experiment, currentResults);
        break;
      case 'ucb':
        updatedVariants = await this.upperConfidenceBound(experiment, currentResults);
        break;
      case 'epsilon_greedy':
        updatedVariants = await this.epsilonGreedy(experiment, currentResults);
        break;
      default:
        updatedVariants = experiment.variants;
    }

    // Validate new weights
    this.validateVariants(updatedVariants);

    // Update in database
    await this.saveUpdatedVariants(experiment.id, updatedVariants);

    this.lastUpdateTime.set(experiment.id, Date.now());
    return updatedVariants;
  }

  // Thompson Sampling for Multi-Armed Bandit
  private async thompsonSampling(
    experiment: Experiment,
    results: VariantResult[]
  ): Promise<Variant[]> {
    const variants = [...experiment.variants];
    const samples: Map<string, number> = new Map();

    // Generate beta samples for each variant
    for (const result of results) {
      const variant = variants.find(v => v.id === result.variantId);
      if (!variant) continue;

      const primaryMetric = experiment.metrics.find(m => m.isPrimary);
      if (!primaryMetric) continue;

      const metricResult = result.metrics[primaryMetric.id];
      if (!metricResult) continue;

      // Beta distribution parameters
      const alpha = metricResult.conversions + 1; // Successes + 1
      const beta = result.exposures - metricResult.conversions + 1; // Failures + 1

      // Sample from beta distribution
      const sample = this.sampleBeta(alpha, beta);
      samples.set(result.variantId, sample);
    }

    // Allocate weights proportional to samples
    const totalSample = Array.from(samples.values()).reduce((sum, s) => sum + s, 0);
    
    for (const variant of variants) {
      const sample = samples.get(variant.id) || 0;
      variant.weight = Math.round((sample / totalSample) * 100 * 100) / 100; // 2 decimal places
    }

    // Ensure weights sum to 100
    this.normalizeWeights(variants);

    return variants;
  }

  // Upper Confidence Bound (UCB) for Multi-Armed Bandit
  private async upperConfidenceBound(
    experiment: Experiment,
    results: VariantResult[]
  ): Promise<Variant[]> {
    const variants = [...experiment.variants];
    const ucbScores: Map<string, number> = new Map();
    const explorationFactor = this.options.ucbExplorationFactor || 2;

    const totalExposures = results.reduce((sum, r) => sum + r.exposures, 0);

    for (const result of results) {
      const variant = variants.find(v => v.id === result.variantId);
      if (!variant) continue;

      const primaryMetric = experiment.metrics.find(m => m.isPrimary);
      if (!primaryMetric) continue;

      const metricResult = result.metrics[primaryMetric.id];
      if (!metricResult) continue;

      // Calculate UCB score
      const meanReward = metricResult.conversionRate;
      const confidence = Math.sqrt(
        (explorationFactor * Math.log(totalExposures)) / result.exposures
      );
      const ucb = meanReward + confidence;

      ucbScores.set(result.variantId, ucb);
    }

    // Allocate weights based on UCB scores
    const maxUcb = Math.max(...Array.from(ucbScores.values()));
    
    for (const variant of variants) {
      const ucb = ucbScores.get(variant.id) || 0;
      if (ucb === maxUcb) {
        // Give more weight to best performer
        variant.weight = 40 + Math.random() * 20; // 40-60%
      } else {
        // Distribute remaining weight
        variant.weight = (100 - 50) / (variants.length - 1);
      }
    }

    // Ensure weights sum to 100
    this.normalizeWeights(variants);

    return variants;
  }

  // Epsilon-Greedy for Multi-Armed Bandit
  private async epsilonGreedy(
    experiment: Experiment,
    results: VariantResult[]
  ): Promise<Variant[]> {
    const variants = [...experiment.variants];
    const epsilon = this.options.epsilonGreedyRate || 0.1;
    const conversionRates: Map<string, number> = new Map();

    // Calculate conversion rates
    for (const result of results) {
      const primaryMetric = experiment.metrics.find(m => m.isPrimary);
      if (!primaryMetric) continue;

      const metricResult = result.metrics[primaryMetric.id];
      if (!metricResult) continue;

      conversionRates.set(result.variantId, metricResult.conversionRate);
    }

    // Find best performing variant
    let bestVariantId: string | null = null;
    let bestRate = -1;
    
    for (const [variantId, rate] of conversionRates) {
      if (rate > bestRate) {
        bestRate = rate;
        bestVariantId = variantId;
      }
    }

    // Allocate weights
    for (const variant of variants) {
      if (variant.id === bestVariantId) {
        // Exploit: give most weight to best performer
        variant.weight = (1 - epsilon) * 100;
      } else {
        // Explore: distribute remaining weight equally
        variant.weight = (epsilon * 100) / (variants.length - 1);
      }
    }

    // Ensure weights sum to 100
    this.normalizeWeights(variants);

    return variants;
  }

  // Calculate variant performance
  private async calculateVariantPerformance(
    experiment: Experiment,
    results: VariantResult[]
  ): Promise<Map<string, VariantPerformance>> {
    const performances = new Map<string, VariantPerformance>();

    for (const result of results) {
      const primaryMetric = experiment.metrics.find(m => m.isPrimary);
      if (!primaryMetric) continue;

      const metricResult = result.metrics[primaryMetric.id];
      if (!metricResult) continue;

      performances.set(result.variantId, {
        conversionRate: metricResult.conversionRate,
        revenue: result.revenue || 0,
        confidence: result.confidence || 0,
        uplift: result.uplift || 0,
        exposures: result.exposures
      });
    }

    return performances;
  }

  // Adjust weights based on performance
  private adjustWeightsBasedOnPerformance(
    variants: Variant[],
    performances: Map<string, VariantPerformance>
  ): Variant[] {
    const updatedVariants = [...variants];
    
    // Calculate performance scores
    const scores: Map<string, number> = new Map();
    let totalScore = 0;

    for (const variant of updatedVariants) {
      const perf = performances.get(variant.id);
      if (!perf) {
        scores.set(variant.id, 1); // Default score
        totalScore += 1;
        continue;
      }

      // Composite score based on conversion rate and confidence
      const score = perf.conversionRate * (0.5 + 0.5 * perf.confidence);
      scores.set(variant.id, score);
      totalScore += score;
    }

    // Adjust weights proportionally
    for (const variant of updatedVariants) {
      const score = scores.get(variant.id) || 1;
      const newWeight = (score / totalScore) * 100;

      // Apply smoothing to prevent drastic changes
      const smoothingFactor = 0.3;
      variant.weight = variant.weight * (1 - smoothingFactor) + 
                      newWeight * smoothingFactor;
    }

    // Ensure weights sum to 100
    this.normalizeWeights(updatedVariants);

    // Ensure minimum weight for each variant (to maintain exploration)
    const minWeight = 5; // 5% minimum
    for (const variant of updatedVariants) {
      if (variant.weight < minWeight) {
        variant.weight = minWeight;
      }
    }

    // Renormalize after applying minimum
    this.normalizeWeights(updatedVariants);

    return updatedVariants;
  }

  // Normalize weights to sum to 100
  private normalizeWeights(variants: Variant[]): void {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    
    if (totalWeight === 0) {
      // Equal distribution if all weights are 0
      variants.forEach(v => v.weight = 100 / variants.length);
    } else {
      // Scale to 100
      const scale = 100 / totalWeight;
      variants.forEach(v => v.weight = Math.round(v.weight * scale * 100) / 100);
    }

    // Fix rounding errors on last variant
    const currentTotal = variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(currentTotal - 100) > 0.01) {
      variants[variants.length - 1].weight += 100 - currentTotal;
    }
  }

  // Save updated variants to database
  private async saveUpdatedVariants(
    experimentId: string,
    variants: Variant[]
  ): Promise<void> {
    const { error } = await this.supabase
      .from('ab_experiments')
      .update({ 
        variants,
        updated_at: new Date().toISOString()
      })
      .eq('id', experimentId);

    if (error) {
      throw new AllocationError(`Failed to update variants: ${error.message}`);
    }

    // Also save allocation history for audit
    await this.saveAllocationHistory(experimentId, variants);
  }

  private async saveAllocationHistory(
    experimentId: string,
    variants: Variant[]
  ): Promise<void> {
    const allocation = variants.map(v => ({
      variant_id: v.id,
      variant_name: v.name,
      weight: v.weight
    }));

    const { error } = await this.supabase
      .from('ab_allocation_history')
      .insert({
        experiment_id: experimentId,
        allocation,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to save allocation history:', error);
    }
  }

  // Get optimal variant allocation for new experiment
  public getOptimalInitialAllocation(
    numVariants: number,
    expectedEffect?: number
  ): Variant[] {
    if (numVariants <= 1) {
      return [{ id: 'control', name: 'Control', weight: 100, isControl: true }];
    }

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const effectAdjustment = expectedEffect !== undefined ? clamp(expectedEffect, -20, 20) : 0;
    const variants: Variant[] = [];

    if (numVariants === 2) {
      const controlWeight = clamp(50 + effectAdjustment, 0, 100);
      const variantWeight = 100 - controlWeight;
      variants.push(
        { id: 'control', name: 'Control', weight: controlWeight, isControl: true },
        { id: 'variant_a', name: 'Variant A', weight: variantWeight }
      );
    } else {
      const baseControlWeight = 100 / numVariants + 10;
      const controlWeight = clamp(baseControlWeight + effectAdjustment, 0, 100);
      const remainingWeight = Math.max(0, 100 - controlWeight);
      const variantWeight = remainingWeight / (numVariants - 1);

      variants.push({
        id: 'control',
        name: 'Control',
        weight: controlWeight,
        isControl: true
      });

      for (let i = 1; i < numVariants; i++) {
        variants.push({
          id: `variant_${String.fromCharCode(64 + i)}`,
          name: `Variant ${String.fromCharCode(64 + i)}`,
          weight: variantWeight
        });
      }
    }

    this.normalizeWeights(variants);
    return variants;
  }

  // Helper function to sample from Beta distribution
  private sampleBeta(alpha: number, beta: number): number {
    // Using gamma distribution to sample beta
    const x = this.sampleGamma(alpha);
    const y = this.sampleGamma(beta);
    return x / (x + y);
  }

  // Helper function to sample from Gamma distribution
  private sampleGamma(shape: number): number {
    // Marsaglia and Tsang method
    if (shape < 1) {
      return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1/3;
    const c = 1 / Math.sqrt(9 * d);

    let sample: number | undefined;
    while (sample === undefined) {
      const z = this.randomNormal();
      const v = Math.pow(1 + c * z, 3);
      const u = Math.random();

      if (u < 1 - 0.0331 * z * z * z * z) {
        sample = d * v;
      } else if (Math.log(u) < 0.5 * z * z + d * (1 - v + Math.log(v))) {
        sample = d * v;
      }
    }

    return sample;
  }

  // Helper function for normal distribution
  private randomNormal(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

interface VariantPerformance {
  conversionRate: number;
  revenue: number;
  confidence: number;
  uplift: number;
  exposures: number;
}
