import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const originalUrl = url.searchParams.get('url');
  const campaignId = url.searchParams.get('c');
  const subscriberId = url.searchParams.get('s');

  // Redirect to original URL if parameters are missing
  if (!originalUrl) {
    return NextResponse.redirect('https://google.com');
  }

  if (!campaignId || !subscriberId) {
    return NextResponse.redirect(originalUrl);
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if this click has already been tracked (for unique clicks)
    const { data: existingClick } = await supabase
      .from('email_analytics')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('subscriber_id', subscriberId)
      .eq('event', 'clicked')
      .eq('url', originalUrl)
      .single();

    // Track the click
    await supabase
      .from('email_analytics')
      .insert({
        campaign_id: campaignId,
        subscriber_id: subscriberId,
        event: 'clicked',
        timestamp: new Date().toISOString(),
        url: originalUrl,
        ip_address: request.ip,
        user_agent: request.headers.get('user-agent'),
        metadata: {
          unique: !existingClick,
          referer: request.headers.get('referer'),
        },
      });

    // Update subscriber last activity
    await supabase
      .from('email_subscribers')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', subscriberId);

    // Parse and validate the original URL
    let redirectUrl: URL;
    try {
      redirectUrl = new URL(originalUrl);
    } catch {
      // If URL is relative, make it absolute
      redirectUrl = new URL(originalUrl, request.url);
    }

    // Security check: only allow HTTP/HTTPS redirects
    if (!['http:', 'https:'].includes(redirectUrl.protocol)) {
      return NextResponse.redirect('https://google.com');
    }

  } catch (error) {
    console.error('Error tracking email click:', error);
  }

  // Redirect to the original URL
  return NextResponse.redirect(originalUrl);
}