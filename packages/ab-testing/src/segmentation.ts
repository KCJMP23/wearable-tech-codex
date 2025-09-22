import { SupabaseClient } from '@supabase/supabase-js';
import {
  Segment,
  SegmentCondition,
  UserContext,
  SegmentResults,
  VariantResult,
  MetricResult
} from './types.js';

export class SegmentationEngine {
  private segments: Map<string, Segment> = new Map();
  private segmentCache: Map<string, Set<string>> = new Map();
  private userSegmentCache: Map<string, Set<string>> = new Map();

  constructor(
    private supabase: SupabaseClient,
    private options: {
      cacheResults?: boolean;
      cacheTTLMs?: number;
    } = {}
  ) {
    this.loadSegments();
  }

  private async loadSegments() {
    try {
      const { data, error } = await this.supabase
        .from('segments')
        .select('*');

      if (error) throw error;

      this.segments.clear();
      data?.forEach(segment => {
        this.segments.set(segment.id, segment);
      });
    } catch (error) {
      console.error('Failed to load segments:', error);
    }
  }

  // Evaluate which segments a user belongs to
  public evaluateUserSegments(context: UserContext): Set<string> {
    const cacheKey = this.getUserCacheKey(context);
    
    if (this.options.cacheResults && this.userSegmentCache.has(cacheKey)) {
      return this.userSegmentCache.get(cacheKey)!;
    }

    const userSegments = new Set<string>();

    for (const [segmentId, segment] of this.segments) {
      if (this.evaluateSegment(segment, context)) {
        userSegments.add(segmentId);
      }
    }

    if (this.options.cacheResults) {
      this.userSegmentCache.set(cacheKey, userSegments);
      
      // Set cache expiry
      if (this.options.cacheTTLMs) {
        setTimeout(() => {
          this.userSegmentCache.delete(cacheKey);
        }, this.options.cacheTTLMs);
      }
    }

    return userSegments;
  }

  // Check if user belongs to specific segment
  public isInSegment(segmentId: string, context: UserContext): boolean {
    const segment = this.segments.get(segmentId);
    if (!segment) return false;

    return this.evaluateSegment(segment, context);
  }

