// Add polyfill for SSR compatibility at the top
if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
  global.self = global;
}

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';

export interface DomainConfig {
  id: string;
  tenantId: string;
  domain: string;
  isCustomDomain: boolean;
  sslEnabled: boolean;
  sslProvider: 'cloudflare' | 'letsencrypt' | 'custom';
  sslStatus: 'pending' | 'active' | 'failed' | 'expired';
  dnsChallengeRecord?: string;
  certificateExpiry?: Date;
  redirectToWww: boolean;
  enforceHttps: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMapping {
  tenantId: string;
  tenantSlug: string;
  domain: string;
  isCustomDomain: boolean;
  theme: Record<string, unknown>;
  branding: {
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    brandName?: string;
  };
  sslConfig: {
    enabled: boolean;
    provider: string;
    status: string;
  };
}

export class DomainMapper {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Extract domain from request headers
   */
  async extractDomain(request?: NextRequest): Promise<string> {
    let host: string;

    if (request) {
      host = request.headers.get('host') || '';
    } else {
      const headersList = headers();
      host = headersList.get('host') || '';
    }

    // Remove port if present
    return host.split(':')[0];
  }

  /**
   * Map domain to tenant configuration
   */
  async mapDomainToTenant(domain: string): Promise<TenantMapping | null> {
    try {
      // First check custom domains
      const { data: customDomain, error: customError } = await this.supabase
        .from('tenant_domains')
        .select(`
          tenant_id,
          domain,
          ssl_enabled,
          ssl_provider,
          ssl_status,
          redirect_to_www,
          enforce_https,
          tenants:tenant_id (
            id,
            slug,
            name,
            theme,
            logo_url,
            favicon_url,
            primary_color,
            secondary_color,
            brand_name
          )
        `)
        .eq('domain', domain)
        .eq('active', true)
        .single();

      if (!customError && customDomain) {
        return {
          tenantId: customDomain.tenant_id,
          tenantSlug: customDomain.tenants.slug,
          domain,
          isCustomDomain: true,
          theme: customDomain.tenants.theme || {},
          branding: {
            logoUrl: customDomain.tenants.logo_url,
            faviconUrl: customDomain.tenants.favicon_url,
            primaryColor: customDomain.tenants.primary_color,
            secondaryColor: customDomain.tenants.secondary_color,
            brandName: customDomain.tenants.brand_name || customDomain.tenants.name,
          },
          sslConfig: {
            enabled: customDomain.ssl_enabled,
            provider: customDomain.ssl_provider,
            status: customDomain.ssl_status,
          },
        };
      }

      // Check subdomain mapping (tenant.affiliateos.com)
      const subdomain = this.extractSubdomain(domain);
      if (subdomain) {
        const { data: tenant, error: tenantError } = await this.supabase
          .from('tenants')
          .select(`
            id,
            slug,
            name,
            domain,
            theme,
            logo_url,
            favicon_url,
            primary_color,
            secondary_color,
            brand_name
          `)
          .eq('slug', subdomain)
          .eq('status', 'active')
          .single();

        if (!tenantError && tenant) {
          return {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            domain: tenant.domain || domain,
            isCustomDomain: false,
            theme: tenant.theme || {},
            branding: {
              logoUrl: tenant.logo_url,
              faviconUrl: tenant.favicon_url,
              primaryColor: tenant.primary_color,
              secondaryColor: tenant.secondary_color,
              brandName: tenant.brand_name || tenant.name,
            },
            sslConfig: {
              enabled: true, // Default SSL for subdomains
              provider: 'cloudflare',
              status: 'active',
            },
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error mapping domain to tenant:', error);
      return null;
    }
  }

  /**
   * Extract subdomain from domain
   */
  private extractSubdomain(domain: string): string | null {
    const baseDomains = [
      'affiliateos.com',
      'localhost',
      'vercel.app',
      process.env.NEXT_PUBLIC_BASE_DOMAIN,
    ].filter(Boolean);

    for (const baseDomain of baseDomains) {
      if (domain.endsWith(`.${baseDomain}`)) {
        const subdomain = domain.replace(`.${baseDomain}`, '');
        return subdomain.includes('.') ? null : subdomain;
      }
    }

    return null;
  }

  /**
   * Validate custom domain configuration
   */
  async validateDomain(domain: string): Promise<{
    valid: boolean;
    errors: string[];
    dnsMethods: {
      cname?: { name: string; value: string };
      aRecord?: { name: string; value: string };
    };
  }> {
    const errors: string[] = [];
    const dnsMethods: any = {};

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    if (!domainRegex.test(domain)) {
      errors.push('Invalid domain format');
    }

    // Check if domain is already in use
    const { data: existingDomain } = await this.supabase
      .from('tenant_domains')
      .select('id')
      .eq('domain', domain)
      .single();

    if (existingDomain) {
      errors.push('Domain is already in use');
    }

    // DNS configuration options
    if (errors.length === 0) {
      dnsMethods.cname = {
        name: domain,
        value: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'app.affiliateos.com',
      };
      dnsMethods.aRecord = {
        name: domain,
        value: process.env.CUSTOM_DOMAIN_IP || '76.76.19.19', // Vercel's IP
      };
    }

    return {
      valid: errors.length === 0,
      errors,
      dnsMethods,
    };
  }

  /**
   * Add custom domain for tenant
   */
  async addCustomDomain(
    tenantId: string,
    domain: string,
    options: {
      sslProvider?: 'cloudflare' | 'letsencrypt' | 'custom';
      redirectToWww?: boolean;
      enforceHttps?: boolean;
    } = {}
  ): Promise<{ success: boolean; error?: string; domainId?: string }> {
    try {
      // Validate domain first
      const validation = await this.validateDomain(domain);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Insert domain configuration
      const { data, error } = await this.supabase
        .from('tenant_domains')
        .insert({
          tenant_id: tenantId,
          domain,
          ssl_enabled: true,
          ssl_provider: options.sslProvider || 'cloudflare',
          ssl_status: 'pending',
          redirect_to_www: options.redirectToWww || false,
          enforce_https: options.enforceHttps !== false,
          active: true,
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Trigger SSL certificate provisioning
      await this.provisionSSLCertificate(data.id, domain, options.sslProvider || 'cloudflare');

      return { success: true, domainId: data.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Provision SSL certificate for domain
   */
  private async provisionSSLCertificate(
    domainId: string,
    domain: string,
    provider: string
  ): Promise<void> {
    try {
      // This would integrate with your SSL provider
      // For now, we'll simulate the process
      
      if (provider === 'cloudflare') {
        // Integrate with Cloudflare API
        await this.setupCloudflareSSL(domain);
      } else if (provider === 'letsencrypt') {
        // Integrate with Let's Encrypt
        await this.setupLetsEncryptSSL(domain);
      }

      // Update SSL status
      await this.supabase
        .from('tenant_domains')
        .update({
          ssl_status: 'active',
          certificate_expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          updated_at: new Date().toISOString(),
        })
        .eq('id', domainId);
    } catch (error) {
      // Update SSL status to failed
      await this.supabase
        .from('tenant_domains')
        .update({
          ssl_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', domainId);
    }
  }

  /**
   * Setup Cloudflare SSL
   */
  private async setupCloudflareSSL(domain: string): Promise<void> {
    const cloudflareAPI = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (!cloudflareAPI || !zoneId) {
      throw new Error('Cloudflare configuration missing');
    }

    // Add DNS record
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudflareAPI}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'CNAME',
        name: domain,
        content: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'app.affiliateos.com',
        proxied: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.statusText}`);
    }
  }

  /**
   * Setup Let's Encrypt SSL
   */
  private async setupLetsEncryptSSL(domain: string): Promise<void> {
    // This would integrate with ACME client for Let's Encrypt
    // Implementation depends on your infrastructure
    console.log(`Setting up Let's Encrypt SSL for ${domain}`);
  }

  /**
   * Remove custom domain
   */
  async removeCustomDomain(tenantId: string, domain: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('tenant_domains')
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('domain', domain);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Check SSL certificate status
   */
  async checkSSLStatus(domain: string): Promise<{
    status: 'active' | 'pending' | 'failed' | 'expired';
    expiresAt?: Date;
    issuer?: string;
  }> {
    try {
      const { data } = await this.supabase
        .from('tenant_domains')
        .select('ssl_status, certificate_expiry, ssl_provider')
        .eq('domain', domain)
        .single();

      if (!data) {
        return { status: 'failed' };
      }

      return {
        status: data.ssl_status,
        expiresAt: data.certificate_expiry ? new Date(data.certificate_expiry) : undefined,
        issuer: data.ssl_provider,
      };
    } catch (error) {
      return { status: 'failed' };
    }
  }

  /**
   * Get all domains for tenant
   */
  async getTenantDomains(tenantId: string): Promise<DomainConfig[]> {
    const { data, error } = await this.supabase
      .from('tenant_domains')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenant domains:', error);
      return [];
    }

    return data.map((domain: any) => ({
      id: domain.id,
      tenantId: domain.tenant_id,
      domain: domain.domain,
      isCustomDomain: true,
      sslEnabled: domain.ssl_enabled,
      sslProvider: domain.ssl_provider,
      sslStatus: domain.ssl_status,
      dnsChallengeRecord: domain.dns_challenge_record,
      certificateExpiry: domain.certificate_expiry ? new Date(domain.certificate_expiry) : undefined,
      redirectToWww: domain.redirect_to_www,
      enforceHttps: domain.enforce_https,
      metadata: domain.metadata || {},
      createdAt: domain.created_at,
      updatedAt: domain.updated_at,
    }));
  }
}

export const domainMapper = new DomainMapper();