import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EmailAnalyticsService } from '@affiliate-factory/email';
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

async function getTenantId(request: NextRequest): Promise<string | null> {
  const headersList = headers();
  const tenantSlug = headersList.get('x-tenant-slug');
  
  if (!tenantSlug) return null;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single();

  return tenant?.id || null;
}

async function checkAuth(request: NextRequest): Promise<{ userId: string; tenantId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const { data: { user } } = await supabase.auth.getUser(token);
  
  if (!user) return null;

  const tenantId = await getTenantId(request);
  if (!tenantId) return null;

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single();

  if (!membership) return null;

  return { userId: user.id, tenantId };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await limiter.check(request);

    const auth = await checkAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify campaign belongs to tenant
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('id, name, status')
      .eq('id', params.id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const realtime = searchParams.get('realtime') === 'true';

    const analyticsService = new EmailAnalyticsService();

    if (realtime) {
      // Get real-time metrics for live campaigns
      const metrics = await analyticsService.getRealTimeMetrics(params.id);
      return NextResponse.json({ metrics });
    }

    // Get comprehensive analytics
    const analytics = await analyticsService.getCampaignAnalytics(params.id, detailed);

    if (!analytics) {
      return NextResponse.json({ error: 'Analytics not available' }, { status: 404 });
    }

    return NextResponse.json({ analytics });
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}