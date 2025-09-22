import axios from 'axios';
import { loadEnv } from './env.js';
import type { RedditTrend } from './types.js';

interface RedditOptions {
  subreddit: string;
  limit?: number;
  timeframe?: 'day' | 'week' | 'month';
}

export async function fetchRedditTrends(options: RedditOptions): Promise<RedditTrend[]> {
  const env = loadEnv();
  const { subreddit, limit = 10, timeframe = 'day' } = options;

  const response = await axios.get(`https://www.reddit.com/r/${subreddit}/top.json`, {
    params: {
      t: timeframe,
      limit
    },
    headers: {
      'User-Agent': env.REDDIT_USER_AGENT,
      Authorization: `Basic ${Buffer.from(`${env.REDDIT_APP_ID}:${env.REDDIT_APP_SECRET}`).toString('base64')}`
    }
  });

  return response.data.data.children.map((child: any) => ({
    subreddit,
    title: child.data.title,
    url: `https://www.reddit.com${child.data.permalink}`,
    score: child.data.score,
    comments: child.data.num_comments,
    tags: child.data.link_flair_text ? [child.data.link_flair_text] : []
  }));
}
