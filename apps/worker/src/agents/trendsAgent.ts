import type { AgentTask, RedditTrend, SearchSnippet } from '@affiliate-factory/sdk';
import { BaseAgent, type AgentDependencies, type AgentResult } from './base';
import { createRedditClient } from '../lib/reddit';
import { createSearchClient } from '../lib/search';

interface TrendsAgentInput {
  tenantId: string;
  action: 'analyze_trends' | 'monitor_reddit' | 'track_keywords' | 'generate_trend_report' | 'find_viral_content' | 'seasonal_analysis';
  keywords?: string[];
  subreddits?: string[];
  timeframe?: 'hour' | 'day' | 'week' | 'month';
  count?: number;
  contentType?: 'all' | 'products' | 'topics' | 'keywords';
}

interface TrendData {
  id: string;
  topic: string;
  source: 'reddit' | 'google' | 'social' | 'news';
  score: number;
  velocity: 'rising' | 'stable' | 'declining';
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  relatedProducts: string[];
  actionableInsights: string[];
  contentOpportunities: Array<{
    type: 'review' | 'howto' | 'listicle' | 'roundup';
    title: string;
    priority: 'high' | 'medium' | 'low';
    timeframe: string;
  }>;
  metadata: {
    discoveredAt: string;
    sources: string[];
    confidence: number;
    category: string;
  };
}

interface TrendReport {
  period: string;
  topTrends: TrendData[];
  emergingTopics: string[];
  contentGaps: string[];
  competitorActivity: Array<{
    competitor: string;
    topics: string[];
    activity: 'high' | 'medium' | 'low';
  }>;
  recommendations: Array<{
    action: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    expectedImpact: string;
    timeframe: string;
  }>;
}

export class TrendsAgent extends BaseAgent {
  name = 'TrendsAgent';
  description = 'Monitors trends across Reddit, social media, and search engines to identify content opportunities';
  version = '1.0.0';

  private readonly wearableTechSubreddits = [
    'wearables',
    'AppleWatch',
    'Garmin',
    'fitbit',
    'samsung',
    'WearOS',
    'smartwatch',
    'fitness',
    'running',
    'cycling',
    'gadgets',
    'tech',
    'QuantifiedSelf',
    'health',
    'biohackers'
  ];

  private readonly trendKeywords = [
    'smartwatch',
    'fitness tracker',
    'apple watch',
    'garmin',
    'fitbit',
    'samsung watch',
    'wear os',
    'health monitoring',
    'heart rate',
    'sleep tracking',
    'GPS watch',
    'running watch',
    'cycling computer',
    'activity tracker',
    'wearable technology'
  ];

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    this.validateRequiredEnv(deps, ['supabase']);
    
    return this.withErrorHandling(async () => {
      const input = task.input as TrendsAgentInput;
      
      switch (input.action) {
        case 'analyze_trends':
          return await this.analyzeTrends(input.tenantId, input.keywords, input.timeframe, input.count, deps);
        case 'monitor_reddit':
          return await this.monitorReddit(input.tenantId, input.subreddits, input.timeframe, deps);
        case 'track_keywords':
          return await this.trackKeywords(input.tenantId, input.keywords!, deps);
        case 'generate_trend_report':
          return await this.generateTrendReport(input.tenantId, input.timeframe, deps);
        case 'find_viral_content':
          return await this.findViralContent(input.tenantId, input.contentType, deps);
        case 'seasonal_analysis':
          return await this.seasonalAnalysis(input.tenantId, deps);
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    }, `execute ${task.input?.action || 'unknown'}`);
  }

