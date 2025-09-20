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

    const { data: campaign, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        stats:email_campaign_stats(*),
        analytics:email_analytics(*)
      `)
      .eq('id', params.id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await limiter.check(request);

    const auth = await checkAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if campaign exists and belongs to tenant
    const { data: existingCampaign } = await supabase
      .from('email_campaigns')
      .select('id, status')
      .eq('id', params.id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Only allow editing draft campaigns
    if (existingCampaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only edit draft campaigns' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const emailService = new EmailService({
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY!,
      fromEmail: body.fromEmail,
      fromName: body.fromName,
      trackOpens: true,
      trackClicks: true,
    });

    const campaignService = new CampaignService(emailService);

    const result = await campaignService.updateCampaign(params.id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Get updated campaign
    const { data: updatedCampaign } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', params.id)
      .single();

    return NextResponse.json({ campaign: updatedCampaign });
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await limiter.check(request);

    const auth = await checkAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if campaign exists and belongs to tenant
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('id, status')
      .eq('id', params.id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Only allow deleting draft campaigns
    if (campaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only delete draft campaigns' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}