import { createServiceClient } from '@/lib/supabase';

export interface AnalyticsEvent {
  id: string;
  tenant_id: string;
  visitor_id: string;
  session_id: string;
  event_type: string;
  event_name?: string;
  page_url?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  properties?: Record<string, any>;
  created_at: Date;
}

export interface ConversionFunnel {
  id: string;
  tenant_id: string;
  name: string;
  steps: FunnelStep[];
}

export interface FunnelStep {
  name: string;
  event_type: string;
  event_name?: string;
  filters?: Record<string, any>;
}

export interface HeatmapData {
  id: string;
  tenant_id: string;
  page_url: string;
  element_selector?: string;
  x_position?: number;
  y_position?: number;
  click_count: number;
  date: Date;
}

export interface AIPrediction {
  id: string;
  tenant_id: string;
  prediction_type: string;
  metric: string;
  predicted_value: number;
  confidence: number;
  time_horizon: string;
  factors?: Record<string, any>;
}

export interface RealtimeMetrics {
  visitors: number;
  page_views: number;
  conversions: number;
  revenue: number;
  bounce_rate: number;
}

export interface FunnelAnalysis {
  step: string;
  visitors: number;
  conversions: number;
  conversion_rate: number;
  drop_off_rate: number;
}

class AnalyticsService {
  async trackEvent(
    tenantId: string,
    event: Omit<AnalyticsEvent, 'id' | 'tenant_id' | 'created_at'>
  ): Promise<void> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        ...event,
        tenant_id: tenantId,
      });

    if (error) throw error;
  }

  async getRealtimeMetrics(
    tenantId: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<RealtimeMetrics> {
    const supabase = createServiceClient();
    
    const intervals: Record<string, string> = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
    };
    
    const { data, error } = await supabase
      .rpc('get_realtime_analytics', {
        tenant_uuid: tenantId,
        time_range: intervals[timeRange],
      });

    if (error) throw error;
    
    return data[0] || {
      visitors: 0,
      page_views: 0,
      conversions: 0,
      revenue: 0,
      bounce_rate: 0,
    };
  }

  async getEventsByType(
    tenantId: string,
    eventType: string,
    dateRange?: { start: Date; end: Date },
    limit = 1000
  ): Promise<AnalyticsEvent[]> {
    const supabase = createServiceClient();
    
    let query = supabase
      .from('analytics_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType);

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getTopPages(
    tenantId: string,
    dateRange?: { start: Date; end: Date },
    limit = 10
  ): Promise<{ page_url: string; views: number; unique_visitors: number }[]> {
    const supabase = createServiceClient();
    
    let query = supabase
      .from('analytics_events')
      .select('page_url, visitor_id')
      .eq('tenant_id', tenantId)
      .eq('event_type', 'page_view');

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Aggregate data
    const pageStats = new Map<string, { views: number; visitors: Set<string> }>();
    
    data?.forEach(event => {
      const url = event.page_url;
      if (!url) return;
      
      if (!pageStats.has(url)) {
        pageStats.set(url, { views: 0, visitors: new Set() });
      }
      
      const stats = pageStats.get(url)!;
      stats.views++;
      stats.visitors.add(event.visitor_id);
    });
    
    return Array.from(pageStats.entries())
      .map(([page_url, stats]) => ({
        page_url,
        views: stats.views,
        unique_visitors: stats.visitors.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  async getTrafficSources(
    tenantId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{ source: string; visitors: number; percentage: number }[]> {
    const supabase = createServiceClient();
    
    let query = supabase
      .from('analytics_events')
      .select('utm_source, referrer, visitor_id')
      .eq('tenant_id', tenantId)
      .eq('event_type', 'page_view');

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Categorize traffic sources
    const sources = new Map<string, Set<string>>();
    
    data?.forEach(event => {
      let source = 'Direct';
      
      if (event.utm_source) {
        source = event.utm_source;
      } else if (event.referrer) {
        const hostname = new URL(event.referrer).hostname;
        if (hostname.includes('google')) source = 'Google';
        else if (hostname.includes('facebook')) source = 'Facebook';
        else if (hostname.includes('twitter')) source = 'Twitter';
        else source = hostname;
      }
      
      if (!sources.has(source)) {
        sources.set(source, new Set());
      }
      
      sources.get(source)!.add(event.visitor_id);
    });
    
    const totalVisitors = new Set(data?.map(e => e.visitor_id)).size;
    
    return Array.from(sources.entries())
      .map(([source, visitors]) => ({
        source,
        visitors: visitors.size,
        percentage: totalVisitors > 0 ? (visitors.size / totalVisitors) * 100 : 0,
      }))
      .sort((a, b) => b.visitors - a.visitors);
  }

  async createConversionFunnel(
    tenantId: string,
    funnel: Omit<ConversionFunnel, 'id' | 'tenant_id'>
  ): Promise<ConversionFunnel> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('conversion_funnels')
      .insert({
        ...funnel,
        tenant_id: tenantId,
        steps: JSON.stringify(funnel.steps),
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      steps: JSON.parse(data.steps),
    };
  }

  async analyzeFunnel(
    tenantId: string,
    funnelId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<FunnelAnalysis[]> {
    const supabase = createServiceClient();
    
    // Get funnel definition
    const { data: funnel, error: funnelError } = await supabase
      .from('conversion_funnels')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', funnelId)
      .single();

    if (funnelError) throw funnelError;
    
    const steps: FunnelStep[] = JSON.parse(funnel.steps);
    const analysis: FunnelAnalysis[] = [];
    
    let previousStepVisitors = 0;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Get events for this step
      let query = supabase
        .from('analytics_events')
        .select('visitor_id')
        .eq('tenant_id', tenantId)
        .eq('event_type', step.event_type);

      if (step.event_name) {
        query = query.eq('event_name', step.event_name);
      }

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: events, error } = await query;

      if (error) throw error;
      
      const uniqueVisitors = new Set(events?.map(e => e.visitor_id)).size;
      
      const conversionRate = previousStepVisitors > 0 
        ? (uniqueVisitors / previousStepVisitors) * 100 
        : 100;
      
      const dropOffRate = 100 - conversionRate;
      
      analysis.push({
        step: step.name,
        visitors: uniqueVisitors,
        conversions: i === 0 ? uniqueVisitors : uniqueVisitors,
        conversion_rate: conversionRate,
        drop_off_rate: dropOffRate,
      });
      
      previousStepVisitors = uniqueVisitors;
    }
    
    return analysis;
  }

  async recordHeatmapClick(
    tenantId: string,
    pageUrl: string,
    x: number,
    y: number,
    elementSelector?: string
  ): Promise<void> {
    const supabase = createServiceClient();
    
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('heatmap_data')
      .upsert({
        tenant_id: tenantId,
        page_url: pageUrl,
        element_selector: elementSelector,
        x_position: x,
        y_position: y,
        click_count: 1,
        date: today,
      }, {
        onConflict: 'tenant_id,page_url,x_position,y_position,date',
        ignoreDuplicates: false,
      });

    if (error) {
      // If upsert fails, try incrementing existing record
      await supabase
        .rpc('increment_heatmap_clicks', {
          tenant_uuid: tenantId,
          page: pageUrl,
          x_pos: x,
          y_pos: y,
          click_date: today,
        });
    }
  }

  async getHeatmapData(
    tenantId: string,
    pageUrl: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<HeatmapData[]> {
    const supabase = createServiceClient();
    
    let query = supabase
      .from('heatmap_data')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('page_url', pageUrl);

    if (dateRange) {
      query = query
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0]);
    }

    const { data, error } = await query.order('click_count', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async generateAIPredictions(
    tenantId: string,
    predictionType: 'revenue' | 'conversion_rate' | 'traffic' | 'churn',
    timeHorizon: '7d' | '30d' | '90d' = '30d'
  ): Promise<AIPrediction> {
    const supabase = createServiceClient();
    
    // Get historical data for training
    const metrics = await this.getRealtimeMetrics(tenantId, '30d');
    const trafficSources = await this.getTrafficSources(tenantId);
    
    // Mock AI prediction - in production, would use ML model
    const predictions = {
      revenue: {
        value: metrics.revenue * 1.15, // 15% growth prediction
        confidence: 85,
        factors: {
          seasonal_trend: 0.12,
          traffic_growth: 0.08,
          conversion_optimization: 0.05,
        },
      },
      conversion_rate: {
        value: (metrics.conversions / metrics.page_views) * 1.08 * 100, // 8% improvement
        confidence: 78,
        factors: {
          ux_improvements: 0.05,
          a_b_test_results: 0.03,
        },
      },
      traffic: {
        value: metrics.page_views * 1.25, // 25% traffic increase
        confidence: 72,
        factors: {
          seo_improvements: 0.15,
          content_marketing: 0.10,
        },
      },
      churn: {
        value: 0.12, // 12% churn rate
        confidence: 68,
        factors: {
          engagement_metrics: -0.05,
          product_satisfaction: 0.03,
        },
      },
    };
    
    const prediction = predictions[predictionType];
    
    const { data, error } = await supabase
      .from('ai_predictions')
      .insert({
        tenant_id: tenantId,
        prediction_type: predictionType,
        metric: predictionType,
        predicted_value: prediction.value,
        confidence: prediction.confidence,
        time_horizon: timeHorizon,
        factors: prediction.factors,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAIPredictions(
    tenantId: string,
    predictionType?: string,
    limit = 10
  ): Promise<AIPrediction[]> {
    const supabase = createServiceClient();
    
    let query = supabase
      .from('ai_predictions')
      .select('*')
      .eq('tenant_id', tenantId);

    if (predictionType) {
      query = query.eq('prediction_type', predictionType);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getUserJourney(
    tenantId: string,
    visitorId: string,
    limit = 100
  ): Promise<AnalyticsEvent[]> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getConversionAttribution(
    tenantId: string,
    conversionEventType = 'purchase',
    attributionWindow = 30 // days
  ): Promise<{
    source: string;
    conversions: number;
    revenue: number;
    first_touch: number;
    last_touch: number;
  }[]> {
    const supabase = createServiceClient();
    
    // Get conversions
    const { data: conversions, error } = await supabase
      .from('analytics_events')
      .select('visitor_id, properties, created_at')
      .eq('tenant_id', tenantId)
      .eq('event_type', conversionEventType)
      .gte('created_at', new Date(Date.now() - attributionWindow * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;
    
    const attribution = new Map<string, {
      conversions: number;
      revenue: number;
      first_touch: number;
      last_touch: number;
    }>();
    
    // Analyze attribution for each conversion
    for (const conversion of conversions || []) {
      const journey = await this.getUserJourney(tenantId, conversion.visitor_id);
      
      if (journey.length === 0) continue;
      
      const firstTouch = journey[0];
      const lastTouch = journey[journey.length - 1];
      
      const firstSource = firstTouch.utm_source || 'Direct';
      const lastSource = lastTouch.utm_source || 'Direct';
      
      // First touch attribution
      if (!attribution.has(firstSource)) {
        attribution.set(firstSource, { conversions: 0, revenue: 0, first_touch: 0, last_touch: 0 });
      }
      attribution.get(firstSource)!.first_touch++;
      
      // Last touch attribution
      if (!attribution.has(lastSource)) {
        attribution.set(lastSource, { conversions: 0, revenue: 0, first_touch: 0, last_touch: 0 });
      }
      attribution.get(lastSource)!.last_touch++;
      attribution.get(lastSource)!.conversions++;
      attribution.get(lastSource)!.revenue += conversion.properties?.value || 0;
    }
    
    return Array.from(attribution.entries()).map(([source, data]) => ({
      source,
      ...data,
    }));
  }
}

export const analyticsService = new AnalyticsService();