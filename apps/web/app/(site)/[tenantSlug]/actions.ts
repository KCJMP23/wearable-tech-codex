'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '../../../lib/supabase';

export async function submitQuizAnswers(tenantSlug: string, quizId: string, answers: Record<string, unknown>) {
  const client = createServiceClient();
  const { data: tenant } = await client.from('tenants').select('id').eq('slug', tenantSlug).maybeSingle();
  if (!tenant) throw new Error('Tenant not found');

  const segments = extractSegments(answers);
  const { data: quiz } = await client.from('quiz').select('schema').eq('id', quizId).maybeSingle();
  const matched = resolveRecommendedProducts(quiz?.schema?.segments ?? [], segments);

  const { error } = await client.from('quiz_results').insert({
    tenant_id: tenant.id,
    quiz_id: quizId,
    answers,
    segments: matched.segmentLabels,
    recommended_product_ids: matched.productIds,
    email: null
  });

  if (error) throw error;
  revalidatePath(`/${tenantSlug}`);
}

export async function subscribeToNewsletter(tenantSlug: string, email: string) {
  const client = createServiceClient();
  const { data: tenant } = await client.from('tenants').select('id').eq('slug', tenantSlug).maybeSingle();
  if (!tenant) throw new Error('Tenant not found');

  const { error } = await client.from('subscribers').upsert({
    tenant_id: tenant.id,
    email,
    status: 'active',
    source: 'newsletter_bar'
  });

  if (error) throw error;
  revalidatePath(`/${tenantSlug}`);
}

function extractSegments(answers: Record<string, unknown>): string[] {
  return Object.values(answers)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value))
    .slice(0, 5);
}

function resolveRecommendedProducts(
  schemaSegments: Array<{ id: string; name: string; recommendedProductIds?: string[] }> = [],
  responses: string[]
): { productIds: string[]; segmentLabels: string[] } {
  if (!schemaSegments.length) {
    return { productIds: [], segmentLabels: responses };
  }

  const matches = new Set<string>();
  const matchedSegments: { id: string; name: string; recommendedProductIds?: string[] }[] = [];
  for (const response of responses) {
    const normalized = response.toLowerCase();
    const segment = schemaSegments.find((item) => {
      return item.id?.toLowerCase() === normalized || item.name?.toLowerCase().includes(normalized);
    });
    if (segment && !matches.has(segment.id)) {
      matches.add(segment.id);
      matchedSegments.push(segment);
    }
  }

  if (!matchedSegments.length) {
    matchedSegments.push(schemaSegments[0]);
  }

  const productIds = Array.from(
    new Set(
      matchedSegments
        .flatMap((segment) => segment.recommendedProductIds ?? [])
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  ).slice(0, 6);

  const segmentLabels = matchedSegments.map((segment) => segment.name ?? segment.id);
  return { productIds, segmentLabels };
}
