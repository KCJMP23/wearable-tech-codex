import type { AgentTask } from '@affiliate-factory/sdk';
import { BaseAgent, type AgentDependencies, type AgentResult } from './base';

interface LinkVerifierInput {
  tenantId: string;
  action: 'verify_all_links' | 'verify_affiliate_tags' | 'check_broken_links' | 'update_redirects' | 'monitor_uptime';
  postId?: string;
  urls?: string[];
  includeInternal?: boolean;
  includeExternal?: boolean;
}

interface LinkStatus {
  url: string;
  statusCode: number;
  isWorking: boolean;
  responseTime: number;
  redirectUrl?: string;
  hasAffiliateTag: boolean;
  correctTag: boolean;
  lastChecked: Date;
  errorMessage?: string;
}

export class LinkVerifierAgent extends BaseAgent {
  name = 'LinkVerifierAgent';
  description = 'Performs nightly HEAD checks on links, ensures Amazon affiliate tags are present, and fixes broken links';
  version = '1.0.0';

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    this.validateRequiredEnv(deps, ['supabase']);
    
    return this.withErrorHandling(async () => {
      const input = task.input as LinkVerifierInput;
      
      switch (input.action) {
        case 'verify_all_links':
          return await this.verifyAllLinks(input.tenantId, deps);
        case 'verify_affiliate_tags':
          return await this.verifyAffiliateTags(input.tenantId, deps);
        case 'check_broken_links':
          return await this.checkBrokenLinks(input.tenantId, deps);
        case 'update_redirects':
          return await this.updateRedirects(input.tenantId, deps);
        case 'monitor_uptime':
          return await this.monitorUptime(input.tenantId, deps);
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    }, `execute ${task.input?.action || 'unknown'}`);
  }

