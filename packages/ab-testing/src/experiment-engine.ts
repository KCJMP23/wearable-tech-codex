import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as murmur from 'murmurhash';
import { 
  Experiment, 
  ExperimentStatus, 
  Variant, 
  UserContext,
  Assignment,
  ExposureEvent,
  ConversionEvent,
  AllocationError,
  ExperimentSchema,
  AllocationStrategy
} from './types.js';

export class ExperimentEngine {
  private supabase: SupabaseClient;
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, Assignment> = new Map();
  private exposureBuffer: ExposureEvent[] = [];
  private conversionBuffer: ConversionEvent[] = [];
  private flushInterval?: NodeJS.Timeout;
  private refreshInterval?: NodeJS.Timeout;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    private options: {
      flushIntervalMs?: number;
      refreshIntervalMs?: number;
      bufferSize?: number;
      enableRealtime?: boolean;
    } = {}
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initialize();
  }

  private async initialize() {
    await this.loadExperiments();
    this.setupEventFlushing();
    this.setupExperimentRefresh();
    
    if (this.options.enableRealtime) {
      this.setupRealtimeSync();
    }
  }

  private async loadExperiments() {
    try {
      const { data, error } = await this.supabase
        .from('ab_experiments')
        .select('*')
        .in('status', [ExperimentStatus.RUNNING, ExperimentStatus.PAUSED]);

      if (error) throw error;

      data?.forEach(exp => {
        const validated = ExperimentSchema.parse(exp);
        this.experiments.set(validated.id, validated);
      });
    } catch (error) {
      console.error('Failed to load experiments:', error);
    }
  }

  private setupEventFlushing() {
    const interval = this.options.flushIntervalMs || 10000; // 10 seconds default
    
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, interval);
  }

  private setupExperimentRefresh() {
    const interval = this.options.refreshIntervalMs || 60000; // 1 minute default
    
    this.refreshInterval = setInterval(() => {
      this.loadExperiments();
    }, interval);
  }

  private setupRealtimeSync() {
    this.supabase
      .channel('ab_experiments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ab_experiments' },
        (payload) => {
          this.handleExperimentChange(payload);
        }
      )
      .subscribe();
  }

  private handleExperimentChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newRecord) {
          try {
            const validated = ExperimentSchema.parse(newRecord);
            this.experiments.set(validated.id, validated);
          } catch (error) {
            console.error('Invalid experiment data:', error);
          }
        }
        break;
      case 'DELETE':
        if (oldRecord?.id) {
          this.experiments.delete(oldRecord.id);
        }
        break;
    }
  }

  // Core allocation logic
  public getAssignment(
    experimentId: string,
    context: UserContext
  ): Assignment {
    const cacheKey = this.getAssignmentCacheKey(experimentId, context);
    
    // Check cache first
    if (this.assignments.has(cacheKey)) {
      return this.assignments.get(cacheKey)!;
    }

    const experiment = this.experiments.get(experimentId);
    
    if (!experiment || experiment.status !== ExperimentStatus.RUNNING) {
      return this.getDefaultAssignment(experimentId);
    }

    // Check segmentation
    if (!this.isInTargetSegment(experiment, context)) {
      return this.getDefaultAssignment(experimentId);
    }

    // Allocate variant
    const variant = this.allocateVariant(experiment, context);
    
    const assignment: Assignment = {
      experimentId,
      experimentName: experiment.name,
      variantId: variant.id,
      variantName: variant.name,
      isInExperiment: true,
      config: variant.config,
      featureFlags: this.getFeatureFlags(experiment, variant),
    };

    // Cache assignment
    this.assignments.set(cacheKey, assignment);

    // Track exposure
    this.trackExposure(experimentId, variant.id, context);

    return assignment;
  }

  private allocateVariant(
    experiment: Experiment,
    context: UserContext
  ): Variant {
    switch (experiment.allocation.type) {
      case 'fixed':
        return this.fixedAllocation(experiment, context);
      case 'dynamic':
        return this.dynamicAllocation(experiment, context);
      case 'multi_armed_bandit':
        return this.multiArmedBanditAllocation(experiment, context);
      default:
        return this.fixedAllocation(experiment, context);
    }
  }

  private fixedAllocation(
    experiment: Experiment,
    context: UserContext
  ): Variant {
    const bucketer = this.getBucketingKey(experiment, context);
    const hash = murmur.v3(bucketer, experiment.allocation.seed || 0);
    const bucket = (hash % 10000) / 100; // 0-100 with 2 decimal precision

    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return variant;
      }
    }

    // Fallback to control
    const control = experiment.variants.find(v => v.isControl) || experiment.variants[0];
    return control;
  }

  private dynamicAllocation(
    experiment: Experiment,
    context: UserContext
  ): Variant {
    // Dynamic allocation based on performance
    // This would fetch current performance metrics and adjust weights
    // For now, fallback to fixed allocation
    return this.fixedAllocation(experiment, context);
  }

  private multiArmedBanditAllocation(
    experiment: Experiment,
    context: UserContext
  ): Variant {
    // Multi-armed bandit algorithm (e.g., Thompson Sampling, UCB)
    // This would use historical performance data to optimize allocation
    // For now, fallback to fixed allocation
    return this.fixedAllocation(experiment, context);
  }

  private getBucketingKey(
    experiment: Experiment,
    context: UserContext
  ): string {
    // Use userId if available, otherwise sessionId
    const id = context.userId || context.sessionId;
    return `${experiment.id}-${id}`;
  }

  private isInTargetSegment(
    experiment: Experiment,
    context: UserContext
  ): boolean {
    if (!experiment.segments || experiment.segments.length === 0) {
      return true; // No segmentation, include everyone
    }

    for (const segment of experiment.segments) {
      if (this.evaluateSegment(segment, context)) {
        return true;
      }
    }

    return false;
  }

  private evaluateSegment(segment: any, context: UserContext): boolean {
    const operator = segment.operator || 'AND';
    const results = segment.conditions.map((condition: any) => 
      this.evaluateCondition(condition, context)
    );

    if (operator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  private evaluateCondition(condition: any, context: UserContext): boolean {
    const value = this.getNestedValue(context, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'gt':
        return Number(value) > Number(condition.value);
      case 'lt':
        return Number(value) < Number(condition.value);
      case 'gte':
        return Number(value) >= Number(condition.value);
      case 'lte':
        return Number(value) <= Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getDefaultAssignment(experimentId: string): Assignment {
    return {
      experimentId,
      experimentName: 'Unknown',
      variantId: 'control',
      variantName: 'Control',
      isInExperiment: false,
      config: {},
    };
  }

  private getFeatureFlags(
    experiment: Experiment,
    variant: Variant
  ): Record<string, boolean | unknown> {
    const flags: Record<string, boolean | unknown> = {};
    
    if (experiment.featureFlags) {
      experiment.featureFlags.forEach(flagId => {
        // Get flag configuration for this variant
        flags[flagId] = variant.config?.[flagId] ?? false;
      });
    }

    return flags;
  }

  private getAssignmentCacheKey(
    experimentId: string,
    context: UserContext
  ): string {
    const id = context.userId || context.sessionId;
    return `${experimentId}-${id}`;
  }

  // Event tracking
  public trackExposure(
    experimentId: string,
    variantId: string,
    context: UserContext
  ): void {
    const event: ExposureEvent = {
      experimentId,
      variantId,
      userId: context.userId,
      sessionId: context.sessionId,
      context,
      timestamp: new Date(),
    };

    this.exposureBuffer.push(event);

    // Flush if buffer is full
    const bufferSize = this.options.bufferSize || 100;
    if (this.exposureBuffer.length >= bufferSize) {
      this.flushEvents();
    }
  }

  public trackConversion(
    experimentId: string,
    metricId: string,
    context: UserContext,
    value?: number,
    revenue?: number
  ): void {
    const assignment = this.getAssignment(experimentId, context);
    
    if (!assignment.isInExperiment) {
      return; // Don't track conversions for non-participants
    }

    const event: ConversionEvent = {
      experimentId,
      variantId: assignment.variantId,
      metricId,
      userId: context.userId,
      sessionId: context.sessionId,
      value,
      revenue,
      context,
      timestamp: new Date(),
    };

    this.conversionBuffer.push(event);

    // Flush if buffer is full
    const bufferSize = this.options.bufferSize || 100;
    if (this.conversionBuffer.length >= bufferSize) {
      this.flushEvents();
    }
  }

  private async flushEvents() {
    const exposuresToFlush = [...this.exposureBuffer];
    const conversionsToFlush = [...this.conversionBuffer];

    this.exposureBuffer = [];
    this.conversionBuffer = [];

    // Send exposures
    if (exposuresToFlush.length > 0) {
      try {
        const { error } = await this.supabase
          .from('ab_exposures')
          .insert(exposuresToFlush);
        
        if (error) throw error;
      } catch (error) {
        console.error('Failed to flush exposures:', error);
        // Re-add to buffer for retry
        this.exposureBuffer.unshift(...exposuresToFlush);
      }
    }

    // Send conversions
    if (conversionsToFlush.length > 0) {
      try {
        const { error } = await this.supabase
          .from('ab_conversions')
          .insert(conversionsToFlush);
        
        if (error) throw error;
      } catch (error) {
        console.error('Failed to flush conversions:', error);
        // Re-add to buffer for retry
        this.conversionBuffer.unshift(...conversionsToFlush);
      }
    }
  }

  // Experiment management
  public async createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment> {
    const newExperiment = {
      ...experiment,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validated = ExperimentSchema.parse(newExperiment);

    const { data, error } = await this.supabase
      .from('ab_experiments')
      .insert(validated)
      .select()
      .single();

    if (error) throw error;

    this.experiments.set(data.id, data);
    return data;
  }

  public async updateExperiment(
    experimentId: string,
    updates: Partial<Experiment>
  ): Promise<Experiment> {
    const existing = this.experiments.get(experimentId);
    if (!existing) {
      throw new Error('Experiment not found');
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    const validated = ExperimentSchema.parse(updated);

    const { data, error } = await this.supabase
      .from('ab_experiments')
      .update(validated)
      .eq('id', experimentId)
      .select()
      .single();

    if (error) throw error;

    this.experiments.set(data.id, data);
    return data;
  }

  public async startExperiment(experimentId: string): Promise<void> {
    await this.updateExperiment(experimentId, {
      status: ExperimentStatus.RUNNING,
      startDate: new Date(),
    });
  }

  public async pauseExperiment(experimentId: string): Promise<void> {
    await this.updateExperiment(experimentId, {
      status: ExperimentStatus.PAUSED,
    });
  }

  public async completeExperiment(experimentId: string): Promise<void> {
    await this.updateExperiment(experimentId, {
      status: ExperimentStatus.COMPLETED,
      endDate: new Date(),
    });
  }

  private generateId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  public destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.flushEvents();
  }
}