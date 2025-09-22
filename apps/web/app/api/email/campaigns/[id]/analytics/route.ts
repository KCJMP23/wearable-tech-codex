import { NextRequest, NextResponse } from 'next/server';
import { EmailAnalyticsService } from '@affiliate-factory/email';
import { rateLimit } from '@/lib/rate-limit';
import { requireTenantContext } from '@/lib/api/tenant-context';

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { context, error: contextError } = await requireTenantContext(request);
  if (!context) {
    return contextError!;
  }

  const { supabase, tenantId, applyCookies } = context;
  const json = (body: unknown, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

  try {
    await limiter.check(request);

    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('id, name, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (campaignError || !campaign) {
      return json({ error: 'Campaign not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const realtime = searchParams.get('realtime') === 'true';

    const analyticsService = new EmailAnalyticsService(supabase);

    if (realtime) {
      const metrics = await analyticsService.getRealTimeMetrics(id);
      return json({ metrics });
    }

    const analytics = await analyticsService.getCampaignAnalytics(id, detailed);

    if (!analytics) {
      return json({ error: 'Analytics not available' }, { status: 404 });
    }

    return json({ analytics });
  } catch (err) {
    if (err instanceof Error && err.message === 'Rate limit exceeded') {
      return json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Analytics API error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
