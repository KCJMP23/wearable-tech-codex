import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { EmailAnalytics } from './types';

export interface EmailMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  
  // Calculated rates
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  
  // Revenue metrics
  revenue?: number;
  conversions?: number;
  conversionRate?: number;
  revenuePerEmail?: number;
  averageOrderValue?: number;
}

export interface CampaignAnalytics extends EmailMetrics {
  campaignId: string;
  campaignName: string;
  sentAt: Date;
  subject: string;
  
  // Device breakdown
  deviceMetrics: {
    desktop: number;
    mobile: number;
    tablet: number;
    other: number;
  };
  
  // Geographic breakdown
  topCountries: Array<{
    country: string;
    opens: number;
    clicks: number;
  }>;
  
  // Time-based metrics
  hourlyMetrics: Array<{
    hour: number;
    opens: number;
    clicks: number;
  }>;
  
  // Link performance
  linkMetrics: Array<{
    url: string;
    clicks: number;
    uniqueClicks: number;
  }>;
}

export interface SubscriberAnalytics {
  subscriberId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  
  // Engagement metrics
  totalEmails: number;
  totalOpens: number;
  totalClicks: number;
  uniqueOpens: number;
  uniqueClicks: number;
  
  // Calculated metrics
  openRate: number;
  clickRate: number;
  engagementScore: number;
  
  // Behavioral data
  lastOpenDate?: Date;
  lastClickDate?: Date;
  averageTimeToOpen?: number; // minutes
  preferredSendDay?: string;
  preferredSendTime?: number; // hour of day
  
  // Purchase data
  totalPurchases: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastPurchaseDate?: Date;
  
  // Segmentation
  segments: string[];
  tags: string[];
  
  // Lifecycle
  lifecycleStage: 'new' | 'active' | 'engaged' | 'at_risk' | 'churned' | 'vip';
  riskScore: number; // 0-100, higher = more likely to churn
}

export interface TenantAnalytics {
  tenantId: string;
  
  // Overview metrics
  totalSubscribers: number;
  activeSubscribers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  
  // Performance metrics
  overallMetrics: EmailMetrics;
  
  // Growth metrics
  subscriberGrowth: Array<{
    date: string;
    newSubscribers: number;
    unsubscribes: number;
    netGrowth: number;
  }>;
  
  // Campaign performance over time
  campaignPerformance: Array<{
    date: string;
    campaignsSent: number;
    totalSent: number;
    averageOpenRate: number;
    averageClickRate: number;
  }>;
  
  // Top performing campaigns
  topCampaigns: Array<{
    campaignId: string;
    name: string;
    openRate: number;
    clickRate: number;
    revenue?: number;
  }>;
  
  // Segment performance
  segmentPerformance: Array<{
    segmentId: string;
    name: string;
    subscriberCount: number;
    averageOpenRate: number;
    averageClickRate: number;
  }>;
}

export class EmailAnalyticsService {
  private supabase: SupabaseClient<any, 'public', any>;

  constructor(supabaseClient?: SupabaseClient<any, 'public', any>) {
    this.supabase =
      supabaseClient ??
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
  }

