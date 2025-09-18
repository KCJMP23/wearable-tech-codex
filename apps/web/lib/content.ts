import type { Post, Product, Quiz, InsightCard, PostImage } from '@affiliate-factory/sdk';
import { createServiceClient } from './supabase';

const mapProduct = (row: any): Product => ({
  id: row.id,
  tenantId: row.tenant_id,
  asin: row.asin,
  title: row.title,
  brand: row.brand,
  images: (row.images ?? []) as PostImage[],
  features: row.features ?? [],
  rating: row.rating,
  reviewCount: row.review_count,
  priceSnapshot: row.price_snapshot,
  currency: row.currency,
  category: row.category,
  subcategory: row.subcategory,
  deviceType: row.device_type,
  compatibility: row.compatibility ?? {},
  regulatoryNotes: row.regulatory_notes,
  healthMetrics: row.health_metrics ?? [],
  batteryLifeHours: row.battery_life_hours,
  waterResistance: row.water_resistance,
  affiliateUrl: row.affiliate_url,
  source: row.source,
  lastVerifiedAt: row.last_verified_at,
  raw: row.raw ?? {}
});

const mapPost = (row: any): Post => ({
  id: row.id,
  tenantId: row.tenant_id,
  type: row.type,
  title: row.title,
  slug: row.slug,
  excerpt: row.excerpt,
  bodyMdx: row.body_mdx,
  images: row.images ?? [],
  status: row.status,
  publishedAt: row.published_at,
  seo: row.seo ?? { title: row.title, description: row.excerpt },
  jsonld: row.jsonld
});

const mapQuiz = (row: any): Quiz => ({
  id: row.id,
  tenantId: row.tenant_id,
  title: row.title,
  schema: row.schema,
  active: row.active
});

export async function getFeaturedProducts(tenantId: string): Promise<Product[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('rating', { ascending: false })
    .limit(6);

  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function getRecentPosts(tenantId: string): Promise<Post[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from('posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(6);

  if (error) throw error;
  return (data ?? []).map(mapPost);
}

export async function getActiveQuiz(tenantId: string): Promise<Quiz | null> {
  const client = createServiceClient();
  const { data, error } = await client
    .from('quiz')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data ? mapQuiz(data) : null;
}

export async function getTenantInsights(tenantId: string): Promise<InsightCard[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from('insights_view')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(6);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId,
    kpi: row.kpi,
    value: row.value,
    window: row.window,
    headline: row.headline,
    body: row.body,
    actionLabel: row.action_label,
    action: row.action_payload,
    computedAt: row.computed_at
  }));
}

export async function getPostBySlug(tenantId: string, slug: string) {
  const client = createServiceClient();
  const { data, error } = await client
    .from('posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPost(data) : null;
}

export async function getPostProducts(postId: string) {
  const client = createServiceClient();
  const { data, error } = await client
    .from('post_products_view')
    .select('products(*)')
    .eq('post_id', postId);
  if (error) throw error;
  return (data ?? []).map((row: any) => mapProduct(row.products));
}

export async function getKbEntry(tenantId: string, kind: string, title: string) {
  const client = createServiceClient();
  const { data, error } = await client
    .from('kb')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('kind', kind)
    .eq('title', title)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTenantTaxonomy(tenantId: string) {
  const client = createServiceClient();
  const { data, error } = await client
    .from('taxonomy')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');
  if (error) throw error;
  const vertical = (data ?? []).filter((row: any) => row.kind === 'vertical');
  const horizontal = (data ?? []).filter((row: any) => row.kind === 'horizontal');
  return { vertical, horizontal };
}

export async function getPostsByTaxonomy(tenantId: string, taxonomySlug: string) {
  const client = createServiceClient();
  const { data, error } = await client.rpc('get_posts_by_taxonomy', { tenant_uuid: tenantId, taxonomy_slug: taxonomySlug });
  if (error) throw error;
  return (data ?? []).map(mapPost);
}
