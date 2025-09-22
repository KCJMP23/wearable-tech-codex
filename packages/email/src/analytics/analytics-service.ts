import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { EmailAnalytics } from '../types';

export interface CampaignAnalytics {
  campaignId: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  uniqueOpens: number;
  uniqueClicks: number;
  totalRevenue?: number;
  averageOrderValue?: number;
}

export interface AutomationAnalytics {
  automationId: string;
  totalExecutions: number;
  activeExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  completionRate: number;
  averageCompletionTime: number; // in hours
  stepAnalytics: {
    step: number;
    actionType: string;
    executed: number;
    succeeded: number;
    failed: number;
    successRate: number;
  }[];
}

export interface OverallAnalytics {
  totalSubscribers: number;
  activeSubscribers: number;
  unsubscribedSubscribers: number;
  bouncedSubscribers: number;
  totalCampaigns: number;
  totalEmailsSent: number;
  totalEmailsDelivered: number;
  totalEmailsOpened: number;
  totalEmailsClicked: number;
  overallOpenRate: number;
  overallClickRate: number;
  growthRate: number; // monthly growth rate
  churnRate: number; // monthly churn rate
  engagementScore: number;
}

export interface EmailPerformanceReport {
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  campaigns: CampaignAnalytics[];
  automations: AutomationAnalytics[];
  overall: OverallAnalytics;
  trends: {
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }[];
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

  async trackEvent(analytics: Omit<EmailAnalytics, 'id' | 'createdAt'>): Promise<void> {
    try {
      await this.supabase
        .from('email_analytics')
        .insert({
          campaign_id: analytics.campaignId ?? null,
          automation_id: analytics.automationId ?? null,
          subscriber_id: analytics.subscriberId,
          event: analytics.event,
          timestamp: analytics.timestamp.toISOString(),
          metadata: analytics.metadata,
          user_agent: analytics.userAgent,
          ip_address: analytics.ipAddress,
          location: analytics.location,
          url: analytics.url ?? null,
          message_id: analytics.messageId ?? null,
        });
    } catch (error) {
      console.error('Error tracking email event:', error);
    }
  }

  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const { data: events } = await this.supabase
      .from('email_analytics')
      .select('event, subscriber_id')
      .eq('campaign_id', campaignId);

    const eventRows = Array.isArray(events) ? events : [];

    if (!eventRows.length) {
      return this.getEmptyCampaignAnalytics(campaignId);
    }

