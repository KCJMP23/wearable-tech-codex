import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { RevenueMetrics } from './types';

export class RevenueTracker {
  private supabase: SupabaseClient;
  private realtimeSubscription: RealtimeChannel | null = null;
  private metricsCache: Map<string, RevenueMetrics> = new Map();
  private alertThresholds: {
    revenueDropPercent: number;
    conversionDropPercent: number;
    errorRatePercent: number;
  };

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    alertThresholds = {
      revenueDropPercent: 20,
      conversionDropPercent: 30,
      errorRatePercent: 5
    }
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.alertThresholds = alertThresholds;
  }

  async startRealtimeTracking(
    onUpdate: (metrics: RevenueMetrics) => void,
    onAlert: (alert: string) => void
  ): Promise<void> {
    // Subscribe to real-time events
    this.realtimeSubscription = this.supabase
      .channel('revenue_updates')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'analytics' 
        },
        async () => {
          // Update metrics on new data
          const metrics = await this.getCurrentMetrics();
          onUpdate(metrics);

          // Check for alerts
          const alerts = await this.checkAlerts(metrics);
          alerts.forEach(alert => onAlert(alert));
        }
      )
      .subscribe();

    // Initial metrics
    const initialMetrics = await this.getCurrentMetrics();
    onUpdate(initialMetrics);
  }

  async stopRealtimeTracking(): Promise<void> {
    if (this.realtimeSubscription) {
      await this.supabase.removeChannel(this.realtimeSubscription);
      this.realtimeSubscription = null;
    }
  }

  async getCurrentMetrics(): Promise<RevenueMetrics> {
    const now = new Date();
    const cacheKey = `metrics_${format(now, 'yyyy-MM-dd-HH')}`;
    
    // Check cache (1 minute TTL)
    const cached = this.metricsCache.get(cacheKey);
    if (cached && (now.getTime() - cached.timestamp.getTime()) < 60000) {
      return cached;
    }

    // Fetch current day metrics
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [
      revenue,
      transactions,
      clickthrough,
      bounce,
      topProducts,
      segments
    ] = await Promise.all([
      this.fetchRevenue(todayStart, todayEnd),
      this.fetchTransactions(todayStart, todayEnd),
      this.fetchClickThroughRate(todayStart, todayEnd),
      this.fetchBounceRate(todayStart, todayEnd),
      this.fetchTopProducts(todayStart, todayEnd),
      this.fetchSegmentRevenue(todayStart, todayEnd)
    ]);

    const metrics: RevenueMetrics = {
      timestamp: now,
      revenue,
      transactions: transactions.count,
      avgOrderValue: transactions.count > 0 ? revenue / transactions.count : 0,
      conversionRate: transactions.conversionRate,
      clickThroughRate: clickthrough,
      bounceRate: bounce,
      topProducts,
      bySegment: segments
    };

    // Cache metrics
    this.metricsCache.set(cacheKey, metrics);

    return metrics;
  }

  private async fetchRevenue(start: Date, end: Date): Promise<number> {
    const { data } = await this.supabase
      .from('analytics')
      .select('revenue')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString());

    return data?.reduce((sum, record) => sum + (record.revenue || 0), 0) || 0;
  }

  private async fetchTransactions(
    start: Date, 
    end: Date
  ): Promise<{ count: number; conversionRate: number }> {
    const { data } = await this.supabase
      .from('analytics')
      .select('conversions, clicks')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString());

    if (!data || data.length === 0) {
      return { count: 0, conversionRate: 0 };
    }

    const totalConversions = data.reduce((sum, r) => sum + (r.conversions || 0), 0);
    const totalClicks = data.reduce((sum, r) => sum + (r.clicks || 0), 0);

    return {
      count: totalConversions,
      conversionRate: totalClicks > 0 ? totalConversions / totalClicks : 0
    };
  }

  private async fetchClickThroughRate(start: Date, end: Date): Promise<number> {
    const { data } = await this.supabase
      .from('analytics')
      .select('clicks, impressions')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString());

    if (!data || data.length === 0) return 0;

    const totalClicks = data.reduce((sum, r) => sum + (r.clicks || 0), 0);
    const totalImpressions = data.reduce((sum, r) => sum + (r.impressions || 0), 0);

    return totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  }

  private async fetchBounceRate(start: Date, end: Date): Promise<number> {
    const { data } = await this.supabase
      .from('user_sessions')
      .select('page_views')
      .gte('started_at', start.toISOString())
      .lte('started_at', end.toISOString());

    if (!data || data.length === 0) return 0;

    const bounced = data.filter(s => s.page_views === 1).length;
    return data.length > 0 ? bounced / data.length : 0;
  }

  private async fetchTopProducts(
    start: Date, 
    end: Date
  ): Promise<Array<{ productId: string; revenue: number; units: number }>> {
    const { data } = await this.supabase
      .from('analytics')
      .select('product_id, revenue, conversions')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('revenue', { ascending: false })
      .limit(10);

    if (!data) return [];

    // Aggregate by product
    const productMap = new Map<string, { revenue: number; units: number }>();

    for (const record of data) {
      const existing = productMap.get(record.product_id) || { revenue: 0, units: 0 };
      productMap.set(record.product_id, {
        revenue: existing.revenue + (record.revenue || 0),
        units: existing.units + (record.conversions || 0)
      });
    }

    return Array.from(productMap.entries())
      .map(([productId, stats]) => ({ productId, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private async fetchSegmentRevenue(
    start: Date,
    end: Date
  ): Promise<Record<string, { revenue: number; transactions: number }>> {
    const { data } = await this.supabase
      .from('segment_analytics')
      .select('segment_id, revenue, transactions')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString());

    const segments: Record<string, { revenue: number; transactions: number }> = {};

    for (const record of data || []) {
      if (!segments[record.segment_id]) {
        segments[record.segment_id] = { revenue: 0, transactions: 0 };
      }
      segments[record.segment_id].revenue += record.revenue || 0;
      segments[record.segment_id].transactions += record.transactions || 0;
    }

    return segments;
  }

  async getHistoricalMetrics(days: number = 30): Promise<RevenueMetrics[]> {
    const metrics: RevenueMetrics[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const [
        revenue,
        transactions,
        clickthrough,
        bounce,
        topProducts
      ] = await Promise.all([
        this.fetchRevenue(dayStart, dayEnd),
        this.fetchTransactions(dayStart, dayEnd),
        this.fetchClickThroughRate(dayStart, dayEnd),
        this.fetchBounceRate(dayStart, dayEnd),
        this.fetchTopProducts(dayStart, dayEnd)
      ]);

      metrics.push({
        timestamp: date,
        revenue,
        transactions: transactions.count,
        avgOrderValue: transactions.count > 0 ? revenue / transactions.count : 0,
        conversionRate: transactions.conversionRate,
        clickThroughRate: clickthrough,
        bounceRate: bounce,
        topProducts,
        bySegment: {}
      });
    }

    return metrics.reverse(); // Oldest first
  }

  async getRevenueForecacast(days: number = 7): Promise<{
    forecast: Array<{ date: Date; predicted: number; lower: number; upper: number }>;
    confidence: number;
  }> {
    // Get historical data for trend analysis
    const historical = await this.getHistoricalMetrics(30);
    
    if (historical.length < 7) {
      return { forecast: [], confidence: 0 };
    }

    // Simple linear regression for forecasting
    const dataPoints: [number, number][] = historical.map((m, i) => [i, m.revenue]);
    const trend = this.calculateTrend(dataPoints);

    // Calculate seasonality (day of week effect)
    const seasonality = this.calculateSeasonality(historical);

    // Generate forecast
    const forecast: Array<{ date: Date; predicted: number; lower: number; upper: number }> = [];
    const lastIndex = historical.length - 1;
    const avgRevenue = historical.reduce((sum, m) => sum + m.revenue, 0) / historical.length;
    const stdDev = Math.sqrt(
      historical.reduce((sum, m) => sum + Math.pow(m.revenue - avgRevenue, 2), 0) / historical.length
    );

    for (let i = 1; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      // Base prediction from trend
      const trendValue = trend.slope * (lastIndex + i) + trend.intercept;
      
      // Apply seasonality
      const dayOfWeek = date.getDay();
      const seasonalFactor = seasonality[dayOfWeek];
      const predicted = trendValue * seasonalFactor;

      // Confidence intervals (95%)
      const margin = 1.96 * stdDev * Math.sqrt(1 + i / 30); // Widen with distance
      
      forecast.push({
        date,
        predicted: Math.max(0, predicted),
        lower: Math.max(0, predicted - margin),
        upper: predicted + margin
      });
    }

    // Calculate confidence based on R²
    const confidence = this.calculateR2(dataPoints, trend);

    return { forecast, confidence };
  }

  private calculateTrend(
    data: [number, number][]
  ): { slope: number; intercept: number } {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (const [x, y] of data) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private calculateSeasonality(historical: RevenueMetrics[]): number[] {
    // Calculate average revenue by day of week
    const dayRevenue: Record<number, number[]> = {};
    
    for (const metric of historical) {
      const day = metric.timestamp.getDay();
      if (!dayRevenue[day]) dayRevenue[day] = [];
      dayRevenue[day].push(metric.revenue);
    }

    const avgRevenue = historical.reduce((sum, m) => sum + m.revenue, 0) / historical.length;
    const seasonality: number[] = [];

    for (let day = 0; day < 7; day++) {
      if (dayRevenue[day]) {
        const dayAvg = dayRevenue[day].reduce((sum, r) => sum + r, 0) / dayRevenue[day].length;
        seasonality[day] = dayAvg / avgRevenue;
      } else {
        seasonality[day] = 1;
      }
    }

    return seasonality;
  }

  private calculateR2(
    data: [number, number][],
    trend: { slope: number; intercept: number }
  ): number {
    const yMean = data.reduce((sum, [, y]) => sum + y, 0) / data.length;
    
    let ssRes = 0, ssTot = 0;
    for (const [x, y] of data) {
      const predicted = trend.slope * x + trend.intercept;
      ssRes += Math.pow(y - predicted, 2);
      ssTot += Math.pow(y - yMean, 2);
    }

    return ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  }

  async checkAlerts(currentMetrics: RevenueMetrics): Promise<string[]> {
    const alerts: string[] = [];

    // Compare to same time yesterday
    const yesterday = subDays(new Date(), 1);
    const yesterdayMetrics = await this.getMetricsForTime(yesterday);

    // Revenue drop alert
    if (yesterdayMetrics.revenue > 0) {
      const revenueDrop = ((yesterdayMetrics.revenue - currentMetrics.revenue) / yesterdayMetrics.revenue) * 100;
      if (revenueDrop > this.alertThresholds.revenueDropPercent) {
        alerts.push(`⚠️ Revenue down ${revenueDrop.toFixed(1)}% compared to yesterday`);
      }
    }

    // Conversion rate drop
    if (yesterdayMetrics.conversionRate > 0) {
      const conversionDrop = ((yesterdayMetrics.conversionRate - currentMetrics.conversionRate) / yesterdayMetrics.conversionRate) * 100;
      if (conversionDrop > this.alertThresholds.conversionDropPercent) {
        alerts.push(`⚠️ Conversion rate down ${conversionDrop.toFixed(1)}% compared to yesterday`);
      }
    }

    // High bounce rate
    if (currentMetrics.bounceRate > 0.7) {
      alerts.push(`⚠️ High bounce rate detected: ${(currentMetrics.bounceRate * 100).toFixed(1)}%`);
    }

    // Check for anomalies in top products
    const anomalies = await this.detectProductAnomalies(currentMetrics.topProducts);
    alerts.push(...anomalies);

    return alerts;
  }

  private async getMetricsForTime(date: Date): Promise<RevenueMetrics> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const [
      revenue,
      transactions,
      clickthrough
    ] = await Promise.all([
      this.fetchRevenue(dayStart, dayEnd),
      this.fetchTransactions(dayStart, dayEnd),
      this.fetchClickThroughRate(dayStart, dayEnd)
    ]);

    return {
      timestamp: date,
      revenue,
      transactions: transactions.count,
      avgOrderValue: transactions.count > 0 ? revenue / transactions.count : 0,
      conversionRate: transactions.conversionRate,
      clickThroughRate: clickthrough,
      bounceRate: 0,
      topProducts: [],
      bySegment: {}
    };
  }

  private async detectProductAnomalies(
    topProducts: Array<{ productId: string; revenue: number; units: number }>
  ): Promise<string[]> {
    const alerts: string[] = [];

    for (const product of topProducts.slice(0, 5)) {
      // Get historical performance
      const { data: historical } = await this.supabase
        .from('analytics')
        .select('revenue, conversions')
        .eq('product_id', product.productId)
        .gte('timestamp', subDays(new Date(), 7).toISOString())
        .order('timestamp', { ascending: false })
        .limit(7);

      if (!historical || historical.length < 3) continue;

      const avgRevenue = historical.reduce((sum, h) => sum + h.revenue, 0) / historical.length;
      const avgUnits = historical.reduce((sum, h) => sum + h.conversions, 0) / historical.length;

      // Check for significant deviations
      if (product.revenue < avgRevenue * 0.5) {
        alerts.push(`📉 Product ${product.productId} revenue 50% below average`);
      } else if (product.revenue > avgRevenue * 2) {
        alerts.push(`📈 Product ${product.productId} revenue 2x above average - investigate opportunity`);
      }

      if (avgUnits > 0 && product.units < avgUnits * 0.3) {
        alerts.push(`⚠️ Product ${product.productId} sales volume unusually low`);
      }
    }

    return alerts;
  }

  async getRevenueBySource(
    start: Date,
    end: Date
  ): Promise<Record<string, number>> {
    const { data } = await this.supabase
      .from('analytics')
      .select('source, revenue')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString());

    const sources: Record<string, number> = {};

    for (const record of data || []) {
      const source = record.source || 'direct';
      sources[source] = (sources[source] || 0) + (record.revenue || 0);
    }

    return sources;
  }

  async getConversionFunnel(
    start: Date,
    end: Date
  ): Promise<{
    stages: Array<{ name: string; value: number; dropoff: number }>;
    overallConversion: number;
  }> {
    const { data } = await this.supabase
      .from('funnel_analytics')
      .select('stage, users')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('stage_order');

    if (!data || data.length === 0) {
      return { stages: [], overallConversion: 0 };
    }

    const stages: Array<{ name: string; value: number; dropoff: number }> = [];
    let previousValue = 0;

    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      const dropoff = previousValue > 0 
        ? ((previousValue - current.users) / previousValue) * 100
        : 0;

      stages.push({
        name: current.stage,
        value: current.users,
        dropoff
      });

      previousValue = current.users;
    }

    const overallConversion = data[0].users > 0
      ? (data[data.length - 1].users / data[0].users) * 100
      : 0;

    return { stages, overallConversion };
  }

  async trackCustomMetric(
    name: string,
    value: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.supabase
      .from('custom_metrics')
      .insert({
        name,
        value,
        metadata,
        timestamp: new Date()
      });
  }

  async getCustomMetrics(
    name: string,
    start: Date,
    end: Date
  ): Promise<Array<{ timestamp: Date; value: number; metadata?: Record<string, unknown> | null }>> {
    const { data } = await this.supabase
      .from('custom_metrics')
      .select('timestamp, value, metadata')
      .eq('name', name)
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('timestamp');

    return (data || []).map(d => ({
      timestamp: new Date(d.timestamp),
      value: d.value,
      metadata: d.metadata ?? null
    }));
  }
}
