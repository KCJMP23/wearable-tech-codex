import Redis from 'ioredis';

// Redis client setup
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Cache configuration
const CACHE_CONFIG = {
  // Default TTL in seconds
  defaultTTL: 300, // 5 minutes
  
  // Different TTLs for different data types
  ttl: {
    user: 1800, // 30 minutes
    site: 600, // 10 minutes
    product: 300, // 5 minutes
    post: 180, // 3 minutes
    analytics: 60, // 1 minute
    theme: 3600, // 1 hour
    static: 86400, // 24 hours
  },
  
  // Cache key prefixes
  prefix: {
    graphql: 'gql',
    user: 'user',
    site: 'site',
    product: 'product',
    post: 'post',
    analytics: 'analytics',
    session: 'session',
  },
};

export class GraphQLCache {
  private redis: Redis;

  constructor() {
    this.redis = redis;
  }

  // Generate cache key
  private generateKey(prefix: string, id: string, suffix?: string): string {
    const key = `${CACHE_CONFIG.prefix.graphql}:${prefix}:${id}`;
    return suffix ? `${key}:${suffix}` : key;
  }

  // Get from cache
  async get<T>(prefix: string, id: string, suffix?: string): Promise<T | null> {
    try {
      const key = this.generateKey(prefix, id, suffix);
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set cache with TTL
  async set(
    prefix: string,
    id: string,
    data: any,
    ttl?: number,
    suffix?: string
  ): Promise<void> {
    try {
      const key = this.generateKey(prefix, id, suffix);
      const cacheTTL = ttl || CACHE_CONFIG.ttl[prefix as keyof typeof CACHE_CONFIG.ttl] || CACHE_CONFIG.defaultTTL;
      
      await this.redis.setex(key, cacheTTL, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Delete from cache
  async delete(prefix: string, id: string, suffix?: string): Promise<void> {
    try {
      const key = this.generateKey(prefix, id, suffix);
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Delete multiple keys with pattern
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  // Increment counter
  async increment(prefix: string, id: string, amount: number = 1): Promise<number> {
    try {
      const key = this.generateKey(prefix, id);
      return await this.redis.incrby(key, amount);
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  // Set with expiration
  async setex(prefix: string, id: string, data: any, seconds: number): Promise<void> {
    try {
      const key = this.generateKey(prefix, id);
      await this.redis.setex(key, seconds, JSON.stringify(data));
    } catch (error) {
      console.error('Cache setex error:', error);
    }
  }

  // Batch get
  async mget<T>(keys: Array<{ prefix: string; id: string; suffix?: string }>): Promise<(T | null)[]> {
    try {
      const cacheKeys = keys.map(({ prefix, id, suffix }) => this.generateKey(prefix, id, suffix));
      const values = await this.redis.mget(...cacheKeys);
      
      return values.map(value => {
        try {
          return value ? JSON.parse(value) : null;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  // Batch set
  async mset(items: Array<{ prefix: string; id: string; data: any; ttl?: number; suffix?: string }>): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      items.forEach(({ prefix, id, data, ttl, suffix }) => {
        const key = this.generateKey(prefix, id, suffix);
        const cacheTTL = ttl || CACHE_CONFIG.ttl[prefix as keyof typeof CACHE_CONFIG.ttl] || CACHE_CONFIG.defaultTTL;
        pipeline.setex(key, cacheTTL, JSON.stringify(data));
      });
      
      await pipeline.exec();
    } catch (error) {
      console.error('Cache mset error:', error);
    }
  }

  // Cache invalidation by relationships
  async invalidateRelated(type: string, id: string): Promise<void> {
    const patterns = [];

    switch (type) {
      case 'site':
        patterns.push(
          `${CACHE_CONFIG.prefix.graphql}:site:${id}*`,
          `${CACHE_CONFIG.prefix.graphql}:product:*:site:${id}`,
          `${CACHE_CONFIG.prefix.graphql}:post:*:site:${id}`,
          `${CACHE_CONFIG.prefix.graphql}:analytics:site:${id}*`
        );
        break;
      case 'product':
        patterns.push(
          `${CACHE_CONFIG.prefix.graphql}:product:${id}*`,
          `${CACHE_CONFIG.prefix.graphql}:site:*:products*`
        );
        break;
      case 'user':
        patterns.push(
          `${CACHE_CONFIG.prefix.graphql}:user:${id}*`,
          `${CACHE_CONFIG.prefix.graphql}:site:*:user:${id}*`
        );
        break;
    }

    await Promise.all(patterns.map(pattern => this.deletePattern(pattern)));
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  // Cache statistics
  async getStats(): Promise<{
    connected: boolean;
    memory: any;
    keyspace: any;
    clients: number;
  }> {
    try {
      const info = await this.redis.info();
      const memory = await this.redis.info('memory');
      const clients = await this.redis.info('clients');
      const keyspace = await this.redis.info('keyspace');

      return {
        connected: true,
        memory: this.parseRedisInfo(memory),
        keyspace: this.parseRedisInfo(keyspace),
        clients: parseInt(this.parseRedisInfo(clients).connected_clients || '0'),
      };
    } catch (error) {
      return {
        connected: false,
        memory: {},
        keyspace: {},
        clients: 0,
      };
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    info.split('\r\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    });
    return result;
  }
}

// Query result caching
export class QueryCache {
  private cache: GraphQLCache;
  
  constructor() {
    this.cache = new GraphQLCache();
  }

  // Cache query result
  async cacheQuery(
    operationName: string,
    variables: any,
    result: any,
    ttl?: number
  ): Promise<void> {
    const key = this.generateQueryKey(operationName, variables);
    await this.cache.set('query', key, result, ttl);
  }

  // Get cached query result
  async getCachedQuery(
    operationName: string,
    variables: any
  ): Promise<any | null> {
    const key = this.generateQueryKey(operationName, variables);
    return await this.cache.get('query', key);
  }

  // Invalidate query cache
  async invalidateQuery(operationName: string, variables?: any): Promise<void> {
    if (variables) {
      const key = this.generateQueryKey(operationName, variables);
      await this.cache.delete('query', key);
    } else {
      // Invalidate all queries with this operation name
      await this.cache.deletePattern(`*:query:${operationName}:*`);
    }
  }

  private generateQueryKey(operationName: string, variables: any): string {
    const variablesHash = this.hashObject(variables);
    return `${operationName}:${variablesHash}`;
  }

  private hashObject(obj: any): string {
    // Simple hash function for variables
    return Buffer.from(JSON.stringify(obj || {})).toString('base64');
  }
}

// Session cache
export class SessionCache {
  private cache: GraphQLCache;
  
  constructor() {
    this.cache = new GraphQLCache();
  }

  async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    await this.cache.set('session', sessionId, data, ttl);
  }

  async getSession(sessionId: string): Promise<any | null> {
    return await this.cache.get('session', sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.cache.delete('session', sessionId);
  }

  async extendSession(sessionId: string, ttl: number = 3600): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await this.setSession(sessionId, session, ttl);
    }
  }
}

// Rate limiting cache
export class RateLimitCache {
  private cache: GraphQLCache;
  
  constructor() {
    this.cache = new GraphQLCache();
  }

  async increment(
    identifier: string,
    window: number = 3600,
    limit: number = 100
  ): Promise<{ count: number; remaining: number; resetTime: number }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = Math.floor(now / (window * 1000)) * window;
    const windowKey = `${key}:${windowStart}`;

    const count = await this.cache.increment('ratelimit', windowKey);
    
    if (count === 1) {
      // Set expiration for the window
      await this.cache.setex('ratelimit', windowKey, count, window);
    }

    return {
      count,
      remaining: Math.max(0, limit - count),
      resetTime: (windowStart + window) * 1000,
    };
  }
}

// Export singleton instances
export const graphqlCache = new GraphQLCache();
export const queryCache = new QueryCache();
export const sessionCache = new SessionCache();
export const rateLimitCache = new RateLimitCache();

// Cache warming utilities
export const cacheWarming = {
  // Warm up common queries
  async warmUpCommonQueries(): Promise<void> {
    // This would pre-populate cache with frequently accessed data
    console.log('Warming up cache with common queries...');
  },

  // Warm up user-specific data
  async warmUpUserData(userId: string): Promise<void> {
    // Pre-load user's sites, recent products, etc.
    console.log(`Warming up cache for user ${userId}...`);
  },

  // Schedule cache warming
  scheduleWarmUp(): void {
    // Set up cron jobs or intervals for cache warming
    setInterval(() => {
      this.warmUpCommonQueries();
    }, 300000); // Every 5 minutes
  },
};