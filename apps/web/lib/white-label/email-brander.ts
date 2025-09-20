import { createClient } from '@supabase/supabase-js';
import { BrandConfiguration } from './branding';

export interface EmailTemplate {
  id: string;
  tenantId: string;
  name: string;
  type: EmailTemplateType;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: EmailVariable[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EmailTemplateType = 
  | 'welcome'
  | 'newsletter'
  | 'product_alert'
  | 'cart_abandonment'
  | 'order_confirmation'
  | 'shipping_notification'
  | 'password_reset'
  | 'account_verification'
  | 'deal_notification'
  | 'custom';

export interface EmailVariable {
  name: string;
  description: string;
  defaultValue?: string;
  required: boolean;
  type: 'text' | 'number' | 'boolean' | 'date' | 'url' | 'email';
}

export interface EmailBrandingConfig {
  id: string;
  tenantId: string;
  headerLogo?: string;
  headerColor: string;
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  buttonColor: string;
  buttonTextColor: string;
  footerText?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  unsubscribeText?: string;
  customCSS?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSendRequest {
  templateId: string;
  to: string | string[];
  variables: Record<string, any>;
  scheduledAt?: Date;
  trackingEnabled?: boolean;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  scheduledId?: string;
}

export class EmailBrander {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Get tenant's email branding configuration
   */
  async getEmailBranding(tenantId: string): Promise<EmailBrandingConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('email_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return this.getDefaultEmailBranding(tenantId);
      }

      return this.transformEmailBrandingData(data);
    } catch (error) {
      console.error('Error fetching email branding:', error);
      return this.getDefaultEmailBranding(tenantId);
    }
  }

  /**
   * Update tenant's email branding
   */
  async updateEmailBranding(
    tenantId: string,
    config: Partial<EmailBrandingConfig>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('email_branding')
        .upsert({
          tenant_id: tenantId,
          header_logo: config.headerLogo,
          header_color: config.headerColor || '#3b82f6',
          background_color: config.backgroundColor || '#ffffff',
          text_color: config.textColor || '#1e293b',
          link_color: config.linkColor || '#3b82f6',
          button_color: config.buttonColor || '#3b82f6',
          button_text_color: config.buttonTextColor || '#ffffff',
          footer_text: config.footerText,
          social_links: config.socialLinks || {},
          unsubscribe_text: config.unsubscribeText,
          custom_css: config.customCSS,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get email template by type
   */
  async getEmailTemplate(tenantId: string, type: EmailTemplateType): Promise<EmailTemplate | null> {
    try {
      const { data, error } = await this.supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', type)
        .eq('is_active', true)
        .single();

      if (error) {
        // Fall back to default template
        return this.getDefaultEmailTemplate(tenantId, type);
      }

      return this.transformEmailTemplateData(data);
    } catch (error) {
      console.error('Error fetching email template:', error);
      return this.getDefaultEmailTemplate(tenantId, type);
    }
  }

  /**
   * Create or update email template
   */
  async updateEmailTemplate(
    tenantId: string,
    template: Partial<EmailTemplate>
  ): Promise<{ success: boolean; error?: string; templateId?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('email_templates')
        .upsert({
          tenant_id: tenantId,
          name: template.name || `${template.type} Template`,
          type: template.type!,
          subject: template.subject!,
          html_content: template.htmlContent!,
          text_content: template.textContent,
          variables: template.variables || [],
          is_default: false,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, templateId: data.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Brand an email template with tenant branding
   */
  async brandEmailTemplate(
    tenantId: string,
    template: EmailTemplate,
    branding?: BrandConfiguration
  ): Promise<{ html: string; text?: string }> {
    try {
      const emailBranding = await this.getEmailBranding(tenantId);
      if (!emailBranding) {
        throw new Error('Email branding not found');
      }

      // Get tenant branding if not provided
      if (!branding) {
        const { brandingManager } = await import('./branding');
        branding = await brandingManager.getTenantBranding(tenantId);
      }

      // Generate branded HTML
      const brandedHTML = this.applyEmailBranding(
        template.htmlContent,
        emailBranding,
        branding
      );

      // Generate plain text version if needed
      const brandedText = template.textContent || this.htmlToText(brandedHTML);

      return {
        html: brandedHTML,
        text: brandedText,
      };
    } catch (error) {
      console.error('Error branding email template:', error);
      return {
        html: template.htmlContent,
        text: template.textContent,
      };
    }
  }

  /**
   * Apply branding to email HTML
   */
  private applyEmailBranding(
    htmlContent: string,
    emailBranding: EmailBrandingConfig,
    tenantBranding?: BrandConfiguration | null
  ): string {
    // Create email wrapper with branding
    const emailWrapper = this.createEmailWrapper(emailBranding, tenantBranding);
    
    // Inject content into wrapper
    let brandedHTML = emailWrapper.replace('{{CONTENT}}', htmlContent);

    // Replace branding variables
    brandedHTML = brandedHTML.replace(/{{HEADER_LOGO}}/g, emailBranding.headerLogo || '');
    brandedHTML = brandedHTML.replace(/{{HEADER_COLOR}}/g, emailBranding.headerColor);
    brandedHTML = brandedHTML.replace(/{{BACKGROUND_COLOR}}/g, emailBranding.backgroundColor);
    brandedHTML = brandedHTML.replace(/{{TEXT_COLOR}}/g, emailBranding.textColor);
    brandedHTML = brandedHTML.replace(/{{LINK_COLOR}}/g, emailBranding.linkColor);
    brandedHTML = brandedHTML.replace(/{{BUTTON_COLOR}}/g, emailBranding.buttonColor);
    brandedHTML = brandedHTML.replace(/{{BUTTON_TEXT_COLOR}}/g, emailBranding.buttonTextColor);
    brandedHTML = brandedHTML.replace(/{{FOOTER_TEXT}}/g, emailBranding.footerText || '');
    brandedHTML = brandedHTML.replace(/{{UNSUBSCRIBE_TEXT}}/g, emailBranding.unsubscribeText || 'Unsubscribe');

    // Add social links
    const socialLinksHTML = this.generateSocialLinksHTML(emailBranding.socialLinks);
    brandedHTML = brandedHTML.replace(/{{SOCIAL_LINKS}}/g, socialLinksHTML);

    // Add custom CSS
    if (emailBranding.customCSS) {
      const styleTag = `<style>${emailBranding.customCSS}</style>`;
      brandedHTML = brandedHTML.replace('</head>', `${styleTag}</head>`);
    }

    return brandedHTML;
  }

  /**
   * Create email wrapper template
   */
  private createEmailWrapper(
    emailBranding: EmailBrandingConfig,
    tenantBranding?: BrandConfiguration | null
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: ${tenantBranding?.typography.fontFamily || 'Arial, sans-serif'};
            background-color: {{BACKGROUND_COLOR}};
            color: {{TEXT_COLOR}};
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .email-header {
            background-color: {{HEADER_COLOR}};
            padding: 20px;
            text-align: center;
        }
        .email-header img {
            max-width: 200px;
            height: auto;
        }
        .email-content {
            padding: 30px;
        }
        .email-footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #6c757d;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: {{BUTTON_COLOR}};
            color: {{BUTTON_TEXT_COLOR}};
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
        }
        .social-links {
            margin: 20px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: {{LINK_COLOR}};
            text-decoration: none;
        }
        a {
            color: {{LINK_COLOR}};
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
            }
            .email-content {
                padding: 20px !important;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            ${emailBranding.headerLogo ? '<img src="{{HEADER_LOGO}}" alt="Logo">' : ''}
        </div>
        <div class="email-content">
            {{CONTENT}}
        </div>
        <div class="email-footer">
            {{SOCIAL_LINKS}}
            <p>{{FOOTER_TEXT}}</p>
            <p><a href="{{UNSUBSCRIBE_URL}}">{{UNSUBSCRIBE_TEXT}}</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate social links HTML
   */
  private generateSocialLinksHTML(socialLinks?: Record<string, string>): string {
    if (!socialLinks) return '';

    const links: string[] = [];
    
    Object.entries(socialLinks).forEach(([platform, url]) => {
      if (url) {
        links.push(`<a href="${url}" target="_blank">${this.capitalizeFirst(platform)}</a>`);
      }
    });

    return links.length > 0 
      ? `<div class="social-links">${links.join(' | ')}</div>`
      : '';
  }

  /**
   * Send branded email
   */
  async sendBrandedEmail(
    tenantId: string,
    request: EmailSendRequest
  ): Promise<EmailSendResult> {
    try {
      // Get template
      const template = await this.getEmailTemplateById(request.templateId);
      if (!template) {
        return { success: false, error: 'Template not found' };
      }

      // Brand the template
      const { html, text } = await this.brandEmailTemplate(tenantId, template);

      // Replace variables in content
      const processedHTML = this.replaceTemplateVariables(html, request.variables);
      const processedText = text ? this.replaceTemplateVariables(text, request.variables) : undefined;
      const processedSubject = this.replaceTemplateVariables(template.subject, request.variables);

      // Send email (integrate with your email provider)
      const sendResult = await this.sendEmail({
        to: request.to,
        subject: processedSubject,
        html: processedHTML,
        text: processedText,
        scheduledAt: request.scheduledAt,
      });

      // Log email send
      if (sendResult.success) {
        await this.logEmailSend(tenantId, {
          template_id: request.templateId,
          recipient: Array.isArray(request.to) ? request.to.join(',') : request.to,
          subject: processedSubject,
          message_id: sendResult.messageId,
          status: 'sent',
        });
      }

      return sendResult;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Replace template variables
   */
  private replaceTemplateVariables(content: string, variables: Record<string, any>): string {
    let processedContent = content;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, String(value));
    });

    return processedContent;
  }

  /**
   * Send email via provider (placeholder)
   */
  private async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    scheduledAt?: Date;
  }): Promise<EmailSendResult> {
    // This would integrate with your email provider (SendGrid, Mailgun, etc.)
    console.log('Sending email:', options);
    
    // Placeholder implementation
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
    };
  }

  /**
   * Log email send for analytics
   */
  private async logEmailSend(tenantId: string, logData: any): Promise<void> {
    try {
      await this.supabase
        .from('email_logs')
        .insert({
          tenant_id: tenantId,
          ...logData,
        });
    } catch (error) {
      console.error('Error logging email send:', error);
    }
  }

  /**
   * Get email template by ID
   */
  private async getEmailTemplateById(templateId: string): Promise<EmailTemplate | null> {
    try {
      const { data, error } = await this.supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        return null;
      }

      return this.transformEmailTemplateData(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  /**
   * Transform database data
   */
  private transformEmailBrandingData(data: any): EmailBrandingConfig {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      headerLogo: data.header_logo,
      headerColor: data.header_color,
      backgroundColor: data.background_color,
      textColor: data.text_color,
      linkColor: data.link_color,
      buttonColor: data.button_color,
      buttonTextColor: data.button_text_color,
      footerText: data.footer_text,
      socialLinks: data.social_links,
      unsubscribeText: data.unsubscribe_text,
      customCSS: data.custom_css,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private transformEmailTemplateData(data: any): EmailTemplate {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      type: data.type,
      subject: data.subject,
      htmlContent: data.html_content,
      textContent: data.text_content,
      variables: data.variables || [],
      isDefault: data.is_default,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get default email branding
   */
  private getDefaultEmailBranding(tenantId: string): EmailBrandingConfig {
    return {
      id: 'default',
      tenantId,
      headerColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      linkColor: '#3b82f6',
      buttonColor: '#3b82f6',
      buttonTextColor: '#ffffff',
      unsubscribeText: 'Unsubscribe',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get default email template
   */
  private getDefaultEmailTemplate(tenantId: string, type: EmailTemplateType): EmailTemplate {
    const templates: Record<EmailTemplateType, Partial<EmailTemplate>> = {
      welcome: {
        subject: 'Welcome to {{COMPANY_NAME}}!',
        htmlContent: '<h1>Welcome!</h1><p>Thank you for joining {{COMPANY_NAME}}.</p>',
      },
      newsletter: {
        subject: '{{NEWSLETTER_TITLE}}',
        htmlContent: '<h1>{{NEWSLETTER_TITLE}}</h1><div>{{NEWSLETTER_CONTENT}}</div>',
      },
      product_alert: {
        subject: 'New Product Alert: {{PRODUCT_NAME}}',
        htmlContent: '<h1>{{PRODUCT_NAME}}</h1><p>{{PRODUCT_DESCRIPTION}}</p><a href="{{PRODUCT_URL}}" class="button">View Product</a>',
      },
      cart_abandonment: {
        subject: 'You left something in your cart',
        htmlContent: '<h1>Don\'t forget your items</h1><p>Complete your purchase before they\'re gone!</p>',
      },
      order_confirmation: {
        subject: 'Order Confirmation #{{ORDER_NUMBER}}',
        htmlContent: '<h1>Order Confirmed</h1><p>Your order #{{ORDER_NUMBER}} has been confirmed.</p>',
      },
      shipping_notification: {
        subject: 'Your order is on the way!',
        htmlContent: '<h1>Shipped!</h1><p>Your order is on the way. Tracking: {{TRACKING_NUMBER}}</p>',
      },
      password_reset: {
        subject: 'Reset Your Password',
        htmlContent: '<h1>Reset Password</h1><p>Click the link below to reset your password:</p><a href="{{RESET_URL}}" class="button">Reset Password</a>',
      },
      account_verification: {
        subject: 'Verify Your Account',
        htmlContent: '<h1>Verify Account</h1><p>Click the link below to verify your account:</p><a href="{{VERIFY_URL}}" class="button">Verify Account</a>',
      },
      deal_notification: {
        subject: 'Special Deal: {{DEAL_TITLE}}',
        htmlContent: '<h1>{{DEAL_TITLE}}</h1><p>{{DEAL_DESCRIPTION}}</p><a href="{{DEAL_URL}}" class="button">View Deal</a>',
      },
      custom: {
        subject: 'Custom Email',
        htmlContent: '<h1>Custom Email</h1><p>{{CONTENT}}</p>',
      },
    };

    const templateData = templates[type] || templates.custom;

    return {
      id: `default-${type}`,
      tenantId,
      name: `Default ${type} Template`,
      type,
      subject: templateData.subject!,
      htmlContent: templateData.htmlContent!,
      variables: [],
      isDefault: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const emailBrander = new EmailBrander();