  private async analyzeTrends(
    tenantId: string,
    keywords?: string[],
    timeframe: string = 'week',
    count: number = 10,
    deps?: AgentDependencies
  ): Promise<any> {
    const searchKeywords = keywords || this.trendKeywords;
    const discoveredTrends: TrendData[] = [];
    
    // Analyze Reddit trends
    if (deps!.redditApiKey) {
      try {
        const redditTrends = await this.analyzeRedditTrends(searchKeywords, timeframe, deps!);
        discoveredTrends.push(...redditTrends);
      } catch (error) {
        console.warn('Reddit trend analysis failed:', error);
      }
    }

    // Analyze search trends
    if (deps!.tavilyApiKey || deps!.serpApiKey) {
      try {
        const searchTrends = await this.analyzeSearchTrends(searchKeywords, timeframe, deps!);
        discoveredTrends.push(...searchTrends);
      } catch (error) {
        console.warn('Search trend analysis failed:', error);
      }
    }

    // Score and rank trends
    const rankedTrends = this.rankTrends(discoveredTrends).slice(0, count);
    
    // Generate content opportunities
    const contentOpportunities = this.identifyContentOpportunities(rankedTrends);
    
    // Store trends for future reference
    await this.storeTrends(tenantId, rankedTrends, deps!);

    return {
      action: 'trends_analyzed',
      timeframe,
      trendsDiscovered: rankedTrends.length,
      topTrends: rankedTrends.slice(0, 5).map(t => ({
        topic: t.topic,
        score: t.score,
        velocity: t.velocity,
        source: t.source
      })),
      contentOpportunities: contentOpportunities.slice(0, 5),
      recommendations: this.generateTrendRecommendations(rankedTrends)
    };
  }

