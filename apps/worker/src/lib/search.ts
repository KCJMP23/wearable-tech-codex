import type { SearchSnippet } from '@affiliate-factory/sdk';

export interface SearchConfig {
  tavilyApiKey?: string;
  serpApiKey?: string;
  bingApiKey?: string;
}

export interface SearchOptions {
  maxResults?: number;
  dateFilter?: 'day' | 'week' | 'month' | 'year';
  includeImages?: boolean;
  includeAnswer?: boolean;
  searchDepth?: 'basic' | 'advanced';
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  score?: number;
  source?: string;
}

export interface NewsResult extends SearchResult {
  imageUrl?: string;
  category?: string;
}

export interface TrendingTopic {
  topic: string;
  searchVolume: number;
  relatedQueries: string[];
  sources: SearchResult[];
}

export class SearchClient {
  private config: SearchConfig;

  constructor(config: SearchConfig) {
    this.config = config;
  }

  async searchWeb(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    // Try Tavily first, fallback to SerpAPI, then Bing
    if (this.config.tavilyApiKey) {
      try {
        return await this.searchWithTavily(query, options);
      } catch (error) {
        console.warn('Tavily search failed, trying SerpAPI:', error);
      }
    }

    if (this.config.serpApiKey) {
      try {
        return await this.searchWithSerpAPI(query, options);
      } catch (error) {
        console.warn('SerpAPI search failed, trying Bing:', error);
      }
    }

    if (this.config.bingApiKey) {
      return await this.searchWithBing(query, options);
    }

    throw new Error('No search API keys configured');
  }

  async searchNews(
    query: string,
    options?: SearchOptions
  ): Promise<NewsResult[]> {
    const results = await this.searchWeb(`${query} news`, {
      ...options,
      dateFilter: options?.dateFilter || 'week',
    });

    return results.map(result => ({
      ...result,
      category: this.extractNewsCategory(result.title + ' ' + result.snippet),
    }));
  }

  async getTrendingTopics(
    domain: string = 'technology',
    options?: { region?: string; timeframe?: string }
  ): Promise<TrendingTopic[]> {
    // This is a simplified implementation - in production you'd use Google Trends API
    const trendingQueries = [
      'best smartwatch 2024',
      'fitness tracker comparison',
      'apple watch vs samsung',
      'garmin new release',
      'wearable health technology',
    ];

    const topics: TrendingTopic[] = [];

    for (const query of trendingQueries) {
      try {
        const sources = await this.searchWeb(query, { maxResults: 5 });
        topics.push({
          topic: query,
          searchVolume: Math.floor(Math.random() * 10000) + 1000, // Mock data
          relatedQueries: await this.getRelatedQueries(query),
          sources,
        });
      } catch (error) {
        console.warn(`Failed to get trending data for ${query}:`, error);
      }
    }

    return topics;
  }

  private async searchWithTavily(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.tavilyApiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: options?.searchDepth || 'basic',
        include_answer: options?.includeAnswer || false,
        include_images: options?.includeImages || false,
        max_results: options?.maxResults || 10,
        include_domains: [],
        exclude_domains: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      publishedAt: result.published_date,
      score: result.score,
      source: 'tavily',
    }));
  }

  private async searchWithSerpAPI(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      engine: 'google',
      q: query,
      api_key: this.config.serpApiKey!,
      num: String(options?.maxResults || 10),
    });

    if (options?.dateFilter) {
      params.set('tbs', `qdr:${options.dateFilter.charAt(0)}`); // qdr:d, qdr:w, etc.
    }

    const response = await fetch(`https://serpapi.com/search?${params}`);
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();
    
    return (data.organic_results || []).map((result: any) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      publishedAt: result.date,
      source: 'serpapi',
    }));
  }

  private async searchWithBing(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: String(options?.maxResults || 10),
      offset: '0',
      mkt: 'en-US',
      safesearch: 'Moderate',
    });

    if (options?.dateFilter) {
      // Bing freshness parameter
      const freshnessMap = {
        day: 'Day',
        week: 'Week',
        month: 'Month',
        year: 'Year',
      };
      params.set('freshness', freshnessMap[options.dateFilter]);
    }

    const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?${params}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.config.bingApiKey!,
      },
    });

    if (!response.ok) {
      throw new Error(`Bing API error: ${response.status}`);
    }

    const data = await response.json();
    
    return (data.webPages?.value || []).map((result: any) => ({
      title: result.name,
      url: result.url,
      snippet: result.snippet,
      publishedAt: result.dateLastCrawled,
      source: 'bing',
    }));
  }

  private async getRelatedQueries(query: string): Promise<string[]> {
    // Simplified implementation - would use actual search suggestions API
    const variations = [
      `${query} review`,
      `${query} comparison`,
      `${query} 2024`,
      `best ${query}`,
      `${query} price`,
    ];

    return variations.slice(0, 3);
  }

  private extractNewsCategory(text: string): string {
    const categories = {
      'technology': ['tech', 'ai', 'artificial intelligence', 'software', 'app'],
      'health': ['health', 'fitness', 'wellness', 'medical', 'exercise'],
      'business': ['business', 'market', 'stock', 'company', 'revenue'],
      'sports': ['sport', 'athlete', 'game', 'team', 'competition'],
      'lifestyle': ['lifestyle', 'fashion', 'travel', 'food', 'home'],
    };

    const textLower = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  async searchProductReviews(productName: string): Promise<SearchResult[]> {
    const query = `${productName} review honest opinion pros cons`;
    return this.searchWeb(query, {
      maxResults: 10,
      dateFilter: 'year',
    });
  }

  async searchCompetitors(productName: string): Promise<SearchResult[]> {
    const query = `${productName} alternatives competitors vs comparison`;
    return this.searchWeb(query, {
      maxResults: 8,
      dateFilter: 'year',
    });
  }

  async searchTechnicalSpecs(productName: string): Promise<SearchResult[]> {
    const query = `${productName} specifications features tech specs detailed`;
    return this.searchWeb(query, {
      maxResults: 5,
      dateFilter: 'year',
    });
  }
}

export function createSearchClient(config: SearchConfig): SearchClient {
  return new SearchClient(config);
}