    const eventCounts = eventRows.reduce((acc, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count unique opens and clicks
    const uniqueOpens = new Set(
      eventRows.filter(e => e.event === 'opened').map(e => e.subscriber_id)
    ).size;

    const uniqueClicks = new Set(
      eventRows.filter(e => e.event === 'clicked').map(e => e.subscriber_id)
    ).size;

    const sent = eventCounts.sent || 0;
    const delivered = eventCounts.delivered || 0;
    const opened = eventCounts.opened || 0;
    const clicked = eventCounts.clicked || 0;
    const bounced = eventCounts.bounced || 0;
    const complained = eventCounts.complained || 0;
    const unsubscribed = eventCounts.unsubscribed || 0;

    return {
      campaignId,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      complained,
      unsubscribed,
      openRate: delivered > 0 ? (uniqueOpens / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (uniqueClicks / delivered) * 100 : 0,
      clickToOpenRate: uniqueOpens > 0 ? (uniqueClicks / uniqueOpens) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
      complaintRate: delivered > 0 ? (complained / delivered) * 100 : 0,
      unsubscribeRate: delivered > 0 ? (unsubscribed / delivered) * 100 : 0,
      uniqueOpens,
      uniqueClicks,
    };
  }

  async getAutomationAnalytics(automationId: string): Promise<AutomationAnalytics> {
    // Get execution stats
    const { data: executions } = await this.supabase
      .from('email_automation_executions')
      .select('status, started_at, completed_at, metadata')
      .eq('automation_id', automationId);

    if (!executions || executions.length === 0) {
      return this.getEmptyAutomationAnalytics(automationId);
    }

    const totalExecutions = executions.length;
    const activeExecutions = executions.filter(e => e.status === 'active').length;
    const completedExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;

    // Calculate average completion time
    const completedWithTimes = executions.filter(e => 
      e.status === 'completed' && e.started_at && e.completed_at
    );

    let averageCompletionTime = 0;
    if (completedWithTimes.length > 0) {
      const totalTime = completedWithTimes.reduce((sum, execution) => {
        const start = new Date(execution.started_at).getTime();
        const end = new Date(execution.completed_at).getTime();
        return sum + (end - start);
      }, 0);
      averageCompletionTime = (totalTime / completedWithTimes.length) / (1000 * 60 * 60); // hours
    }

    // Analyze step performance
    const stepStats = new Map<string, { executed: number; succeeded: number; failed: number }>();
    
    executions.forEach(execution => {
      const actionLogs = execution.metadata?.actionLogs || [];
      actionLogs.forEach((log: any) => {
        const key = `${log.step}-${log.actionType}`;
        const stats = stepStats.get(key) || { executed: 0, succeeded: 0, failed: 0 };
        stats.executed++;
        if (log.success) {
          stats.succeeded++;
        } else {
          stats.failed++;
        }
        stepStats.set(key, stats);
      });
    });

    const stepAnalytics = Array.from(stepStats.entries()).map(([key, stats]) => {
      const [step, actionType] = key.split('-');
      return {
        step: parseInt(step),
        actionType,
        executed: stats.executed,
        succeeded: stats.succeeded,
        failed: stats.failed,
        successRate: stats.executed > 0 ? (stats.succeeded / stats.executed) * 100 : 0,
      };
    }).sort((a, b) => a.step - b.step);

    return {
      automationId,
      totalExecutions,
      activeExecutions,
      completedExecutions,
      failedExecutions,
      completionRate: totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0,
      averageCompletionTime,
      stepAnalytics,
    };
  }

  async getOverallAnalytics(tenantId: string): Promise<OverallAnalytics> {
    // Get subscriber counts
    const { data: subscriberStats } = await this.supabase
      .from('email_subscribers')
      .select('status')
      .eq('tenant_id', tenantId);

    const totalSubscribers = subscriberStats?.length || 0;
    const activeSubscribers = subscriberStats?.filter(s => s.status === 'active').length || 0;
    const unsubscribedSubscribers = subscriberStats?.filter(s => s.status === 'unsubscribed').length || 0;
    const bouncedSubscribers = subscriberStats?.filter(s => s.status === 'bounced').length || 0;

    // Get campaign counts
    const { data: campaignStats } = await this.supabase
      .from('email_campaigns')
      .select('id')
      .eq('tenant_id', tenantId);

    const totalCampaigns = campaignStats?.length || 0;

    // Get email stats from analytics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: emailStats } = await this.supabase
      .from('email_analytics')
      .select('event')
      .gte('timestamp', thirtyDaysAgo.toISOString())
      .in('campaign_id', campaignStats?.map(c => c.id) || []);

    if (!emailStats) {
      return this.getEmptyOverallAnalytics();
    }

    const eventCounts = emailStats.reduce((acc, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalEmailsSent = eventCounts.sent || 0;
    const totalEmailsDelivered = eventCounts.delivered || 0;
    const totalEmailsOpened = eventCounts.opened || 0;
    const totalEmailsClicked = eventCounts.clicked || 0;

    // Calculate growth and churn rates
    const { growthRate, churnRate } = await this.calculateGrowthAndChurnRates(tenantId);

    // Calculate engagement score (simplified metric)
    const engagementScore = this.calculateEngagementScore({
      totalSubscribers: activeSubscribers,
      totalEmailsDelivered,
      totalEmailsOpened,
      totalEmailsClicked,
    });

    return {
      totalSubscribers,
      activeSubscribers,
      unsubscribedSubscribers,
      bouncedSubscribers,
      totalCampaigns,
      totalEmailsSent,
      totalEmailsDelivered,
      totalEmailsOpened,
      totalEmailsClicked,
      overallOpenRate: totalEmailsDelivered > 0 ? (totalEmailsOpened / totalEmailsDelivered) * 100 : 0,
      overallClickRate: totalEmailsDelivered > 0 ? (totalEmailsClicked / totalEmailsDelivered) * 100 : 0,
      growthRate,
      churnRate,
      engagementScore,
    };
  }

  async getPerformanceReport(
    tenantId: string,
    period: 'day' | 'week' | 'month',
    startDate: string,
    endDate: string
  ): Promise<EmailPerformanceReport> {
    // Get campaigns in the period
    const { data: campaigns } = await this.supabase
      .from('email_campaigns')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('sent_at', startDate)
      .lte('sent_at', endDate);

    const campaignAnalytics = await Promise.all(
      (campaigns || []).map(c => this.getCampaignAnalytics(c.id))
    );

    // Get automations
    const { data: automations } = await this.supabase
      .from('email_automations')
      .select('id')
      .eq('tenant_id', tenantId);

    const automationAnalytics = await Promise.all(
      (automations || []).map(a => this.getAutomationAnalytics(a.id))
    );

    const overall = await this.getOverallAnalytics(tenantId);
    const trends = await this.getTrends(tenantId, period, startDate, endDate);

    return {
      period,
      startDate,
      endDate,
      campaigns: campaignAnalytics,
      automations: automationAnalytics,
      overall,
      trends,
    };
  }

  async getTrends(
    tenantId: string,
    period: 'day' | 'week' | 'month',
    startDate: string,
    endDate: string
  ): Promise<EmailPerformanceReport['trends']> {
    const dateFormat = period === 'day' ? 'YYYY-MM-DD' : 
                     period === 'week' ? 'YYYY-"W"WW' : 'YYYY-MM';

    const { data: trendData } = await this.supabase.rpc('get_email_trends', {
      p_tenant_id: tenantId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_date_format: dateFormat,
    });

    return trendData || [];
  }

  async getTopPerformingCampaigns(
    tenantId: string,
    metric: 'open_rate' | 'click_rate' | 'conversion_rate' = 'open_rate',
    limit = 10
  ): Promise<CampaignAnalytics[]> {
    const { data: campaigns } = await this.supabase
      .from('email_campaigns')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(50); // Get recent campaigns

    if (!campaigns) return [];

    const campaignAnalytics = await Promise.all(
      campaigns.map(c => this.getCampaignAnalytics(c.id))
    );

    // Sort by the specified metric
    campaignAnalytics.sort((a, b) => {
      const aValue = metric === 'open_rate' ? a.openRate : 
                    metric === 'click_rate' ? a.clickRate : a.clickToOpenRate;
      const bValue = metric === 'open_rate' ? b.openRate : 
                    metric === 'click_rate' ? b.clickRate : b.clickToOpenRate;
      return bValue - aValue;
    });

    return campaignAnalytics.slice(0, limit);
  }

  async getSubscriberEngagementScore(subscriberId: string): Promise<number> {
    const { data: events } = await this.supabase
      .from('email_analytics')
      .select('event, timestamp')
      .eq('subscriber_id', subscriberId)
      .gte('timestamp', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (!events || events.length === 0) return 0;

    let score = 0;
    const recentEvents = events.filter(e => 
      new Date(e.timestamp).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    // Scoring algorithm
    score += recentEvents.filter(e => e.event === 'opened').length * 1;
    score += recentEvents.filter(e => e.event === 'clicked').length * 3;
    score += events.filter(e => e.event === 'opened').length * 0.5;
    score += events.filter(e => e.event === 'clicked').length * 2;

    // Penalize bounces and complaints
    score -= events.filter(e => e.event === 'bounced').length * 2;
    score -= events.filter(e => e.event === 'complained').length * 5;

    return Math.max(0, Math.min(100, score));
  }

  private async calculateGrowthAndChurnRates(tenantId: string): Promise<{
    growthRate: number;
    churnRate: number;
  }> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Get subscriber counts for the last two months
    const { data: lastMonthSubs } = await this.supabase
      .from('email_subscribers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .gte('subscribed_at', lastMonth.toISOString());

    const { data: twoMonthsAgoSubs } = await this.supabase
      .from('email_subscribers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .gte('subscribed_at', twoMonthsAgo.toISOString())
      .lt('subscribed_at', lastMonth.toISOString());

    const { data: unsubscribed } = await this.supabase
      .from('email_subscribers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'unsubscribed')
      .gte('unsubscribed_at', lastMonth.toISOString());

    const newSubscribers = lastMonthSubs?.length || 0;
    const previousSubscribers = twoMonthsAgoSubs?.length || 0;
    const lostSubscribers = unsubscribed?.length || 0;

    const growthRate = previousSubscribers > 0 ? 
      ((newSubscribers - lostSubscribers) / previousSubscribers) * 100 : 0;

    const churnRate = (previousSubscribers + newSubscribers) > 0 ? 
      (lostSubscribers / (previousSubscribers + newSubscribers)) * 100 : 0;

    return { growthRate, churnRate };
  }

  private calculateEngagementScore(data: {
    totalSubscribers: number;
    totalEmailsDelivered: number;
    totalEmailsOpened: number;
    totalEmailsClicked: number;
  }): number {
    if (data.totalSubscribers === 0 || data.totalEmailsDelivered === 0) return 0;

    const openRate = (data.totalEmailsOpened / data.totalEmailsDelivered) * 100;
    const clickRate = (data.totalEmailsClicked / data.totalEmailsDelivered) * 100;
    const deliveryRate = (data.totalEmailsDelivered / data.totalSubscribers) * 100;

    // Weighted engagement score
    return (openRate * 0.4) + (clickRate * 0.4) + (deliveryRate * 0.2);
  }

  private getEmptyCampaignAnalytics(campaignId: string): CampaignAnalytics {
    return {
      campaignId,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      unsubscribed: 0,
      openRate: 0,
      clickRate: 0,
      clickToOpenRate: 0,
      bounceRate: 0,
      complaintRate: 0,
      unsubscribeRate: 0,
      uniqueOpens: 0,
      uniqueClicks: 0,
    };
  }

  private getEmptyAutomationAnalytics(automationId: string): AutomationAnalytics {
    return {
      automationId,
      totalExecutions: 0,
      activeExecutions: 0,
      completedExecutions: 0,
      failedExecutions: 0,
      completionRate: 0,
      averageCompletionTime: 0,
      stepAnalytics: [],
    };
  }

  private getEmptyOverallAnalytics(): OverallAnalytics {
    return {
      totalSubscribers: 0,
      activeSubscribers: 0,
      unsubscribedSubscribers: 0,
      bouncedSubscribers: 0,
      totalCampaigns: 0,
      totalEmailsSent: 0,
      totalEmailsDelivered: 0,
      totalEmailsOpened: 0,
      totalEmailsClicked: 0,
      overallOpenRate: 0,
      overallClickRate: 0,
      growthRate: 0,
      churnRate: 0,
      engagementScore: 0,
    };
  }
}
