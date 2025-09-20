import sgMail from '@sendgrid/mail';
import { BaseEmailProvider } from './base';
import { EmailMessage, EmailProviderResponse, WebhookEvent } from '../types';
import crypto from 'crypto';

export class SendGridProvider extends BaseEmailProvider {
  constructor(config: any) {
    super(config);
    if (!config.apiKey) {
      throw new Error('SendGrid API key is required');
    }
    sgMail.setApiKey(config.apiKey);
  }

  async send(message: EmailMessage): Promise<EmailProviderResponse> {
    try {
      const recipients = Array.isArray(message.to) ? message.to : [message.to];
      
      const msg = {
        to: recipients,
        cc: message.cc,
        bcc: message.bcc,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        replyTo: this.config.replyTo,
        subject: message.subject,
        html: this.addTrackingPixel(
          this.addUnsubscribeLink(message.html, 'SUBSCRIBER_ID'),
          'TRACKING_ID'
        ),
        text: message.text,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType,
          disposition: 'attachment',
        })),
        headers: this.addComplianceHeaders(message.headers),
        categories: message.tags,
        customArgs: message.metadata,
        trackingSettings: {
          clickTracking: {
            enable: this.config.trackClicks,
            enableText: false,
          },
          openTracking: {
            enable: this.config.trackOpens,
          },
          subscriptionTracking: {
            enable: false, // We handle this ourselves
          },
        },
      };

      const response = await sgMail.send(msg);
      
      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        metadata: {
          statusCode: response[0].statusCode,
          headers: response[0].headers,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email',
        metadata: {
          code: error.code,
          response: error.response?.body,
        },
      };
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    try {
      const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
      if (!publicKey) return false;

      const verify = crypto.createVerify('sha256');
      verify.update(payload);
      return verify.verify(publicKey, signature, 'base64');
    } catch {
      return false;
    }
  }

  parseWebhook(payload: any[]): WebhookEvent[] {
    return payload.map(event => ({
      provider: 'sendgrid' as const,
      event: this.mapSendGridEvent(event.event),
      timestamp: new Date(event.timestamp * 1000),
      messageId: event.sg_message_id,
      email: event.email,
      metadata: {
        category: event.category,
        userAgent: event.useragent,
        ip: event.ip,
        url: event.url,
        reason: event.reason,
        status: event.status,
      },
    }));
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.fromEmail);
  }

  private mapSendGridEvent(event: string): string {
    const eventMap: Record<string, string> = {
      'processed': 'sent',
      'delivered': 'delivered',
      'open': 'opened',
      'click': 'clicked',
      'bounce': 'bounced',
      'dropped': 'failed',
      'deferred': 'deferred',
      'spam_report': 'complained',
      'unsubscribe': 'unsubscribed',
      'group_unsubscribe': 'unsubscribed',
      'group_resubscribe': 'resubscribed',
    };
    
    return eventMap[event] || event;
  }
}