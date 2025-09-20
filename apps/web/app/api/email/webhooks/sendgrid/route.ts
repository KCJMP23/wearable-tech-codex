import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '@affiliate-factory/email';
import { ComplianceService } from '@affiliate-factory/email';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: string;
  sg_message_id: string;
  category?: string[];
  url?: string;
  useragent?: string;
  ip?: string;
  reason?: string;
  status?: string;
  response?: string;
  attempt?: string;
  [key: string]: any;
}

function verifyWebhookSignature(
  payload: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const verify = crypto.createVerify('sha256');
    verify.update(payload);
    return verify.verify(publicKey, signature, 'base64');
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

function mapSendGridEvent(event: string): string {
  const eventMap: Record<string, string> = {
    'processed': 'sent',
    'delivered': 'delivered',
    'open': 'opened',
    'click': 'clicked',
    'bounce': 'bounced',
    'dropped': 'failed',
    'deferred': 'deferred',
    'spam_report': 'complained',
    'unsubscribe': 'unsubscribed',
    'group_unsubscribe': 'unsubscribed',
    'group_resubscribe': 'resubscribed',
  };
  
  return eventMap[event] || event;
}

async function processEmailEvent(event: SendGridEvent): Promise<void> {
  try {
    const mappedEvent = mapSendGridEvent(event.event);
    
    // Extract campaign and subscriber info from custom args or categories
    let campaignId = '';
    let subscriberId = '';
    let tenantId = '';

    // Try to get from custom args (passed when sending)
    if (event.category && Array.isArray(event.category)) {
      for (const category of event.category) {
        if (category.startsWith('campaign_')) {
          campaignId = category.replace('campaign_', '');
        } else if (category.startsWith('subscriber_')) {
          subscriberId = category.replace('subscriber_', '');
        } else if (category.startsWith('tenant_')) {
          tenantId = category.replace('tenant_', '');
        }
      }
    }

    // If not found in categories, try to find subscriber by email
    if (!subscriberId && event.email) {
      const { data: subscriber } = await supabase
        .from('email_subscribers')
        .select('id, tenant_id')
        .eq('email', event.email)
        .single();

      if (subscriber) {
        subscriberId = subscriber.id;
        tenantId = subscriber.tenant_id;
      }
    }

    // Log the email event
    await supabase
      .from('email_analytics')
      .insert({
        campaign_id: campaignId || null,
        subscriber_id: subscriberId || null,
        event: mappedEvent,
        timestamp: new Date(event.timestamp * 1000).toISOString(),
        metadata: {
          messageId: event.sg_message_id,
          userAgent: event.useragent,
          ip: event.ip,
          url: event.url,
          reason: event.reason,
          status: event.status,
          response: event.response,
          attempt: event.attempt,
          provider: 'sendgrid',
          originalEvent: event.event,
        },
        user_agent: event.useragent,
        ip_address: event.ip,
      });

    // Handle specific events
    await handleSpecificEvent(mappedEvent, event, subscriberId, tenantId);
  } catch (error) {
    console.error('Error processing email event:', error);
    throw error;
  }
}

async function handleSpecificEvent(
  eventType: string,
  event: SendGridEvent,
  subscriberId: string,
  tenantId: string
): Promise<void> {
  const complianceService = new ComplianceService();

  switch (eventType) {
    case 'bounced':
      await handleBounce(event, subscriberId, complianceService);
      break;
    case 'complained':
      await handleComplaint(event, subscriberId, complianceService);
      break;
    case 'unsubscribed':
      await handleUnsubscribe(event, subscriberId, tenantId, complianceService);
      break;
    case 'clicked':
      await handleClick(event, subscriberId);
      break;
    case 'opened':
      await updateLastActive(subscriberId);
      break;
  }
}

async function handleBounce(
  event: SendGridEvent, 
  subscriberId: string,
  complianceService: ComplianceService
): Promise<void> {
  if (!subscriberId) return;

  // Increment bounce count
  await supabase
    .from('email_subscribers')
    .update({
      bounce_count: supabase.raw('bounce_count + 1'),
      last_bounce_at: new Date().toISOString(),
    })
    .eq('id', subscriberId);

  // Check if we should suppress this email
  const { data: subscriber } = await supabase
    .from('email_subscribers')
    .select('bounce_count, email, tenant_id')
    .eq('id', subscriberId)
    .single();

  if (subscriber && subscriber.bounce_count >= 5) {
    // Mark as bounced and add to suppression list
    await supabase
      .from('email_subscribers')
      .update({ status: 'bounced' })
      .eq('id', subscriberId);

    await complianceService.addToSuppressionList({
      email: subscriber.email,
      reason: 'bounce',
      addedAt: new Date(),
      source: 'webhook',
      metadata: {
        bounceReason: event.reason,
        bounceType: event.status,
        provider: 'sendgrid',
      },
    });
  }
}

async function handleComplaint(
  event: SendGridEvent, 
  subscriberId: string,
  complianceService: ComplianceService
): Promise<void> {
  if (!subscriberId) return;

  // Increment complaint count and mark as complained
  await supabase
    .from('email_subscribers')
    .update({
      status: 'complained',
      complaint_count: supabase.raw('complaint_count + 1'),
      complained_at: new Date().toISOString(),
    })
    .eq('id', subscriberId);

  // Add to suppression list
  const { data: subscriber } = await supabase
    .from('email_subscribers')
    .select('email, tenant_id')
    .eq('id', subscriberId)
    .single();

  if (subscriber) {
    await complianceService.addToSuppressionList({
      email: subscriber.email,
      reason: 'complaint',
      addedAt: new Date(),
      source: 'webhook',
      metadata: { 
        complaintReason: event.reason,
        provider: 'sendgrid',
      },
    });

    // Record consent withdrawal
    await complianceService.recordConsent({
      subscriberId,
      consentType: 'opt_out',
      consent: false,
      source: 'complaint_webhook',
      timestamp: new Date(),
      metadata: { 
        provider: 'sendgrid',
        reason: event.reason,
      },
    });
  }
}

async function handleUnsubscribe(
  event: SendGridEvent, 
  subscriberId: string, 
  tenantId: string,
  complianceService: ComplianceService
): Promise<void> {
  if (!subscriberId || !tenantId) return;

  // Process unsubscribe through compliance service
  const { data: subscriber } = await supabase
    .from('email_subscribers')
    .select('email')
    .eq('id', subscriberId)
    .single();

  if (subscriber) {
    await complianceService.processUnsubscribe(tenantId, {
      email: subscriber.email,
      reason: 'email_client_unsubscribe',
      source: 'email_link',
      ipAddress: event.ip,
      userAgent: event.useragent,
    });
  }
}

async function handleClick(event: SendGridEvent, subscriberId: string): Promise<void> {
  if (!subscriberId || !event.url) return;

  // Update last active time
  await updateLastActive(subscriberId);

  // Track click for link analytics
  await supabase
    .from('email_link_clicks')
    .insert({
      subscriber_id: subscriberId,
      url: event.url,
      clicked_at: new Date(event.timestamp * 1000).toISOString(),
      user_agent: event.useragent,
      ip_address: event.ip,
    });
}

async function updateLastActive(subscriberId: string): Promise<void> {
  if (!subscriberId) return;

  await supabase
    .from('email_subscribers')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', subscriberId);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-twilio-email-event-webhook-signature') || '';
    
    // Verify webhook signature if public key is configured
    const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
    
    if (publicKey && signature) {
      const isValid = verifyWebhookSignature(body, signature, publicKey);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const events: SendGridEvent[] = JSON.parse(body);
    
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
    }

    // Process each event
    const results = await Promise.allSettled(
      events.map(event => processEmailEvent(event))
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (failed > 0) {
      console.error(`Processed ${successful} events successfully, ${failed} failed`);
      const failures = results
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason);
      console.error('Failed events:', failures);
    }

    return NextResponse.json({ 
      success: true, 
      processed: successful,
      failed: failed
    });
  } catch (error) {
    console.error('SendGrid webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// SendGrid webhook events are sent via POST only
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' }, 
    { status: 405 }
  );
}