  async getCampaignAnalytics(
    campaignId: string,
    includeDetailedMetrics = true
  ): Promise<CampaignAnalytics | null> {
    try {
      // Get campaign details
      const { data: campaign } = await this.supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (!campaign) return null;

      // Get basic metrics
      const basicMetrics = await this.calculateBasicMetrics(campaignId);
      
      // Get detailed metrics if requested
      let deviceMetrics = { desktop: 0, mobile: 0, tablet: 0, other: 0 };
      let topCountries: Array<{ country: string; opens: number; clicks: number }> = [];
      let hourlyMetrics: Array<{ hour: number; opens: number; clicks: number }> = [];
      let linkMetrics: Array<{ url: string; clicks: number; uniqueClicks: number }> = [];

      if (includeDetailedMetrics) {
        deviceMetrics = await this.getDeviceMetrics(campaignId);
        topCountries = await this.getTopCountries(campaignId);
        hourlyMetrics = await this.getHourlyMetrics(campaignId);
        linkMetrics = await this.getLinkMetrics(campaignId);
      }

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        sentAt: new Date(campaign.sent_at),
        subject: campaign.subject,
        ...basicMetrics,
        deviceMetrics,
        topCountries,
        hourlyMetrics,
        linkMetrics,
      };
    } catch (error) {
      console.error('Error getting campaign analytics:', error);
      return null;
    }
  }

  async getSubscriberAnalytics(subscriberId: string): Promise<SubscriberAnalytics | null> {
    try {
      // Get subscriber details
      const { data: subscriber } = await this.supabase
        .from('email_subscribers')
        .select('*')
        .eq('id', subscriberId)
        .single();

      if (!subscriber) return null;

      // Get email analytics
      const { data: analytics } = await this.supabase
        .from('email_analytics')
        .select('*')
        .eq('subscriber_id', subscriberId);

      const analyticsEvents = Array.isArray(analytics) ? analytics : [];

      // Calculate engagement metrics
      const totalEmails = analyticsEvents.filter(a => a.event === 'sent').length;
      const totalOpens = analyticsEvents.filter(a => a.event === 'opened').length;
      const totalClicks = analyticsEvents.filter(a => a.event === 'clicked').length;
      
      const uniqueOpens = new Set(
        analyticsEvents.filter(a => a.event === 'opened').map(a => a.campaign_id)
      ).size;
      
      const uniqueClicks = new Set(
        analyticsEvents.filter(a => a.event === 'clicked').map(a => a.campaign_id)
      ).size;

      const openRate = totalEmails > 0 ? (uniqueOpens / totalEmails) * 100 : 0;
      const clickRate = totalEmails > 0 ? (uniqueClicks / totalEmails) * 100 : 0;
      
      // Calculate engagement score (0-100)
      const engagementScore = this.calculateEngagementScore({
        openRate,
        clickRate,
        totalOpens,
        totalClicks,
        daysSinceLastOpen: this.getDaysSinceLastActivity(analyticsEvents, 'opened'),
      });

      // Get purchase data
      const { data: purchases } = await this.supabase
        .from('purchases')
        .select('*')
        .eq('subscriber_id', subscriberId);

      const purchaseRows = Array.isArray(purchases) ? purchases : [];

      const totalPurchases = purchaseRows.length;
      const totalRevenue = purchaseRows.reduce((sum, p) => sum + (p.total || 0), 0);
      const averageOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

      // Get behavioral insights
      const lastOpenDate = this.getLastActivityDate(analyticsEvents, 'opened');
      const lastClickDate = this.getLastActivityDate(analyticsEvents, 'clicked');
      const averageTimeToOpen = this.calculateAverageTimeToOpen(analyticsEvents);
      const { preferredSendDay, preferredSendTime } = this.calculatePreferredTiming(analyticsEvents);

      // Get segments and tags
      const { data: segmentMemberships } = await this.supabase
        .from('email_segment_members')
        .select('segment:email_segments(name)')
        .eq('subscriber_id', subscriberId);

      const membershipRows = Array.isArray(segmentMemberships) ? segmentMemberships : [];
      const segments = membershipRows
        .map(m => {
          const segment = Array.isArray(m.segment) ? m.segment[0] : m.segment;
          return segment?.name as string | undefined;
        })
        .filter((name): name is string => Boolean(name));

      // Calculate lifecycle stage and risk score
      const lifecycleStage = this.calculateLifecycleStage({
        openRate,
        clickRate,
        daysSinceLastOpen: this.getDaysSinceLastActivity(analyticsEvents, 'opened'),
        totalPurchases,
        daysSinceLastPurchase: purchaseRows[0] ? 
          Math.floor((Date.now() - new Date(purchaseRows[0].created_at).getTime()) / (1000 * 60 * 60 * 24)) : 
          Infinity,
      });

      const riskScore = this.calculateRiskScore({
        openRate,
        clickRate,
        daysSinceLastOpen: this.getDaysSinceLastActivity(analyticsEvents, 'opened'),
        engagementTrend: this.calculateEngagementTrend(analyticsEvents),
      });

      return {
        subscriberId: subscriber.id,
        email: subscriber.email,
        firstName: subscriber.first_name,
        lastName: subscriber.last_name,
        totalEmails,
        totalOpens,
        totalClicks,
        uniqueOpens,
        uniqueClicks,
        openRate,
        clickRate,
        engagementScore,
        lastOpenDate,
        lastClickDate,
        averageTimeToOpen,
        preferredSendDay,
        preferredSendTime,
        totalPurchases,
        totalRevenue,
        averageOrderValue,
        lastPurchaseDate: purchaseRows[0] ? new Date(purchaseRows[0].created_at) : undefined,
        segments,
        tags: subscriber.tags || [],
        lifecycleStage,
        riskScore,
      };
    } catch (error) {
      console.error('Error getting subscriber analytics:', error);
      return null;
    }
  }

  async getTenantAnalytics(
    tenantId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<TenantAnalytics | null> {
    try {
      // Get basic counts
      const { data: subscriberCounts } = await this.supabase
        .from('email_subscribers')
        .select('status')
        .eq('tenant_id', tenantId);

      const totalSubscribers = subscriberCounts?.length || 0;
      const activeSubscribers = subscriberCounts?.filter(s => s.status === 'active').length || 0;

      const { data: campaignCounts } = await this.supabase
        .from('email_campaigns')
        .select('status')
        .eq('tenant_id', tenantId);

      const totalCampaigns = campaignCounts?.length || 0;
      const activeCampaigns = campaignCounts?.filter(c => c.status === 'active').length || 0;

      // Get overall performance metrics
      const overallMetrics = await this.calculateTenantMetrics(tenantId, dateRange);

      // Get growth metrics
      const subscriberGrowth = await this.getSubscriberGrowth(tenantId, dateRange);

      // Get campaign performance over time
      const campaignPerformance = await this.getCampaignPerformanceOverTime(tenantId, dateRange);

      // Get top performing campaigns
      const topCampaigns = await this.getTopPerformingCampaigns(tenantId, 10);

      // Get segment performance
      const segmentPerformance = await this.getSegmentPerformance(tenantId);

      return {
        tenantId,
        totalSubscribers,
        activeSubscribers,
        totalCampaigns,
        activeCampaigns,
        overallMetrics,
        subscriberGrowth,
        campaignPerformance,
        topCampaigns,
        segmentPerformance,
      };
    } catch (error) {
      console.error('Error getting tenant analytics:', error);
      return null;
    }
  }

  async getRealTimeMetrics(campaignId: string): Promise<{
    sent: number;
    opens: number;
    clicks: number;
    openRate: number;
    clickRate: number;
    lastUpdated: Date;
  }> {
    try {
      const { data: analytics } = await this.supabase
        .from('email_analytics')
        .select('event, timestamp')
        .eq('campaign_id', campaignId)
        .order('timestamp', { ascending: false });

      if (!analytics) {
        return {
          sent: 0,
          opens: 0,
          clicks: 0,
          openRate: 0,
          clickRate: 0,
          lastUpdated: new Date(),
        };
      }

      const sent = analytics.filter(a => a.event === 'sent').length;
      const opens = analytics.filter(a => a.event === 'opened').length;
      const clicks = analytics.filter(a => a.event === 'clicked').length;
      
      const openRate = sent > 0 ? (opens / sent) * 100 : 0;
      const clickRate = sent > 0 ? (clicks / sent) * 100 : 0;
      
      const lastUpdated = analytics.length > 0 ? new Date(analytics[0].timestamp) : new Date();

      return {
        sent,
        opens,
        clicks,
        openRate,
        clickRate,
        lastUpdated,
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return {
        sent: 0,
        opens: 0,
        clicks: 0,
        openRate: 0,
        clickRate: 0,
        lastUpdated: new Date(),
      };
    }
  }

  async trackEmailEvent(event: EmailAnalytics): Promise<void> {
    try {
      await this.supabase
        .from('email_analytics')
        .insert({
          campaign_id: event.campaignId,
          subscriber_id: event.subscriberId,
          event: event.event,
          timestamp: event.timestamp.toISOString(),
          metadata: event.metadata,
          user_agent: event.userAgent,
          ip_address: event.ipAddress,
          location: event.location,
        });
    } catch (error) {
      console.error('Error tracking email event:', error);
    }
  }

  async getComparativeAnalytics(
    campaignIds: string[]
  ): Promise<Array<{ campaignId: string; metrics: EmailMetrics }>> {
    const results = [];
    
    for (const campaignId of campaignIds) {
      const metrics = await this.calculateBasicMetrics(campaignId);
      results.push({ campaignId, metrics });
    }
    
    return results;
  }

  private async calculateBasicMetrics(campaignId: string): Promise<EmailMetrics> {
    const { data: analytics } = await this.supabase
      .from('email_analytics')
      .select('event')
      .eq('campaign_id', campaignId);

    if (!analytics) {
      return this.getEmptyMetrics();
    }

    const counts = analytics.reduce((acc, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sent = counts.sent || 0;
    const delivered = counts.delivered || 0;
    const opened = counts.opened || 0;
    const clicked = counts.clicked || 0;
    const bounced = counts.bounced || 0;
    const complained = counts.complained || 0;
    const unsubscribed = counts.unsubscribed || 0;

    // Get revenue data
    const { data: conversions } = await this.supabase
      .from('email_conversions')
      .select('value')
      .eq('campaign_id', campaignId);

    const revenue = conversions?.reduce((sum, conv) => sum + (conv.value || 0), 0) || 0;
    const conversionsCount = conversions?.length || 0;

    return {
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      complained,
      unsubscribed,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      clickToOpenRate: opened > 0 ? (clicked / opened) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
      complaintRate: sent > 0 ? (complained / sent) * 100 : 0,
      unsubscribeRate: sent > 0 ? (unsubscribed / sent) * 100 : 0,
      revenue,
      conversions: conversionsCount,
      conversionRate: sent > 0 ? (conversionsCount / sent) * 100 : 0,
      revenuePerEmail: sent > 0 ? revenue / sent : 0,
      averageOrderValue: conversionsCount > 0 ? revenue / conversionsCount : 0,
    };
  }

  private async getDeviceMetrics(campaignId: string) {
    const { data: analytics } = await this.supabase
      .from('email_analytics')
      .select('user_agent')
      .eq('campaign_id', campaignId)
      .eq('event', 'opened');

    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0, other: 0 };
    
    analytics?.forEach(event => {
      const userAgent = event.user_agent?.toLowerCase() || '';
      if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
        deviceCounts.mobile++;
      } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
        deviceCounts.tablet++;
      } else if (userAgent.includes('desktop') || userAgent.includes('windows') || userAgent.includes('mac')) {
        deviceCounts.desktop++;
      } else {
        deviceCounts.other++;
      }
    });

    return deviceCounts;
  }

  private async getTopCountries(campaignId: string) {
    const { data: analytics } = await this.supabase
      .from('email_analytics')
      .select('location, event')
      .eq('campaign_id', campaignId)
      .in('event', ['opened', 'clicked']);

    const countryStats: Record<string, { opens: number; clicks: number }> = {};
    
    analytics?.forEach(event => {
      const country = event.location?.country || 'Unknown';
      if (!countryStats[country]) {
        countryStats[country] = { opens: 0, clicks: 0 };
      }
      
      if (event.event === 'opened') {
        countryStats[country].opens++;
      } else if (event.event === 'clicked') {
        countryStats[country].clicks++;
      }
    });

    return Object.entries(countryStats)
      .map(([country, stats]) => ({ country, ...stats }))
      .sort((a, b) => (b.opens + b.clicks) - (a.opens + a.clicks))
      .slice(0, 10);
  }

  private async getHourlyMetrics(campaignId: string) {
    const { data: analytics } = await this.supabase
      .from('email_analytics')
      .select('timestamp, event')
      .eq('campaign_id', campaignId)
      .in('event', ['opened', 'clicked']);

    const hourlyStats: Record<number, { opens: number; clicks: number }> = {};
    
    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats[hour] = { opens: 0, clicks: 0 };
    }

    analytics?.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      
      if (event.event === 'opened') {
        hourlyStats[hour].opens++;
      } else if (event.event === 'clicked') {
        hourlyStats[hour].clicks++;
      }
    });

    return Object.entries(hourlyStats).map(([hour, stats]) => ({
      hour: parseInt(hour),
      ...stats,
    }));
  }

  private async getLinkMetrics(campaignId: string) {
    const { data: analytics } = await this.supabase
      .from('email_analytics')
      .select('metadata, subscriber_id')
      .eq('campaign_id', campaignId)
      .eq('event', 'clicked');

    const linkStats: Record<string, { clicks: number; uniqueClicks: Set<string> }> = {};
    
    analytics?.forEach(event => {
      const url = event.metadata?.url || 'Unknown';
      if (!linkStats[url]) {
        linkStats[url] = { clicks: 0, uniqueClicks: new Set() };
      }
      
      linkStats[url].clicks++;
      linkStats[url].uniqueClicks.add(event.subscriber_id);
    });

    return Object.entries(linkStats)
      .map(([url, stats]) => ({
        url,
        clicks: stats.clicks,
        uniqueClicks: stats.uniqueClicks.size,
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }

  private getEmptyMetrics(): EmailMetrics {
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      unsubscribed: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      clickToOpenRate: 0,
      bounceRate: 0,
      complaintRate: 0,
      unsubscribeRate: 0,
      revenue: 0,
      conversions: 0,
      conversionRate: 0,
      revenuePerEmail: 0,
      averageOrderValue: 0,
    };
  }

  private calculateEngagementScore(data: {
    openRate: number;
    clickRate: number;
    totalOpens: number;
    totalClicks: number;
    daysSinceLastOpen: number;
  }): number {
    let score = 0;
    
    // Open rate contribution (0-40 points)
    score += Math.min(data.openRate * 0.8, 40);
    
    // Click rate contribution (0-30 points)
    score += Math.min(data.clickRate * 3, 30);
    
    // Activity volume (0-20 points)
    const activityScore = Math.min((data.totalOpens + data.totalClicks * 2) / 2, 20);
    score += activityScore;
    
    // Recency penalty (0-10 points deducted)
    if (data.daysSinceLastOpen > 30) {
      score -= Math.min((data.daysSinceLastOpen - 30) / 10, 10);
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private getDaysSinceLastActivity(analytics: any[], event: string): number {
    const lastActivity = analytics
      ?.filter(a => a.event === event)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (!lastActivity) return Infinity;
    
    return Math.floor((Date.now() - new Date(lastActivity.timestamp).getTime()) / (1000 * 60 * 60 * 24));
  }

  private getLastActivityDate(analytics: any[], event: string): Date | undefined {
    const lastActivity = analytics
      ?.filter(a => a.event === event)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    return lastActivity ? new Date(lastActivity.timestamp) : undefined;
  }

  private calculateAverageTimeToOpen(analytics: any[]): number | undefined {
    const sentEvents = analytics?.filter(a => a.event === 'sent') || [];
    const openEvents = analytics?.filter(a => a.event === 'opened') || [];
    
    if (sentEvents.length === 0 || openEvents.length === 0) return undefined;
    
    const times: number[] = [];
    
    sentEvents.forEach(sent => {
      const correspondingOpen = openEvents.find(open => 
        open.campaign_id === sent.campaign_id &&
        new Date(open.timestamp) > new Date(sent.timestamp)
      );
      
      if (correspondingOpen) {
        const timeToOpen = (new Date(correspondingOpen.timestamp).getTime() - new Date(sent.timestamp).getTime()) / (1000 * 60);
        times.push(timeToOpen);
      }
    });
    
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : undefined;
  }

  private calculatePreferredTiming(analytics: any[]): {
    preferredSendDay?: string;
    preferredSendTime?: number;
  } {
    const openEvents = analytics?.filter(a => a.event === 'opened') || [];
    
    if (openEvents.length === 0) return {};
    
    const dayStats: Record<string, number> = {};
    const hourStats: Record<number, number> = {};
    
    openEvents.forEach(event => {
      const date = new Date(event.timestamp);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();
      
      dayStats[day] = (dayStats[day] || 0) + 1;
      hourStats[hour] = (hourStats[hour] || 0) + 1;
    });
    
    const preferredSendDay = Object.entries(dayStats)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    const preferredSendTime = Object.entries(hourStats)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    return {
      preferredSendDay,
      preferredSendTime: preferredSendTime ? parseInt(preferredSendTime) : undefined,
    };
  }

  private calculateLifecycleStage(data: {
    openRate: number;
    clickRate: number;
    daysSinceLastOpen: number;
    totalPurchases: number;
    daysSinceLastPurchase: number;
  }): 'new' | 'active' | 'engaged' | 'at_risk' | 'churned' | 'vip' {
    if (data.totalPurchases >= 5 && data.openRate > 30 && data.clickRate > 5) {
      return 'vip';
    }
    
    if (data.daysSinceLastOpen > 180) {
      return 'churned';
    }
    
    if (data.daysSinceLastOpen > 90 || data.openRate < 5) {
      return 'at_risk';
    }
    
    if (data.openRate > 25 && data.clickRate > 3) {
      return 'engaged';
    }
    
    if (data.openRate > 10 || data.daysSinceLastOpen < 30) {
      return 'active';
    }
    
    return 'new';
  }

  private calculateRiskScore(data: {
    openRate: number;
    clickRate: number;
    daysSinceLastOpen: number;
    engagementTrend: number;
  }): number {
    let risk = 0;
    
    // Low open rate increases risk
    if (data.openRate < 10) risk += 30;
    else if (data.openRate < 20) risk += 15;
    
    // Low click rate increases risk
    if (data.clickRate < 2) risk += 20;
    else if (data.clickRate < 5) risk += 10;
    
    // Inactivity increases risk
    if (data.daysSinceLastOpen > 90) risk += 40;
    else if (data.daysSinceLastOpen > 60) risk += 25;
    else if (data.daysSinceLastOpen > 30) risk += 10;
    
    // Negative engagement trend increases risk
    if (data.engagementTrend < -0.5) risk += 20;
    else if (data.engagementTrend < -0.2) risk += 10;
    
    return Math.min(100, risk);
  }

  private calculateEngagementTrend(analytics: any[]): number {
    // Calculate engagement trend over the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentAnalytics = analytics?.filter(a => 
      new Date(a.timestamp) > sixMonthsAgo &&
      ['opened', 'clicked'].includes(a.event)
    ) || [];
    
    if (recentAnalytics.length < 2) return 0;
    
    // Simple trend calculation - compare first half vs second half
    const midpoint = recentAnalytics.length / 2;
    const firstHalf = recentAnalytics.slice(0, Math.floor(midpoint));
    const secondHalf = recentAnalytics.slice(Math.floor(midpoint));
    
    const firstHalfEngagement = firstHalf.length;
    const secondHalfEngagement = secondHalf.length;
    
    if (firstHalfEngagement === 0) return secondHalfEngagement > 0 ? 1 : 0;
    
    return (secondHalfEngagement - firstHalfEngagement) / firstHalfEngagement;
  }

  // Additional helper methods for tenant analytics
  private async calculateTenantMetrics(tenantId: string, dateRange: { start: Date; end: Date }): Promise<EmailMetrics> {
    const { data: campaignRows } = await this.supabase
      .from('email_campaigns')
      .select('id')
      .eq('tenant_id', tenantId);

    const campaignIds = (campaignRows ?? []).map(row => row.id);
    if (campaignIds.length === 0) {
      return this.getEmptyMetrics();
    }

    const { data: analytics } = await this.supabase
      .from('email_analytics')
      .select('event, campaign_id')
      .in('campaign_id', campaignIds)
      .gte('timestamp', dateRange.start.toISOString())
      .lte('timestamp', dateRange.end.toISOString());

    const events = Array.isArray(analytics) ? analytics : [];

    // Aggregate similar to campaign analytics; for now return placeholder metrics.
    if (!events.length) {
      return this.getEmptyMetrics();
    }

    const metrics = this.getEmptyMetrics();
    metrics.sent = events.filter(e => e.event === 'sent').length;
    metrics.delivered = events.filter(e => e.event === 'delivered').length;
    metrics.opened = events.filter(e => e.event === 'opened').length;
    metrics.clicked = events.filter(e => e.event === 'clicked').length;
    metrics.bounced = events.filter(e => e.event === 'bounced').length;
    metrics.complained = events.filter(e => e.event === 'complained').length;
    metrics.unsubscribed = events.filter(e => e.event === 'unsubscribed').length;

    metrics.openRate = metrics.sent > 0 ? (metrics.opened / metrics.sent) * 100 : 0;
    metrics.clickRate = metrics.sent > 0 ? (metrics.clicked / metrics.sent) * 100 : 0;
    metrics.bounceRate = metrics.sent > 0 ? (metrics.bounced / metrics.sent) * 100 : 0;
    metrics.unsubscribeRate = metrics.sent > 0 ? (metrics.unsubscribed / metrics.sent) * 100 : 0;

    return metrics;
  }

  private async getSubscriberGrowth(tenantId: string, dateRange: { start: Date; end: Date }) {
    // Implementation for subscriber growth over time
    return [];
  }

  private async getCampaignPerformanceOverTime(tenantId: string, dateRange: { start: Date; end: Date }) {
    // Implementation for campaign performance over time
    return [];
  }

  private async getTopPerformingCampaigns(tenantId: string, limit: number) {
    // Implementation for top performing campaigns
    return [];
  }

  private async getSegmentPerformance(tenantId: string) {
    // Implementation for segment performance
    return [];
  }
}