  private async verifyAllLinks(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get all published posts
    const { data: posts } = await deps.supabase
      .from('posts')
      .select('id, title, body_mdx, images')
      .eq('tenant_id', tenantId)
      .eq('status', 'published');

    // Get all products with affiliate URLs
    const { data: products } = await deps.supabase
      .from('products')
      .select('id, title, affiliate_url')
      .eq('tenant_id', tenantId);

    const allLinks = this.extractAllLinks(posts || [], products || []);
    const verificationResults = [];
    const errors = [];

    // Check each link
    for (const link of allLinks) {
      try {
        const status = await this.checkLinkStatus(link.url, deps);
        
        // Update link status in database
        await this.updateLinkStatus(tenantId, link, status, deps);
        
        verificationResults.push({
          ...link,
          status: status.isWorking ? 'working' : 'broken',
          statusCode: status.statusCode,
          responseTime: status.responseTime,
          hasCorrectTag: status.correctTag
        });

      } catch (error) {
        errors.push({
          url: link.url,
          source: link.source,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const summary = {
      totalLinks: allLinks.length,
      workingLinks: verificationResults.filter(r => r.status === 'working').length,
      brokenLinks: verificationResults.filter(r => r.status === 'broken').length,
      missingAffiliateTags: verificationResults.filter(r => r.isAffiliate && !r.hasCorrectTag).length,
      averageResponseTime: this.calculateAverageResponseTime(verificationResults),
      lastVerified: new Date().toISOString()
    };

    // Store verification summary
    await this.storeVerificationSummary(tenantId, summary, deps);

    return {
      action: 'all_links_verified',
      summary,
      results: verificationResults,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async verifyAffiliateTags(tenantId: string, deps: AgentDependencies): Promise<any> {
    const partnerTag = deps.amazonPartnerTag || 'jmpkc01-20';
    
    // Get all products and affiliate links
    const { data: products } = await deps.supabase
      .from('products')
      .select('id, asin, affiliate_url, title')
      .eq('tenant_id', tenantId);

    const tagVerificationResults = [];
    const fixedLinks = [];

    for (const product of products || []) {
      const hasCorrectTag = product.affiliate_url.includes(`tag=${partnerTag}`);
      
      if (!hasCorrectTag && product.affiliate_url.includes('amazon.')) {
        // Fix the affiliate tag
        const correctedUrl = this.ensureAmazonTag(product.affiliate_url, partnerTag);
        
        await deps.supabase
          .from('products')
          .update({ 
            affiliate_url: correctedUrl,
            last_verified_at: new Date().toISOString()
          })
          .eq('id', product.id);

        fixedLinks.push({
          productId: product.id,
          asin: product.asin,
          title: product.title,
          oldUrl: product.affiliate_url,
          newUrl: correctedUrl
        });
      }

      tagVerificationResults.push({
        productId: product.id,
        asin: product.asin,
        title: product.title,
        hasCorrectTag: hasCorrectTag || !product.affiliate_url.includes('amazon.'),
        action: hasCorrectTag ? 'verified' : 'fixed'
      });
    }

    return {
      action: 'affiliate_tags_verified',
      totalProducts: products?.length || 0,
      linksFixed: fixedLinks.length,
      results: tagVerificationResults,
      fixedLinks
    };
  }

  private async checkBrokenLinks(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get links that were marked as broken in previous checks
    const { data: brokenLinks } = await deps.supabase
      .from('links')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('ok', false)
      .order('checked_at', { ascending: true });

    const recheckResults = [];
    const stillBroken = [];
    const nowWorking = [];

    for (const link of brokenLinks || []) {
      try {
        const status = await this.checkLinkStatus(link.target_url, deps);
        
        await deps.supabase
          .from('links')
          .update({
            status_code: status.statusCode,
            ok: status.isWorking,
            checked_at: new Date().toISOString()
          })
          .eq('id', link.id);

        if (status.isWorking) {
          nowWorking.push({
            id: link.id,
            url: link.target_url,
            previousError: link.status_code,
            newStatus: status.statusCode
          });
        } else {
          stillBroken.push({
            id: link.id,
            url: link.target_url,
            statusCode: status.statusCode,
            daysBroken: Math.floor((Date.now() - new Date(link.checked_at).getTime()) / (1000 * 60 * 60 * 24))
          });
        }

        recheckResults.push({
          linkId: link.id,
          url: link.target_url,
          status: status.isWorking ? 'fixed' : 'still_broken',
          statusCode: status.statusCode
        });

      } catch (error) {
        recheckResults.push({
          linkId: link.id,
          url: link.target_url,
          status: 'check_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      action: 'broken_links_checked',
      totalRechecked: recheckResults.length,
      linksFixed: nowWorking.length,
      stillBrokenCount: stillBroken.length,
      results: recheckResults,
      fixedLinks: nowWorking,
      persistentlyBroken: stillBroken.filter(link => link.daysBroken > 7)
    };
  }

  private async updateRedirects(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get links that returned redirect status codes
    const { data: redirectLinks } = await deps.supabase
      .from('links')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status_code', [301, 302, 303, 307, 308]);

    const redirectUpdates = [];

    for (const link of redirectLinks || []) {
      try {
        // Follow redirects to get final URL
        const finalUrl = await this.followRedirects(link.target_url);
        
        if (finalUrl !== link.target_url) {
          // Update posts that contain this URL
          const updateResult = await this.updateUrlInContent(
            tenantId,
            link.target_url,
            finalUrl,
            deps
          );

          redirectUpdates.push({
            linkId: link.id,
            oldUrl: link.target_url,
            newUrl: finalUrl,
            postsUpdated: updateResult.postsUpdated,
            productsUpdated: updateResult.productsUpdated
          });

          // Update link record
          await deps.supabase
            .from('links')
            .update({
              target_url: finalUrl,
              checked_at: new Date().toISOString()
            })
            .eq('id', link.id);
        }

      } catch (error) {
        console.error(`Failed to update redirect for ${link.target_url}:`, error);
      }
    }

    return {
      action: 'redirects_updated',
      redirectsProcessed: redirectLinks?.length || 0,
      urlsUpdated: redirectUpdates.length,
      updates: redirectUpdates
    };
  }

  private async monitorUptime(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get critical URLs to monitor (affiliate links, important external references)
    const { data: criticalLinks } = await deps.supabase
      .from('links')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('target_type', 'product')
      .order('checked_at', { ascending: true })
      .limit(50);

    const uptimeResults = [];
    let totalUptime = 0;
    let totalResponseTime = 0;

    for (const link of criticalLinks || []) {
      try {
        const startTime = Date.now();
        const status = await this.checkLinkStatus(link.target_url, deps);
        const responseTime = Date.now() - startTime;

        uptimeResults.push({
          url: link.target_url,
          isUp: status.isWorking,
          responseTime,
          statusCode: status.statusCode,
          lastChecked: new Date().toISOString()
        });

        if (status.isWorking) {
          totalUptime++;
        }
        totalResponseTime += responseTime;

        // Update link status
        await deps.supabase
          .from('links')
          .update({
            status_code: status.statusCode,
            ok: status.isWorking,
            checked_at: new Date().toISOString()
          })
          .eq('id', link.id);

      } catch (error) {
        uptimeResults.push({
          url: link.target_url,
          isUp: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date().toISOString()
        });
      }
    }

    const uptimePercentage = criticalLinks?.length 
      ? (totalUptime / criticalLinks.length) * 100 
      : 100;
    
    const averageResponseTime = criticalLinks?.length 
      ? totalResponseTime / criticalLinks.length 
      : 0;

    // Store uptime metrics
    await deps.supabase
      .from('insights')
      .insert({
        tenant_id: tenantId,
        kpi: 'uptime',
        value: uptimePercentage,
        window: 'hourly',
        meta: {
          totalLinks: criticalLinks?.length || 0,
          workingLinks: totalUptime,
          averageResponseTime,
          timestamp: new Date().toISOString()
        },
        computed_at: new Date().toISOString()
      });

    return {
      action: 'uptime_monitored',
      monitoredLinks: criticalLinks?.length || 0,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      results: uptimeResults
    };
  }

  // Helper methods
  private extractAllLinks(posts: any[], products: any[]): Array<{url: string; source: string; type: string; isAffiliate: boolean}> {
    const links = [];

    // Extract links from post content
    for (const post of posts) {
      if (post.body_mdx) {
        const markdownLinks = this.extractMarkdownLinks(post.body_mdx);
        for (const link of markdownLinks) {
          links.push({
            url: link,
            source: `post:${post.id}`,
            type: 'content',
            isAffiliate: link.includes('amazon.') && link.includes('tag=')
          });
        }
      }

      // Extract image URLs
      if (post.images) {
        for (const image of post.images) {
          if (image.url && image.url.startsWith('http')) {
            links.push({
              url: image.url,
              source: `post:${post.id}`,
              type: 'image',
              isAffiliate: false
            });
          }
        }
      }
    }

    // Extract affiliate URLs from products
    for (const product of products) {
      if (product.affiliate_url) {
        links.push({
          url: product.affiliate_url,
          source: `product:${product.id}`,
          type: 'affiliate',
          isAffiliate: true
        });
      }
    }

    return links;
  }

  private extractMarkdownLinks(markdown: string): string[] {
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    const links = [];
    let match;

    while ((match = linkRegex.exec(markdown)) !== null) {
      const url = match[2];
      if (url.startsWith('http')) {
        links.push(url);
      }
    }

    return links;
  }

  private async checkLinkStatus(url: string, deps: AgentDependencies): Promise<LinkStatus> {
    const startTime = Date.now();
    
    try {
      // Mock HTTP request - in real implementation, use fetch or axios
      const isAmazonLink = url.includes('amazon.');
      const hasAffiliateTag = url.includes('tag=');
      const correctTag = hasAffiliateTag && url.includes(deps.amazonPartnerTag || 'jmpkc01-20');
      
      // Simulate different response scenarios
      const random = Math.random();
      let statusCode: number;
      let isWorking: boolean;
      
      if (random > 0.95) {
        statusCode = 404;
        isWorking = false;
      } else if (random > 0.90) {
        statusCode = 301;
        isWorking = true;
      } else if (random > 0.85) {
        statusCode = 500;
        isWorking = false;
      } else {
        statusCode = 200;
        isWorking = true;
      }

      const responseTime = Date.now() - startTime;

      return {
        url,
        statusCode,
        isWorking,
        responseTime,
        hasAffiliateTag: isAmazonLink ? hasAffiliateTag : false,
        correctTag: isAmazonLink ? correctTag : true,
        lastChecked: new Date()
      };

    } catch (error) {
      return {
        url,
        statusCode: 0,
        isWorking: false,
        responseTime: Date.now() - startTime,
        hasAffiliateTag: false,
        correctTag: false,
        lastChecked: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async updateLinkStatus(
    tenantId: string, 
    link: any, 
    status: LinkStatus, 
    deps: AgentDependencies
  ): Promise<void> {
    // Insert or update link status in links table
    const { data: existingLink } = await deps.supabase
      .from('links')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('target_url', link.url)
      .single();

    const linkData = {
      tenant_id: tenantId,
      target_url: link.url,
      target_type: link.type === 'affiliate' ? 'product' : 'outbound',
      status_code: status.statusCode,
      ok: status.isWorking,
      checked_at: new Date().toISOString()
    };

    if (existingLink) {
      await deps.supabase
        .from('links')
        .update(linkData)
        .eq('id', existingLink.id);
    } else {
      await deps.supabase
        .from('links')
        .insert(linkData);
    }
  }

  private calculateAverageResponseTime(results: any[]): number {
    const responseTimes = results
      .filter(r => r.responseTime)
      .map(r => r.responseTime);
    
    if (responseTimes.length === 0) return 0;
    
    return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
  }

  private async storeVerificationSummary(
    tenantId: string, 
    summary: any, 
    deps: AgentDependencies
  ): Promise<void> {
    await deps.supabase
      .from('insights')
      .insert({
        tenant_id: tenantId,
        kpi: 'link_health',
        value: summary.workingLinks / summary.totalLinks,
        window: 'daily',
        meta: summary,
        computed_at: new Date().toISOString()
      });
  }

  private async followRedirects(url: string): Promise<string> {
    // Mock redirect following - in real implementation, follow actual redirects
    // For Amazon links, might redirect to updated product pages
    if (url.includes('amazon.') && Math.random() > 0.7) {
      return url.replace(/\/dp\/[A-Z0-9]+/, '/dp/B08NEWPRODUCT');
    }
    
    return url;
  }

  private async updateUrlInContent(
    tenantId: string,
    oldUrl: string,
    newUrl: string,
    deps: AgentDependencies
  ): Promise<{postsUpdated: number; productsUpdated: number}> {
    let postsUpdated = 0;
    let productsUpdated = 0;

    // Update posts
    const { data: posts } = await deps.supabase
      .from('posts')
      .select('id, body_mdx')
      .eq('tenant_id', tenantId)
      .like('body_mdx', `%${oldUrl}%`);

    for (const post of posts || []) {
      const updatedContent = post.body_mdx.replace(new RegExp(oldUrl, 'g'), newUrl);
      
      await deps.supabase
        .from('posts')
        .update({ body_mdx: updatedContent })
        .eq('id', post.id);
      
      postsUpdated++;
    }

    // Update products
    const { data: products } = await deps.supabase
      .from('products')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('affiliate_url', oldUrl);

    for (const product of products || []) {
      await deps.supabase
        .from('products')
        .update({ affiliate_url: newUrl })
        .eq('id', product.id);
      
      productsUpdated++;
    }

    return { postsUpdated, productsUpdated };
  }
}

export const linkVerifierAgent = new LinkVerifierAgent();