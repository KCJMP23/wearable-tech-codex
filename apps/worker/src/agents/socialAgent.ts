import type { AgentTask } from '@affiliate-factory/sdk';
import { BaseAgent, type AgentDependencies, type AgentResult } from './base';

interface SocialAgentInput {
  tenantId: string;
  action: 'create_post' | 'schedule_content' | 'analyze_performance' | 'generate_captions' | 'optimize_hashtags';
  platform?: 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'tiktok';
  postId?: string;
  contentType?: 'product_feature' | 'blog_promotion' | 'seasonal' | 'educational' | 'behind_scenes';
  scheduledTime?: string;
  customMessage?: string;
}

interface SocialPost {
  platform: string;
  caption: string;
  hashtags: string[];
  imageUrl?: string;
  ctaUrl?: string;
  scheduledTime: string;
  engagement: {
    estimatedReach: number;
    estimatedEngagement: number;
  };
}

export class SocialAgent extends BaseAgent {
  name = 'SocialAgent';
  description = 'Creates and schedules social media content, generates captions with images, and analyzes performance';
  version = '1.0.0';

  private readonly platformSpecs = {
    instagram: { maxLength: 2200, hashtagLimit: 30, imageRequired: true },
    twitter: { maxLength: 280, hashtagLimit: 10, imageRequired: false },
    facebook: { maxLength: 500, hashtagLimit: 15, imageRequired: false },
    linkedin: { maxLength: 1300, hashtagLimit: 10, imageRequired: false },
    tiktok: { maxLength: 150, hashtagLimit: 5, imageRequired: true }
  };

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    this.validateRequiredEnv(deps, ['supabase']);
    
    return this.withErrorHandling(async () => {
      const input = task.input as SocialAgentInput;
      
      switch (input.action) {
        case 'create_post':
          return await this.createPost(input.tenantId, input.platform!, input.contentType!, deps);
        case 'schedule_content':
          return await this.scheduleContent(input.tenantId, input.postId, input.scheduledTime, deps);
        case 'analyze_performance':
          return await this.analyzePerformance(input.tenantId, input.platform, deps);
        case 'generate_captions':
          return await this.generateCaptions(input.tenantId, input.contentType!, input.platform, deps);
        case 'optimize_hashtags':
          return await this.optimizeHashtags(input.tenantId, input.platform!, deps);
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    }, `execute ${task.input?.action || 'unknown'}`);
  }

