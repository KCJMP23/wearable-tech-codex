import { NextRequest, NextResponse } from 'next/server';
import { CampaignService } from '@affiliate-factory/email';
import { EmailService } from '@affiliate-factory/email';
import { rateLimit } from '@/lib/rate-limit';
import { requireTenantContext } from '@/lib/api/tenant-context';

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 100
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { context, error: contextError } = await requireTenantContext(request);
  if (!context) {
    return contextError!;
  }

  const { supabase, tenantId, user, applyCookies } = context;
  const jsonWithCookies = (body: unknown, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

  try {
    await limiter.check(request);

    const { data: membership, error: membershipError } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (membershipError) {
      console.error('Membership lookup failed:', membershipError);
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    if (!membership || !['admin', 'editor'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (campaignError || !campaign) {
      return jsonWithCookies({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return jsonWithCookies(
        { error: 'Campaign has already been sent or is not ready' },
        { status: 400 }
      );
    }

    if (!campaign.html_content || !campaign.subject || !campaign.list_ids?.length) {
      return jsonWithCookies(
        { error: 'Campaign is missing required content or recipients' },
        { status: 400 }
      );
    }

    const { data: tenantConfig, error: tenantConfigError } = await supabase
      .from('tenants')
      .select('email_config')
      .eq('id', tenantId)
      .single();

    if (tenantConfigError) {
      console.error('Tenant email config error:', tenantConfigError);
      return jsonWithCookies({ error: 'Failed to load tenant email configuration' }, { status: 500 });
    }

    const emailConfig = tenantConfig?.email_config || {
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY!,
      fromEmail: campaign.from_email,
      fromName: campaign.from_name,
      trackOpens: true,
      trackClicks: true
    };

    const emailService = new EmailService(emailConfig, supabase);
    const campaignService = new CampaignService(emailService, { supabase });

    const body = await request.json().catch(() => ({}));
    const { testEmail, sendType = 'live' } = body;

    if (sendType === 'test' && testEmail) {
      const result = await emailService.sendEmail({
        to: testEmail,
        subject: `[TEST] ${campaign.subject}`,
        html: campaign.html_content,
        text: campaign.text_content,
        metadata: {
          campaignId: campaign.id,
          isTest: true,
          tenantId
        }
      });

      if (!result.success) {
        return jsonWithCookies(
          { error: `Test send failed: ${result.error}` },
          { status: 400 }
        );
      }

      return jsonWithCookies({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    }

    const result = await campaignService.sendCampaign(id);

    if (!result.success) {
      return jsonWithCookies({ error: result.error }, { status: 400 });
    }

    await supabase
      .from('activity_logs')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        action: 'campaign_sent',
        resource_type: 'email_campaign',
        resource_id: id,
        metadata: {
          sent: result.sent,
          failed: result.failed,
          abTestResults: result.abTestResults
        }
      });

    return jsonWithCookies({
      success: true,
      message: 'Campaign sent successfully',
      stats: {
        sent: result.sent,
        failed: result.failed
      },
      abTestResults: result.abTestResults
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Rate limit exceeded') {
      return jsonWithCookies({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Send campaign error:', err);

    try {
      await supabase
        .from('activity_logs')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          action: 'campaign_send_failed',
          resource_type: 'email_campaign',
          resource_id: params.id,
          metadata: {
            error: err instanceof Error ? err.message : 'Unknown error'
          }
        });
    } catch (logError) {
      console.error('Failed to log send failure:', logError);
    }

    return jsonWithCookies({ error: 'Failed to send campaign' }, { status: 500 });
  }
}
