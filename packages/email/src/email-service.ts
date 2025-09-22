import { render } from '@react-email/render';
import { createElement } from 'react';
import { BaseEmailProvider, EmailProviderFactory } from './providers';
import { EmailConfig, EmailMessage, SendEmailResponse, Campaign, Subscriber } from './types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class EmailService {
  private provider: BaseEmailProvider;
  private supabase: SupabaseClient<any, 'public', any>;

  constructor(config: EmailConfig, supabaseClient?: SupabaseClient<any, 'public', any>) {
    this.provider = EmailProviderFactory.create(config);
    this.supabase =
      supabaseClient ??
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
  }

  async sendEmail(message: EmailMessage): Promise<SendEmailResponse> {
    try {
      // Validate message
      if (!message.to || !message.subject || !message.html) {
        throw new Error('Missing required email fields: to, subject, html');
      }

      // Send email via provider
      const result = await this.provider.send(message);

      // Log email send attempt
      if (message.metadata?.campaignId && message.metadata?.subscriberId) {
        await this.logEmailEvent({
          campaignId: message.metadata.campaignId,
          subscriberId: message.metadata.subscriberId,
          event: result.success ? 'sent' : 'failed',
          timestamp: new Date(),
          metadata: {
            messageId: result.messageId,
            error: result.error,
          },
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async sendTemplate(
    templateComponent: React.ComponentType<any>,
    templateProps: any,
    recipients: string | string[],
    subject: string,
    options: {
      campaignId?: string;
      subscriberId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<SendEmailResponse> {
    try {
      // Render React template to HTML
      const element = createElement(templateComponent, templateProps);
      const html = render(element);
      const text = render(element, { plainText: true });

      const message: EmailMessage = {
        to: recipients,
        subject,
        html,
        text,
        metadata: options.metadata,
      };

      return this.sendEmail(message);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to render template',
      };
    }
  }

  async sendCampaign(campaignId: string): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
    try {
      // Get campaign details
      const { data: campaign, error: campaignError } = await this.supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campaign not found');
      }

      // Get campaign recipients
      const recipients = await this.getCampaignRecipients(campaignId);
      
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      // Send to each recipient
      for (const recipient of recipients) {
        try {
          const personalizedHtml = this.personalizeContent(campaign.html_content, recipient);
          const personalizedSubject = this.personalizeContent(campaign.subject, recipient);

          const result = await this.sendEmail({
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
            errors.push(`${recipient.email}: ${result.error}`);
          }
        } catch (error) {
          failed++;
          errors.push(`${recipient.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update campaign status
      await this.supabase
        .from('email_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          stats: {
            sent,
            failed,
            total: recipients.length,
          },
        })
        .eq('id', campaignId);

      return { success: true, sent, failed, errors };
    } catch (error) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async processWebhook(provider: string, payload: any, signature: string): Promise<boolean> {
    try {
      // Verify webhook signature
      if (!this.provider.verifyWebhook(payload, signature)) {
        return false;
      }

      // Parse webhook events
      const events = this.provider.parseWebhook(payload);

      // Process each event
      for (const event of events) {
        await this.handleWebhookEvent(event);
      }

      return true;
    } catch (error) {
      console.error('Failed to process webhook:', error);
      return false;
    }
  }

  private async getCampaignRecipients(campaignId: string): Promise<any[]> {
    const { data: campaign } = await this.supabase
      .from('email_campaigns')
      .select('list_ids, segment_ids')
      .eq('id', campaignId)
      .single();

    if (!campaign) return [];

    let query = this.supabase
      .from('email_subscribers')
      .select('*')
      .eq('status', 'active');

    // Filter by lists
    if (campaign.list_ids && campaign.list_ids.length > 0) {
      const { data: listSubscribers } = await this.supabase
        .from('email_list_subscribers')
        .select('subscriber_id')
        .in('list_id', campaign.list_ids);

      const subscriberIds = listSubscribers?.map(ls => ls.subscriber_id) || [];
      query = query.in('id', subscriberIds);
    }

    // Apply segments
    if (campaign.segment_ids && campaign.segment_ids.length > 0) {
      // This would involve more complex segment logic
      // For now, we'll just get all subscribers
    }

    const { data: recipients } = await query;
    return recipients || [];
  }

  private personalizeContent(content: string, subscriber: any): string {
    return content
      .replace(/\{\{firstName\}\}/g, subscriber.first_name || '')
      .replace(/\{\{lastName\}\}/g, subscriber.last_name || '')
      .replace(/\{\{email\}\}/g, subscriber.email || '')
      .replace(/\{\{name\}\}/g, subscriber.first_name || subscriber.email || 'there');
  }

  private async handleWebhookEvent(event: any): Promise<void> {
    // Update subscriber status based on event
    if (event.event === 'bounced' || event.event === 'complained') {
      const { data: subscriber } = await this.supabase
        .from('email_subscribers')
        .select('bounce_count, complaint_count')
        .eq('email', event.email)
        .maybeSingle();

      const bounceCount = subscriber?.bounce_count ?? 0;
      const complaintCount = subscriber?.complaint_count ?? 0;

      await this.supabase
        .from('email_subscribers')
        .update({
          status: event.event === 'bounced' ? 'bounced' : 'complained',
          bounce_count: event.event === 'bounced' ? bounceCount + 1 : bounceCount,
          complaint_count: event.event === 'complained' ? complaintCount + 1 : complaintCount,
        })
        .eq('email', event.email);
    }

    if (event.event === 'unsubscribed') {
      await this.supabase
        .from('email_subscribers')
        .update({
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('email', event.email);
    }

    // Log analytics event
    await this.logEmailEvent({
      campaignId: event.metadata?.campaignId,
      subscriberId: event.metadata?.subscriberId,
      event: event.event,
      timestamp: event.timestamp,
      metadata: event.metadata,
      userAgent: event.metadata?.userAgent,
      ipAddress: event.metadata?.ip,
      location: event.metadata?.location,
    });
  }

  private async logEmailEvent(eventData: {
    campaignId?: string;
    subscriberId?: string;
    event: string;
    timestamp: Date;
    metadata?: any;
    userAgent?: string;
    ipAddress?: string;
    location?: any;
  }): Promise<void> {
    try {
      await this.supabase
        .from('email_analytics')
        .insert({
          campaign_id: eventData.campaignId,
          subscriber_id: eventData.subscriberId,
          event: eventData.event,
          timestamp: eventData.timestamp.toISOString(),
          metadata: eventData.metadata,
          user_agent: eventData.userAgent,
          ip_address: eventData.ipAddress,
          location: eventData.location,
        });
    } catch (error) {
      console.error('Failed to log email event:', error);
    }
  }

  async getEmailAnalytics(campaignId: string): Promise<{
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
  }> {
    const { data: analytics } = await this.supabase
      .from('email_analytics')
      .select('event')
      .eq('campaign_id', campaignId);

    if (!analytics) {
      return {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
      };
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

    return {
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      complained,
      unsubscribed,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
    };
  }
}
