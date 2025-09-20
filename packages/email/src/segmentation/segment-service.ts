import { createClient } from '@supabase/supabase-js';
import { Segment, SegmentCondition } from '../types';
import { SegmentationQueryBuilder } from './query-builder';

export class SegmentService {
  private supabase;
  private queryBuilder: SegmentationQueryBuilder;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.queryBuilder = new SegmentationQueryBuilder();
  }

  async createSegment(
    tenantId: string,
    name: string,
    description: string,
    conditions: SegmentCondition[]
  ): Promise<{ success: boolean; segmentId?: string; error?: string }> {
    try {
      // Validate conditions
      for (const condition of conditions) {
        const validation = this.queryBuilder.validateCondition(condition);
        if (!validation.isValid) {
          return {
            success: false,
            error: `Invalid condition for field ${condition.field}: ${validation.error}`,
          };
        }
      }

      // Create segment
      const { data, error } = await this.supabase
        .from('email_segments')
        .insert({
          tenant_id: tenantId,
          name,
          description,
          conditions,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Calculate initial subscriber count
      await this.recalculateSegmentSize(data.id);

      return { success: true, segmentId: data.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async updateSegment(
    segmentId: string,
    updates: Partial<Pick<Segment, 'name' | 'description' | 'conditions' | 'isActive'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate conditions if they're being updated
      if (updates.conditions) {
        for (const condition of updates.conditions) {
          const validation = this.queryBuilder.validateCondition(condition);
          if (!validation.isValid) {
            return {
              success: false,
              error: `Invalid condition for field ${condition.field}: ${validation.error}`,
            };
          }
        }
      }

      const { error } = await this.supabase
        .from('email_segments')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', segmentId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Recalculate subscriber count if conditions changed
      if (updates.conditions) {
        await this.recalculateSegmentSize(segmentId);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deleteSegment(segmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('email_segments')
        .delete()
        .eq('id', segmentId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getSegment(segmentId: string): Promise<Segment | null> {
    const { data, error } = await this.supabase
      .from('email_segments')
      .select('*')
      .eq('id', segmentId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      description: data.description,
      conditions: data.conditions,
      isActive: data.is_active,
      subscriberCount: data.subscriber_count,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async getSegments(tenantId: string): Promise<Segment[]> {
    const { data, error } = await this.supabase
      .from('email_segments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(segment => ({
      id: segment.id,
      tenantId: segment.tenant_id,
      name: segment.name,
      description: segment.description,
      conditions: segment.conditions,
      isActive: segment.is_active,
      subscriberCount: segment.subscriber_count,
      createdAt: new Date(segment.created_at),
      updatedAt: new Date(segment.updated_at),
    }));
  }

  async getSegmentSubscribers(
    segmentId: string,
    limit = 100,
    offset = 0
  ): Promise<{
    subscribers: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // Get segment
      const segment = await this.getSegment(segmentId);
      if (!segment) {
        return { subscribers: [], total: 0, hasMore: false };
      }

      // Build query
      const { query, params } = this.queryBuilder.buildSQL(
        segment.tenantId,
        segment.conditions
      );

      // Get total count
      const countQuery = query.replace('SELECT DISTINCT s.id', 'SELECT COUNT(DISTINCT s.id) as count');
      const { data: countData, error: countError } = await this.supabase.rpc('execute_sql', {
        query: countQuery,
        params,
      });

      if (countError) {
        throw new Error(countError.message);
      }

      const total = countData?.[0]?.count || 0;

      // Get subscribers with pagination
      const subscribersQuery = `
        ${query}
        ORDER BY s.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const { data: subscriberIds, error: subscribersError } = await this.supabase.rpc('execute_sql', {
        query: subscribersQuery,
        params,
      });

      if (subscribersError) {
        throw new Error(subscribersError.message);
      }

      const ids = subscriberIds?.map((row: any) => row.id) || [];

      // Get full subscriber details
      const { data: subscribers, error } = await this.supabase
        .from('email_subscribers')
        .select('*')
        .in('id', ids);

      if (error) {
        throw new Error(error.message);
      }

      return {
        subscribers: subscribers || [],
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('Error getting segment subscribers:', error);
      return { subscribers: [], total: 0, hasMore: false };
    }
  }

  async testSegment(
    tenantId: string,
    conditions: SegmentCondition[],
    limit = 10
  ): Promise<{
    success: boolean;
    subscribers: any[];
    totalCount: number;
    error?: string;
  }> {
    try {
      // Validate conditions
      for (const condition of conditions) {
        const validation = this.queryBuilder.validateCondition(condition);
        if (!validation.isValid) {
          return {
            success: false,
            subscribers: [],
            totalCount: 0,
            error: `Invalid condition for field ${condition.field}: ${validation.error}`,
          };
        }
      }

      // Build query
      const { query, params } = this.queryBuilder.buildSQL(tenantId, conditions);

      // Get total count
      const countQuery = query.replace('SELECT DISTINCT s.id', 'SELECT COUNT(DISTINCT s.id) as count');
      const { data: countData, error: countError } = await this.supabase.rpc('execute_sql', {
        query: countQuery,
        params,
      });

      if (countError) {
        throw new Error(countError.message);
      }

      const totalCount = countData?.[0]?.count || 0;

      // Get sample subscribers
      const sampleQuery = `
        ${query}
        ORDER BY s.created_at DESC
        LIMIT ${limit}
      `;

      const { data: subscriberIds, error: subscribersError } = await this.supabase.rpc('execute_sql', {
        query: sampleQuery,
        params,
      });

      if (subscribersError) {
        throw new Error(subscribersError.message);
      }

      const ids = subscriberIds?.map((row: any) => row.id) || [];

      // Get full subscriber details
      const { data: subscribers, error } = await this.supabase
        .from('email_subscribers')
        .select('id, email, first_name, last_name, status, subscribed_at')
        .in('id', ids);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        subscribers: subscribers || [],
        totalCount,
      };
    } catch (error) {
      return {
        success: false,
        subscribers: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async recalculateSegmentSize(segmentId: string): Promise<void> {
    try {
      const segment = await this.getSegment(segmentId);
      if (!segment) return;

      const { query, params } = this.queryBuilder.buildSQL(
        segment.tenantId,
        segment.conditions
      );

      const countQuery = query.replace('SELECT DISTINCT s.id', 'SELECT COUNT(DISTINCT s.id) as count');
      const { data: countData, error } = await this.supabase.rpc('execute_sql', {
        query: countQuery,
        params,
      });

      if (error) {
        console.error('Error calculating segment size:', error);
        return;
      }

      const count = countData?.[0]?.count || 0;

      await this.supabase
        .from('email_segments')
        .update({
          subscriber_count: count,
          last_calculated_at: new Date().toISOString(),
        })
        .eq('id', segmentId);
    } catch (error) {
      console.error('Error recalculating segment size:', error);
    }
  }

  async recalculateAllSegmentSizes(tenantId: string): Promise<void> {
    const segments = await this.getSegments(tenantId);
    
    for (const segment of segments) {
      if (segment.isActive) {
        await this.recalculateSegmentSize(segment.id);
      }
    }
  }

  async getSubscriberSegments(subscriberId: string): Promise<Segment[]> {
    // This would require a more complex query to check which segments
    // a specific subscriber belongs to
    const { data: subscriber } = await this.supabase
      .from('email_subscribers')
      .select('tenant_id')
      .eq('id', subscriberId)
      .single();

    if (!subscriber) return [];

    const segments = await this.getSegments(subscriber.tenant_id);
    const matchingSegments: Segment[] = [];

    for (const segment of segments) {
      if (!segment.isActive) continue;

      const { success, totalCount } = await this.testSegment(
        segment.tenantId,
        segment.conditions.map(c => ({ ...c, value: subscriberId }))
      );

      if (success && totalCount > 0) {
        matchingSegments.push(segment);
      }
    }

    return matchingSegments;
  }

  getAvailableFields() {
    return this.queryBuilder.getAvailableFields();
  }

  getSupportedOperators(fieldType: string) {
    return this.queryBuilder.getSupportedOperators(fieldType);
  }

  getSegmentTemplates() {
    return this.queryBuilder.getSegmentTemplates();
  }

  async createSegmentFromTemplate(
    tenantId: string,
    templateName: string,
    customName?: string
  ): Promise<{ success: boolean; segmentId?: string; error?: string }> {
    const templates = this.getSegmentTemplates();
    const template = templates[templateName];

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    const name = customName || templateName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const description = `Auto-generated segment based on ${name} template`;

    return this.createSegment(tenantId, name, description, template.conditions);
  }
}