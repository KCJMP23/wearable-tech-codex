import { NextRequest } from 'next/server';

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (in production, use Redis)
const store = new Map<string, RateLimitState>();

export function rateLimit(config: RateLimitConfig) {
  return {
    check: async (request: NextRequest): Promise<void> => {
      const identifier = getIdentifier(request);
      const now = Date.now();
      const resetTime = now + config.interval;

      const current = store.get(identifier);

      if (!current || now > current.resetTime) {
        // Reset or initialize counter
        store.set(identifier, {
          count: 1,
          resetTime,
        });
        return;
      }

      if (current.count >= config.uniqueTokenPerInterval) {
        const error = new Error('Rate limit exceeded');
        error.name = 'RateLimitError';
        throw error;
      }

      // Increment counter
      current.count++;
      store.set(identifier, current);
    },

    getState: (request: NextRequest): RateLimitState | null => {
      const identifier = getIdentifier(request);
      return store.get(identifier) || null;
    },

    reset: (request: NextRequest): void => {
      const identifier = getIdentifier(request);
      store.delete(identifier);
    },
  };
}

function getIdentifier(request: NextRequest): string {
  // Try to get IP address from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cloudflareIP = request.headers.get('cf-connecting-ip');
  
  let ip = forwarded?.split(',')[0] || realIP || cloudflareIP || 'unknown';
  
  // For authenticated requests, include user ID if available
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Extract user ID from JWT or session (simplified)
    const token = authHeader.replace('Bearer ', '');
    // In a real implementation, you'd decode the JWT
    ip += `:${token.slice(0, 10)}`;
  }

  return ip;
}

// Middleware helper for API routes
export function withRateLimit(
  handler: (request: NextRequest) => Promise<Response>,
  config: RateLimitConfig
) {
  const limiter = rateLimit(config);

  return async (request: NextRequest): Promise<Response> => {
    try {
      await limiter.check(request);
      return handler(request);
    } catch (error) {
      if (error instanceof Error && error.name === 'RateLimitError') {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            },
          }
        );
      }
      throw error;
    }
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of store.entries()) {
    if (now > state.resetTime) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute