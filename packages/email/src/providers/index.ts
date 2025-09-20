import { BaseEmailProvider } from './base';
import { SendGridProvider } from './sendgrid';
import { MailgunProvider } from './mailgun';
import { SESProvider } from './ses';
import { EmailConfig, EmailProvider } from '../types';

export { BaseEmailProvider, SendGridProvider, MailgunProvider, SESProvider };

export class EmailProviderFactory {
  static create(config: EmailConfig): BaseEmailProvider {
    switch (config.provider) {
      case 'sendgrid':
        return new SendGridProvider(config);
      case 'mailgun':
        return new MailgunProvider(config);
      case 'ses':
        return new SESProvider(config);
      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  static getSupportedProviders(): EmailProvider[] {
    return ['sendgrid', 'mailgun', 'ses'];
  }

  static validateProvider(provider: string): provider is EmailProvider {
    return this.getSupportedProviders().includes(provider as EmailProvider);
  }
}