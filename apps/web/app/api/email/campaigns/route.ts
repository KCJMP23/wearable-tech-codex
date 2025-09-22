import { NextRequest, NextResponse } from 'next/server';
import { CampaignService } from '@affiliate-factory/email';
import { EmailService } from '@affiliate-factory/email';
import { rateLimit } from '@/lib/rate-limit';
import { requireTenantContext } from '@/lib/api/tenant-context';

// Rate limiting
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function GET(request: NextRequest) {
  let applyCookiesRef: ((response: NextResponse) => NextResponse) | null = null;
  try {
    await limiter.check(request);

    const { context, error: contextError } = await requireTenantContext(request);
    if (!context) {
      return contextError!;
    }

    const { supabase, tenantId, applyCookies } = context;
    applyCookiesRef = applyCookies;
    const json = (body: unknown, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let query = supabase
      .from('email_campaigns')
      .select(`
        *,
        stats:email_campaign_stats(*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: campaigns, error: queryError, count } = await query;

    if (queryError) {
      console.error('Database error:', queryError);
      return json({ error: 'Database error' }, { status: 500 });
    }

    const response = NextResponse.json({
      campaigns: campaigns || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

    return applyCookies(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      const response = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      return applyCookiesRef ? applyCookiesRef(response) : response;
    }

    console.error('API error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return applyCookiesRef ? applyCookiesRef(response) : response;
  }
}

export async function POST(request: NextRequest) {
  let applyCookiesRef: ((response: NextResponse) => NextResponse) | null = null;
  try {
    await limiter.check(request);

    const { context, error: contextError } = await requireTenantContext(request);
    if (!context) {
      return contextError!;
    }

    const { supabase, tenantId, applyCookies } = context;
    applyCookiesRef = applyCookies;
    const json = (body: unknown, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

    const body = await request.json();
    
    // Validate required fields
    const {
      name,
      type,
      subject,
      preheader,
      fromName,
      fromEmail,
      replyTo,
      htmlContent,
      textContent,
      listIds,
      segmentIds,
      tags,
      scheduledAt,
      abTestConfig,
    } = body;

    if (!name || !type || !subject || !fromName || !fromEmail || !htmlContent || !listIds?.length) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize services
    const emailService = new EmailService({
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY!,
      fromEmail,
      fromName,
      trackOpens: true,
      trackClicks: true,
    }, supabase);

    const campaignService = new CampaignService(emailService, { supabase });

    // Create campaign
    const result = await campaignService.createCampaign({
      tenantId,
      name,
      type,
      subject,
      preheader,
      fromName,
      fromEmail,
      replyTo,
      htmlContent,
      textContent,
      listIds,
      segmentIds: segmentIds || [],
      tags: tags || [],
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      abTestConfig,
    });

    if (!result.success) {
      return json({ error: result.error }, { status: 400 });
    }

    return json({ campaign: result.campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      const response = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      return applyCookiesRef ? applyCookiesRef(response) : response;
    }

    console.error('API error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return applyCookiesRef ? applyCookiesRef(response) : response;
  }
}
