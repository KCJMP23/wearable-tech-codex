import AWS from 'aws-sdk';
import { BaseEmailProvider } from './base';
import { EmailMessage, EmailProviderResponse, WebhookEvent } from '../types';

export class SESProvider extends BaseEmailProvider {
  private ses: AWS.SES;

  constructor(config: any) {
    super(config);
    
    this.ses = new AWS.SES({
      region: config.region || 'us-east-1',
      accessKeyId: config.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  async send(message: EmailMessage): Promise<EmailProviderResponse> {
    try {
      const recipients = Array.isArray(message.to) ? message.to : [message.to];
      
      const params: AWS.SES.SendEmailRequest = {
        Source: `${this.config.fromName} <${this.config.fromEmail}>`,
        Destination: {
          ToAddresses: recipients,
          CcAddresses: message.cc,
          BccAddresses: message.bcc,
        },
        Message: {
          Subject: {
            Data: message.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: this.addTrackingPixel(
                this.addUnsubscribeLink(message.html, 'SUBSCRIBER_ID'),
                'TRACKING_ID'
              ),
              Charset: 'UTF-8',
            },
            Text: message.text ? {
              Data: message.text,
              Charset: 'UTF-8',
            } : undefined,
          },
        },
        ReplyToAddresses: this.config.replyTo ? [this.config.replyTo] : undefined,
        Tags: message.tags?.map(tag => ({
          Name: 'category',
          Value: tag,
        })),
        ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET,
      };

      // For attachments, we need to use sendRawEmail
      if (message.attachments && message.attachments.length > 0) {
        return this.sendRawEmail(message);
      }

      const response = await this.ses.sendEmail(params).promise();
      
      return {
        success: true,
        messageId: response.MessageId,
        metadata: {
          messageId: response.MessageId,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email',
        metadata: {
          code: error.code,
          statusCode: error.statusCode,
        },
      };
    }
  }

  private async sendRawEmail(message: EmailMessage): Promise<EmailProviderResponse> {
    try {
      const rawEmail = this.buildRawEmail(message);
      
      const params: AWS.SES.SendRawEmailRequest = {
        Source: this.config.fromEmail,
        Destinations: [
          ...(Array.isArray(message.to) ? message.to : [message.to]),
          ...(message.cc || []),
          ...(message.bcc || []),
        ],
        RawMessage: {
          Data: rawEmail,
        },
        Tags: message.tags?.map(tag => ({
          Name: 'category',
          Value: tag,
        })),
        ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET,
      };

      const response = await this.ses.sendRawEmail(params).promise();
      
      return {
        success: true,
        messageId: response.MessageId,
        metadata: {
          messageId: response.MessageId,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email',
        metadata: {
          code: error.code,
          statusCode: error.statusCode,
        },
      };
    }
  }

  private buildRawEmail(message: EmailMessage): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random()}`;
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    
    let rawEmail = '';
    
    // Headers
    rawEmail += `From: ${this.config.fromName} <${this.config.fromEmail}>\r\n`;
    rawEmail += `To: ${recipients.join(', ')}\r\n`;
    if (message.cc) rawEmail += `Cc: ${message.cc.join(', ')}\r\n`;
    if (this.config.replyTo) rawEmail += `Reply-To: ${this.config.replyTo}\r\n`;
    rawEmail += `Subject: ${message.subject}\r\n`;
    rawEmail += `MIME-Version: 1.0\r\n`;
    rawEmail += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

    // Body
    rawEmail += `--${boundary}\r\n`;
    rawEmail += `Content-Type: multipart/alternative; boundary="${boundary}_alt"\r\n\r\n`;

    // Text version
    if (message.text) {
      rawEmail += `--${boundary}_alt\r\n`;
      rawEmail += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      rawEmail += `${message.text}\r\n\r\n`;
    }

    // HTML version
    rawEmail += `--${boundary}_alt\r\n`;
    rawEmail += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
    rawEmail += this.addTrackingPixel(
      this.addUnsubscribeLink(message.html, 'SUBSCRIBER_ID'),
      'TRACKING_ID'
    );
    rawEmail += `\r\n\r\n--${boundary}_alt--\r\n\r\n`;

    // Attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        rawEmail += `--${boundary}\r\n`;
        rawEmail += `Content-Type: ${attachment.contentType}\r\n`;
        rawEmail += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
        rawEmail += `Content-Transfer-Encoding: base64\r\n\r\n`;
        rawEmail += `${attachment.content}\r\n\r\n`;
      }
    }

    rawEmail += `--${boundary}--\r\n`;
    
    return rawEmail;
  }

  verifyWebhook(payload: string, signature: string): boolean {
    // SES uses SNS for webhooks, verification is handled differently
    try {
      const parsedPayload = JSON.parse(payload);
      // Basic validation - in production, you'd verify SNS signature
      return !!(parsedPayload.Type && parsedPayload.Message);
    } catch {
      return false;
    }
  }

  parseWebhook(payload: any): WebhookEvent[] {
    try {
      const message = typeof payload.Message === 'string' 
        ? JSON.parse(payload.Message) 
        : payload.Message;

      if (message.eventType) {
        return [{
          provider: 'ses' as const,
          event: this.mapSESEvent(message.eventType),
          timestamp: new Date(message.mail?.timestamp || Date.now()),
          messageId: message.mail?.messageId,
          email: message.mail?.destination?.[0] || message.delivery?.recipients?.[0],
          metadata: {
            notificationType: message.notificationType,
            bounce: message.bounce,
            complaint: message.complaint,
            delivery: message.delivery,
          },
        }];
      }

      return [];
    } catch {
      return [];
    }
  }

  validateConfig(): boolean {
    return !!(this.config.fromEmail && (this.config.accessKeyId || process.env.AWS_ACCESS_KEY_ID));
  }

  private mapSESEvent(eventType: string): string {
    const eventMap: Record<string, string> = {
      'send': 'sent',
      'delivery': 'delivered',
      'open': 'opened',
      'click': 'clicked',
      'bounce': 'bounced',
      'complaint': 'complained',
      'reject': 'failed',
    };
    
    return eventMap[eventType] || eventType;
  }
}