  private async monitorReddit(
    tenantId: string,
    subreddits?: string[],
    timeframe: string = 'day',
    deps?: AgentDependencies
  ): Promise<any> {
    if (!deps!.redditApiKey) {
      throw new Error('Reddit API key is required for Reddit monitoring');
    }

    const targetSubreddits = subreddits || this.wearableTechSubreddits;
    const reddit = createRedditClient({
      clientId: deps!.redditApiKey.split(':')[0] || '',
      clientSecret: deps!.redditApiKey.split(':')[1] || '',
      userAgent: 'WearableTechTrends/1.0'
    });

    const redditInsights = [];
    const errors = [];

    for (const subreddit of targetSubreddits) {
      try {
        // Get trending posts
        const trendingPosts = await reddit.getTrendingTopics(
          [subreddit],
          this.trendKeywords,
          { timeframe: timeframe as any, minScore: 10, limit: 5 }
        );

        // Analyze post sentiment and topics
        const subredditInsight = {
          subreddit,
          trendingTopics: this.extractTopics(trendingPosts),
          topPosts: trendingPosts.slice(0, 3).map(post => ({
            title: post.title,
            score: post.score,
            comments: post.comments,
            url: post.url,
            sentiment: this.analyzeSentiment(post.title)
          })),
          engagement: this.calculateEngagement(trendingPosts),
          recommendations: this.generateSubredditRecommendations(subreddit, trendingPosts)
        };

        redditInsights.push(subredditInsight);
      } catch (error) {
        errors.push({
          subreddit,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Store Reddit insights
    await deps!.supabase
      .from('insights')
      .insert({
        tenant_id: tenantId,
        kpi: 'reddit_trends',
        value: redditInsights.length,
        window: timeframe,
        meta: {
          insights: redditInsights,
          errors: errors.length > 0 ? errors : undefined
        },
        computed_at: new Date().toISOString()
      });

    return {
      action: 'reddit_monitored',
      subredditsAnalyzed: redditInsights.length,
      totalPosts: redditInsights.reduce((sum, insight) => sum + insight.topPosts.length, 0),
      topTopics: this.getTopTopics(redditInsights),
      insights: redditInsights,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async trackKeywords(
    tenantId: string,
    keywords: string[],
    deps: AgentDependencies
  ): Promise<any> {
    if (!deps.tavilyApiKey && !deps.serpApiKey) {
      throw new Error('Search API key is required for keyword tracking');
    }

    const searchClient = createSearchClient({
      tavilyApiKey: deps.tavilyApiKey,
      serpApiKey: deps.serpApiKey,
      bingApiKey: deps.bingApiKey
    });

    const keywordAnalysis = [];

    for (const keyword of keywords) {
      try {
        // Search for keyword trends
        const searchResults = await searchClient.searchWeb(keyword, { 
          maxResults: 10,
          dateFilter: 'week'
        });

        // Analyze search results
        const analysis = {
          keyword,
          searchVolume: this.estimateSearchVolume(searchResults),
          trend: this.analyzeTrendDirection(searchResults),
          competition: this.analyzeCompetition(searchResults),
          opportunities: this.identifyKeywordOpportunities(keyword, searchResults),
          topResults: searchResults.slice(0, 5).map(result => ({
            title: result.title,
            url: result.url,
            snippet: result.snippet.substring(0, 150)
          }))
        };

        keywordAnalysis.push(analysis);
      } catch (error) {
        console.warn(`Failed to track keyword "${keyword}":`, error);
      }
    }

    // Store keyword tracking data
    await deps.supabase
      .from('keyword_tracking')
      .insert({
        tenant_id: tenantId,
        keywords: keywords,
        analysis: keywordAnalysis,
        tracked_at: new Date().toISOString()
      });

    return {
      action: 'keywords_tracked',
      keywordsAnalyzed: keywordAnalysis.length,
      highOpportunityKeywords: keywordAnalysis
        .filter(k => k.opportunities.length > 0)
        .map(k => k.keyword),
      analysis: keywordAnalysis
    };
  }

  private async generateTrendReport(
    tenantId: string,
    timeframe: string = 'week',
    deps: AgentDependencies
  ): Promise<any> {
    // Get recent trends
    const { data: recentTrends } = await deps.supabase
      .from('trends')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('discovered_at', this.getTimeframeStart(timeframe))
      .order('score', { ascending: false });

    // Get competitor analysis
    const competitorActivity = await this.analyzeCompetitors(deps);

    // Generate comprehensive report
    const report: TrendReport = {
      period: `${timeframe} ending ${new Date().toDateString()}`,
      topTrends: (recentTrends || []).slice(0, 10) as TrendData[],
      emergingTopics: this.identifyEmergingTopics(recentTrends || []),
      contentGaps: await this.identifyContentGaps(tenantId, recentTrends || [], deps),
      competitorActivity,
      recommendations: this.generateStrategicRecommendations(recentTrends || [], competitorActivity)
    };

    // Store report
    await deps.supabase
      .from('trend_reports')
      .insert({
        tenant_id: tenantId,
        period: report.period,
        report_data: report,
        generated_at: new Date().toISOString()
      });

    return {
      action: 'trend_report_generated',
      period: report.period,
      topTrendsCount: report.topTrends.length,
      emergingTopicsCount: report.emergingTopics.length,
      contentGapsIdentified: report.contentGaps.length,
      recommendationsCount: report.recommendations.length,
      report
    };
  }

  private async findViralContent(
    tenantId: string,
    contentType: string = 'all',
    deps: AgentDependencies
  ): Promise<any> {
    const viralContent = [];

    // Check Reddit for viral posts
    if (deps.redditApiKey) {
      try {
        const reddit = createRedditClient({
          clientId: deps.redditApiKey.split(':')[0] || '',
          clientSecret: deps.redditApiKey.split(':')[1] || '',
          userAgent: 'WearableTechTrends/1.0'
        });

        for (const subreddit of this.wearableTechSubreddits.slice(0, 5)) {
          const hotPosts = await reddit.getHotPosts(subreddit, { limit: 10, timeframe: 'day' });
          
          const viral = hotPosts
            .filter(post => post.score > 1000 || post.numComments > 100)
            .map(post => ({
              source: 'reddit',
              platform: `r/${subreddit}`,
              title: post.title,
              url: post.url,
              score: post.score,
              engagement: post.numComments,
              viralityScore: this.calculateViralityScore(post.score, post.numComments),
              topics: this.extractTopicsFromText(post.title),
              contentOpportunity: this.identifyContentOpportunityFromPost(post)
            }));

          viralContent.push(...viral);
        }
      } catch (error) {
        console.warn('Failed to find viral Reddit content:', error);
      }
    }

    // Sort by virality score
    const topViralContent = viralContent
      .sort((a, b) => b.viralityScore - a.viralityScore)
      .slice(0, 10);

    return {
      action: 'viral_content_found',
      viralContentFound: topViralContent.length,
      topViralContent: topViralContent.slice(0, 5),
      contentOpportunities: topViralContent
        .filter(c => c.contentOpportunity)
        .map(c => c.contentOpportunity)
        .slice(0, 3)
    };
  }

  private async seasonalAnalysis(tenantId: string, deps: AgentDependencies): Promise<any> {
    const currentSeason = this.getCurrentSeason();
    const seasonalKeywords = this.getSeasonalKeywords(currentSeason);
    
    // Analyze seasonal trends
    const seasonalTrends = await this.analyzeTrends(
      tenantId,
      seasonalKeywords,
      'month',
      15,
      deps
    );

    // Generate seasonal content calendar
    const contentCalendar = this.generateSeasonalContentCalendar(currentSeason, seasonalTrends);

    // Identify seasonal products
    const { data: seasonalProducts } = await deps.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .limit(10);

    const seasonalProductAnalysis = this.analyzeSeasonalProducts(
      currentSeason,
      seasonalProducts || []
    );

    return {
      action: 'seasonal_analysis_completed',
      season: currentSeason,
      seasonalTrends: seasonalTrends.topTrends,
      contentCalendar,
      seasonalProducts: seasonalProductAnalysis,
      recommendations: this.generateSeasonalRecommendations(currentSeason, seasonalTrends)
    };
  }

  // Helper methods
  private async analyzeRedditTrends(
    keywords: string[],
    timeframe: string,
    deps: AgentDependencies
  ): Promise<TrendData[]> {
    const reddit = createRedditClient({
      clientId: deps.redditApiKey!.split(':')[0] || '',
      clientSecret: deps.redditApiKey!.split(':')[1] || '',
      userAgent: 'WearableTechTrends/1.0'
    });

    const trends: TrendData[] = [];

    const redditTrends = await reddit.getTrendingTopics(
      this.wearableTechSubreddits,
      keywords,
      { timeframe: timeframe as any, minScore: 5, limit: 20 }
    );

    for (const trend of redditTrends) {
      const trendData: TrendData = {
        id: `reddit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        topic: trend.title,
        source: 'reddit',
        score: this.calculateTrendScore(trend.score, trend.comments, 'reddit'),
        velocity: this.determineVelocity(trend.score, timeframe),
        sentiment: this.analyzeSentiment(trend.title),
        keywords: trend.tags,
        relatedProducts: this.extractProductMentions(trend.title),
        actionableInsights: this.generateActionableInsights(trend),
        contentOpportunities: this.generateContentOpportunities(trend),
        metadata: {
          discoveredAt: new Date().toISOString(),
          sources: [trend.url],
          confidence: this.calculateConfidence(trend.score, trend.comments),
          category: this.categorizeContent(trend.title)
        }
      };

      trends.push(trendData);
    }

    return trends;
  }

  private async analyzeSearchTrends(
    keywords: string[],
    timeframe: string,
    deps: AgentDependencies
  ): Promise<TrendData[]> {
    const searchClient = createSearchClient({
      tavilyApiKey: deps.tavilyApiKey,
      serpApiKey: deps.serpApiKey,
      bingApiKey: deps.bingApiKey
    });

    const trends: TrendData[] = [];

    for (const keyword of keywords.slice(0, 5)) { // Limit to avoid API limits
      try {
        const searchResults = await searchClient.searchWeb(keyword, {
          maxResults: 10,
          dateFilter: timeframe as any
        });

        if (searchResults.length > 0) {
          const trendData: TrendData = {
            id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            topic: keyword,
            source: 'google',
            score: this.calculateSearchTrendScore(searchResults),
            velocity: 'stable', // Would need historical data to determine
            sentiment: this.analyzeSearchSentiment(searchResults),
            keywords: [keyword],
            relatedProducts: this.extractProductMentionsFromSearch(searchResults),
            actionableInsights: this.generateSearchInsights(keyword, searchResults),
            contentOpportunities: this.generateSearchContentOpportunities(keyword, searchResults),
            metadata: {
              discoveredAt: new Date().toISOString(),
              sources: searchResults.slice(0, 3).map(r => r.url),
              confidence: 0.7,
              category: this.categorizeSearchTopic(keyword)
            }
          };

          trends.push(trendData);
        }
      } catch (error) {
        console.warn(`Failed to analyze search trends for ${keyword}:`, error);
      }
    }

    return trends;
  }

  private rankTrends(trends: TrendData[]): TrendData[] {
    return trends.sort((a, b) => {
      // Primary sort: score
      if (b.score !== a.score) return b.score - a.score;
      
      // Secondary sort: velocity (rising > stable > declining)
      const velocityScore = { rising: 3, stable: 2, declining: 1 };
      if (velocityScore[b.velocity] !== velocityScore[a.velocity]) {
        return velocityScore[b.velocity] - velocityScore[a.velocity];
      }
      
      // Tertiary sort: confidence
      return b.metadata.confidence - a.metadata.confidence;
    });
  }

  private identifyContentOpportunities(trends: TrendData[]): Array<{
    type: string;
    title: string;
    priority: string;
    timeframe: string;
    basedOnTrend: string;
  }> {
    const opportunities = [];

    for (const trend of trends.slice(0, 5)) {
      opportunities.push(...trend.contentOpportunities.map(opp => ({
        ...opp,
        basedOnTrend: trend.topic
      })));
    }

    return opportunities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
             (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
    });
  }

  private async storeTrends(tenantId: string, trends: TrendData[], deps: AgentDependencies): Promise<void> {
    try {
      const trendRecords = trends.map(trend => ({
        tenant_id: tenantId,
        trend_id: trend.id,
        topic: trend.topic,
        source: trend.source,
        score: trend.score,
        velocity: trend.velocity,
        sentiment: trend.sentiment,
        keywords: trend.keywords,
        metadata: trend.metadata,
        discovered_at: trend.metadata.discoveredAt
      }));

      await deps.supabase
        .from('trends')
        .insert(trendRecords);
    } catch (error) {
      console.warn('Failed to store trends:', error);
    }
  }

  private generateTrendRecommendations(trends: TrendData[]): string[] {
    const recommendations = [];

    // High-score trends
    const highScoreTrends = trends.filter(t => t.score > 80);
    if (highScoreTrends.length > 0) {
      recommendations.push(`Create content around high-scoring trend: "${highScoreTrends[0].topic}"`);
    }

    // Rising trends
    const risingTrends = trends.filter(t => t.velocity === 'rising');
    if (risingTrends.length > 0) {
      recommendations.push(`Capitalize on rising trend: "${risingTrends[0].topic}"`);
    }

    // Content gaps
    const reviewOpportunities = trends.filter(t => 
      t.contentOpportunities.some(opp => opp.type === 'review')
    );
    if (reviewOpportunities.length > 0) {
      recommendations.push('Focus on product reviews to capture current interest');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring trends for new opportunities');
    }

    return recommendations;
  }

  private extractTopics(posts: any[]): string[] {
    const topics = new Set<string>();
    
    for (const post of posts) {
      // Extract topics from title and tags
      const words = post.title.toLowerCase().split(/\s+/);
      const relevantWords = words.filter(word => 
        word.length > 3 && 
        this.trendKeywords.some(keyword => keyword.includes(word) || word.includes(keyword))
      );
      
      relevantWords.forEach(word => topics.add(word));
      
      if (post.tags) {
        post.tags.forEach((tag: string) => topics.add(tag));
      }
    }
    
    return Array.from(topics).slice(0, 10);
  }

  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['best', 'great', 'excellent', 'amazing', 'love', 'awesome', 'perfect'];
    const negativeWords = ['worst', 'terrible', 'awful', 'hate', 'horrible', 'bad', 'disappointing'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateEngagement(posts: any[]): { averageScore: number; averageComments: number; totalEngagement: number } {
    if (posts.length === 0) return { averageScore: 0, averageComments: 0, totalEngagement: 0 };
    
    const totalScore = posts.reduce((sum, post) => sum + post.score, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.comments, 0);
    
    return {
      averageScore: Math.round(totalScore / posts.length),
      averageComments: Math.round(totalComments / posts.length),
      totalEngagement: totalScore + totalComments
    };
  }

  private generateSubredditRecommendations(subreddit: string, posts: any[]): string[] {
    const recommendations = [];
    
    const avgScore = posts.reduce((sum, post) => sum + post.score, 0) / posts.length;
    
    if (avgScore > 100) {
      recommendations.push(`High engagement in r/${subreddit} - consider creating targeted content`);
    }
    
    const commonTopics = this.extractTopics(posts);
    if (commonTopics.length > 0) {
      recommendations.push(`Popular topics: ${commonTopics.slice(0, 3).join(', ')}`);
    }
    
    return recommendations;
  }

  private getTopTopics(insights: any[]): string[] {
    const allTopics = insights.flatMap(insight => insight.trendingTopics);
    const topicFreq: Record<string, number> = {};
    
    allTopics.forEach(topic => {
      topicFreq[topic] = (topicFreq[topic] || 0) + 1;
    });
    
    return Object.entries(topicFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  // More utility methods
  private calculateTrendScore(score: number, comments: number, source: string): number {
    const baseScore = source === 'reddit' ? score + comments * 2 : score;
    return Math.min(100, Math.max(0, baseScore / 10));
  }

  private determineVelocity(score: number, timeframe: string): 'rising' | 'stable' | 'declining' {
    // Simplified velocity calculation - in real implementation, compare with historical data
    if (timeframe === 'hour' && score > 50) return 'rising';
    if (timeframe === 'day' && score > 100) return 'rising';
    if (timeframe === 'week' && score > 500) return 'rising';
    return 'stable';
  }

  private extractProductMentions(text: string): string[] {
    const productKeywords = ['apple watch', 'garmin', 'fitbit', 'samsung watch', 'pixel watch'];
    const mentions = [];
    
    const lowerText = text.toLowerCase();
    for (const product of productKeywords) {
      if (lowerText.includes(product)) {
        mentions.push(product);
      }
    }
    
    return mentions;
  }

  private generateActionableInsights(trend: any): string[] {
    return [
      `High engagement on topic: ${trend.title}`,
      `Opportunity for product comparison content`,
      `Consider creating how-to guide based on user interest`
    ];
  }

  private generateContentOpportunities(trend: any): Array<{
    type: 'review' | 'howto' | 'listicle' | 'roundup';
    title: string;
    priority: 'high' | 'medium' | 'low';
    timeframe: string;
  }> {
    const opportunities = [];
    
    if (trend.title.includes('best') || trend.title.includes('top')) {
      opportunities.push({
        type: 'listicle' as const,
        title: `Best ${this.extractProductType(trend.title)} for ${new Date().getFullYear()}`,
        priority: 'high' as const,
        timeframe: '1 week'
      });
    }
    
    if (trend.title.includes('how') || trend.title.includes('setup')) {
      opportunities.push({
        type: 'howto' as const,
        title: `How to ${this.extractAction(trend.title)}`,
        priority: 'medium' as const,
        timeframe: '2 weeks'
      });
    }
    
    return opportunities;
  }

  private calculateConfidence(score: number, comments: number): number {
    const totalEngagement = score + comments;
    if (totalEngagement > 1000) return 0.9;
    if (totalEngagement > 500) return 0.8;
    if (totalEngagement > 100) return 0.7;
    if (totalEngagement > 50) return 0.6;
    return 0.5;
  }

  private categorizeContent(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('review') || lowerText.includes('rating')) return 'review';
    if (lowerText.includes('how to') || lowerText.includes('guide')) return 'guide';
    if (lowerText.includes('best') || lowerText.includes('top')) return 'comparison';
    if (lowerText.includes('deal') || lowerText.includes('sale')) return 'deals';
    if (lowerText.includes('new') || lowerText.includes('release')) return 'news';
    
    return 'general';
  }

  private extractProductType(text: string): string {
    const types = ['smartwatch', 'fitness tracker', 'smart ring', 'heart rate monitor'];
    const lowerText = text.toLowerCase();
    
    for (const type of types) {
      if (lowerText.includes(type)) return type;
    }
    
    return 'wearable devices';
  }

  private extractAction(text: string): string {
    const actions = ['setup', 'configure', 'optimize', 'troubleshoot', 'choose'];
    const lowerText = text.toLowerCase();
    
    for (const action of actions) {
      if (lowerText.includes(action)) return `${action} your wearable device`;
    }
    
    return 'use wearable technology effectively';
  }

  // Additional helper methods for search trends, seasonal analysis, etc.
  private estimateSearchVolume(results: any[]): string {
    // Mock implementation - in real version, use actual search volume data
    return results.length > 8 ? 'High' : results.length > 4 ? 'Medium' : 'Low';
  }

  private analyzeTrendDirection(results: any[]): 'rising' | 'stable' | 'declining' {
    // Mock trend direction - in real implementation, compare with historical data
    return 'stable';
  }

  private analyzeCompetition(results: any[]): 'high' | 'medium' | 'low' {
    // Analyze domain authority and competition
    const authorityDomains = results.filter(r => 
      ['techcrunch.com', 'wired.com', 'theverge.com', 'engadget.com'].some(domain => r.url.includes(domain))
    );
    
    return authorityDomains.length > 3 ? 'high' : authorityDomains.length > 1 ? 'medium' : 'low';
  }

  private identifyKeywordOpportunities(keyword: string, results: any[]): string[] {
    const opportunities = [];
    
    if (results.length < 5) {
      opportunities.push('Low competition - good opportunity for ranking');
    }
    
    if (results.some(r => r.title.toLowerCase().includes('best'))) {
      opportunities.push('Listicle content opportunity');
    }
    
    if (results.some(r => r.title.toLowerCase().includes('how'))) {
      opportunities.push('How-to content opportunity');
    }
    
    return opportunities;
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }

  private getSeasonalKeywords(season: string): string[] {
    const seasonalMap = {
      Spring: ['outdoor fitness', 'running watch', 'cycling tracker', 'spring training'],
      Summer: ['swimming watch', 'triathlon training', 'vacation fitness', 'waterproof tracker'],
      Fall: ['marathon training', 'back to school fitness', 'indoor workouts', 'weather tracking'],
      Winter: ['indoor fitness', 'holiday deals', 'new year fitness', 'winter sports tracking']
    };
    
    return seasonalMap[season as keyof typeof seasonalMap] || this.trendKeywords;
  }

  private getTimeframeStart(timeframe: string): string {
    const now = new Date();
    const periods = {
      hour: 1,
      day: 24,
      week: 24 * 7,
      month: 24 * 30
    };
    
    const hours = periods[timeframe as keyof typeof periods] || 24;
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    return start.toISOString();
  }

  // Additional methods for completeness
  private calculateViralityScore(score: number, comments: number): number {
    return score + (comments * 2);
  }

  private extractTopicsFromText(text: string): string[] {
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 3);
  }

  private identifyContentOpportunityFromPost(post: any): any {
    return {
      type: 'review',
      title: `Review: ${this.extractProductFromTitle(post.title)}`,
      priority: 'medium',
      timeframe: '1 week'
    };
  }

  private extractProductFromTitle(title: string): string {
    // Extract product name from post title
    const products = ['Apple Watch', 'Garmin', 'Fitbit', 'Samsung Watch'];
    for (const product of products) {
      if (title.toLowerCase().includes(product.toLowerCase())) {
        return product;
      }
    }
    return 'Wearable Device';
  }

  // Mock implementations for remaining methods
  private calculateSearchTrendScore(results: any[]): number {
    return Math.min(100, results.length * 10);
  }

  private analyzeSearchSentiment(results: any[]): 'positive' | 'neutral' | 'negative' {
    return 'neutral'; // Simplified
  }

  private extractProductMentionsFromSearch(results: any[]): string[] {
    return []; // Simplified
  }

  private generateSearchInsights(keyword: string, results: any[]): string[] {
    return [`Search interest in "${keyword}" remains active`];
  }

  private generateSearchContentOpportunities(keyword: string, results: any[]): any[] {
    return [{
      type: 'howto',
      title: `How to choose the best ${keyword}`,
      priority: 'medium',
      timeframe: '2 weeks'
    }];
  }

  private categorizeSearchTopic(keyword: string): string {
    return 'product';
  }

  private identifyEmergingTopics(trends: any[]): string[] {
    return trends.slice(0, 5).map(t => t.topic);
  }

  private async identifyContentGaps(tenantId: string, trends: any[], deps: AgentDependencies): Promise<string[]> {
    return ['Long-form buyer guides', 'Technical comparison charts'];
  }

  private async analyzeCompetitors(deps: AgentDependencies): Promise<any[]> {
    return [
      { competitor: 'TechRadar', topics: ['smartwatch reviews'], activity: 'high' },
      { competitor: 'CNET', topics: ['fitness tracker guides'], activity: 'medium' }
    ];
  }

  private generateStrategicRecommendations(trends: any[], competitors: any[]): any[] {
    return [
      {
        action: 'Create trending content',
        priority: 'high',
        expectedImpact: 'Increased organic traffic',
        timeframe: '1 week'
      }
    ];
  }

  private generateSeasonalContentCalendar(season: string, trends: any): any {
    return {
      week1: 'Seasonal fitness prep content',
      week2: 'Product roundups for season',
      week3: 'How-to guides for seasonal activities',
      week4: 'Deal roundups and gift guides'
    };
  }

  private analyzeSeasonalProducts(season: string, products: any[]): any {
    return {
      recommendedProducts: products.slice(0, 3),
      seasonalRelevance: 'High for outdoor fitness tracking',
      marketingAngles: [`Perfect for ${season.toLowerCase()} activities`]
    };
  }

  private generateSeasonalRecommendations(season: string, trends: any): string[] {
    return [
      `Focus on ${season.toLowerCase()}-specific content`,
      'Highlight seasonal product features',
      'Create gift guides for upcoming holidays'
    ];
  }
}

export const trendsAgent = new TrendsAgent();