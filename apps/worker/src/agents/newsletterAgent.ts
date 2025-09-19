import type { AgentTask, NewsletterCampaign, SegmentDefinition } from '@affiliate-factory/sdk';
import { BaseAgent, type AgentDependencies, type AgentResult } from './base';
import { createOpenAIClient } from '../lib/openai';

interface NewsletterAgentInput {
  tenantId: string;
  action: 'generate_weekly_roundup' | 'create_product_spotlight' | 'send_campaign' | 'manage_segments' | 'analyze_performance' | 'create_abandoned_cart' | 'seasonal_campaign';
  segmentId?: string;
  productIds?: string[];
  templateType?: 'roundup' | 'spotlight' | 'announcement' | 'seasonal' | 'educational';
  scheduledAt?: string;
  customContent?: {
    subject?: string;
    preheader?: string;
    sections?: Array<{
      type: 'header' | 'content' | 'products' | 'cta' | 'footer';
      content: any;
    }>;
  };
}

interface NewsletterTemplate {
  type: string;
  subject: string;
  preheader: string;
  structure: string[];
  cta: {
    primary: string;
    secondary?: string;
  };
  personalization: string[];
}

interface EmailMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
}

export class NewsletterAgent extends BaseAgent {
  name = 'NewsletterAgent';
  description = 'Manages email newsletter campaigns, segmentation, and automated email sequences';
  version = '1.0.0';

  private readonly newsletterTemplates: Record<string, NewsletterTemplate> = {
    roundup: {
      type: 'roundup',
      subject: 'Weekly Wearable Tech Roundup - [Date]',
      preheader: 'Latest reviews, trends, and deals in wearable technology',
      structure: ['header', 'intro', 'featured_reviews', 'trending_products', 'tech_news', 'deals', 'footer'],
      cta: {
        primary: 'Read Full Reviews',
        secondary: 'Shop Latest Deals'
      },
      personalization: ['user_preferences', 'browsing_history', 'purchase_behavior']
    },
    spotlight: {
      type: 'spotlight',
      subject: 'Product Spotlight: [Product Name] Deep Dive',
      preheader: 'Everything you need to know about this game-changing device',
      structure: ['header', 'hero_product', 'key_features', 'expert_review', 'comparisons', 'cta', 'footer'],
      cta: {
        primary: 'Read Full Review',
        secondary: 'Compare Similar Products'
      },
      personalization: ['device_preferences', 'price_range', 'feature_interests']
    },
    seasonal: {
      type: 'seasonal',
      subject: '[Season] Wearable Tech Guide - Best Picks for [Use Case]',
      preheader: 'Curated recommendations for the season ahead',
      structure: ['header', 'seasonal_intro', 'category_highlights', 'gift_guides', 'seasonal_tips', 'deals', 'footer'],
      cta: {
        primary: 'Shop Seasonal Picks',
        secondary: 'View Gift Guide'
      },
      personalization: ['seasonal_interests', 'gift_recipients', 'budget_preferences']
    },
    educational: {
      type: 'educational',
      subject: 'Tech Tips: [Topic] Explained Simply',
      preheader: 'Master your wearable devices with expert tips and tricks',
      structure: ['header', 'tip_intro', 'step_by_step', 'pro_tips', 'troubleshooting', 'related_content', 'footer'],
      cta: {
        primary: 'Learn More',
        secondary: 'View Related Guides'
      },
      personalization: ['skill_level', 'device_ownership', 'learning_preferences']
    },
    announcement: {
      type: 'announcement',
      subject: 'Important Update: [Announcement Title]',
      preheader: 'What this means for you and your devices',
      structure: ['header', 'announcement', 'impact_analysis', 'action_items', 'resources', 'footer'],
      cta: {
        primary: 'Learn More',
        secondary: 'Update Settings'
      },
      personalization: ['affected_devices', 'account_status', 'notification_preferences']
    }
  };

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    this.validateRequiredEnv(deps, ['supabase']);
    
    return this.withErrorHandling(async () => {
      const input = task.input as NewsletterAgentInput;
      
      switch (input.action) {
        case 'generate_weekly_roundup':
          return await this.generateWeeklyRoundup(input.tenantId, deps);
        case 'create_product_spotlight':
          return await this.createProductSpotlight(input.tenantId, input.productIds!, deps);
        case 'send_campaign':
          return await this.sendCampaign(input.tenantId, input.segmentId, input.templateType!, input.customContent, deps);
        case 'manage_segments':
          return await this.manageSegments(input.tenantId, deps);
        case 'analyze_performance':
          return await this.analyzePerformance(input.tenantId, deps);
        case 'seasonal_campaign':
          return await this.createSeasonalCampaign(input.tenantId, deps);
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    }, `execute ${task.input?.action || 'unknown'}`);
  }

