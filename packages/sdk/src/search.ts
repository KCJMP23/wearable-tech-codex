import axios from 'axios';
import { loadEnv } from './env';
import type { SearchSnippet } from './types';

interface SearchOptions {
  query: string;
  maxResults?: number;
}

export async function performSearch({ query, maxResults = 5 }: SearchOptions): Promise<SearchSnippet[]> {
  const env = loadEnv();
  if (env.TAVILY_API_KEY) {
    const response = await axios.post(
      'https://api.tavily.com/search',
      { query, max_results: maxResults, include_images: false, include_answers: false },
      { headers: { 'Content-Type': 'application/json', 'X-API-Key': env.TAVILY_API_KEY } }
    );
    return (response.data?.results ?? []).map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      publishedAt: result.published_date
    }));
  }

  if (env.SERPAPI_API_KEY) {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        api_key: env.SERPAPI_API_KEY,
        engine: 'google',
        q: query,
        num: maxResults
      }
    });
    return (response.data?.organic_results ?? []).map((result: any) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      publishedAt: result?.date
    }));
  }

  throw new Error('No search provider configured. Set TAVILY_API_KEY or SERPAPI_API_KEY.');
}
