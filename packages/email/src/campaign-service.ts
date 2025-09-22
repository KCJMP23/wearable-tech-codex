import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Campaign, CampaignType, Subscriber, EmailAnalytics } from './types';
import { EmailService } from './email-service';
import { SegmentService } from './segmentation/segment-service';
import { v4 as uuidv4 } from 'uuid';

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  revenue?: number;
  conversions?: number;
  conversionRate?: number;
}

export interface ABTestResult {
  variant: string;
  sent: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  isWinner: boolean;
  confidence: number;
}

type Client = SupabaseClient<any, 'public', any>;

interface CampaignServiceOptions {
  supabase?: Client;
  segmentService?: SegmentService;
}

export class CampaignService {
  private supabase: Client;
  private emailService: EmailService;
  private segmentService: SegmentService;

  constructor(emailService: EmailService, options: CampaignServiceOptions = {}) {
    this.supabase =
      options.supabase ??
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    this.emailService = emailService;
    this.segmentService = options.segmentService ?? new SegmentService(this.supabase);
  }

  async createCampaign(params: {
    tenantId: string;
    name: string;
    type: CampaignType;
    subject: string;
    preheader?: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    htmlContent: string;
    textContent?: string;
    listIds: string[];
    segmentIds?: string[];
    tags?: string[];
    scheduledAt?: Date;
    abTestConfig?: {
      enabled: boolean;
      testPercentage: number;
      variants: Array<{
        name: string;
        subject: string;
        htmlContent: string;
        percentage: number;
      }>;
    };
  }): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
    try {
      const campaignId = uuidv4();
      
      // Validate A/B test configuration
      if (params.abTestConfig?.enabled) {
        const totalPercentage = params.abTestConfig.variants.reduce(
          (sum, variant) => sum + variant.percentage, 
          0
        );
        if (totalPercentage !== 100) {
          return { success: false, error: 'A/B test variant percentages must total 100%' };
        }
      }

      // Estimate recipient count
      const recipientCount = await this.estimateRecipientCount(
        params.tenantId,
        params.listIds,
        params.segmentIds
      );

      const campaign: Campaign = {
        id: campaignId,
        tenantId: params.tenantId,
        name: params.name,
        type: params.type,
        subject: params.subject,
        preheader: params.preheader,
        fromName: params.fromName,
        fromEmail: params.fromEmail,
        replyTo: params.replyTo,
        htmlContent: params.htmlContent,
        textContent: params.textContent,
        status: params.scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: params.scheduledAt,
        listIds: params.listIds,
        segmentIds: params.segmentIds,
        abTestConfig: params.abTestConfig,
        tags: params.tags,
      };

      const { error } = await this.supabase
        .from('email_campaigns')
        .insert({
          id: campaign.id,
          tenant_id: campaign.tenantId,
          name: campaign.name,
          type: campaign.type,
          subject: campaign.subject,
          preheader: campaign.preheader,
          from_name: campaign.fromName,
          from_email: campaign.fromEmail,
          reply_to: campaign.replyTo,
          html_content: campaign.htmlContent,
          text_content: campaign.textContent,
          status: campaign.status,
          scheduled_at: campaign.scheduledAt?.toISOString(),
          list_ids: campaign.listIds,
          segment_ids: campaign.segmentIds,
          ab_test_config: campaign.abTestConfig,
          tags: campaign.tags,
          estimated_recipients: recipientCount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, campaign };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create campaign',
      };
    }
  }

  async updateCampaign(
    campaignId: string,
    updates: Partial<Campaign>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('email_campaigns')
        .update({
          name: updates.name,
          subject: updates.subject,
          preheader: updates.preheader,
          html_content: updates.htmlContent,
          text_content: updates.textContent,
          scheduled_at: updates.scheduledAt?.toISOString(),
          list_ids: updates.listIds,
          segment_ids: updates.segmentIds,
          ab_test_config: updates.abTestConfig,
          tags: updates.tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update campaign',
      };
    }
  }

  async duplicateCampaign(
    campaignId: string,
    newName?: string
  ): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
    try {
      const { data: originalCampaign, error: fetchError } = await this.supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (fetchError || !originalCampaign) {
        return { success: false, error: 'Campaign not found' };
      }

      const newCampaignId = uuidv4();
      const duplicatedCampaign = {
        ...originalCampaign,
        id: newCampaignId,
        name: newName || `${originalCampaign.name} (Copy)`,
        status: 'draft',
        scheduled_at: null,
        sent_at: null,
        stats: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('email_campaigns')
        .insert(duplicatedCampaign);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, campaign: duplicatedCampaign as Campaign };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to duplicate campaign',
      };
    }
  }

  async sendCampaign(campaignId: string): Promise<{
    success: boolean;
    sent?: number;
    failed?: number;
    abTestResults?: ABTestResult[];
    error?: string;
  }> {
    try {
      const { data: campaign, error: campaignError } = await this.supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        return { success: false, error: 'Campaign has already been sent' };
      }

      // Update campaign status
      await this.supabase
        .from('email_campaigns')
        .update({
          status: 'sending',
          sent_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      // Get recipients
      const recipients = await this.getCampaignRecipients(
        campaign.tenant_id,
        campaign.list_ids,
        campaign.segment_ids
      );

      if (recipients.length === 0) {
        await this.supabase
          .from('email_campaigns')
          .update({ status: 'failed' })
          .eq('id', campaignId);
        return { success: false, error: 'No recipients found for campaign' };
      }

      let results;
      
      // Handle A/B testing
      if (campaign.ab_test_config?.enabled) {
        results = await this.sendABTestCampaign(campaign, recipients);
      } else {
        results = await this.sendRegularCampaign(campaign, recipients);
      }

      // Update final campaign status and stats
      await this.supabase
        .from('email_campaigns')
        .update({
          status: 'sent',
          stats: {
            sent: results.sent,
            failed: results.failed,
            total: recipients.length,
          },
        })
        .eq('id', campaignId);

      return {
        success: true,
        sent: results.sent,
        failed: results.failed,
        abTestResults: results.abTestResults,
      };
    } catch (error) {
      // Update campaign status to failed
      await this.supabase
        .from('email_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send campaign',
      };
    }
  }

  async pauseCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('email_campaigns')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause campaign',
      };
    }
  }

  async getCampaignStats(campaignId: string): Promise<CampaignStats | null> {
    try {
      const analytics = await this.emailService.getEmailAnalytics(campaignId);
      
      // Get conversion data
      const { data: conversions } = await this.supabase
        .from('email_conversions')
        .select('*')
        .eq('campaign_id', campaignId);

      const revenue = conversions?.reduce((sum, conv) => sum + (conv.value || 0), 0) || 0;
      const conversionCount = conversions?.length || 0;

      return {
        ...analytics,
        unsubscribeRate: analytics.sent > 0 ? (analytics.unsubscribed / analytics.sent) * 100 : 0,
        revenue,
        conversions: conversionCount,
        conversionRate: analytics.sent > 0 ? (conversionCount / analytics.sent) * 100 : 0,
      };
    } catch (error) {
      console.error('Failed to get campaign stats:', error);
      return null;
    }
  }

  async getABTestResults(campaignId: string): Promise<ABTestResult[]> {
    try {
      const { data: campaign } = await this.supabase
        .from('email_campaigns')
        .select('ab_test_config')
        .eq('id', campaignId)
        .single();

      if (!campaign?.ab_test_config?.enabled) {
        return [];
      }

      const results: ABTestResult[] = [];
      
      for (const variant of campaign.ab_test_config.variants) {
        const { data: analytics } = await this.supabase
          .from('email_analytics')
          .select('event')
          .eq('campaign_id', campaignId)
          .eq('variant_name', variant.name);

        const events = analytics || [];
        const sent = events.filter(e => e.event === 'sent').length;
        const opened = events.filter(e => e.event === 'opened').length;
        const clicked = events.filter(e => e.event === 'clicked').length;

        const { data: conversions } = await this.supabase
          .from('email_conversions')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('variant_name', variant.name);

        const conversionCount = conversions?.length || 0;

        results.push({
          variant: variant.name,
          sent,
          openRate: sent > 0 ? (opened / sent) * 100 : 0,
          clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
          conversionRate: sent > 0 ? (conversionCount / sent) * 100 : 0,
          isWinner: false, // Will be calculated after all variants
          confidence: 0,
        });
      }

      // Determine winner (highest conversion rate)
      if (results.length > 1) {
        const bestResult = results.reduce((best, current) => 
          current.conversionRate > best.conversionRate ? current : best
        );
        bestResult.isWinner = true;
        bestResult.confidence = this.calculateStatisticalSignificance(results);
      }

      return results;
    } catch (error) {
      console.error('Failed to get A/B test results:', error);
      return [];
    }
  }

  private async estimateRecipientCount(
    tenantId: string,
    listIds: string[],
    segmentIds?: string[]
  ): Promise<number> {
    try {
      let query = this.supabase
        .from('email_subscribers')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (listIds.length > 0) {
        const { data: listSubscribers } = await this.supabase
          .from('email_list_subscribers')
          .select('subscriber_id')
          .in('list_id', listIds);

        const subscriberIds = listSubscribers?.map(ls => ls.subscriber_id) || [];
        if (subscriberIds.length > 0) {
          query = query.in('id', subscriberIds);
        } else {
          return 0;
        }
      }

      if (segmentIds && segmentIds.length > 0) {
        // Apply segment filters (this would involve complex logic)
        // For now, we'll just return the basic count
      }

      const { count } = await query;
      return count || 0;
    } catch (error) {
      console.error('Failed to estimate recipient count:', error);
      return 0;
    }
  }

  private async getCampaignRecipients(
    tenantId: string,
    listIds: string[],
    segmentIds?: string[]
  ): Promise<Subscriber[]> {
    try {
      let query = this.supabase
        .from('email_subscribers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (listIds.length > 0) {
        const { data: listSubscribers } = await this.supabase
          .from('email_list_subscribers')
          .select('subscriber_id')
          .in('list_id', listIds);

        const subscriberIds = listSubscribers?.map(ls => ls.subscriber_id) || [];
        if (subscriberIds.length > 0) {
          query = query.in('id', subscriberIds);
        } else {
          return [];
        }
      }

      if (segmentIds && segmentIds.length > 0) {
        // Apply segment filters using SegmentService
        for (const segmentId of segmentIds) {
          const segmentRecipients = await this.segmentService.getSegmentSubscribers(segmentId);
          const segmentSubscriberIds = segmentRecipients.subscribers.map(r => r.id);
          if (segmentSubscriberIds.length > 0) {
            query = query.in('id', segmentSubscriberIds);
          }
        }
      }

      const { data: recipients } = await query;
      return recipients || [];
    } catch (error) {
      console.error('Failed to get campaign recipients:', error);
      return [];
    }
  }

  private async sendRegularCampaign(
    campaign: any,
    recipients: Subscriber[]
  ): Promise<{ sent: number; failed: number; abTestResults?: ABTestResult[] }> {
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const personalizedHtml = this.personalizeContent(campaign.html_content, recipient);
        const personalizedSubject = this.personalizeContent(campaign.subject, recipient);

        const result = await this.emailService.sendEmail({
          to: recipient.email,
          subject: personalizedSubject,
          html: personalizedHtml,
          text: campaign.text_content,
          metadata: {
            campaignId: campaign.id,
            subscriberId: recipient.id,
            tenantId: campaign.tenant_id,
          },
        });

        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    return { sent, failed };
  }

  private async sendABTestCampaign(
    campaign: any,
    recipients: Subscriber[]
  ): Promise<{ sent: number; failed: number; abTestResults?: ABTestResult[] }> {
    const testPercentage = campaign.ab_test_config.testPercentage;
    const testCount = Math.floor((recipients.length * testPercentage) / 100);
    const testRecipients = recipients.slice(0, testCount);
    const remainingRecipients = recipients.slice(testCount);

    let sent = 0;
    let failed = 0;

    // Send A/B test variants
    for (const variant of campaign.ab_test_config.variants) {
      const variantCount = Math.floor((testRecipients.length * variant.percentage) / 100);
      const variantRecipients = testRecipients.splice(0, variantCount);

      for (const recipient of variantRecipients) {
        try {
          const personalizedHtml = this.personalizeContent(variant.htmlContent, recipient);
          const personalizedSubject = this.personalizeContent(variant.subject, recipient);

          const result = await this.emailService.sendEmail({
            to: recipient.email,
            subject: personalizedSubject,
            html: personalizedHtml,
            text: campaign.text_content,
            metadata: {
              campaignId: campaign.id,
              subscriberId: recipient.id,
              tenantId: campaign.tenant_id,
              variantName: variant.name,
            },
          });

          if (result.success) {
            sent++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }
    }

    // Wait for test results and send winner to remaining recipients
    // In a real implementation, this would be scheduled as a separate job
    setTimeout(async () => {
      const testResults = await this.getABTestResults(campaign.id);
      const winner = testResults.find(r => r.isWinner);
      
      if (winner && remainingRecipients.length > 0) {
        const winnerVariant = campaign.ab_test_config.variants.find(
          (v: any) => v.name === winner.variant
        );
        
        if (winnerVariant) {
          // Send winner variant to remaining recipients
          // This would be implemented as a separate campaign send
        }
      }
    }, 24 * 60 * 60 * 1000); // Wait 24 hours for test results

    return { sent, failed };
  }

  private personalizeContent(content: string, subscriber: Subscriber): string {
    return content
      .replace(/\{\{firstName\}\}/g, subscriber.firstName || '')
      .replace(/\{\{lastName\}\}/g, subscriber.lastName || '')
      .replace(/\{\{email\}\}/g, subscriber.email || '')
      .replace(/\{\{name\}\}/g, subscriber.firstName || subscriber.email || 'there');
  }

  private calculateStatisticalSignificance(results: ABTestResult[]): number {
    // Simplified statistical significance calculation
    // In a real implementation, use proper statistical tests
    if (results.length < 2) return 0;
    
    const [best, second] = results.sort((a, b) => b.conversionRate - a.conversionRate);
    const diff = best.conversionRate - second.conversionRate;
    const avgRate = (best.conversionRate + second.conversionRate) / 2;
    
    // Simple confidence calculation based on difference
    return Math.min(95, (diff / avgRate) * 100);
  }
}
