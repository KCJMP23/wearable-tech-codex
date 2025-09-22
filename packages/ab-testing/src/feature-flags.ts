import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import * as murmur from 'murmurhash';
import {
  FeatureFlag,
  UserContext,
  SegmentCondition
} from './types.js';

type FlagChangePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: unknown;
  old: unknown;
};

export class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private evaluationCache: Map<string, boolean | unknown> = new Map();
  private refreshInterval?: NodeJS.Timeout;
  private realtimeSubscription?: RealtimeChannel;

  constructor(
    private supabase: SupabaseClient,
    private options: {
      refreshIntervalMs?: number;
      enableRealtime?: boolean;
      cacheEvaluations?: boolean;
      defaultValue?: boolean;
    } = {}
  ) {
    this.initialize();
  }

  private async initialize() {
    await this.loadFlags();
    this.setupRefresh();
    
    if (this.options.enableRealtime) {
      this.setupRealtimeSync();
    }
  }

  private async loadFlags() {
    try {
      const { data, error } = await this.supabase
        .from('feature_flags')
        .select('*')
        .eq('enabled', true);

      if (error) throw error;

      this.flags.clear();
      data?.forEach(flag => {
        this.flags.set(flag.id, flag);
      });
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    }
  }

  private setupRefresh() {
    const interval = this.options.refreshIntervalMs || 60000; // 1 minute default
    
    this.refreshInterval = setInterval(() => {
      this.loadFlags();
      this.clearCache();
    }, interval);
  }

  private setupRealtimeSync() {
    this.realtimeSubscription = this.supabase
      .channel('feature_flags_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_flags' },
        (payload) => {
          this.handleFlagChange(payload as FlagChangePayload);
        }
      )
      .subscribe();
  }

  private handleFlagChange(payload: FlagChangePayload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const nextRecord = this.normalizeFlagRecord(newRecord);
    const previousRecord = this.normalizeFlagRecord(oldRecord);

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (nextRecord?.enabled && nextRecord.id) {
          this.flags.set(nextRecord.id, nextRecord as FeatureFlag);
        } else if (nextRecord && nextRecord.id) {
          this.flags.delete(nextRecord.id);
        }
        break;
      case 'DELETE':
        if (previousRecord?.id) {
          this.flags.delete(previousRecord.id);
        }
        break;
    }

    // Clear cache when flags change
    this.clearCache();
  }

  // Evaluate feature flag for a user
  public evaluate(
    flagId: string,
    context: UserContext
  ): boolean | unknown {
    // Check cache first
    const cacheKey = this.getCacheKey(flagId, context);
    if (this.options.cacheEvaluations && this.evaluationCache.has(cacheKey)) {
      return this.evaluationCache.get(cacheKey)!;
    }

    const flag = this.flags.get(flagId);
    
    if (!flag || !flag.enabled) {
      return this.options.defaultValue ?? false;
    }

    let result: boolean | unknown = false;

    // Check conditions first
    if (flag.conditions && flag.conditions.length > 0) {
      const conditionsMet = this.evaluateConditions(flag.conditions, context);
      if (!conditionsMet) {
        result = this.options.defaultValue ?? false;
        if (this.options.cacheEvaluations) {
          this.evaluationCache.set(cacheKey, result);
        }
        return result;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const isInRollout = this.isInRollout(flagId, context, flag.rolloutPercentage);
      if (!isInRollout) {
        result = this.options.defaultValue ?? false;
        if (this.options.cacheEvaluations) {
          this.evaluationCache.set(cacheKey, result);
        }
        return result;
      }
    }

    // Return variations if defined, otherwise true
    result = flag.variations?.[this.selectVariation(flagId, context)] ?? true;

    if (this.options.cacheEvaluations) {
      this.evaluationCache.set(cacheKey, result);
    }

    return result;
  }

  // Batch evaluate multiple flags
  public evaluateAll(
    context: UserContext
  ): Record<string, boolean | unknown> {
    const results: Record<string, boolean | unknown> = {};
    
    for (const [flagId] of this.flags) {
      results[flagId] = this.evaluate(flagId, context);
    }

    return results;
  }

  // Get flags for specific experiments
  public getExperimentFlags(
    experimentId: string,
    variantId: string,
    context: UserContext
  ): Record<string, boolean | unknown> {
    const results: Record<string, boolean | unknown> = {};
    
    for (const [flagId, flag] of this.flags) {
      if (flag.experiments?.includes(experimentId)) {
        // Use variant-specific configuration if available
        const variantConfig = flag.variations?.[variantId];
        if (variantConfig !== undefined) {
          results[flagId] = variantConfig;
        } else {
          results[flagId] = this.evaluate(flagId, context);
        }
      }
    }

    return results;
  }

  private evaluateConditions(
    conditions: SegmentCondition[],
    context: UserContext
  ): boolean {
    return conditions.every(condition => 
      this.evaluateCondition(condition, context)
    );
  }

  private evaluateCondition(
    condition: SegmentCondition,
    context: UserContext
  ): boolean {
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
        return Array.isArray(condition.value)
          ? (condition.value as unknown[]).includes(value)
          : false;
      case 'not_in':
        return Array.isArray(condition.value)
          ? !(condition.value as unknown[]).includes(value)
          : false;
      default:
        return false;
    }
  }

  private getNestedValue(obj: UserContext, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  }

  private isInRollout(
    flagId: string,
    context: UserContext,
    percentage: number
  ): boolean {
    const bucketer = this.getBucketingKey(flagId, context);
    const hash = murmur.v3(bucketer, 0);
    const bucket = (hash % 10000) / 100; // 0-100 with 2 decimal precision
    return bucket < percentage;
  }

  private selectVariation(
    flagId: string,
    context: UserContext
  ): string {
    const flag = this.flags.get(flagId);
    if (!flag?.variations) return 'default';

    const variations = Object.keys(flag.variations);
    if (variations.length === 0) return 'default';

    const bucketer = this.getBucketingKey(flagId, context);
    const hash = murmur.v3(bucketer, 1); // Different seed for variation selection
    const index = hash % variations.length;
    
    return variations[index];
  }

  private getBucketingKey(
    flagId: string,
    context: UserContext
  ): string {
    const id = context.userId || context.sessionId;
    return `${flagId}-${id}`;
  }

  private getCacheKey(
    flagId: string,
    context: UserContext
  ): string {
    const id = context.userId || context.sessionId;
    return `${flagId}-${id}`;
  }

  private clearCache() {
    this.evaluationCache.clear();
  }

  // Feature flag management
  public async createFlag(
    flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<FeatureFlag> {
    const newFlag: FeatureFlag = {
      ...flag,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const { data, error } = await this.supabase
      .from('feature_flags')
      .insert(newFlag)
      .select()
      .single();

    if (error) throw error;

    if (data.enabled) {
      this.flags.set(data.id, data);
    }

    return data;
  }

  public async updateFlag(
    flagId: string,
    updates: Partial<FeatureFlag>
  ): Promise<FeatureFlag> {
    const { data, error } = await this.supabase
      .from('feature_flags')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', flagId)
      .select()
      .single();

    if (error) throw error;

    if (data.enabled) {
      this.flags.set(data.id, data);
    } else {
      this.flags.delete(data.id);
    }

    this.clearCache();
    return data;
  }

  public async toggleFlag(
    flagId: string,
    enabled: boolean
  ): Promise<void> {
    await this.updateFlag(flagId, { enabled });
  }

  public async deleteFlag(flagId: string): Promise<void> {
    const { error } = await this.supabase
      .from('feature_flags')
      .delete()
      .eq('id', flagId);

    if (error) throw error;

    this.flags.delete(flagId);
    this.clearCache();
  }

  // Gradual rollout management
  public async updateRollout(
    flagId: string,
    percentage: number
  ): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    await this.updateFlag(flagId, { rolloutPercentage: percentage });
  }

  public async graduateRollout(
    flagId: string,
    schedule: RolloutSchedule
  ): Promise<void> {
    // Schedule gradual rollout increases
    const intervals = this.calculateRolloutIntervals(schedule);
    
    for (const { percentage, delay } of intervals) {
      setTimeout(async () => {
        await this.updateRollout(flagId, percentage);
      }, delay);
    }
  }

  private calculateRolloutIntervals(
    schedule: RolloutSchedule
  ): Array<{ percentage: number; delay: number }> {
    const intervals: Array<{ percentage: number; delay: number }> = [];
    const steps = schedule.steps || 5;
    const duration = schedule.durationHours * 3600000; // Convert to milliseconds
    const stepDuration = duration / steps;

    for (let i = 1; i <= steps; i++) {
      intervals.push({
        percentage: (100 / steps) * i,
        delay: stepDuration * i
      });
    }

    return intervals;
  }

  // Analytics
  public async trackFlagExposure(
    flagId: string,
    context: UserContext,
    value: boolean | unknown
  ): Promise<void> {
    try {
      await this.supabase
        .from('feature_flag_exposures')
        .insert({
          flag_id: flagId,
          user_id: context.userId,
          session_id: context.sessionId,
          value: JSON.stringify(value),
          context: context,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to track flag exposure:', error);
    }
  }

  public async getFlagAnalytics(
    flagId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FlagAnalytics> {
    let query = this.supabase
      .from('feature_flag_exposures')
      .select('*')
      .eq('flag_id', flagId);

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    // Calculate analytics
    const totalExposures = data?.length || 0;
    const uniqueUsers = new Set(data?.map(d => d.user_id).filter(Boolean)).size;
    const uniqueSessions = new Set(data?.map(d => d.session_id)).size;

    const valueDistribution: Record<string, number> = {};
    data?.forEach(exposure => {
      const value = String(exposure.value);
      valueDistribution[value] = (valueDistribution[value] || 0) + 1;
    });

    return {
      flagId,
      totalExposures,
      uniqueUsers,
      uniqueSessions,
      valueDistribution,
      startDate,
      endDate
    };
  }

  // Integration with experiments
  public async linkToExperiment(
    flagId: string,
    experimentId: string,
    variantConfigs?: Record<string, unknown>
  ): Promise<void> {
    const flag = this.flags.get(flagId);
    if (!flag) {
      throw new Error(`Feature flag ${flagId} not found`);
    }

    const experiments = flag.experiments || [];
    if (!experiments.includes(experimentId)) {
      experiments.push(experimentId);
    }

    const variations = {
      ...flag.variations,
      ...variantConfigs
    };

    await this.updateFlag(flagId, { experiments, variations });
  }

  public async unlinkFromExperiment(
    flagId: string,
    experimentId: string
  ): Promise<void> {
    const flag = this.flags.get(flagId);
    if (!flag) {
      throw new Error(`Feature flag ${flagId} not found`);
    }

    const experiments = (flag.experiments || []).filter(id => id !== experimentId);
    await this.updateFlag(flagId, { experiments });
  }

  private generateId(): string {
    return `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  public destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.realtimeSubscription) {
      void this.realtimeSubscription.unsubscribe();
    }
    this.clearCache();
  }

  private normalizeFlagRecord(record: unknown): Partial<FeatureFlag> | null {
    if (!record || typeof record !== 'object') {
      return null;
    }
    return record as Partial<FeatureFlag>;
  }
}

interface RolloutSchedule {
  durationHours: number;
  steps?: number;
  targetPercentage?: number;
}

interface FlagAnalytics {
  flagId: string;
  totalExposures: number;
  uniqueUsers: number;
  uniqueSessions: number;
  valueDistribution: Record<string, number>;
  startDate?: Date;
  endDate?: Date;
}