  private async createPost(
    tenantId: string, 
    platform: string, 
    contentType: string, 
    deps: AgentDependencies
  ): Promise<any> {
    // Get tenant context and recent content
    const tenantData = await this.getTenantContext(tenantId, deps);
    const recentContent = await this.getRecentContent(tenantId, contentType, deps);
    
    // Generate social media post
    const socialPost = await this.generateSocialPost(
      tenantData,
      recentContent,
      platform,
      contentType,
      deps
    );

    // Save to calendar for scheduling
    const { data: calendarItem, error } = await deps.supabase
      .from('calendar')
      .insert({
        tenant_id: tenantId,
        item_type: 'social',
        title: `${platform} post - ${contentType}`,
        status: 'planned',
        run_at: socialPost.scheduledTime,
        meta: {
          platform,
          caption: socialPost.caption,
          hashtags: socialPost.hashtags,
          imageUrl: socialPost.imageUrl,
          ctaUrl: socialPost.ctaUrl,
          contentType
        }
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to schedule social post: ${error.message}`);
    }

    return {
      action: 'post_created',
      platform,
      contentType,
      calendarItemId: calendarItem.id,
      caption: socialPost.caption,
      hashtags: socialPost.hashtags,
      estimatedReach: socialPost.engagement.estimatedReach
    };
  }

  private async scheduleContent(
    tenantId: string,
    postId?: string,
    scheduledTime?: string,
    deps?: AgentDependencies
  ): Promise<any> {
    // Get upcoming blog posts or products to promote
    const { data: upcomingPosts } = await deps!.supabase
      .from('posts')
      .select('id, title, excerpt, published_at, type')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .gte('published_at', new Date().toISOString())
      .order('published_at', { ascending: true })
      .limit(5);

    const scheduledPosts = [];
    const platforms = ['instagram', 'twitter', 'facebook'];

    for (const post of upcomingPosts || []) {
      for (const platform of platforms) {
        const socialPost = await this.generatePostPromotion(post, platform, deps!);
        
        const runTime = scheduledTime 
          ? new Date(scheduledTime)
          : new Date(new Date(post.published_at).getTime() + 2 * 60 * 60 * 1000); // 2 hours after publish

        const { data: calendarItem } = await deps!.supabase
          .from('calendar')
          .insert({
            tenant_id: tenantId,
            item_type: 'social',
            title: `${platform} - ${post.title}`,
            status: 'scheduled',
            run_at: runTime.toISOString(),
            meta: {
              platform,
              postId: post.id,
              ...socialPost
            }
          })
          .select()
          .single();

        if (calendarItem) {
          scheduledPosts.push({
            platform,
            postTitle: post.title,
            scheduledTime: runTime.toISOString(),
            calendarItemId: calendarItem.id
          });
        }
      }
    }

    return {
      action: 'content_scheduled',
      postsScheduled: scheduledPosts.length,
      platforms: platforms.length,
      schedule: scheduledPosts
    };
  }

  private async analyzePerformance(
    tenantId: string,
    platform?: string,
    deps?: AgentDependencies
  ): Promise<any> {
    // Get recent social media posts
    const { data: socialPosts } = await deps!.supabase
      .from('calendar')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_type', 'social')
      .eq('status', 'done')
      .gte('run_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('run_at', { ascending: false });

    // Mock performance analysis - in real implementation, use social media APIs
    const performanceData = this.analyzePostPerformance(socialPosts || [], platform);

    // Store performance insights
    await deps!.supabase
      .from('insights')
      .insert({
        tenant_id: tenantId,
        kpi: 'social_performance',
        value: performanceData.averageEngagement,
        window: 'monthly',
        meta: performanceData,
        computed_at: new Date().toISOString()
      });

    return {
      action: 'performance_analyzed',
      timeframe: '30_days',
      totalPosts: performanceData.totalPosts,
      averageEngagement: performanceData.averageEngagement,
      topPerformingPlatform: performanceData.topPlatform,
      recommendations: performanceData.recommendations,
      metrics: performanceData.platformMetrics
    };
  }

  private async generateCaptions(
    tenantId: string,
    contentType: string,
    platform?: string,
    deps?: AgentDependencies
  ): Promise<any> {
    const tenantData = await this.getTenantContext(tenantId, deps!);
    const recentContent = await this.getRecentContent(tenantId, contentType, deps!);
    
    const captions = [];
    const platforms = platform ? [platform] : Object.keys(this.platformSpecs);

    for (const targetPlatform of platforms) {
      const caption = await this.generatePlatformCaption(
        tenantData,
        recentContent,
        targetPlatform,
        contentType
      );

      captions.push({
        platform: targetPlatform,
        caption: caption.text,
        hashtags: caption.hashtags,
        characterCount: caption.text.length,
        withinLimit: caption.text.length <= this.platformSpecs[targetPlatform as keyof typeof this.platformSpecs].maxLength
      });
    }

    return {
      action: 'captions_generated',
      contentType,
      totalCaptions: captions.length,
      captions
    };
  }

  private async optimizeHashtags(
    tenantId: string,
    platform: string,
    deps: AgentDependencies
  ): Promise<any> {
    const tenantData = await this.getTenantContext(tenantId, deps);
    
    // Get trending hashtags for the niche
    const trendingTags = await this.getTrendingHashtags(tenantData.niche, platform);
    
    // Get performance data for existing hashtags
    const existingTags = await this.getExistingHashtags(tenantId, platform, deps);
    
    // Generate optimized hashtag sets
    const optimizedSets = this.generateHashtagSets(
      trendingTags,
      existingTags,
      tenantData.niche,
      platform
    );

    return {
      action: 'hashtags_optimized',
      platform,
      trendingTags: trendingTags.slice(0, 10),
      optimizedSets,
      recommendations: this.generateHashtagRecommendations(trendingTags, existingTags)
    };
  }

  // Helper methods
  private async getTenantContext(tenantId: string, deps: AgentDependencies): Promise<any> {
    const { data: tenant } = await deps.supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    return {
      tenant: tenant || {},
      niche: tenant?.name || 'Wearable Technology',
      brandVoice: tenant?.theme?.brandVoice || 'friendly',
      colors: tenant?.color_tokens || {}
    };
  }

  private async getRecentContent(
    tenantId: string,
    contentType: string,
    deps: AgentDependencies
  ): Promise<any> {
    if (contentType === 'product_feature') {
      const { data: products } = await deps.supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      return { type: 'products', items: products || [] };
    }

    const { data: posts } = await deps.supabase
      .from('posts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(3);

    return { type: 'posts', items: posts || [] };
  }

  private async generateSocialPost(
    tenantData: any,
    content: any,
    platform: string,
    contentType: string,
    deps: AgentDependencies
  ): Promise<SocialPost> {
    const platformSpec = this.platformSpecs[platform as keyof typeof this.platformSpecs];
    
    // Generate caption based on content type
    const caption = this.generateCaptionForType(
      contentType,
      content,
      tenantData,
      platformSpec.maxLength
    );

    // Generate relevant hashtags
    const hashtags = await this.generateRelevantHashtags(
      tenantData.niche,
      contentType,
      platform,
      platformSpec.hashtagLimit
    );

    // Select appropriate image
    const imageUrl = this.selectImage(content, contentType, platformSpec.imageRequired);

    // Generate CTA URL
    const ctaUrl = this.generateCTAUrl(content, contentType);

    // Calculate optimal posting time
    const scheduledTime = this.calculateOptimalPostTime(platform);

    return {
      platform,
      caption,
      hashtags,
      imageUrl,
      ctaUrl,
      scheduledTime: scheduledTime.toISOString(),
      engagement: {
        estimatedReach: this.estimateReach(platform, hashtags.length),
        estimatedEngagement: this.estimateEngagement(platform, caption.length)
      }
    };
  }

  private generateCaptionForType(
    contentType: string,
    content: any,
    tenantData: any,
    maxLength: number
  ): string {
    const templates = {
      product_feature: [
        "🔥 Just discovered this amazing {product}! The {feature} is a game-changer for {use_case}.",
        "✨ Why we love the {product}: {reason}. Perfect for anyone who {target_audience}.",
        "💡 Pro tip: The {product} excels at {feature}. Here's why it's worth considering..."
      ],
      blog_promotion: [
        "📖 New guide: {title}. Everything you need to know about {topic}.",
        "🎯 Just published: {title}. Get the insights that matter most.",
        "💡 Deep dive: {title}. Save this for later!"
      ],
      educational: [
        "🤓 Quick tip: {tip}. Try this and let us know how it works!",
        "📚 Did you know? {fact}. This changes everything about {topic}.",
        "💡 Pro insight: {insight}. Game-changer for {audience}."
      ],
      seasonal: [
        "🎉 {season} is here! Time to {action} with {product_category}.",
        "❄️ {season} essentials: {list}. Which one is your favorite?",
        "🌟 Perfect timing for {activity}! Here's what you need..."
      ]
    };

    const template = templates[contentType as keyof typeof templates]?.[0] || templates.educational[0];
    
    // Replace placeholders with actual content
    let caption = template;
    
    if (content.items?.[0]) {
      const item = content.items[0];
      caption = caption
        .replace('{product}', item.title || 'this product')
        .replace('{title}', item.title || 'our latest guide')
        .replace('{feature}', item.health_metrics?.[0] || 'advanced features')
        .replace('{use_case}', 'fitness tracking')
        .replace('{topic}', tenantData.niche)
        .replace('{reason}', 'its accuracy and ease of use')
        .replace('{target_audience}', 'values precision');
    }

    // Ensure within character limit
    if (caption.length > maxLength - 50) { // Leave room for hashtags
      caption = caption.substring(0, maxLength - 53) + '...';
    }

    return caption;
  }

  private async generateRelevantHashtags(
    niche: string,
    contentType: string,
    platform: string,
    limit: number
  ): Promise<string[]> {
    const baseHashtags = [
      '#wearabletech',
      '#smartwatch',
      '#fitnesstracker',
      '#healthtech',
      '#wearables'
    ];

    const contentHashtags = {
      product_feature: ['#review', '#unboxing', '#tech'],
      blog_promotion: ['#guide', '#tips', '#learn'],
      educational: ['#tips', '#howto', '#education'],
      seasonal: ['#seasonal', '#deals', '#trending']
    };

    const platformHashtags = {
      instagram: ['#instagood', '#photooftheday'],
      twitter: ['#tech', '#innovation'],
      tiktok: ['#fyp', '#viral'],
      facebook: ['#technology'],
      linkedin: ['#innovation', '#technology']
    };

    const allTags = [
      ...baseHashtags,
      ...(contentHashtags[contentType as keyof typeof contentHashtags] || []),
      ...(platformHashtags[platform as keyof typeof platformHashtags] || [])
    ];

    return allTags.slice(0, limit);
  }

  private selectImage(content: any, contentType: string, required: boolean): string | undefined {
    if (!required && Math.random() > 0.7) return undefined;

    if (content.items?.[0]?.images?.[0]?.url) {
      return content.items[0].images[0].url;
    }

    // Return default image for content type
    const defaultImages = {
      product_feature: 'https://example.com/product-hero.jpg',
      blog_promotion: 'https://example.com/blog-hero.jpg',
      educational: 'https://example.com/tips-hero.jpg',
      seasonal: 'https://example.com/seasonal-hero.jpg'
    };

    return defaultImages[contentType as keyof typeof defaultImages];
  }

  private generateCTAUrl(content: any, contentType: string): string {
    if (contentType === 'product_feature' && content.items?.[0]?.affiliate_url) {
      return this.ensureAmazonTag(content.items[0].affiliate_url);
    }

    if (contentType === 'blog_promotion' && content.items?.[0]?.slug) {
      return `https://example.com/blog/${content.items[0].slug}`;
    }

    return 'https://example.com';
  }

  private calculateOptimalPostTime(platform: string): Date {
    // Platform-specific optimal posting times
    const optimalTimes = {
      instagram: { hour: 11, minute: 0 }, // 11 AM
      twitter: { hour: 9, minute: 0 },    // 9 AM
      facebook: { hour: 15, minute: 0 },  // 3 PM
      linkedin: { hour: 8, minute: 0 },   // 8 AM
      tiktok: { hour: 18, minute: 0 }     // 6 PM
    };

    const time = optimalTimes[platform as keyof typeof optimalTimes] || { hour: 12, minute: 0 };
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(time.hour, time.minute, 0, 0);

    return tomorrow;
  }

  private estimateReach(platform: string, hashtagCount: number): number {
    const baseReach = {
      instagram: 500,
      twitter: 200,
      facebook: 300,
      linkedin: 150,
      tiktok: 1000
    };

    const base = baseReach[platform as keyof typeof baseReach] || 300;
    return base + (hashtagCount * 50);
  }

  private estimateEngagement(platform: string, captionLength: number): number {
    const engagementRates = {
      instagram: 0.03,
      twitter: 0.02,
      facebook: 0.025,
      linkedin: 0.015,
      tiktok: 0.05
    };

    const rate = engagementRates[platform as keyof typeof engagementRates] || 0.025;
    const lengthBonus = captionLength > 100 ? 1.2 : 1.0;
    
    return Math.round(this.estimateReach(platform, 10) * rate * lengthBonus);
  }

  private async generatePostPromotion(post: any, platform: string, deps: AgentDependencies): Promise<any> {
    const platformSpec = this.platformSpecs[platform as keyof typeof this.platformSpecs];
    
    const promotionCaptions = [
      `📖 New post: ${post.title}. ${post.excerpt?.substring(0, 100)}...`,
      `✨ Just published: ${post.title}. Check it out!`,
      `💡 Latest insights: ${post.title}. Everything you need to know.`
    ];

    const caption = promotionCaptions[Math.floor(Math.random() * promotionCaptions.length)];
    
    return {
      caption: caption.length > platformSpec.maxLength 
        ? caption.substring(0, platformSpec.maxLength - 3) + '...'
        : caption,
      hashtags: await this.generateRelevantHashtags('wearable technology', 'blog_promotion', platform, platformSpec.hashtagLimit),
      ctaUrl: `https://example.com/blog/${post.slug}`
    };
  }

  private analyzePostPerformance(posts: any[], platform?: string): any {
    // Mock performance analysis
    const platformPosts = platform ? posts.filter(p => p.meta?.platform === platform) : posts;
    
    const mockMetrics = {
      totalPosts: platformPosts.length,
      averageEngagement: 250 + Math.random() * 200,
      topPlatform: 'instagram',
      platformMetrics: {
        instagram: { posts: 12, avgEngagement: 280, growth: 15 },
        twitter: { posts: 8, avgEngagement: 150, growth: 8 },
        facebook: { posts: 6, avgEngagement: 200, growth: 12 }
      },
      recommendations: [
        'Increase posting frequency on Instagram',
        'Use more video content for higher engagement',
        'Post during optimal times for each platform'
      ]
    };

    return mockMetrics;
  }

  private async getTrendingHashtags(niche: string, platform: string): Promise<string[]> {
    // Mock trending hashtags - in real implementation, use social media APIs
    return [
      '#wearabletech2024',
      '#smartwatchreview',
      '#fitnessmotivation',
      '#healthgoals',
      '#techreviews',
      '#gadgetlover',
      '#workouttech',
      '#sleeptracking',
      '#heartratemonitor',
      '#fitnessjourney'
    ];
  }

  private async getExistingHashtags(tenantId: string, platform: string, deps: AgentDependencies): Promise<any[]> {
    const { data: socialPosts } = await deps.supabase
      .from('calendar')
      .select('meta')
      .eq('tenant_id', tenantId)
      .eq('item_type', 'social')
      .like('meta->platform', platform)
      .limit(20);

    const hashtagFrequency: Record<string, number> = {};
    
    for (const post of socialPosts || []) {
      const hashtags = post.meta?.hashtags || [];
      for (const tag of hashtags) {
        hashtagFrequency[tag] = (hashtagFrequency[tag] || 0) + 1;
      }
    }

    return Object.entries(hashtagFrequency)
      .map(([tag, count]) => ({ tag, count, performance: 'average' }))
      .sort((a, b) => b.count - a.count);
  }

  private generateHashtagSets(
    trending: string[],
    existing: any[],
    niche: string,
    platform: string
  ): any[] {
    const platformSpec = this.platformSpecs[platform as keyof typeof this.platformSpecs];
    
    return [
      {
        name: 'High Engagement',
        hashtags: trending.slice(0, Math.floor(platformSpec.hashtagLimit * 0.7)),
        description: 'Mix of trending and niche-specific tags'
      },
      {
        name: 'Brand Building',
        hashtags: existing.slice(0, 5).map(e => e.tag).concat(trending.slice(0, 5)),
        description: 'Consistent brand hashtags with trending additions'
      },
      {
        name: 'Discovery',
        hashtags: trending.slice(0, platformSpec.hashtagLimit),
        description: 'Maximum reach with trending hashtags'
      }
    ];
  }

  private generateHashtagRecommendations(trending: string[], existing: any[]): string[] {
    return [
      'Mix trending hashtags with consistent brand tags',
      'Rotate hashtag sets to avoid shadowbanning',
      'Monitor hashtag performance and adjust accordingly',
      'Use platform-specific hashtag limits effectively'
    ];
  }
}

export const socialAgent = new SocialAgent();