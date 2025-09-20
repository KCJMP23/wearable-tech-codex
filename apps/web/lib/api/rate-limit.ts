import { NextRequest } from 'next/server';
import { LRUCache } from 'lru-cache';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  headers: HeadersInit;
}

// Create different rate limit stores for different tiers
const rateLimitStores = {
  public: new LRUCache<string, number[]>({
    max: 10000,
    ttl: 60 * 1000, // 1 minute
  }),
  authenticated: new LRUCache<string, number[]>({
    max: 10000,
    ttl: 60 * 1000, // 1 minute
  }),
  premium: new LRUCache<string, number[]>({
    max: 10000,
    ttl: 60 * 1000, // 1 minute
  }),
};

// Rate limit configurations
const rateLimitConfigs = {
  public: {
    requests: 30,
    window: 60 * 1000, // 1 minute
  },
  authenticated: {
    requests: 100,
    window: 60 * 1000, // 1 minute
  },
  premium: {
    requests: 1000,
    window: 60 * 1000, // 1 minute
  },
};

export async function rateLimit(
  request: NextRequest,
  tier: 'public' | 'authenticated' | 'premium' = 'public'
): Promise<RateLimitResult> {
  const identifier = getIdentifier(request);
  const store = rateLimitStores[tier];
  const config = rateLimitConfigs[tier];
  const now = Date.now();
  
  // Get current request timestamps
  const timestamps = store.get(identifier) || [];
  
  // Remove timestamps outside the current window
  const validTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < config.window
  );
  
  // Check if limit exceeded
  const remaining = Math.max(0, config.requests - validTimestamps.length);
  const reset = validTimestamps.length > 0 
    ? validTimestamps[0] + config.window 
    : now + config.window;
  
  if (validTimestamps.length >= config.requests) {
    return {
      success: false,
      limit: config.requests,
      remaining: 0,
      reset,
      headers: {
        'X-RateLimit-Limit': config.requests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': Math.ceil((reset - now) / 1000).toString(),
      },
    };
  }
  
  // Add current timestamp
  validTimestamps.push(now);
  store.set(identifier, validTimestamps);
  
  return {
    success: true,
    limit: config.requests,
    remaining: remaining - 1,
    reset,
    headers: {
      'X-RateLimit-Limit': config.requests.toString(),
      'X-RateLimit-Remaining': (remaining - 1).toString(),
      'X-RateLimit-Reset': reset.toString(),
    },
  };
}

function getIdentifier(request: NextRequest): string {
  // Try to get identifier from various sources
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) return `api:${apiKey}`;
  
  const authorization = request.headers.get('authorization');
  if (authorization) return `auth:${authorization}`;
  
  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || 'unknown';
  return `ip:${ip}`;
}