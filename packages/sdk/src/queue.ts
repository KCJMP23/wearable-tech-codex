import { Redis } from '@upstash/redis';
import { loadEnv } from './env.js';

const QUEUE_KEY = 'affiliate-factory:tasks';
let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    const env = loadEnv();
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis credentials missing');
    }
    redisClient = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN
    });
  }
  return redisClient;
}

export async function enqueueTask(payload: Record<string, unknown>): Promise<void> {
  const redis = getRedis();
  await redis.rpush(QUEUE_KEY, JSON.stringify(payload));
}

export async function dequeueTask(): Promise<Record<string, unknown> | null> {
  const redis = getRedis();
  const result = await redis.lpop<string>(QUEUE_KEY);
  return result ? (JSON.parse(result) as Record<string, unknown>) : null;
}
