import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SegmentService } from '@affiliate-factory/email';
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 200, // More restrictive for testing
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

export async function POST(request: NextRequest) {
  try {
    await limiter.check(request);

    const auth = await checkAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conditions, limit = 10 } = body;

    if (!conditions || !Array.isArray(conditions)) {
      return NextResponse.json(
        { error: 'Conditions array is required' },
        { status: 400 }
      );
    }

    const segmentService = new SegmentService();
    const result = await segmentService.testSegment(
      auth.tenantId,
      conditions,
      Math.min(limit, 50) // Cap at 50 for testing
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      totalCount: result.totalCount,
      sampleSubscribers: result.subscribers,
      conditions,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Test segment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}