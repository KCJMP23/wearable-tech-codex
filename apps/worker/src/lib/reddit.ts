import type { RedditTrend } from '@affiliate-factory/sdk';

export interface RedditConfig {
  clientId: string;
  clientSecret: string;
  userAgent: string;
}

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  subreddit: string;
  score: number;
  numComments: number;
  created: number;
  author: string;
  permalink: string;
  thumbnail?: string;
  flair?: string;
}

export interface SubredditInfo {
  name: string;
  displayName: string;
  subscribers: number;
  description: string;
  publicDescription: string;
}

export class RedditClient {
  private clientId: string;
  private clientSecret: string;
  private userAgent: string;
  private accessToken: string | null = null;
  private tokenExpires: number = 0;

  constructor(config: RedditConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.userAgent = config.userAgent;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpires) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Reddit API authentication failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpires = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

    return this.accessToken;
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`https://oauth.reddit.com${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API request failed: ${response.status}`);
    }

    return response.json();
  }

  async getHotPosts(
    subreddit: string,
    options?: {
      limit?: number;
      timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    }
  ): Promise<RedditPost[]> {
    const limit = options?.limit || 25;
    const timeframe = options?.timeframe || 'day';
    
    const endpoint = `/r/${subreddit}/hot.json?limit=${limit}&t=${timeframe}`;
    const data = await this.makeRequest(endpoint);
    
    return data.data.children.map((child: any) => this.parsePost(child.data));
  }

  async getTopPosts(
    subreddit: string,
    options?: {
      limit?: number;
      timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    }
  ): Promise<RedditPost[]> {
    const limit = options?.limit || 25;
    const timeframe = options?.timeframe || 'day';
    
    const endpoint = `/r/${subreddit}/top.json?limit=${limit}&t=${timeframe}`;
    const data = await this.makeRequest(endpoint);
    
    return data.data.children.map((child: any) => this.parsePost(child.data));
  }

  async searchPosts(
    query: string,
    options?: {
      subreddit?: string;
      sort?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
      timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
      limit?: number;
    }
  ): Promise<RedditPost[]> {
    const subreddit = options?.subreddit || 'all';
    const sort = options?.sort || 'relevance';
    const timeframe = options?.timeframe || 'week';
    const limit = options?.limit || 25;
    
    const endpoint = `/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=${sort}&t=${timeframe}&limit=${limit}`;
    const data = await this.makeRequest(endpoint);
    
    return data.data.children.map((child: any) => this.parsePost(child.data));
  }

  async getSubredditInfo(subreddit: string): Promise<SubredditInfo> {
    const endpoint = `/r/${subreddit}/about.json`;
    const data = await this.makeRequest(endpoint);
    
    return {
      name: data.data.name,
      displayName: data.data.display_name,
      subscribers: data.data.subscribers,
      description: data.data.description,
      publicDescription: data.data.public_description,
    };
  }

  async getTrendingTopics(
    subreddits: string[],
    keywords: string[] = [],
    options?: {
      timeframe?: 'hour' | 'day' | 'week';
      minScore?: number;
      limit?: number;
    }
  ): Promise<RedditTrend[]> {
    const timeframe = options?.timeframe || 'day';
    const minScore = options?.minScore || 10;
    const limit = options?.limit || 50;
    
    const trends: RedditTrend[] = [];
    
    for (const subreddit of subreddits) {
      try {
        const posts = await this.getTopPosts(subreddit, { timeframe, limit });
        
        for (const post of posts) {
          if (post.score < minScore) continue;
          
          // Check if post contains any keywords (if specified)
          if (keywords.length > 0) {
            const text = (post.title + ' ' + post.selftext).toLowerCase();
            const hasKeyword = keywords.some(keyword => 
              text.includes(keyword.toLowerCase())
            );
            if (!hasKeyword) continue;
          }
          
          trends.push({
            subreddit: post.subreddit,
            title: post.title,
            url: post.url,
            score: post.score,
            comments: post.numComments,
            tags: this.extractTags(post),
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch trends from r/${subreddit}:`, error);
      }
    }
    
    // Sort by score and return top results
    return trends
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private parsePost(data: any): RedditPost {
    return {
      id: data.id,
      title: data.title,
      selftext: data.selftext || '',
      url: data.url,
      subreddit: data.subreddit,
      score: data.score,
      numComments: data.num_comments,
      created: data.created_utc,
      author: data.author,
      permalink: `https://reddit.com${data.permalink}`,
      thumbnail: data.thumbnail !== 'self' ? data.thumbnail : undefined,
      flair: data.link_flair_text,
    };
  }

  private extractTags(post: RedditPost): string[] {
    const tags: string[] = [];
    
    // Add flair as tag
    if (post.flair) {
      tags.push(post.flair.toLowerCase());
    }
    
    // Extract common tech terms from title
    const techTerms = [
      'smartwatch', 'fitness tracker', 'apple watch', 'garmin', 'fitbit',
      'samsung', 'wear os', 'health', 'workout', 'running', 'cycling',
      'heart rate', 'gps', 'battery', 'waterproof', 'review', 'vs', 'comparison'
    ];
    
    const titleLower = post.title.toLowerCase();
    for (const term of techTerms) {
      if (titleLower.includes(term)) {
        tags.push(term.replace(/\s+/g, '_'));
      }
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }
}

export function createRedditClient(config: RedditConfig): RedditClient {
  return new RedditClient(config);
}