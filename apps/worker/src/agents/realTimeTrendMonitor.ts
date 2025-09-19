import { createServiceClient } from '@affiliate-factory/sdk';
import { createRedditClient } from '../lib/reddit';
import { createSearchClient } from '../lib/search';
import { createOpenAIClient } from '../lib/openai';

interface TrendAlert {
  id: string;
  source: 'reddit' | 'google' | 'social' | 'news';
  topic: string;
  score: number;
  velocity: 'viral' | 'rising' | 'steady';
  relevance: number;
  action: 'create_content' | 'update_products' | 'send_alert' | 'schedule_post';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  metadata: {
    keywords: string[];
    sentiment: number;
    engagement: number;
    competition: number;
  };
}

export class RealTimeTrendMonitor {
  private supabase = createServiceClient();
  private reddit = createRedditClient();
  private search = createSearchClient();
  private openai = createOpenAIClient();
  
  private readonly TREND_THRESHOLD = 0.75;
  private readonly VIRAL_THRESHOLD = 0.9;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  async startMonitoring(tenantId: string, niche: string) {
    console.log(`🔍 Starting real-time trend monitoring for ${niche}`);
    
    // Set up continuous monitoring
    setInterval(() => this.checkTrends(tenantId, niche), this.CHECK_INTERVAL);
    
    // Initial check
    await this.checkTrends(tenantId, niche);
  }
  
  private async checkTrends(tenantId: string, niche: string) {
    try {
      // Gather trend data from multiple sources
      const [redditTrends, googleTrends, socialSignals] = await Promise.all([
        this.getRedditTrends(niche),
        this.getGoogleTrends(niche),
        this.getSocialSignals(niche)
      ]);
      
      // Analyze trends with AI
      const alerts = await this.analyzeTrends({
        reddit: redditTrends,
        google: googleTrends,
        social: socialSignals,
        niche
      });
      
      // Process high-priority alerts
      for (const alert of alerts) {
        if (alert.score >= this.TREND_THRESHOLD) {
          await this.processAlert(tenantId, alert);
        }
      }
      
    } catch (error) {
      console.error('Trend monitoring error:', error);
    }
  }
  
  private async getRedditTrends(niche: string) {
    const subreddits = this.getSubredditsForNiche(niche);
    const trends = [];
    
    for (const subreddit of subreddits) {
      const posts = await this.reddit.getHotPosts(subreddit, 10);
      
      for (const post of posts) {
        const velocity = this.calculateVelocity(post.score, post.created_utc);
        
        if (velocity > 0.5) {
          trends.push({
            title: post.title,
            score: post.score,
            velocity,
            url: post.url,
            subreddit: post.subreddit,
            created: post.created_utc,
            engagement: post.num_comments / Math.max(1, post.score) * 100
          });
        }
      }
    }
    
    return trends.sort((a, b) => b.velocity - a.velocity).slice(0, 10);
  }
  
  private async getGoogleTrends(niche: string) {
    const queries = this.getTrendQueriesForNiche(niche);
    const trends = [];
    
    for (const query of queries) {
      const results = await this.search.search(query, { 
        freshness: 'day',
        count: 5 
      });
      
      // Analyze search volume and competition
      const trendScore = await this.calculateSearchTrendScore(results);
      
      if (trendScore > 0.6) {
        trends.push({
          query,
          score: trendScore,
          results: results.length,
          topResults: results.slice(0, 3)
        });
      }
    }
    
    return trends;
  }
  
  private async getSocialSignals(niche: string) {
    // Simulate social media trending topics
    // In production, this would integrate with Twitter/X API, Instagram, etc.
    return [
      {
        platform: 'twitter',
        hashtags: this.getTrendingHashtags(niche),
        engagement: Math.random() * 10000
      }
    ];
  }
  
