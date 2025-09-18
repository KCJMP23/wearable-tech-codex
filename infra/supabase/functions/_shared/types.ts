// Common types for Supabase Edge Functions

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MAKE_BLOG_WEBHOOK_SECRET?: string;
  MAKE_PRODUCT_WEBHOOK_SECRET?: string;
  MAKE_IMAGE_WEBHOOK_SECRET?: string;
  OPENAI_API_KEY?: string;
  AMAZON_ACCESS_KEY_ID?: string;
  AMAZON_SECRET_ACCESS_KEY?: string;
  AMAZON_ASSOCIATE_TAG?: string;
}

export interface IngestPostPayload {
  tenantSlug: string;
  sourceId?: string;
  type: 'howto' | 'listicle' | 'answer' | 'review' | 'roundup' | 'alternative' | 'evergreen';
  title: string;
  slug: string;
  excerpt: string;
  bodyMdx: string;
  images?: Array<{ url: string; alt: string }>;
  internalLinks?: string[];
  externalLinks?: string[];
  products?: string[];
  seo?: { title?: string; description?: string };
  jsonLd?: Record<string, any>;
  publish: boolean;
}

export interface IngestProductPayload {
  tenantSlug: string;
  asin: string;
  title?: string;
  brand?: string;
  price?: number;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  features?: string[];
  description?: string;
  categoryPath?: string;
  affiliateUrl?: string;
  isActive?: boolean;
}

export interface IngestImagePayload {
  tenantSlug: string;
  images: Array<{
    url: string;
    alt: string;
    fileName?: string;
    bucket?: string;
    folder?: string;
  }>;
}

export interface RunAgentPayload {
  agentType: 'product' | 'editorial' | 'newsletter' | 'personalization' | 'seasonal' | 'social' | 'trends' | 'chatbot' | 'orchestrator';
  tenantSlug?: string;
  parameters?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
}

export interface ScheduleTickPayload {
  eventType: string;
  tenantSlug?: string;
  scheduledFor: string;
  parameters?: Record<string, any>;
}

export interface LinkVerifyPayload {
  tenantSlug?: string;
  links?: string[];
  postIds?: string[];
  productIds?: string[];
}

export interface EmbeddingsIndexPayload {
  tenantSlug?: string;
  contentType: 'post' | 'product' | 'category';
  contentIds?: string[];
  reindexAll?: boolean;
}

export interface AgentTask {
  id: string;
  tenant_id: string;
  agent_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
  scheduled_for?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  result?: Record<string, any>;
}

export interface ScheduledEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  scheduled_for: string;
  parameters: Record<string, any>;
  status: 'pending' | 'processed' | 'failed';
  processed_at?: string;
  error_message?: string;
}

export interface LinkVerificationResult {
  url: string;
  status: 'valid' | 'invalid' | 'error';
  statusCode?: number;
  redirectUrl?: string;
  errorMessage?: string;
  checkedAt: string;
}

export interface EmbeddingRecord {
  id: string;
  content_type: 'post' | 'product' | 'category';
  content_id: string;
  tenant_id: string;
  title: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}