  // Evaluate segment conditions
  private evaluateSegment(segment: Segment, context: UserContext): boolean {
    if (!segment.conditions || segment.conditions.length === 0) {
      return true; // No conditions means everyone is included
    }

    const results = segment.conditions.map(condition =>
      this.evaluateCondition(condition, context)
    );

    if (segment.operator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  private evaluateCondition(
    condition: SegmentCondition,
    context: UserContext
  ): boolean {
    const value = this.getNestedValue(context, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return this.isEqual(value, condition.value);
      case 'not_equals':
        return !this.isEqual(value, condition.value);
      case 'contains':
        return this.contains(value, condition.value);
      case 'gt':
        return this.compare(value, condition.value) > 0;
      case 'lt':
        return this.compare(value, condition.value) < 0;
      case 'gte':
        return this.compare(value, condition.value) >= 0;
      case 'lte':
        return this.compare(value, condition.value) <= 0;
      case 'in':
        return this.isIn(value, condition.value);
      case 'not_in':
        return !this.isIn(value, condition.value);
      default:
        return false;
    }
  }

  private isEqual(a: unknown, b: unknown): boolean {
    // Handle null/undefined
    if (a == null || b == null) {
      return a == b;
    }

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // Handle objects/arrays
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    // Default comparison
    return a === b;
  }

  private contains(value: unknown, searchValue: unknown): boolean {
    if (value == null || searchValue == null) return false;

    // Array contains
    if (Array.isArray(value)) {
      return value.some(v => this.isEqual(v, searchValue));
    }

    // String contains
    return String(value).toLowerCase().includes(String(searchValue).toLowerCase());
  }

  private compare(a: unknown, b: unknown): number {
    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // Handle numbers
    const numA = Number(a);
    const numB = Number(b);
    
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    // String comparison
    return String(a).localeCompare(String(b));
  }

  private isIn(value: unknown, list: unknown): boolean {
    if (!Array.isArray(list)) return false;
    return list.some(item => this.isEqual(value, item));
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    const keys = path.match(/[^.[\]]+/g) ?? [];

    return keys.reduce<unknown>((current, key) => {
      if (current == null) return undefined;

      if (Array.isArray(current)) {
        const index = Number.parseInt(key, 10);
        if (Number.isNaN(index)) {
          return undefined;
        }
        return current[index];
      }

      if (typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }

      return undefined;
    }, obj);
  }

  private getUserCacheKey(context: UserContext): string {
    const id = context.userId || context.sessionId;
    const attrs = JSON.stringify(context.attributes || {});
    return `${id}-${attrs}`;
  }

  // Create predefined segments
  public createCommonSegments(): Segment[] {
    return [
      // Device segments
      {
        id: 'mobile_users',
        name: 'Mobile Users',
        conditions: [
          { field: 'device.type', operator: 'equals', value: 'mobile' }
        ],
        operator: 'AND'
      },
      {
        id: 'desktop_users',
        name: 'Desktop Users',
        conditions: [
          { field: 'device.type', operator: 'equals', value: 'desktop' }
        ],
        operator: 'AND'
      },
      
      // Geographic segments
      {
        id: 'us_users',
        name: 'US Users',
        conditions: [
          { field: 'geo.country', operator: 'equals', value: 'US' }
        ],
        operator: 'AND'
      },
      {
        id: 'eu_users',
        name: 'EU Users',
        conditions: [
          { field: 'geo.country', operator: 'in', value: [
            'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'PL', 'SE', 'DK', 'FI'
          ]}
        ],
        operator: 'AND'
      },

      // Behavior segments
      {
        id: 'new_users',
        name: 'New Users',
        conditions: [
          { field: 'attributes.firstVisit', operator: 'gte', value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        ],
        operator: 'AND'
      },
      {
        id: 'returning_users',
        name: 'Returning Users',
        conditions: [
          { field: 'attributes.visitCount', operator: 'gt', value: 1 }
        ],
        operator: 'AND'
      },
      {
        id: 'high_value_users',
        name: 'High Value Users',
        conditions: [
          { field: 'attributes.totalSpent', operator: 'gte', value: 100 },
          { field: 'attributes.purchaseCount', operator: 'gte', value: 3 }
        ],
        operator: 'OR'
      },

      // Traffic source segments
      {
        id: 'organic_traffic',
        name: 'Organic Traffic',
        conditions: [
          { field: 'utm.medium', operator: 'equals', value: 'organic' }
        ],
        operator: 'AND'
      },
      {
        id: 'paid_traffic',
        name: 'Paid Traffic',
        conditions: [
          { field: 'utm.medium', operator: 'in', value: ['cpc', 'cpm', 'ppc'] }
        ],
        operator: 'AND'
      },
      {
        id: 'social_traffic',
        name: 'Social Traffic',
        conditions: [
          { field: 'utm.source', operator: 'in', value: ['facebook', 'twitter', 'instagram', 'linkedin'] }
        ],
        operator: 'AND'
      },

      // Browser segments
      {
        id: 'chrome_users',
        name: 'Chrome Users',
        conditions: [
          { field: 'device.browser', operator: 'contains', value: 'Chrome' }
        ],
        operator: 'AND'
      },
      {
        id: 'safari_users',
        name: 'Safari Users',
        conditions: [
          { field: 'device.browser', operator: 'contains', value: 'Safari' }
        ],
        operator: 'AND'
      }
    ];
  }

  // Segment management
  public async createSegment(
    segment: Omit<Segment, 'id'>
  ): Promise<Segment> {
    const newSegment: Segment = {
      ...segment,
      id: this.generateId()
    };

    const { data, error } = await this.supabase
      .from('segments')
      .insert(newSegment)
      .select()
      .single();

    if (error) throw error;

    this.segments.set(data.id, data);
    this.clearCache();

    return data;
  }

  public async updateSegment(
    segmentId: string,
    updates: Partial<Segment>
  ): Promise<Segment> {
    const { data, error } = await this.supabase
      .from('segments')
      .update(updates)
      .eq('id', segmentId)
      .select()
      .single();

    if (error) throw error;

    this.segments.set(data.id, data);
    this.clearCache();

    return data;
  }

  public async deleteSegment(segmentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('segments')
      .delete()
      .eq('id', segmentId);

    if (error) throw error;

    this.segments.delete(segmentId);
    this.clearCache();
  }

  // Analytics
  public async getSegmentSize(segmentId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .filter('segments', 'cs', `{${segmentId}}`);

    if (error) throw error;
    return count || 0;
  }

  public async getSegmentOverlap(
    segmentIds: string[]
  ): Promise<Map<string, number>> {
    const overlap = new Map<string, number>();

    // Get users in each segment
    const segmentUsers = new Map<string, Set<string>>();

    for (const segmentId of segmentIds) {
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .filter('segments', 'cs', `{${segmentId}}`);

      if (error) throw error;

      segmentUsers.set(
        segmentId, 
        new Set(data?.map(u => u.id) || [])
      );
    }

    // Calculate overlaps
    for (let i = 0; i < segmentIds.length; i++) {
      for (let j = i + 1; j < segmentIds.length; j++) {
        const segment1 = segmentIds[i];
        const segment2 = segmentIds[j];
        const users1 = segmentUsers.get(segment1)!;
        const users2 = segmentUsers.get(segment2)!;

        const intersection = new Set(
          [...users1].filter(u => users2.has(u))
        );

        overlap.set(`${segment1}-${segment2}`, intersection.size);
      }
    }

    return overlap;
  }

  // Analyze segment performance in experiments
  public async analyzeSegmentPerformance(
    experimentId: string,
    segmentId: string
  ): Promise<SegmentResults> {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error(`Segment ${segmentId} not found`);
    }

    // Get exposures and conversions for this segment
    const { data: exposuresData, error: expError } = await this.supabase
      .from('ab_exposures')
      .select('*')
      .eq('experiment_id', experimentId)
      .filter('context->segments', 'cs', `["${segmentId}"]`);

    if (expError) throw expError;

    const { data: conversionsData, error: convError } = await this.supabase
      .from('ab_conversions')
      .select('*')
      .eq('experiment_id', experimentId)
      .filter('context->segments', 'cs', `["${segmentId}"]`);

    if (convError) throw convError;

    const { data: experimentRow } = await this.supabase
      .from('ab_experiments')
      .select('variants')
      .eq('id', experimentId)
      .single();

    const variantNameMap = new Map<string, string>();
    const rawVariants = (experimentRow?.variants ?? []) as ExperimentVariantRow[];
    rawVariants.forEach(variant => {
      variantNameMap.set(variant.id, variant.name);
    });

    // Calculate results per variant
    const variantResults = new Map<string, VariantResult>();

    const segmentExposures = (exposuresData ?? []) as SegmentTrafficRow[];
    const segmentConversions = (conversionsData ?? []) as SegmentConversionRow[];

    const ensureVariant = (variantId: string): VariantResult => {
      if (!variantResults.has(variantId)) {
        variantResults.set(variantId, {
          variantId,
          variantName: variantNameMap.get(variantId) ?? variantId,
          exposures: 0,
          conversions: {},
          metrics: {}
        });
      }
      return variantResults.get(variantId)!;
    };

    segmentExposures.forEach(exposure => {
      const result = ensureVariant(exposure.variant_id);
      result.exposures += 1;
    });

    segmentConversions.forEach(conversion => {
      const result = ensureVariant(conversion.variant_id);
      const metricId = conversion.metric_id;
      result.conversions[metricId] = (result.conversions[metricId] || 0) + 1;
    });

    variantResults.forEach(result => {
      result.metrics = Object.entries(result.conversions).reduce(
        (acc, [metricId, conversions]) => {
          const metricResult: MetricResult = {
            value: conversions,
            conversions,
            conversionRate: result.exposures > 0 ? conversions / result.exposures : 0
          };
          acc[metricId] = metricResult;
          return acc;
        },
        {} as Record<string, MetricResult>
      );
    });

    return {
      segmentId,
      segmentName: segment.name,
      exposures: segmentExposures.length,
      variants: Array.from(variantResults.values())
    };
  }

  // Build complex segments using builder pattern
  public createSegmentBuilder(): SegmentBuilder {
    return new SegmentBuilder();
  }

  private generateId(): string {
    return `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private clearCache() {
    this.segmentCache.clear();
    this.userSegmentCache.clear();
  }
}

// Segment builder for complex conditions
export class SegmentBuilder {
  private conditions: SegmentCondition[] = [];
  private operator: 'AND' | 'OR' = 'AND';
  private name: string = '';

  public withName(name: string): this {
    this.name = name;
    return this;
  }

  public withOperator(operator: 'AND' | 'OR'): this {
    this.operator = operator;
    return this;
  }

  public whereEquals(field: string, value: unknown): this {
    this.conditions.push({ field, operator: 'equals', value });
    return this;
  }

  public whereNotEquals(field: string, value: unknown): this {
    this.conditions.push({ field, operator: 'not_equals', value });
    return this;
  }

  public whereContains(field: string, value: unknown): this {
    this.conditions.push({ field, operator: 'contains', value });
    return this;
  }

  public whereGreaterThan(field: string, value: unknown): this {
    this.conditions.push({ field, operator: 'gt', value });
    return this;
  }

  public whereLessThan(field: string, value: unknown): this {
    this.conditions.push({ field, operator: 'lt', value });
    return this;
  }

  public whereGreaterOrEqual(field: string, value: unknown): this {
    this.conditions.push({ field, operator: 'gte', value });
    return this;
  }

  public whereLessOrEqual(field: string, value: unknown): this {
    this.conditions.push({ field, operator: 'lte', value });
    return this;
  }

  public whereIn(field: string, values: unknown[]): this {
    this.conditions.push({ field, operator: 'in', value: values });
    return this;
  }

  public whereNotIn(field: string, values: unknown[]): this {
    this.conditions.push({ field, operator: 'not_in', value: values });
    return this;
  }

  public build(): Omit<Segment, 'id'> {
    if (!this.name) {
      throw new Error('Segment name is required');
    }

    if (this.conditions.length === 0) {
      throw new Error('At least one condition is required');
    }

    return {
      name: this.name,
      conditions: this.conditions,
      operator: this.operator
    };
  }
}

interface SegmentTrafficRow {
  variant_id: string;
}

interface SegmentConversionRow {
  variant_id: string;
  metric_id: string;
}

interface ExperimentVariantRow {
  id: string;
  name: string;
}