  private async analyzeTrends(data: any) {
    const prompt = `
    Analyze these trending topics for a ${data.niche} affiliate site and identify actionable opportunities:
    
    Reddit Trends: ${JSON.stringify(data.reddit, null, 2)}
    Google Trends: ${JSON.stringify(data.google, null, 2)}
    Social Signals: ${JSON.stringify(data.social, null, 2)}
    
    For each significant trend, provide:
    1. Topic and keywords
    2. Urgency score (0-1)
    3. Content opportunity type
    4. Expected competition
    5. Recommended action
    
    Focus on trends that:
    - Are rising rapidly
    - Have commercial intent
    - Match the niche
    - Have low competition
    
    Return as JSON array of trend alerts.
    `;
    
    const analysis = await this.openai.generateJSON(prompt);
    
    return analysis.alerts.map((alert: any) => ({
      id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: alert.source || 'mixed',
      topic: alert.topic,
      score: alert.urgency,
      velocity: alert.urgency > 0.8 ? 'viral' : alert.urgency > 0.6 ? 'rising' : 'steady',
      relevance: alert.relevance || 0.8,
      action: this.determineAction(alert),
      priority: this.calculatePriority(alert.urgency),
      metadata: {
        keywords: alert.keywords || [],
        sentiment: alert.sentiment || 0.7,
        engagement: alert.engagement || 0.5,
        competition: alert.competition || 0.3
      }
    }));
  }
  
  private async processAlert(tenantId: string, alert: TrendAlert) {
    console.log(`🚨 Processing ${alert.priority} priority alert: ${alert.topic}`);
    
    // Store alert
    await this.supabase
      .from('trend_alerts')
      .insert({
        tenant_id: tenantId,
        alert_id: alert.id,
        topic: alert.topic,
        score: alert.score,
        velocity: alert.velocity,
        source: alert.source,
        priority: alert.priority,
        metadata: alert.metadata,
        processed: false
      });
    
    // Take automatic action based on alert
    switch (alert.action) {
      case 'create_content':
        await this.triggerContentCreation(tenantId, alert);
        break;
        
      case 'update_products':
        await this.triggerProductUpdate(tenantId, alert);
        break;
        
      case 'send_alert':
        await this.sendNotification(tenantId, alert);
        break;
        
      case 'schedule_post':
        await this.scheduleContent(tenantId, alert);
        break;
    }
    
    // If viral, trigger immediate multi-agent response
    if (alert.velocity === 'viral') {
      await this.triggerViralResponse(tenantId, alert);
    }
  }
  
  private async triggerContentCreation(tenantId: string, alert: TrendAlert) {
    // Queue immediate content generation
    await this.supabase
      .from('agent_tasks')
      .insert({
        tenant_id: tenantId,
        agent: 'EditorialAgent',
        input: {
          type: 'trending',
          topic: alert.topic,
          keywords: alert.metadata.keywords,
          priority: 'high',
          publishImmediately: alert.priority === 'urgent'
        },
        status: 'queued',
        priority: 1
      });
  }
  
  private async triggerProductUpdate(tenantId: string, alert: TrendAlert) {
    // Find and import related products
    await this.supabase
      .from('agent_tasks')
      .insert({
        tenant_id: tenantId,
        agent: 'ProductAgent',
        input: {
          action: 'import_trending',
          keywords: alert.metadata.keywords,
          count: 10,
          priority: 'high'
        },
        status: 'queued',
        priority: 2
      });
  }
  
  private async triggerViralResponse(tenantId: string, alert: TrendAlert) {
    console.log(`🔥 VIRAL TREND DETECTED: ${alert.topic}`);
    
    // Coordinate multi-agent response
    const tasks = [
      {
        tenant_id: tenantId,
        agent: 'EditorialAgent',
        input: {
          type: 'viral_response',
          topic: alert.topic,
          format: 'quick_post',
          publishImmediately: true
        },
        status: 'queued',
        priority: 0
      },
      {
        tenant_id: tenantId,
        agent: 'SocialAgent',
        input: {
          type: 'viral_amplification',
          topic: alert.topic,
          platforms: ['twitter', 'facebook', 'instagram']
        },
        status: 'queued',
        priority: 0
      },
      {
        tenant_id: tenantId,
        agent: 'NewsletterAgent',
        input: {
          type: 'flash_alert',
          topic: alert.topic,
          sendImmediately: true
        },
        status: 'queued',
        priority: 0
      }
    ];
    
    await this.supabase.from('agent_tasks').insert(tasks);
  }
  
  private async sendNotification(tenantId: string, alert: TrendAlert) {
    // Send admin notification
    await this.supabase
      .from('notifications')
      .insert({
        tenant_id: tenantId,
        type: 'trend_alert',
        title: `Trending: ${alert.topic}`,
        message: `A ${alert.velocity} trend has been detected with ${Math.round(alert.score * 100)}% relevance to your niche.`,
        priority: alert.priority,
        data: alert
      });
  }
  
