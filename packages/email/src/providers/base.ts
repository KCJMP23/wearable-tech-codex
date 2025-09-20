import { EmailConfig, EmailMessage, EmailProviderResponse, WebhookEvent } from '../types';

export abstract class BaseEmailProvider {
  protected config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  abstract send(message: EmailMessage): Promise<EmailProviderResponse>;
  abstract verifyWebhook(payload: any, signature: string): boolean;
  abstract parseWebhook(payload: any): WebhookEvent[];
  abstract validateConfig(): boolean;

  protected addTrackingPixel(html: string, trackingId: string): string {
    if (!this.config.trackOpens) return html;
    
    const trackingPixel = `<img src="${this.getTrackingPixelUrl(trackingId)}" width="1" height="1" style="display:none;" alt="" />`;
    
    // Try to insert before closing body tag, fallback to end of HTML
    if (html.includes('</body>')) {
      return html.replace('</body>', `${trackingPixel}</body>`);
    }
    return html + trackingPixel;
  }

  protected addClickTracking(html: string, campaignId: string, subscriberId: string): string {
    if (!this.config.trackClicks) return html;
    
    // Replace all href attributes with tracked URLs
    return html.replace(/href="([^"]+)"/g, (match, url) => {
      if (url.startsWith('#') || url.startsWith('mailto:') || url.includes('unsubscribe')) {
        return match;
      }
      const trackedUrl = this.getClickTrackingUrl(url, campaignId, subscriberId);
      return `href="${trackedUrl}"`;
    });
  }

  protected getTrackingPixelUrl(trackingId: string): string {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/open/${trackingId}`;
  }

  protected getClickTrackingUrl(originalUrl: string, campaignId: string, subscriberId: string): string {
    const trackingUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/click`);
    trackingUrl.searchParams.set('url', originalUrl);
    trackingUrl.searchParams.set('c', campaignId);
    trackingUrl.searchParams.set('s', subscriberId);
    return trackingUrl.toString();
  }

  protected addUnsubscribeLink(html: string, subscriberId: string): string {
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token=${subscriberId}`;
    
    // Add unsubscribe link to footer if not present
    if (!html.includes('unsubscribe') && !html.includes('Unsubscribe')) {
      const footer = `
        <div style="text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding: 20px;">
          <p>You received this email because you are subscribed to our mailing list.</p>
          <p><a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> | <a href="${this.config.replyTo || this.config.fromEmail}" style="color: #666;">Contact Us</a></p>
        </div>
      `;
      
      if (html.includes('</body>')) {
        return html.replace('</body>', `${footer}</body>`);
      }
      return html + footer;
    }
    
    return html;
  }

  protected addComplianceHeaders(headers: Record<string, string> = {}): Record<string, string> {
    return {
      ...headers,
      'List-Unsubscribe': this.config.unsubscribeUrl || `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-Email-Type-Id': 'marketing',
    };
  }
}