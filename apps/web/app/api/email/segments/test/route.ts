import { NextRequest, NextResponse } from 'next/server';
import { SegmentService } from '@affiliate-factory/email';
import { rateLimit } from '@/lib/rate-limit';
import { requireTenantContext } from '@/lib/api/tenant-context';

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 200
});

export async function POST(request: NextRequest) {
  const { context, error: contextError } = await requireTenantContext(request);
  if (!context) {
    return contextError!;
  }

  const { supabase, tenantId, applyCookies } = context;
  const json = (body: unknown, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

  try {
    await limiter.check(request);

    const body = await request.json();
    const { conditions, limit = 10 } = body;

    if (!conditions || !Array.isArray(conditions)) {
      return json(
        { error: 'Conditions array is required' },
        { status: 400 }
      );
    }

    const segmentService = new SegmentService(supabase);
    const result = await segmentService.testSegment(
      tenantId,
      conditions,
      Math.min(limit, 50)
    );

    if (!result.success) {
      return json({ error: result.error }, { status: 400 });
    }

    return json({
      success: true,
      totalCount: result.totalCount,
      sampleSubscribers: result.subscribers,
      conditions
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Rate limit exceeded') {
      return json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Test segment error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
