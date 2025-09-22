import { SupabaseClient } from '@supabase/supabase-js';
import { StatisticalAnalyzer } from './statistical-analyzer.js';
import {
  Experiment,
  ExperimentStatus,
  VariantResult,
  Metric,
  StatisticalTest
} from './types.js';

export class WinnerSelector {
  private statisticalAnalyzer: StatisticalAnalyzer;
  private decisionHistory: Map<string, WinnerDecision[]> = new Map();

  constructor(
    private supabase: SupabaseClient,
    private options: {
      confidenceLevel?: number;
      minimumSampleSize?: number;
      minimumDuration?: number; // hours
      bayesianPriorAlpha?: number;
      bayesianPriorBeta?: number;
      multiMetricStrategy?: 'weighted' | 'all_must_win' | 'primary_only';
    } = {}
  ) {
    this.statisticalAnalyzer = new StatisticalAnalyzer(
      options.confidenceLevel || 0.95,
      options.minimumSampleSize || 100
    );
  }

  // Determine if there's a winner
  public async selectWinner(
    experiment: Experiment
  ): Promise<WinnerSelectionResult> {
    // Check if experiment has run long enough
    const duration = this.getExperimentDuration(experiment);
    const minimumDuration = experiment.winnerSelectionCriteria?.minimumDuration || 
                           this.options.minimumDuration || 
                           24; // 24 hours default

    if (duration < minimumDuration) {
      return {
        hasWinner: false,
        reason: `Experiment needs to run for at least ${minimumDuration} hours (current: ${duration.toFixed(1)}h)`,
        recommendation: 'continue'
      };
    }

    // Get experiment results
    const results = await this.getExperimentResults(experiment.id);
    
    if (!results || results.length === 0) {
      return {
        hasWinner: false,
        reason: 'No data available yet',
        recommendation: 'continue'
      };
    }

    // Check minimum sample size
    const sampleSizeCheck = this.checkSampleSize(experiment, results);
    if (!sampleSizeCheck.sufficient) {
      return {
        hasWinner: false,
        reason: sampleSizeCheck.reason,
        recommendation: 'continue',
        estimatedTimeRemaining: sampleSizeCheck.estimatedTimeRemaining
      };
    }

    // Find control variant
    const control = results.find(r => {
      const variant = experiment.variants.find(v => v.id === r.variantId);
      return variant?.isControl;
    });

    if (!control) {
      return {
        hasWinner: false,
        reason: 'No control variant found',
        recommendation: 'review_setup'
      };
    }

    // Evaluate each variant against control
    const evaluations = await this.evaluateVariants(experiment, control, results);

    // Determine winner based on criteria
    const winnerResult = this.determineWinner(experiment, evaluations);

    // Record decision
    await this.recordDecision(experiment, winnerResult);

    return winnerResult;
  }

