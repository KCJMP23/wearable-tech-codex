import Mailgun from 'mailgun-js';
import { BaseEmailProvider } from './base';
import { EmailMessage, EmailProviderResponse, WebhookEvent } from '../types';
import crypto from 'crypto';

export class MailgunProvider extends BaseEmailProvider {
  private mailgun: Mailgun.Mailgun;

  constructor(config: any) {
    super(config);
    if (!config.apiKey || !config.domain) {
      throw new Error('Mailgun API key and domain are required');
    }
    
    this.mailgun = Mailgun({
      apiKey: config.apiKey,
      domain: config.domain,
      host: config.region === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net',
    });
  }

  async send(message: EmailMessage): Promise<EmailProviderResponse> {
    try {
      const recipients = Array.isArray(message.to) ? message.to.join(',') : message.to;
      
      const attachments = message.attachments?.map(att => new this.mailgun.Attachment({
        data: Buffer.from(att.content, 'base64'),
        filename: att.filename,
        contentType: att.contentType,
      }));

      const data = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: recipients,
        cc: message.cc?.join(','),
        bcc: message.bcc?.join(','),
        'h:Reply-To': this.config.replyTo,
        subject: message.subject,
        html: this.addTrackingPixel(
          this.addUnsubscribeLink(message.html, 'SUBSCRIBER_ID'),
          'TRACKING_ID'
        ),
        text: message.text,
        attachment: attachments,
        'o:tag': message.tags,
        'o:tracking': this.config.trackOpens,
        'o:tracking-clicks': (this.config.trackClicks ? 'yes' : 'no') as 'yes' | 'no',
        'o:tracking-opens': (this.config.trackOpens ? 'yes' : 'no') as 'yes' | 'no',
        ...this.addMailgunHeaders(message.headers),
        ...this.addMailgunVariables(message.metadata),
      };

      const response = await this.mailgun.messages().send(data);
      
      return {
        success: true,
        messageId: response.id,
        metadata: {
          message: response.message,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email',
        metadata: {
          statusCode: error.statusCode,
          details: error.details,
        },
      };
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    try {
      const webhookSigningKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
      if (!webhookSigningKey) return false;

      const hmac = crypto.createHmac('sha256', webhookSigningKey);
      hmac.update(payload);
      const computedSignature = hmac.digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch {
      return false;
    }
  }

  parseWebhook(payload: any): WebhookEvent[] {
    const eventData = payload['event-data'];
    if (!eventData) return [];

    return [{
      provider: 'mailgun' as const,
      event: this.mapMailgunEvent(eventData.event),
      timestamp: new Date(eventData.timestamp * 1000),
      messageId: eventData.message?.headers?.['message-id'],
      email: eventData.recipient,
      metadata: {
        tags: eventData.tags,
        userAgent: eventData['user-variables']?.['user-agent'],
        ip: eventData['client-info']?.['client-ip'],
        url: eventData.url,
        reason: eventData.reason,
        severity: eventData.severity,
        deliveryStatus: eventData['delivery-status'],
      },
    }];
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.domain && this.config.fromEmail);
  }

  private addMailgunHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const mailgunHeaders: Record<string, string> = {};
    
    Object.entries(this.addComplianceHeaders(headers)).forEach(([key, value]) => {
      mailgunHeaders[`h:${key}`] = value;
    });
    
    return mailgunHeaders;
  }

  private addMailgunVariables(metadata: Record<string, any> = {}): Record<string, string> {
    const variables: Record<string, string> = {};
    
    Object.entries(metadata).forEach(([key, value]) => {
      variables[`v:${key}`] = typeof value === 'string' ? value : JSON.stringify(value);
    });
    
    return variables;
  }

  private mapMailgunEvent(event: string): string {
    const eventMap: Record<string, string> = {
      'accepted': 'sent',
      'delivered': 'delivered',
      'opened': 'opened',
      'clicked': 'clicked',
      'bounced': 'bounced',
      'failed': 'failed',
      'complained': 'complained',
      'unsubscribed': 'unsubscribed',
    };
    
    return eventMap[event] || event;
  }
}
