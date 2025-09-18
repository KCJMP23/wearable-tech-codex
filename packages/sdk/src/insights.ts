import { withServiceClient } from './supabase';
import type { InsightCard } from './types';

interface InsightOptions {
  tenantId: string;
  limit?: number;
}

export async function listInsights({ tenantId, limit = 10 }: InsightOptions): Promise<InsightCard[]> {
  return withServiceClient(async (client) => {
    const { data, error } = await client
      .from('insights_view')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('computed_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      kpi: row.kpi,
      value: row.value,
      window: row.window,
      headline: row.headline,
      body: row.body,
      actionLabel: row.action_label ?? undefined,
      action: row.action_payload ?? undefined,
      computedAt: row.computed_at
    }));
  });
}

export async function upsertInsight(insight: InsightCard): Promise<void> {
  await withServiceClient(async (client) => {
    const { error } = await client.from('insights').upsert({
      id: insight.id,
      tenant_id: insight.tenantId,
      kpi: insight.kpi,
      value: insight.value,
      window: insight.window,
      meta: {
        headline: insight.headline,
        body: insight.body,
        action: insight.action
      },
      computed_at: insight.computedAt
    });
    if (error) {
      throw error;
    }
  });
}
