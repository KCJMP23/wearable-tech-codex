import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SITE_NAME: z.string().default('Affiliate Factory'),
  NEXT_PUBLIC_DEFAULT_DOMAIN: z.string().default('example.com'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(32),
  SUPABASE_STORAGE_BUCKET: z.string().default('media'),
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  EMBEDDINGS_MODEL: z.string().default('text-embedding-3-large'),
  TAVILY_API_KEY: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().min(1),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  AMAZON_PA_API_ACCESS_KEY: z.string().min(1),
  AMAZON_PA_API_SECRET_KEY: z.string().min(1),
  AMAZON_PA_API_PARTNER_TAG: z.string().default('jmpkc01-20'),
  AMAZON_PA_API_PARTNER_TYPE: z.string().default('Associates'),
  AMAZON_PA_API_LOCALE: z.string().default('US'),
  WALMART_PARTNER_ID: z.string().optional(),
  TARGET_PARTNER_ID: z.string().optional(),
  BESTBUY_API_KEY: z.string().optional(),
  REDDIT_APP_ID: z.string().min(1),
  REDDIT_APP_SECRET: z.string().min(1),
  REDDIT_USER_AGENT: z.string().default('affiliate-suite/1.0'),
  MAKE_BLOG_WEBHOOK_SECRET: z.string().min(1),
  MAKE_PRODUCT_WEBHOOK_SECRET: z.string().min(1),
  MAKE_IMAGE_WEBHOOK_SECRET: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  DEFAULT_TENANT_SLUG: z.string().default('nectarheat'),
  DEFAULT_TENANT_DOMAIN: z.string().default('nectarheat.com'),
  SENTRY_DSN: z.string().optional(),
  LOGFLARE_API_KEY: z.string().optional(),
  ENABLE_OPTIONAL_AD_MANAGER: z.string().default('false')
});

export type Environment = z.infer<typeof envSchema>;

let cachedEnv: Environment | null = null;

export function loadEnv(overrides: Partial<Record<keyof Environment, string>> = {}): Environment {
  if (!cachedEnv) {
    const parsed = envSchema.safeParse({ ...process.env, ...overrides });
    if (!parsed.success) {
      throw new Error(`Environment validation failed: ${parsed.error.message}`);
    }
    cachedEnv = parsed.data;
  }
  return cachedEnv;
}

export function getEnvVar<K extends keyof Environment>(key: K): Environment[K] {
  const env = loadEnv();
  return env[key];
}
