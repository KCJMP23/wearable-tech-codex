import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CampaignService } from '@affiliate-factory/email';
import { EmailService } from '@affiliate-factory/email';
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
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

  // Verify user has access to this tenant
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single();

  if (!membership) return null;

  return { userId: user.id, tenantId };
}

export async function GET(request: NextRequest) {
  try {
    await limiter.check(request);

    const auth = await checkAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      .eq('tenant_id', auth.tenantId)
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

    const { data: campaigns, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      campaigns: campaigns || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await limiter.check(request);

    const auth = await checkAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize services
    const emailService = new EmailService({
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY!,
      fromEmail,
      fromName,
      trackOpens: true,
      trackClicks: true,
    });

    const campaignService = new CampaignService(emailService);

    // Create campaign
    const result = await campaignService.createCampaign({
      tenantId: auth.tenantId,
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
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ campaign: result.campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}