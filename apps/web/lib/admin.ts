import { createServiceClient } from './supabase';
import type { AgentTask, CalendarItem, InsightCard, Product, Post } from '@affiliate-factory/sdk';

const mapProduct = (row: any): Product => ({
  id: row.id,
  tenantId: row.tenant_id,
  asin: row.asin,
  title: row.title,
  brand: row.brand,
  images: row.images ?? [],
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

export async function getAdminInsights(tenantId: string): Promise<InsightCard[]> {
  const client = createServiceClient();
  const { data, error } = await client.from('insights_view').select('*').eq('tenant_id', tenantId).limit(8);
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

export async function getAgentTasks(tenantId: string): Promise<AgentTask[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from('agent_tasks')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    agent: row.agent,
    input: row.input,
    status: row.status,
    result: row.result,
    createdAt: row.created_at,
    completedAt: row.completed_at
  }));
}

export async function getCalendarItems(tenantId: string): Promise<CalendarItem[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from('calendar')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('run_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
    .lte('run_at', new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString());
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    itemType: row.item_type,
    refId: row.ref_id,
    title: row.title,
    status: row.status,
    runAt: row.run_at,
    meta: row.meta ?? {}
  }));
}

export async function listProducts(tenantId: string): Promise<Product[]> {
  const client = createServiceClient();
  const { data, error } = await client.from('products').select('*').eq('tenant_id', tenantId).limit(50);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function listPosts(tenantId: string): Promise<Post[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from('posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(mapPost);
}
