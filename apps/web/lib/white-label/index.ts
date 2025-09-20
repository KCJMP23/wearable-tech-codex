import { NextRequest } from 'next/server';
import { domainMapper, TenantMapping } from './domain-mapper';
import { themeOverrideManager, ThemeConfig } from './theme-overrides';
import { brandingManager, BrandConfiguration } from './branding';
import { emailBrander, EmailBrandingConfig } from './email-brander';
import { cssInjector, DynamicCSS } from './css-injector';
import { tenantAnalytics, AnalyticsConfig } from './analytics';
import { whiteLabelAPIWrapper, WhiteLabelAPIConfig } from './api-wrapper';

export interface WhiteLabelConfiguration {
  tenant: TenantMapping;
  theme: ThemeConfig | null;
  branding: BrandConfiguration | null;
  emailBranding: EmailBrandingConfig | null;
  analytics: AnalyticsConfig | null;
  apiConfig: WhiteLabelAPIConfig | null;
  css: DynamicCSS;
}

export interface WhiteLabelContext {
  tenantId: string;
  tenantSlug: string;
  domain: string;
  isCustomDomain: boolean;
  configuration: WhiteLabelConfiguration;
}

export class WhiteLabelManager {
  private cache: Map<string, WhiteLabelConfiguration> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize white-label configuration from request
   */
  async initializeFromRequest(request?: NextRequest): Promise<WhiteLabelContext | null> {
    try {
      // Extract domain from request
      const domain = await domainMapper.extractDomain(request);
      
      // Map domain to tenant
      const tenantMapping = await domainMapper.mapDomainToTenant(domain);
      if (!tenantMapping) {
        return null;
      }

      // Get or create configuration
      const configuration = await this.getConfiguration(tenantMapping.tenantId);

      return {
        tenantId: tenantMapping.tenantId,
        tenantSlug: tenantMapping.tenantSlug,
        domain: tenantMapping.domain,
        isCustomDomain: tenantMapping.isCustomDomain,
        configuration: {
          ...configuration,
          tenant: tenantMapping,
        },
      };
    } catch (error) {
      console.error('Error initializing white-label context:', error);
      return null;
    }
  }

  /**
   * Get complete white-label configuration for tenant
   */
  async getConfiguration(tenantId: string): Promise<WhiteLabelConfiguration> {
    // Check cache first
    const cached = this.getCachedConfiguration(tenantId);
    if (cached) {
      return cached;
    }

    try {
      // Fetch all configuration components in parallel
      const [theme, branding, emailBranding, analytics, apiConfig] = await Promise.all([
        themeOverrideManager.getTenantTheme(tenantId),
        brandingManager.getTenantBranding(tenantId),
        emailBrander.getEmailBranding(tenantId),
        tenantAnalytics.getAnalyticsConfig(tenantId),
        whiteLabelAPIWrapper.getAPIConfig(tenantId),
      ]);

      // Generate CSS
      const css = await cssInjector.generateTenantCSS(tenantId);

      const configuration: WhiteLabelConfiguration = {
        tenant: {} as TenantMapping, // Will be filled by caller
        theme,
        branding,
        emailBranding,
        analytics,
        apiConfig,
        css,
      };

      // Cache the configuration
      this.setCachedConfiguration(tenantId, configuration);

      return configuration;
    } catch (error) {
      console.error('Error fetching white-label configuration:', error);
      return this.getDefaultConfiguration();
    }
  }

  /**
   * Generate complete HTML head section with white-label assets
   */
  generateHTMLHead(context: WhiteLabelContext, pageTitle?: string): string {
    const { configuration } = context;
    const headElements: string[] = [];

    // Title
    const title = pageTitle 
      ? `${pageTitle} | ${configuration.branding?.metadata.companyName || context.tenantSlug}`
      : configuration.branding?.metadata.companyName || context.tenantSlug;
    
    headElements.push(`<title>${title}</title>`);

    // Meta tags
    if (configuration.branding?.metadata.description) {
      headElements.push(`<meta name="description" content="${configuration.branding.metadata.description}">`);
    }

    if (configuration.branding?.metadata.seoDefaults?.keywords) {
      const keywords = configuration.branding.metadata.seoDefaults.keywords.join(', ');
      headElements.push(`<meta name="keywords" content="${keywords}">`);
    }

    // Favicon
    if (configuration.branding?.assets.faviconUrl) {
      headElements.push(`<link rel="icon" href="${configuration.branding.assets.faviconUrl}">`);
    }

    // Apple Touch Icon
    if (configuration.branding?.assets.appleTouchIconUrl) {
      headElements.push(`<link rel="apple-touch-icon" href="${configuration.branding.assets.appleTouchIconUrl}">`);
    }

    // Social Share Image
    if (configuration.branding?.assets.socialShareImageUrl) {
      headElements.push(`<meta property="og:image" content="${configuration.branding.assets.socialShareImageUrl}">`);
      headElements.push(`<meta name="twitter:image" content="${configuration.branding.assets.socialShareImageUrl}">`);
    }

    // CSS Variables and Styles
    headElements.push(`<style id="white-label-css">${configuration.css.variables}</style>`);
    headElements.push(`<style id="white-label-global">${configuration.css.global}</style>`);
    headElements.push(`<style id="white-label-components">${configuration.css.components}</style>`);

    // Font imports
    if (configuration.branding?.typography.fontUrl) {
      headElements.push(`<link rel="preconnect" href="https://fonts.googleapis.com">`);
      headElements.push(`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`);
      headElements.push(`<link href="${configuration.branding.typography.fontUrl}" rel="stylesheet">`);
    }

    // Analytics and tracking scripts
    if (configuration.analytics?.isActive) {
      const trackingScripts = tenantAnalytics.generateTrackingScripts(configuration.analytics);
      headElements.push(trackingScripts);
    }

    return headElements.join('\n');
  }