  private getExperimentDuration(experiment: Experiment): number {
    if (!experiment.startDate) return 0;
    
    const now = new Date();
    const start = new Date(experiment.startDate);
    return (now.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
  }

  private checkSampleSize(
    experiment: Experiment,
    results: VariantResult[]
  ): SampleSizeCheck {
    const minimumSampleSize = experiment.minimumSampleSize || 
                             this.options.minimumSampleSize || 
                             100;

    const totalExposures = results.reduce((sum, r) => sum + r.exposures, 0);
    const avgExposuresPerVariant = totalExposures / results.length;

    if (avgExposuresPerVariant < minimumSampleSize) {
      const currentRate = totalExposures / this.getExperimentDuration(experiment);
      const remainingExposures = (minimumSampleSize * results.length) - totalExposures;
      const estimatedTimeRemaining = remainingExposures / currentRate;

      return {
        sufficient: false,
        reason: `Need at least ${minimumSampleSize} exposures per variant (current avg: ${Math.floor(avgExposuresPerVariant)})`,
        estimatedTimeRemaining
      };
    }

    // Check statistical power
    const primaryMetric = experiment.metrics.find(m => m.isPrimary);
    if (primaryMetric) {
      const control = results.find(r => {
        const variant = experiment.variants.find(v => v.id === r.variantId);
        return variant?.isControl;
      });

      if (control) {
        const controlRate = control.metrics[primaryMetric.id]?.conversionRate || 0;
        const minimumDetectableEffect = 0.1; // 10% relative change
        
        const requiredSampleSize = this.statisticalAnalyzer.calculateSampleSize(
          controlRate,
          minimumDetectableEffect,
          0.8, // 80% power
          1 - (this.options.confidenceLevel || 0.95),
          true
        );

        if (avgExposuresPerVariant < requiredSampleSize) {
          const currentRate = totalExposures / this.getExperimentDuration(experiment);
          const remainingExposures = (requiredSampleSize * results.length) - totalExposures;
          const estimatedTimeRemaining = remainingExposures / currentRate;

          return {
            sufficient: false,
            reason: `Need ${requiredSampleSize} exposures per variant for 80% statistical power (current: ${Math.floor(avgExposuresPerVariant)})`,
            estimatedTimeRemaining
          };
        }
      }
    }

    return { sufficient: true };
  }

  private async getExperimentResults(experimentId: string): Promise<VariantResult[]> {
    // Get exposures and conversions
    const { data: exposures, error: expError } = await this.supabase
      .from('ab_exposures')
      .select('variant_id')
      .eq('experiment_id', experimentId);

    if (expError) throw expError;

    const { data: conversions, error: convError } = await this.supabase
      .from('ab_conversions')
      .select('variant_id, metric_id, value, revenue')
      .eq('experiment_id', experimentId);

    if (convError) throw convError;

    // Aggregate results by variant
    const variantMap = new Map<string, VariantResult>();

    // Count exposures
    exposures?.forEach(exposure => {
      if (!variantMap.has(exposure.variant_id)) {
        variantMap.set(exposure.variant_id, {
          variantId: exposure.variant_id,
          variantName: '',
          exposures: 0,
          conversions: {},
          metrics: {}
        });
      }
      variantMap.get(exposure.variant_id)!.exposures++;
    });

    // Count conversions and calculate metrics
    conversions?.forEach(conversion => {
      const result = variantMap.get(conversion.variant_id);
      if (result) {
        // Track conversions by metric
        if (!result.conversions[conversion.metric_id]) {
          result.conversions[conversion.metric_id] = 0;
        }
        result.conversions[conversion.metric_id]++;

        // Track revenue if applicable
        if (conversion.revenue) {
          result.revenue = (result.revenue || 0) + conversion.revenue;
        }

        // Calculate metric results
        if (!result.metrics[conversion.metric_id]) {
          result.metrics[conversion.metric_id] = {
            value: 0,
            conversions: 0,
            conversionRate: 0
          };
        }
        
        const metricResult = result.metrics[conversion.metric_id];
        metricResult.conversions++;
        metricResult.value += conversion.value || 1;
      }
    });

    // Calculate conversion rates
    variantMap.forEach(result => {
      Object.keys(result.metrics).forEach(metricId => {
        const metricResult = result.metrics[metricId];
        metricResult.conversionRate = metricResult.conversions / result.exposures;
      });
    });

    return Array.from(variantMap.values());
  }

  private async evaluateVariants(
    experiment: Experiment,
    control: VariantResult,
    results: VariantResult[]
  ): Promise<VariantEvaluation[]> {
    const evaluations: VariantEvaluation[] = [];

    for (const variant of results) {
      if (variant.variantId === control.variantId) continue;

      const evaluation: VariantEvaluation = {
        variantId: variant.variantId,
        metrics: {},
        overallScore: 0,
        isWinner: false,
        confidence: 0
      };

      // Evaluate each metric
      for (const metric of experiment.metrics) {
        const metricEval = await this.evaluateMetric(
          experiment,
          control,
          variant,
          metric
        );
        evaluation.metrics[metric.id] = metricEval;
      }

      // Calculate overall score
      evaluation.overallScore = this.calculateOverallScore(
        experiment,
        evaluation
      );

      // Determine if this variant is a winner
      evaluation.isWinner = this.isVariantWinner(
        experiment,
        evaluation
      );

      // Calculate confidence
      evaluation.confidence = this.calculateConfidence(evaluation);

      evaluations.push(evaluation);
    }

    return evaluations;
  }

  private async evaluateMetric(
    experiment: Experiment,
    control: VariantResult,
    variant: VariantResult,
    metric: Metric
  ): Promise<MetricEvaluation> {
    const test = experiment.statisticalTest || StatisticalTest.CHI_SQUARE;
    
    // Statistical significance test
    const significance = this.statisticalAnalyzer.calculateSignificance(
      control,
      variant,
      metric,
      test
    );

    // Bayesian analysis
    const controlConversions = control.metrics[metric.id]?.conversions || 0;
    const variantConversions = variant.metrics[metric.id]?.conversions || 0;
    
    const bayesian = this.statisticalAnalyzer.bayesianAnalysis(
      controlConversions,
      control.exposures,
      variantConversions,
      variant.exposures,
      this.options.bayesianPriorAlpha || 1,
      this.options.bayesianPriorBeta || 1
    );

    // Check if metric goal is met
    let goalMet = false;
    if (metric.goalValue) {
      const variantValue = variant.metrics[metric.id]?.value || 0;
      goalMet = variantValue >= metric.goalValue;
    }

    return {
      metricId: metric.id,
      metricName: metric.name,
      controlValue: control.metrics[metric.id]?.conversionRate || 0,
      variantValue: variant.metrics[metric.id]?.conversionRate || 0,
      controlConversions,
      variantConversions,
      uplift: significance.uplift,
      upliftCI: significance.upliftConfidenceInterval,
      pValue: significance.pValue,
      isSignificant: significance.isSignificant,
      statisticalPower: significance.statisticalPower,
      probabilityOfBeingBest: bayesian.probabilityVariantBetter,
      expectedLoss: bayesian.expectedLoss,
      goalMet
    };
  }

  private calculateOverallScore(
    experiment: Experiment,
    evaluation: VariantEvaluation
  ): number {
    const strategy = this.options.multiMetricStrategy || 'weighted';
    
    switch (strategy) {
      case 'primary_only':
        return this.calculatePrimaryOnlyScore(experiment, evaluation);
      case 'all_must_win':
        return this.calculateAllMustWinScore(experiment, evaluation);
      case 'weighted':
      default:
        return this.calculateWeightedScore(experiment, evaluation);
    }
  }

  private calculatePrimaryOnlyScore(
    experiment: Experiment,
    evaluation: VariantEvaluation
  ): number {
    const primaryMetric = experiment.metrics.find(m => m.isPrimary);
    if (!primaryMetric) return 0;

    const metricEval = evaluation.metrics[primaryMetric.id];
    if (!metricEval) return 0;

    return metricEval.probabilityOfBeingBest;
  }

  private calculateAllMustWinScore(
    experiment: Experiment,
    evaluation: VariantEvaluation
  ): number {
    const scores = Object.values(evaluation.metrics).map(m => 
      m.probabilityOfBeingBest
    );

    if (scores.length === 0) return 0;
    return Math.min(...scores); // Worst performing metric determines score
  }

  private calculateWeightedScore(
    experiment: Experiment,
    evaluation: VariantEvaluation
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const metric of experiment.metrics) {
      const metricEval = evaluation.metrics[metric.id];
      if (!metricEval) continue;

      // Primary metric gets 2x weight
      const weight = metric.isPrimary ? 2 : 1;
      totalWeight += weight;
      weightedSum += metricEval.probabilityOfBeingBest * weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private isVariantWinner(
    experiment: Experiment,
    evaluation: VariantEvaluation
  ): boolean {
    const criteria = experiment.winnerSelectionCriteria;
    if (!criteria) {
      // Default criteria: 95% probability of being best
      return evaluation.overallScore > 0.95;
    }

    // Check primary metric
    if (criteria.metric) {
      const metricEval = evaluation.metrics[criteria.metric];
      if (!metricEval) return false;

      // Check statistical significance
      if (!metricEval.isSignificant) return false;

      // Check probability threshold
      const threshold = criteria.threshold || 0.95;
      if (metricEval.probabilityOfBeingBest < threshold) return false;

      // Check minimum conversions
      if (criteria.minimumConversions) {
        if ((metricEval.variantConversions ?? 0) < criteria.minimumConversions) {
          return false;
        }
      }
    }

    return true;
  }

  private calculateConfidence(evaluation: VariantEvaluation): number {
    // Average confidence across all metrics
    const confidences = Object.values(evaluation.metrics).map(m => 
      m.probabilityOfBeingBest
    );

    if (confidences.length === 0) return 0;
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  private determineWinner(
    experiment: Experiment,
    evaluations: VariantEvaluation[]
  ): WinnerSelectionResult {
    // Find variants that meet winning criteria
    const winners = evaluations.filter(e => e.isWinner);

    if (winners.length === 0) {
      // No clear winner yet
      const bestVariant = evaluations.reduce((best, current) => 
        current.overallScore > best.overallScore ? current : best
      , evaluations[0]);

      if (bestVariant.overallScore > 0.8) {
        return {
          hasWinner: false,
          reason: 'Leading variant detected but not yet statistically significant',
          leadingVariant: bestVariant.variantId,
          confidence: bestVariant.confidence,
          recommendation: 'continue'
        };
      }

      return {
        hasWinner: false,
        reason: 'No variant showing significant improvement',
        recommendation: 'continue_or_redesign'
      };
    }

    // Select best winner if multiple
    const winner = winners.reduce((best, current) => 
      current.overallScore > best.overallScore ? current : best
    );

    return {
      hasWinner: true,
      winner: winner.variantId,
      confidence: winner.confidence,
      metrics: winner.metrics,
      recommendation: 'implement_winner',
      autoImplement: experiment.winnerSelectionCriteria?.autoImplement || false
    };
  }

  private async recordDecision(
    experiment: Experiment,
    result: WinnerSelectionResult
  ): Promise<void> {
    const experimentId = experiment.id;
    const decision: WinnerDecision = {
      experimentId,
      timestamp: new Date(),
      result,
      implemented: false
    };

    // Store in database
    try {
      await this.supabase
        .from('ab_winner_decisions')
        .insert({
          experiment_id: experimentId,
          has_winner: result.hasWinner,
          winner_variant_id: result.winner,
          confidence: result.confidence,
          reason: result.reason,
          recommendation: result.recommendation,
          metrics: result.metrics,
          auto_implement: result.autoImplement,
          implemented: false,
          timestamp: decision.timestamp.toISOString()
        });
    } catch (error) {
      console.error('Failed to record winner decision:', error);
    }

    // Update local history
    if (!this.decisionHistory.has(experimentId)) {
      this.decisionHistory.set(experimentId, []);
    }
    this.decisionHistory.get(experimentId)!.push(decision);

    // Auto-implement if configured
    if (result.hasWinner && result.autoImplement) {
      await this.implementWinner(experimentId, result.winner!);
    }

    // Auto-stop if configured
    if (result.hasWinner && experiment.winnerSelectionCriteria?.autoStop) {
      await this.stopExperiment(experimentId);
    }
  }

  private async implementWinner(
    experimentId: string,
    winnerVariantId: string
  ): Promise<void> {
    try {
      // Update experiment to route 100% traffic to winner
      await this.supabase
        .from('ab_experiments')
        .update({
          status: ExperimentStatus.COMPLETED,
          winner_variant_id: winnerVariantId,
          completed_at: new Date().toISOString()
        })
        .eq('id', experimentId);

      // Update decision record
      await this.supabase
        .from('ab_winner_decisions')
        .update({ implemented: true })
        .eq('experiment_id', experimentId)
        .eq('winner_variant_id', winnerVariantId);

    } catch (error) {
      console.error('Failed to implement winner:', error);
    }
  }

  private async stopExperiment(experimentId: string): Promise<void> {
    try {
      await this.supabase
        .from('ab_experiments')
        .update({
          status: ExperimentStatus.COMPLETED,
          ended_at: new Date().toISOString()
        })
        .eq('id', experimentId);
    } catch (error) {
      console.error('Failed to stop experiment:', error);
    }
  }

  // Monitor experiments for auto-selection
  public async monitorExperiments(): Promise<void> {
    const { data: experiments, error } = await this.supabase
      .from('ab_experiments')
      .select('*')
      .eq('status', ExperimentStatus.RUNNING)
      .not('winner_selection_criteria', 'is', null);

    if (error) {
      console.error('Failed to fetch experiments:', error);
      return;
    }

    for (const experiment of experiments || []) {
      try {
        const result = await this.selectWinner(experiment);
        console.log(`Experiment ${experiment.id}: ${result.recommendation}`);
      } catch (error) {
        console.error(`Failed to evaluate experiment ${experiment.id}:`, error);
      }
    }
  }
}

interface SampleSizeCheck {
  sufficient: boolean;
  reason?: string;
  estimatedTimeRemaining?: number; // hours
}

interface VariantEvaluation {
  variantId: string;
  metrics: Record<string, MetricEvaluation>;
  overallScore: number;
  isWinner: boolean;
  confidence: number;
}

interface MetricEvaluation {
  metricId: string;
  metricName: string;
  controlValue: number;
  variantValue: number;
  controlConversions: number;
  variantConversions: number;
  uplift: number;
  upliftCI: [number, number];
  pValue: number;
  isSignificant: boolean;
  statisticalPower: number;
  probabilityOfBeingBest: number;
  expectedLoss: number;
  goalMet: boolean;
}

interface WinnerSelectionResult {
  hasWinner: boolean;
  winner?: string;
  leadingVariant?: string;
  confidence?: number;
  metrics?: Record<string, MetricEvaluation>;
  reason?: string;
  recommendation: 'continue' | 'implement_winner' | 'continue_or_redesign' | 'review_setup';
  estimatedTimeRemaining?: number; // hours
  autoImplement?: boolean;
}

interface WinnerDecision {
  experimentId: string;
  timestamp: Date;
  result: WinnerSelectionResult;
  implemented: boolean;
}
