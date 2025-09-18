export type PostType =
  | 'howto'
  | 'listicle'
  | 'answer'
  | 'review'
  | 'roundup'
  | 'alternative'
  | 'evergreen';

export type PublishStatus = 'draft' | 'scheduled' | 'published';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
  theme: Record<string, unknown>;
  logoUrl: string | null;
  colorTokens: Record<string, string>;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
}

export interface ProductImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface ProductFeature {
  title: string;
  description: string;
}

export interface Product {
  id: string;
  tenantId: string;
  asin: string;
  title: string;
  brand: string | null;
  images: ProductImage[];
  features: ProductFeature[];
  rating: number | null;
  reviewCount: number | null;
  priceSnapshot: string | null;
  currency: string | null;
  category: string | null;
  subcategory: string | null;
  deviceType: string | null;
  compatibility: Record<string, unknown>;
  regulatoryNotes: string | null;
  healthMetrics: string[];
  batteryLifeHours: number | null;
  waterResistance: string | null;
  affiliateUrl: string;
  source: string;
  lastVerifiedAt: string | null;
  raw: Record<string, unknown>;
}

export interface PostSeo {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
}

export interface JsonLdPayload {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
}

export interface PostImage extends ProductImage {
  attribution?: string;
}

export interface Post {
  id: string;
  tenantId: string;
  type: PostType;
  title: string;
  slug: string;
  excerpt: string;
  bodyMdx: string;
  images: PostImage[];
  status: PublishStatus;
  publishedAt: string | null;
  seo: PostSeo;
  jsonld: JsonLdPayload | null;
}

export interface QuizSchemaNode {
  id: string;
  question: string;
  type: 'single' | 'multi' | 'scale';
  choices: Array<{
    id: string;
    label: string;
    value: string;
    next?: string | null;
  }>;
  scoring?: Record<string, number>;
}

export interface Quiz {
  id: string;
  tenantId: string;
  title: string;
  schema: QuizSchemaNode[];
  active: boolean;
}

export interface InsightCard {
  id: string;
  tenantId: string;
  kpi: string;
  value: number;
  window: string;
  headline: string;
  body: string;
  actionLabel?: string;
  action?: {
    type: 'run-agent' | 'open-url' | 'schedule';
    payload: Record<string, unknown>;
  };
  computedAt: string;
}

export interface CalendarItem {
  id: string;
  tenantId: string;
  itemType: 'post' | 'newsletter' | 'social' | 'agent';
  refId: string | null;
  title: string;
  status: 'planned' | 'scheduled' | 'published' | 'done' | 'blocked';
  runAt: string;
  meta: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  tenantId: string;
  agent: string;
  input: Record<string, unknown>;
  status: 'queued' | 'running' | 'done' | 'error';
  result: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AgentRunInput<T = Record<string, unknown>> {
  tenantSlug: string;
  agent: string;
  input: T;
}

export interface AgentRunResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export interface AmazonProductResponse {
  asin: string;
  detailPageURL: string;
  title?: string;
  brand?: string;
  features?: string[];
  images?: ProductImage[];
  rating?: number;
  reviewCount?: number;
  price?: {
    amount: number;
    currency: string;
  };
}

export interface RedditTrend {
  subreddit: string;
  title: string;
  url: string;
  score: number;
  comments: number;
  tags: string[];
}

export interface SearchSnippet {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export interface NewsletterCampaign {
  id: string;
  tenantId: string;
  subject: string;
  preheader?: string;
  html: string;
  segment: string;
  scheduledAt: string;
}

export interface SegmentDefinition {
  id: string;
  name: string;
  rules: Record<string, unknown>;
}
