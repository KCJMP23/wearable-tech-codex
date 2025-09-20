import { GraphQLError } from 'graphql';
import { SchemaDirectiveVisitor } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLField } from 'graphql';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

// Create Redis client for rate limiting
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Rate limiter configurations
const rateLimiters = new Map<string, RateLimiterRedis>();

function getRateLimiter(key: string, max: number, windowMs: number): RateLimiterRedis {
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rate_limit:${key}`,
      points: max,
      duration: Math.floor(windowMs / 1000), // Convert to seconds
      blockDuration: Math.floor(windowMs / 1000), // Block for the same duration
    }));
  }
  return rateLimiters.get(key)!;
}

export class RateLimitDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const { max, window } = this.args;

    field.resolve = async function (source, args, context, info) {
      const rateLimiter = getRateLimiter(
        `${info.fieldName}:${context.user?.id || context.ip}`,
        max,
        parseTimeWindow(window)
      );

      try {
        await rateLimiter.consume(context.user?.id || context.ip);
      } catch (rejRes: any) {
        const remainingTime = Math.round(rejRes.msBeforeNext / 1000);
        throw new GraphQLError(
          `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
          {
            extensions: {
              code: 'RATE_LIMITED',
              http: { status: 429 },
              rateLimitDetails: {
                max,
                window,
                remainingTime,
                resetAt: new Date(Date.now() + rejRes.msBeforeNext),
              },
            },
          }
        );
      }

      return resolve.call(this, source, args, context, info);
    };
  }
}

// Parse time window string (e.g., "1h", "30m", "60s")
function parseTimeWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid time window format: ${window}`);
  }

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error(`Invalid time unit: ${unit}`);
  }
}

// User-based rate limiting
export async function checkUserRateLimit(
  userId: string,
  operation: string,
  max: number = 100,
  windowMs: number = 60 * 60 * 1000 // 1 hour
): Promise<void> {
  const rateLimiter = getRateLimiter(`user:${operation}`, max, windowMs);

  try {
    await rateLimiter.consume(userId);
  } catch (rejRes: any) {
    const remainingTime = Math.round(rejRes.msBeforeNext / 1000);
    throw new GraphQLError(
      `Rate limit exceeded for ${operation}. Try again in ${remainingTime} seconds.`,
      {
        extensions: {
          code: 'RATE_LIMITED',
          http: { status: 429 },
          rateLimitDetails: {
            operation,
            max,
            windowMs,
            remainingTime,
            resetAt: new Date(Date.now() + rejRes.msBeforeNext),
          },
        },
      }
    );
  }
}

// API key based rate limiting
export async function checkApiKeyRateLimit(
  apiKey: string,
  operation: string,
  max: number = 1000,
  windowMs: number = 60 * 60 * 1000 // 1 hour
): Promise<void> {
  const rateLimiter = getRateLimiter(`api_key:${operation}`, max, windowMs);

  try {
    await rateLimiter.consume(apiKey);
  } catch (rejRes: any) {
    const remainingTime = Math.round(rejRes.msBeforeNext / 1000);
    throw new GraphQLError(
      `API rate limit exceeded for ${operation}. Try again in ${remainingTime} seconds.`,
      {
        extensions: {
          code: 'API_RATE_LIMITED',
          http: { status: 429 },
          rateLimitDetails: {
            operation,
            max,
            windowMs,
            remainingTime,
            resetAt: new Date(Date.now() + rejRes.msBeforeNext),
          },
        },
      }
    );
  }
}

// IP-based rate limiting (for unauthenticated requests)
export async function checkIpRateLimit(
  ip: string,
  operation: string = 'general',
  max: number = 100,
  windowMs: number = 60 * 60 * 1000 // 1 hour
): Promise<void> {
  const rateLimiter = getRateLimiter(`ip:${operation}`, max, windowMs);

  try {
    await rateLimiter.consume(ip);
  } catch (rejRes: any) {
    const remainingTime = Math.round(rejRes.msBeforeNext / 1000);
    throw new GraphQLError(
      `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
      {
        extensions: {
          code: 'IP_RATE_LIMITED',
          http: { status: 429 },
          rateLimitDetails: {
            operation,
            max,
            windowMs,
            remainingTime,
            resetAt: new Date(Date.now() + rejRes.msBeforeNext),
          },
        },
      }
    );
  }
}

// Dynamic rate limiting based on user tier
export async function checkTieredRateLimit(
  user: any,
  operation: string,
  windowMs: number = 60 * 60 * 1000
): Promise<void> {
  let max: number;

  // Adjust limits based on user tier
  switch (user.role) {
    case 'ADMIN':
    case 'DEVELOPER':
      max = 10000; // Very high limit for admins
      break;
    case 'MODERATOR':
      max = 5000;
      break;
    default:
      if (user.isPremium) {
        max = 1000; // Higher limit for premium users
      } else {
        max = 100; // Standard limit for free users
      }
  }

  await checkUserRateLimit(user.id, operation, max, windowMs);
}

// Rate limit decorator
export function rateLimit(max: number, window: string) {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;
    const windowMs = parseTimeWindow(window);

    descriptor.value = async function (source: any, args: any, context: any, info: any) {
      const identifier = context.user?.id || context.ip;
      const key = `${info.fieldName}:${identifier}`;
      
      await checkUserRateLimit(identifier, key, max, windowMs);
      
      return method.call(this, source, args, context, info);
    };
  };
}