  private async scheduleContent(tenantId: string, alert: TrendAlert) {
    // Schedule content for optimal timing
    const optimalTime = this.calculateOptimalPostTime(alert);
    
    await this.supabase
      .from('scheduled_posts')
      .insert({
        tenant_id: tenantId,
        type: 'trending_content',
        topic: alert.topic,
        scheduled_for: optimalTime,
        metadata: alert.metadata
      });
  }
  
  private calculateVelocity(score: number, createdAt: number): number {
    const hoursOld = (Date.now() - createdAt * 1000) / (1000 * 60 * 60);
    const velocityScore = score / Math.max(1, hoursOld);
    return Math.min(1, velocityScore / 1000);
  }
  
  private async calculateSearchTrendScore(results: any[]): Promise<number> {
    if (results.length === 0) return 0;
    
    const freshness = results.filter(r => {
      const date = new Date(r.datePublished);
      const hoursOld = (Date.now() - date.getTime()) / (1000 * 60 * 60);
      return hoursOld < 24;
    }).length / results.length;
    
    return freshness;
  }
  
  private determineAction(alert: any): string {
    if (alert.urgency > 0.8) return 'create_content';
    if (alert.commercial_intent > 0.7) return 'update_products';
    if (alert.urgency > 0.6) return 'schedule_post';
    return 'send_alert';
  }
  
  private calculatePriority(urgency: number): string {
    if (urgency > 0.9) return 'urgent';
    if (urgency > 0.7) return 'high';
    if (urgency > 0.5) return 'medium';
    return 'low';
  }
  
  private calculateOptimalPostTime(alert: TrendAlert): Date {
    const now = new Date();
    
    // Post within 2 hours for viral, 6 hours for rising
    const hoursToWait = alert.velocity === 'viral' ? 2 : 6;
    
    return new Date(now.getTime() + hoursToWait * 60 * 60 * 1000);
  }
  
  private getSubredditsForNiche(niche: string): string[] {
    const subredditMap: Record<string, string[]> = {
      'wearable-tech': ['wearables', 'AppleWatch', 'Garmin', 'fitbit', 'smartwatch'],
      'smart-home': ['smarthome', 'homeautomation', 'googlehome', 'alexa', 'HomeKit'],
      'outdoor-gear': ['CampingGear', 'Ultralight', 'hiking', 'backpacking', 'outdoors'],
      'health-wellness': ['fitness', 'nutrition', 'wellness', 'GetMotivated', 'health'],
      'gaming-tech': ['gaming', 'pcgaming', 'buildapc', 'gamingsetups', 'battlestations']
    };
    
    return subredditMap[niche] || ['gadgets', 'tech'];
  }
  
  private getTrendQueriesForNiche(niche: string): string[] {
    const queryMap: Record<string, string[]> = {
      'wearable-tech': [
        'best smartwatch 2024',
        'new fitness tracker',
        'apple watch vs garmin',
        'health monitoring wearables'
      ],
      'smart-home': [
        'smart home devices 2024',
        'home automation setup',
        'best smart lights',
        'alexa vs google home'
      ],
      'outdoor-gear': [
        'best hiking gear 2024',
        'ultralight backpacking',
        'camping essentials',
        'outdoor tech gadgets'
      ]
    };
    
    return queryMap[niche] || ['trending tech 2024'];
  }
  
  private getTrendingHashtags(niche: string): string[] {
    const hashtagMap: Record<string, string[]> = {
      'wearable-tech': ['#smartwatch', '#fitnesstracker', '#wearabletech', '#healthtech'],
      'smart-home': ['#smarthome', '#homeautomation', '#iot', '#connectedhome'],
      'outdoor-gear': ['#hiking', '#camping', '#outdoors', '#adventure']
    };
    
    return hashtagMap[niche] || ['#tech', '#gadgets'];
  }
}

// Start monitor for all active tenants
export async function initializeTrendMonitoring() {
  const supabase = createServiceClient();
  const monitor = new RealTimeTrendMonitor();
  
  // Get all active tenants
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, slug, settings')
    .eq('status', 'active');
  
  if (tenants) {
    for (const tenant of tenants) {
      const niche = tenant.settings?.niche || 'wearable-tech';
      await monitor.startMonitoring(tenant.id, niche);
    }
  }
  
  console.log(`✅ Real-time trend monitoring initialized for ${tenants?.length || 0} tenants`);
}