  private async generateWeeklyRoundup(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get this week's content
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Fetch week's published content
    const { data: weeklyPosts } = await deps.supabase
      .from('posts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .gte('published_at', weekStart.toISOString())
      .lte('published_at', weekEnd.toISOString())
      .order('published_at', { ascending: false });

    // Get trending products
    const { data: trendingProducts } = await deps.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Generate newsletter content
    const newsletterContent = await this.generateRoundupContent(
      weeklyPosts || [], 
      trendingProducts || [], 
      deps
    );

    // Create campaign
    const campaign = await this.createCampaign(
      tenantId,
      'roundup',
      newsletterContent,
      deps
    );

    return {
      action: 'weekly_roundup_generated',
      campaignId: campaign.id,
      subject: campaign.subject,
      contentSections: Object.keys(newsletterContent.sections),
      postsIncluded: weeklyPosts?.length || 0,
      productsHighlighted: trendingProducts?.length || 0
    };
  }

  private async createProductSpotlight(tenantId: string, productIds: string[], deps: AgentDependencies): Promise<any> {
    if (!productIds || productIds.length === 0) {
      throw new Error('Product IDs are required for spotlight campaign');
    }

    // Get featured products
    const { data: products } = await deps.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('id', productIds);

    if (!products || products.length === 0) {
      throw new Error('No products found for spotlight');
    }

    // Get related reviews
    const { data: reviews } = await deps.supabase
      .from('posts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('type', 'review')
      .eq('status', 'published')
      .limit(3);

    // Generate spotlight content
    const spotlightContent = await this.generateSpotlightContent(
      products[0], // Primary product
      products.slice(1), // Related products
      reviews || [],
      deps
    );

    // Create campaign
    const campaign = await this.createCampaign(
      tenantId,
      'spotlight',
      spotlightContent,
      deps
    );

    return {
      action: 'product_spotlight_created',
      campaignId: campaign.id,
      featuredProduct: products[0].title,
      relatedProducts: products.slice(1).map(p => p.title),
      subject: campaign.subject
    };
  }

  private async sendCampaign(
    tenantId: string,
    segmentId?: string,
    templateType?: string,
    customContent?: any,
    deps?: AgentDependencies
  ): Promise<any> {
    // Get campaign to send
    let query = deps!.supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'draft');

    if (templateType) {
      query = query.eq('template_type', templateType);
    }

    const { data: campaigns } = await query.limit(1);
    
    if (!campaigns || campaigns.length === 0) {
      throw new Error('No draft campaigns found to send');
    }

    const campaign = campaigns[0];

    // Get subscriber segment
    const subscribers = await this.getSubscribers(tenantId, segmentId, deps!);
    
    if (subscribers.length === 0) {
      throw new Error('No subscribers found for campaign');
    }

    // Send campaign (mock implementation)
    const sendResult = await this.dispatchCampaign(campaign, subscribers, deps!);

    // Update campaign status
    await deps!.supabase
      .from('newsletter_campaigns')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: subscribers.length
      })
      .eq('id', campaign.id);

