import { NextRequest, NextResponse } from 'next/server';
import { CampaignService } from '@affiliate-factory/email';
import { EmailService } from '@affiliate-factory/email';
import { rateLimit } from '@/lib/rate-limit';
import { requireTenantContext } from '@/lib/api/tenant-context';

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  let applyCookiesRef: ((response: NextResponse) => NextResponse) | null = null;
  try {
    await limiter.check(request);

    const { context, error: contextError } = await requireTenantContext(request);
    if (!context) {
      return contextError!;
    }

    const { supabase, tenantId, applyCookies } = context;
    applyCookiesRef = applyCookies;

    const { data: campaign, error: queryError } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        stats:email_campaign_stats(*),
        analytics:email_analytics(*)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (queryError || !campaign) {
      const response = NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      return applyCookies(response);
    }

    return applyCookies(NextResponse.json({ campaign }));
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  let applyCookiesRef: ((response: NextResponse) => NextResponse) | null = null;
  try {
    await limiter.check(request);

    const { context, error: contextError } = await requireTenantContext(request);
    if (!context) {
      return contextError!;
    }

    const { supabase, tenantId, applyCookies } = context;
    applyCookiesRef = applyCookies;

    // Check if campaign exists and belongs to tenant
    const { data: existingCampaign } = await supabase
      .from('email_campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!existingCampaign) {
      const response = NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      return applyCookies(response);
    }

    // Only allow editing draft campaigns
    if (existingCampaign.status !== 'draft') {
      const response = NextResponse.json({ error: 'Can only edit draft campaigns' }, { status: 400 });
      return applyCookies(response);
    }

    const body = await request.json();
    
    const emailService = new EmailService({
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY!,
      fromEmail: body.fromEmail,
      fromName: body.fromName,
      trackOpens: true,
      trackClicks: true,
    }, supabase);

    const campaignService = new CampaignService(emailService, { supabase });

    const result = await campaignService.updateCampaign(id, body);

    if (!result.success) {
      const response = NextResponse.json({ error: result.error }, { status: 400 });
      return applyCookies(response);
    }

    // Get updated campaign
    const { data: updatedCampaign } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    return applyCookies(NextResponse.json({ campaign: updatedCampaign }));
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  let applyCookiesRef: ((response: NextResponse) => NextResponse) | null = null;
  try {
    await limiter.check(request);

    const { context, error: contextError } = await requireTenantContext(request);
    if (!context) {
      return contextError!;
    }

    const { supabase, tenantId, applyCookies } = context;
    applyCookiesRef = applyCookies;

    // Check if campaign exists and belongs to tenant
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!campaign) {
      const response = NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      return applyCookies(response);
    }

    // Only allow deleting draft campaigns
    if (campaign.status !== 'draft') {
      const response = NextResponse.json({ error: 'Can only delete draft campaigns' }, { status: 400 });
      return applyCookies(response);
    }

    const { error: deleteError } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      const response = NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
      return applyCookies(response);
    }

    return applyCookies(NextResponse.json({ success: true }));
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
