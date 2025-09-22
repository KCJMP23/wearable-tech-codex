import { NextRequest, NextResponse } from 'next/server';
import { SegmentService } from '@affiliate-factory/email';
import { rateLimit } from '@/lib/rate-limit';
import { requireTenantContext } from '@/lib/api/tenant-context';

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500
});

export async function GET(request: NextRequest) {
  const { context, error: contextError } = await requireTenantContext(request);
  if (!context) {
    return contextError!;
  }

  const { supabase, tenantId, applyCookies } = context;
  const json = (body: unknown, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

  try {
    await limiter.check(request);

    const { searchParams } = new URL(request.url);
    const includeCount = searchParams.get('include_count') === 'true';

    const segmentService = new SegmentService(supabase);
    const segments = await segmentService.getSegments(tenantId);

    if (includeCount) {
      for (const segment of segments) {
        await segmentService.recalculateSegmentSize(segment.id);
      }
    }

    return json({ segments });
  } catch (err) {
    if (err instanceof Error && err.message === 'Rate limit exceeded') {
      return json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Segments API error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { name, description, conditions } = body;

    if (!name || !conditions || !Array.isArray(conditions)) {
      return json(
        { error: 'Name and conditions are required' },
        { status: 400 }
      );
    }

    const segmentService = new SegmentService(supabase);
    const result = await segmentService.createSegment(
      tenantId,
      name,
      description || '',
      conditions
    );

    if (!result.success) {
      return json({ error: result.error }, { status: 400 });
    }

    const segment = await segmentService.getSegment(result.segmentId!);

    return json({ segment }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Rate limit exceeded') {
      return json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Create segment error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