    return {
      action: 'campaign_sent',
      campaignId: campaign.id,
      subject: campaign.subject,
      recipientCount: subscribers.length,
      estimatedDelivery: sendResult.estimatedDelivery
    };
  }

  private async manageSegments(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Create default segments if they don't exist
    const defaultSegments = [
      {
        name: 'All Subscribers',
        rules: { active: true },
        description: 'All active newsletter subscribers'
      },
      {
        name: 'Fitness Enthusiasts',
        rules: { 
          interests: ['fitness', 'health', 'running', 'cycling'],
          device_preferences: ['fitness_tracker', 'smartwatch']
        },
        description: 'Users interested in fitness tracking devices'
      },
      {
        name: 'Tech Early Adopters',
        rules: {
          engagement_level: 'high',
          price_sensitivity: 'low',
          feature_interests: ['latest_tech', 'premium_features']
        },
        description: 'Users who prefer cutting-edge technology'
      },
      {
        name: 'Budget Conscious',
        rules: {
          price_range: 'budget',
          deal_engagement: 'high'
        },
        description: 'Users looking for affordable options and deals'
      },
      {
        name: 'Health Monitors',
        rules: {
          health_conditions: ['diabetes', 'heart_conditions'],
          device_needs: ['health_monitoring', 'medical_features']
        },
        description: 'Users needing health monitoring capabilities'
      }
    ];

    const createdSegments = [];
    
    for (const segment of defaultSegments) {
      // Check if segment exists
      const { data: existing } = await deps.supabase
        .from('subscriber_segments')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', segment.name)
        .single();

      if (!existing) {
        const { data: newSegment } = await deps.supabase
          .from('subscriber_segments')
          .insert({
            tenant_id: tenantId,
            name: segment.name,
            rules: segment.rules,
            description: segment.description
          })
          .select()
          .single();
        
        if (newSegment) {
          createdSegments.push(newSegment);
        }
      }
    }

    // Get all segments for analysis
    const { data: allSegments } = await deps.supabase
      .from('subscriber_segments')
      .select('*')
      .eq('tenant_id', tenantId);

    // Calculate segment sizes (mock)
    const segmentSizes = await this.calculateSegmentSizes(tenantId, allSegments || [], deps);

    return {
      action: 'segments_managed',
      segmentsCreated: createdSegments.length,
      totalSegments: allSegments?.length || 0,
      segmentSizes
    };
  }

  private async analyzePerformance(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get recent campaigns
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: campaigns } = await deps.supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'sent')
      .gte('sent_at', thirtyDaysAgo.toISOString())
      .order('sent_at', { ascending: false });

    if (!campaigns || campaigns.length === 0) {
      return { action: 'no_campaigns_to_analyze' };
    }

    // Calculate metrics (mock implementation)
    const metrics = this.calculateCampaignMetrics(campaigns);
    const trends = this.analyzeTrends(campaigns);
    const recommendations = this.generatePerformanceRecommendations(metrics, trends);

    // Store performance insights
    await deps.supabase
      .from('insights')
      .insert({
        tenant_id: tenantId,
        kpi: 'newsletter_performance',
        value: metrics.averageOpenRate,
        window: 'monthly',
        meta: {
          metrics,
          trends,
          recommendations
        },
        computed_at: new Date().toISOString()
      });

    return {
      action: 'performance_analyzed',
      campaignsAnalyzed: campaigns.length,
      averageOpenRate: `${metrics.averageOpenRate}%`,
      averageClickRate: `${metrics.averageClickRate}%`,
      bestPerformingTemplate: metrics.bestTemplate,
      trends,
      recommendations
    };
  }

  private async createSeasonalCampaign(tenantId: string, deps: AgentDependencies): Promise<any> {
    const currentSeason = this.getCurrentSeason();
    const seasonalTopics = this.getSeasonalTopics(currentSeason);
    
    // Get seasonal products
    const { data: seasonalProducts } = await deps.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .limit(5);

    // Generate seasonal content
    const seasonalContent = await this.generateSeasonalContent(
      currentSeason,
      seasonalTopics,
      seasonalProducts || [],
      deps
    );

    // Create campaign
    const campaign = await this.createCampaign(
      tenantId,
      'seasonal',
      seasonalContent,
      deps
    );

    return {
      action: 'seasonal_campaign_created',
      campaignId: campaign.id,
      season: currentSeason,
      topics: seasonalTopics,
      productsIncluded: seasonalProducts?.length || 0
    };
  }

  // Helper methods
  private async generateRoundupContent(
    posts: any[],
    products: any[],
    deps: AgentDependencies
  ): Promise<any> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    return {
      header: {
        title: `Weekly Wearable Tech Roundup`,
        subtitle: `Week of ${weekStart.toLocaleDateString()}`,
        image: 'https://example.com/newsletter-header.jpg'
      },
      sections: {
        intro: {
          content: 'This week brought exciting developments in wearable technology. Here are the highlights you shouldn\'t miss.'
        },
        featured_reviews: {
          posts: posts.filter(p => p.type === 'review').slice(0, 3).map(post => ({
            title: post.title,
            excerpt: post.excerpt,
            url: `https://example.com/blog/${post.slug}`,
            image: post.images?.[0]?.url
          }))
        },
        trending_products: {
          products: products.slice(0, 4).map(product => ({
            title: product.title,
            price: product.price_snapshot,
            image: product.images?.[0]?.url,
            affiliate_url: product.affiliate_url,
            rating: product.rating
          }))
        },
        tech_news: {
          items: [
            'New fitness tracking algorithms improve accuracy by 15%',
            'Major smartwatch update adds sleep coaching features',
            'Wearable market sees 23% growth in health monitoring devices'
          ]
        },
        deals: {
          items: products.filter(p => p.price_snapshot).slice(0, 3).map(product => ({
            title: product.title,
            original_price: product.price_snapshot,
            sale_price: this.calculateSalePrice(product.price_snapshot),
            savings: this.calculateSavings(product.price_snapshot),
            affiliate_url: product.affiliate_url
          }))
        }
      }
    };
  }

  private async generateSpotlightContent(
    primaryProduct: any,
    relatedProducts: any[],
    reviews: any[],
    deps: AgentDependencies
  ): Promise<any> {
    return {
      header: {
        title: `Product Spotlight: ${primaryProduct.title}`,
        subtitle: 'In-depth analysis and expert insights',
        image: primaryProduct.images?.[0]?.url
      },
      sections: {
        hero_product: {
          product: {
            title: primaryProduct.title,
            brand: primaryProduct.brand,
            price: primaryProduct.price_snapshot,
            rating: primaryProduct.rating,
            image: primaryProduct.images?.[0]?.url,
            affiliate_url: primaryProduct.affiliate_url
          }
        },
        key_features: {
          features: primaryProduct.features?.slice(0, 5) || [],
          health_metrics: primaryProduct.health_metrics || [],
          battery_life: primaryProduct.battery_life_hours,
          water_resistance: primaryProduct.water_resistance
        },
        expert_review: {
          review: reviews.find(r => r.title.includes(primaryProduct.title.split(' ')[0])) || {
            title: `${primaryProduct.title} Review`,
            excerpt: `Our comprehensive review of the ${primaryProduct.title}`,
            url: `https://example.com/reviews/${primaryProduct.asin}`
          }
        },
        comparisons: {
          products: relatedProducts.slice(0, 3).map(product => ({
            title: product.title,
            price: product.price_snapshot,
            rating: product.rating,
            key_difference: this.identifyKeyDifference(primaryProduct, product)
          }))
        }
      }
    };
  }

  private async generateSeasonalContent(
    season: string,
    topics: string[],
    products: any[],
    deps: AgentDependencies
  ): Promise<any> {
    return {
      header: {
        title: `${season} Wearable Tech Guide`,
        subtitle: `Best picks for ${season.toLowerCase()} activities`,
        image: `https://example.com/seasonal/${season.toLowerCase()}.jpg`
      },
      sections: {
        seasonal_intro: {
          content: `As ${season.toLowerCase()} approaches, it's time to prepare your wearable tech for the season ahead. Here are our top recommendations.`
        },
        category_highlights: {
          categories: this.getSeasonalCategories(season).map(category => ({
            name: category,
            products: products.filter(p => this.matchesSeasonalCategory(p, category)).slice(0, 2)
          }))
        },
        seasonal_tips: {
          tips: this.getSeasonalTips(season)
        }
      }
    };
  }

  private async createCampaign(
    tenantId: string,
    templateType: string,
    content: any,
    deps: AgentDependencies
  ): Promise<NewsletterCampaign> {
    const template = this.newsletterTemplates[templateType];
    const htmlContent = await this.generateHTMLContent(template, content, deps);
    
    const campaign = {
      tenant_id: tenantId,
      template_type: templateType,
      subject: this.personalizeSubject(template.subject, content),
      preheader: template.preheader,
      html: htmlContent,
      segment: 'all_subscribers',
      status: 'draft',
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
    };

    const { data: savedCampaign, error } = await deps.supabase
      .from('newsletter_campaigns')
      .insert(campaign)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }

    return savedCampaign as NewsletterCampaign;
  }

  private async generateHTMLContent(template: NewsletterTemplate, content: any, deps: AgentDependencies): Promise<string> {
    // Mock HTML generation - in real implementation, use a template engine
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${content.header?.title || 'Newsletter'}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .section { margin: 30px 0; }
    .product { border: 1px solid #ddd; padding: 15px; margin: 10px 0; }
    .cta { text-align: center; margin: 30px 0; }
    .btn { background: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${content.header?.title || 'Wearable Tech Newsletter'}</h1>
      <p>${content.header?.subtitle || ''}</p>
    </div>`;

    // Add content sections based on template structure
    for (const sectionType of template.structure) {
      if (content.sections?.[sectionType]) {
        html += this.renderSection(sectionType, content.sections[sectionType]);
      }
    }

    html += `
    <div class="cta">
      <a href="#" class="btn">${template.cta.primary}</a>
    </div>
    <div class="footer">
      <p><small>You received this email because you subscribed to our newsletter.</small></p>
      <p><small><a href="#">Unsubscribe</a> | <a href="#">Update Preferences</a></small></p>
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  private renderSection(sectionType: string, sectionData: any): string {
    switch (sectionType) {
      case 'featured_reviews':
        return `
    <div class="section">
      <h2>Featured Reviews</h2>
      ${(sectionData.posts || []).map((post: any) => `
        <div class="product">
          <h3><a href="${post.url}">${post.title}</a></h3>
          <p>${post.excerpt}</p>
        </div>
      `).join('')}
    </div>`;
      
      case 'trending_products':
        return `
    <div class="section">
      <h2>Trending Products</h2>
      ${(sectionData.products || []).map((product: any) => `
        <div class="product">
          <h3>${product.title}</h3>
          <p>Price: ${product.price || 'N/A'} | Rating: ${product.rating || 'N/A'}</p>
          <a href="${product.affiliate_url}">View Product</a>
        </div>
      `).join('')}
    </div>`;
      
      default:
        return `
    <div class="section">
      <h2>${sectionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h2>
      <p>${sectionData.content || JSON.stringify(sectionData)}</p>
    </div>`;
    }
  }

  private personalizeSubject(subject: string, content: any): string {
    const today = new Date();
    const replacements = {
      '[Date]': today.toLocaleDateString(),
      '[Product Name]': content.sections?.hero_product?.product?.title || 'Featured Product',
      '[Season]': this.getCurrentSeason(),
      '[Use Case]': 'Fitness & Health'
    };

    let personalizedSubject = subject;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      personalizedSubject = personalizedSubject.replace(placeholder, value);
    });

    return personalizedSubject;
  }

  private async getSubscribers(tenantId: string, segmentId?: string, deps?: AgentDependencies): Promise<any[]> {
    // Mock subscribers - in real implementation, query actual subscriber database
    return [
      { id: '1', email: 'user1@example.com', preferences: { fitness: true } },
      { id: '2', email: 'user2@example.com', preferences: { tech: true } },
      { id: '3', email: 'user3@example.com', preferences: { budget: true } }
    ];
  }

  private async dispatchCampaign(campaign: any, subscribers: any[], deps: AgentDependencies): Promise<any> {
    // Mock email sending - in real implementation, integrate with email service (SendGrid, Mailgun, etc.)
    console.log(`Sending campaign "${campaign.subject}" to ${subscribers.length} subscribers`);
    
    return {
      sent: subscribers.length,
      estimatedDelivery: '15 minutes',
      trackingId: `track_${Date.now()}`
    };
  }

  private async calculateSegmentSizes(tenantId: string, segments: any[], deps: AgentDependencies): Promise<Record<string, number>> {
    // Mock segment size calculation
    const sizes: Record<string, number> = {};
    
    for (const segment of segments) {
      // In real implementation, count subscribers matching segment rules
      sizes[segment.name] = Math.floor(Math.random() * 1000) + 100;
    }
    
    return sizes;
  }

  private calculateCampaignMetrics(campaigns: any[]): EmailMetrics & { bestTemplate: string } {
    // Mock metrics calculation
    const totalSent = campaigns.reduce((sum, c) => sum + (c.recipient_count || 0), 0);
    const avgOpenRate = 25 + Math.random() * 10; // 25-35%
    const avgClickRate = 3 + Math.random() * 4; // 3-7%
    
    return {
      sent: totalSent,
      delivered: Math.floor(totalSent * 0.98),
      opened: Math.floor(totalSent * (avgOpenRate / 100)),
      clicked: Math.floor(totalSent * (avgClickRate / 100)),
      unsubscribed: Math.floor(totalSent * 0.005),
      bounced: Math.floor(totalSent * 0.02),
      openRate: Math.round(avgOpenRate * 10) / 10,
      clickRate: Math.round(avgClickRate * 10) / 10,
      unsubscribeRate: 0.5,
      bestTemplate: 'roundup' // Most common template
    };
  }

  private analyzeTrends(campaigns: any[]): any {
    return {
      openRateTrend: 'increasing',
      clickRateTrend: 'stable',
      bestDayToSend: 'Friday',
      bestTimeToSend: '10:00 AM',
      topPerformingSubjectLines: [
        'Weekly Roundup',
        'Product Spotlight',
        'Deal Alert'
      ]
    };
  }

  private generatePerformanceRecommendations(metrics: any, trends: any): string[] {
    const recommendations = [];
    
    if (metrics.openRate < 20) {
      recommendations.push('Improve subject lines to increase open rates');
    }
    
    if (metrics.clickRate < 3) {
      recommendations.push('Add more compelling calls-to-action');
    }
    
    if (metrics.unsubscribeRate > 1) {
      recommendations.push('Review content relevance and frequency');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Newsletter performance is strong - maintain current strategy');
    }
    
    return recommendations;
  }

  // Utility methods
  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }

  private getSeasonalTopics(season: string): string[] {
    const topics = {
      Spring: ['outdoor fitness', 'running prep', 'cycling season', 'spring cleaning'],
      Summer: ['swimming tracking', 'vacation tech', 'heat monitoring', 'UV protection'],
      Fall: ['back to school', 'marathon training', 'weather resistance', 'indoor workouts'],
      Winter: ['holiday gifts', 'indoor fitness', 'cold weather', 'new year goals']
    };
    
    return topics[season as keyof typeof topics] || ['general fitness', 'health monitoring'];
  }

  private getSeasonalCategories(season: string): string[] {
    const categories = {
      Spring: ['Running Watches', 'Fitness Trackers', 'Outdoor Gear'],
      Summer: ['Swimming Watches', 'Adventure Gear', 'Travel Tech'],
      Fall: ['Marathon Watches', 'Indoor Fitness', 'Weather Resistant'],
      Winter: ['Gift Ideas', 'Indoor Training', 'Health Monitoring']
    };
    
    return categories[season as keyof typeof categories] || ['General Wearables'];
  }

  private getSeasonalTips(season: string): string[] {
    const tips = {
      Spring: [
        'Calibrate your GPS for outdoor season',
        'Update fitness goals for spring activities',
        'Clean and maintain your devices after winter storage'
      ],
      Summer: [
        'Protect devices from heat and sun exposure',
        'Stay hydrated - use water reminder features',
        'Track UV exposure for safer outdoor workouts'
      ],
      Fall: [
        'Prepare for shorter daylight hours',
        'Switch to indoor workout tracking modes',
        'Consider devices with better visibility in low light'
      ],
      Winter: [
        'Extend battery life in cold weather',
        'Use indoor activity tracking features',
        'Set reminders for movement during sedentary periods'
      ]
    };
    
    return tips[season as keyof typeof tips] || ['General wearable tips'];
  }

  private matchesSeasonalCategory(product: any, category: string): boolean {
    // Simple matching logic
    const productTitle = product.title.toLowerCase();
    const categoryLower = category.toLowerCase();
    
    return productTitle.includes(categoryLower.split(' ')[0]);
  }

  private calculateSalePrice(originalPrice: string): string {
    const price = parseFloat(originalPrice.replace(/[^\d.]/g, ''));
    const salePrice = price * (0.8 + Math.random() * 0.15); // 15-20% off
    return `$${salePrice.toFixed(2)}`;
  }

  private calculateSavings(originalPrice: string): string {
    const price = parseFloat(originalPrice.replace(/[^\d.]/g, ''));
    const savings = price * (0.05 + Math.random() * 0.15); // 5-20% savings
    return `$${savings.toFixed(2)}`;
  }

  private identifyKeyDifference(primaryProduct: any, comparisonProduct: any): string {
    // Simple comparison logic
    if (primaryProduct.battery_life_hours && comparisonProduct.battery_life_hours) {
      const diff = primaryProduct.battery_life_hours - comparisonProduct.battery_life_hours;
      if (Math.abs(diff) > 12) {
        return diff > 0 ? 'Longer battery life' : 'Shorter battery life';
      }
    }
    
    if (primaryProduct.price_snapshot && comparisonProduct.price_snapshot) {
      const price1 = parseFloat(primaryProduct.price_snapshot.replace(/[^\d.]/g, ''));
      const price2 = parseFloat(comparisonProduct.price_snapshot.replace(/[^\d.]/g, ''));
      const diff = price1 - price2;
      
      if (Math.abs(diff) > 50) {
        return diff > 0 ? 'Higher price point' : 'More affordable';
      }
    }
    
    return 'Different target audience';
  }
}

export const newsletterAgent = new NewsletterAgent();