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
  uniqueTokenPerInterval: 100, // More restrictive for sending
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

  // Verify user has admin/editor role for sending campaigns
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single();

  if (!membership || !['admin', 'editor'].includes(membership.role)) {
    return null;
  }

  return { userId: user.id, tenantId };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await limiter.check(request);

    const auth = await checkAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Validate campaign can be sent
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Campaign has already been sent or is not ready' },
        { status: 400 }
      );
    }

    // Validate campaign has required content
    if (!campaign.html_content || !campaign.subject || !campaign.list_ids?.length) {
      return NextResponse.json(
        { error: 'Campaign is missing required content or recipients' },
        { status: 400 }
      );
    }

    // Get tenant email configuration
    const { data: tenant } = await supabase
      .from('tenants')
      .select('email_config')
      .eq('id', auth.tenantId)
      .single();

    const emailConfig = tenant?.email_config || {
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY!,
      fromEmail: campaign.from_email,
      fromName: campaign.from_name,
      trackOpens: true,
      trackClicks: true,
    };

    // Initialize services
    const emailService = new EmailService(emailConfig);
    const campaignService = new CampaignService(emailService);

    // Check for test send
    const body = await request.json().catch(() => ({}));
    const { testEmail, sendType = 'live' } = body;

    if (sendType === 'test' && testEmail) {
      // Send test email
      const result = await emailService.sendEmail({
        to: testEmail,
        subject: `[TEST] ${campaign.subject}`,
        html: campaign.html_content,
        text: campaign.text_content,
        metadata: {
          campaignId: campaign.id,
          isTest: true,
          tenantId: auth.tenantId,
        },
      });

      if (!result.success) {
        return NextResponse.json(
          { error: `Test send failed: ${result.error}` },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
      });
    }

    // Send live campaign
    const result = await campaignService.sendCampaign(params.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Log campaign send action
    await supabase
      .from('activity_logs')
      .insert({
        tenant_id: auth.tenantId,
        user_id: auth.userId,
        action: 'campaign_sent',
        resource_type: 'email_campaign',
        resource_id: params.id,
        metadata: {
          sent: result.sent,
          failed: result.failed,
          abTestResults: result.abTestResults,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Campaign sent successfully',
      stats: {
        sent: result.sent,
        failed: result.failed,
      },
      abTestResults: result.abTestResults,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Send campaign error:', error);
    
    // Log failed send attempt
    try {
      const auth = await checkAuth(request);
      if (auth) {
        await supabase
          .from('activity_logs')
          .insert({
            tenant_id: auth.tenantId,
            user_id: auth.userId,
            action: 'campaign_send_failed',
            resource_type: 'email_campaign',
            resource_id: params.id,
            metadata: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
      }
    } catch (logError) {
      console.error('Failed to log send failure:', logError);
    }

    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}