  /**
   * Generate page-specific CSS
   */
  async generatePageCSS(tenantId: string, pagePath: string): Promise<string> {
    return await cssInjector.getPageCSS(tenantId, pagePath);
  }

  /**
   * Generate cookie consent banner
   */
  generateCookieConsent(context: WhiteLabelContext): string {
    if (!context.configuration.analytics?.enableCookieConsent) {
      return '';
    }

    return tenantAnalytics.generateCookieConsentBanner(context.configuration.analytics);
  }

  /**
   * Get branded email template
   */
  async getBrandedEmailTemplate(
    tenantId: string,
    templateType: string,
    variables: Record<string, any>
  ): Promise<{ html: string; text?: string; subject: string } | null> {
    try {
      const template = await emailBrander.getEmailTemplate(tenantId, templateType as any);
      if (!template) {
        return null;
      }

      const { html, text } = await emailBrander.brandEmailTemplate(tenantId, template);

      // Replace variables in subject and content
      const subject = this.replaceVariables(template.subject, variables);
      const processedHTML = this.replaceVariables(html, variables);
      const processedText = text ? this.replaceVariables(text, variables) : undefined;

      return {
        html: processedHTML,
        text: processedText,
        subject,
      };
    } catch (error) {
      console.error('Error getting branded email template:', error);
      return null;
    }
  }

  /**
   * Handle API request with white-labeling
   */
  async handleAPIRequest(request: NextRequest, endpoint: string) {
    return await whiteLabelAPIWrapper.handleAPIRequest(request, endpoint);
  }

  /**
   * Add custom domain for tenant
   */
  async addCustomDomain(
    tenantId: string,
    domain: string,
    options?: {
      sslProvider?: 'cloudflare' | 'letsencrypt' | 'custom';
      redirectToWww?: boolean;
      enforceHttps?: boolean;
    }
  ) {
    const result = await domainMapper.addCustomDomain(tenantId, domain, options);
    
    if (result.success) {
      // Invalidate cache
      this.invalidateCache(tenantId);
    }

    return result;
  }

  /**
   * Update tenant branding
   */
  async updateBranding(
    tenantId: string,
    branding: Partial<BrandConfiguration>
  ) {
    const result = await brandingManager.updateTenantBranding(tenantId, branding);
    
    if (result.success) {
      // Invalidate cache
      this.invalidateCache(tenantId);
    }

    return result;
  }

  /**
   * Update tenant theme
   */
  async updateTheme(
    tenantId: string,
    theme: Partial<ThemeConfig>
  ) {
    const result = await themeOverrideManager.updateTenantTheme(tenantId, theme);
    
    if (result.success) {
      // Invalidate cache
      this.invalidateCache(tenantId);
    }

    return result;
  }

  /**
   * Update analytics configuration
   */
  async updateAnalytics(
    tenantId: string,
    analytics: Partial<AnalyticsConfig>
  ) {
    const result = await tenantAnalytics.updateAnalyticsConfig(tenantId, analytics);
    
    if (result.success) {
      // Invalidate cache
      this.invalidateCache(tenantId);
    }

    return result;
  }

  /**
   * Upload brand asset
   */
  async uploadBrandAsset(
    tenantId: string,
    file: File,
    assetType: 'logoUrl' | 'faviconUrl' | 'socialShareImageUrl' | 'backgroundImageUrl'
  ) {
    const result = await brandingManager.uploadBrandAsset(tenantId, file, assetType);
    
    if (result.success) {
      // Invalidate cache
      this.invalidateCache(tenantId);
    }

    return result;
  }

  /**
   * Get tenant domains
   */
  async getTenantDomains(tenantId: string) {
    return await domainMapper.getTenantDomains(tenantId);
  }

  /**
   * Cache management
   */
  private getCachedConfiguration(tenantId: string): WhiteLabelConfiguration | null {
    const cached = this.cache.get(tenantId);
    const expiry = this.cacheExpiry.get(tenantId);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    return null;
  }

  private setCachedConfiguration(tenantId: string, configuration: WhiteLabelConfiguration): void {
    this.cache.set(tenantId, configuration);
    this.cacheExpiry.set(tenantId, Date.now() + this.CACHE_DURATION);
  }

  private invalidateCache(tenantId: string): void {
    this.cache.delete(tenantId);
    this.cacheExpiry.delete(tenantId);
  }

  /**
   * Utility methods
   */
  private replaceVariables(content: string, variables: Record<string, any>): string {
    let processedContent = content;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, String(value));
    });

    return processedContent;
  }

  private getDefaultConfiguration(): WhiteLabelConfiguration {
    return {
      tenant: {} as TenantMapping,
      theme: null,
      branding: null,
      emailBranding: null,
      analytics: null,
      apiConfig: null,
      css: {
        variables: ':root { --theme-primary: #3b82f6; }',
        global: '',
        components: '',
        pages: {},
      },
    };
  }
}

// Export singleton instance
export const whiteLabelManager = new WhiteLabelManager();

// Export all types and managers
export {
  domainMapper,
  themeOverrideManager,
  brandingManager,
  emailBrander,
  cssInjector,
  tenantAnalytics,
  whiteLabelAPIWrapper,
};

export type {
  TenantMapping,
  ThemeConfig,
  BrandConfiguration,
  EmailBrandingConfig,
  AnalyticsConfig,
  WhiteLabelAPIConfig,
  DynamicCSS,
};