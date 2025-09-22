import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await context.params;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Decode tracking ID to get campaign and subscriber info
    // Format: base64(campaignId:subscriberId)
    const decoded = Buffer.from(trackingId, 'base64').toString('utf-8');
    const [campaignId, subscriberId] = decoded.split(':');

    if (!campaignId || !subscriberId) {
      console.error('Invalid tracking ID format');
      return getTrackingPixel();
    }

    // Check if this open has already been tracked (for unique opens)
    const { data: existingOpen } = await supabase
      .from('email_analytics')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('subscriber_id', subscriberId)
      .eq('event', 'opened')
      .single();

    // Always track the open (for total opens), but mark if it's unique
    await supabase
      .from('email_analytics')
      .insert({
        campaign_id: campaignId,
        subscriber_id: subscriberId,
        event: 'opened',
        timestamp: new Date().toISOString(),
        ip_address: request.ip,
        user_agent: request.headers.get('user-agent'),
        metadata: {
          unique: !existingOpen,
          referer: request.headers.get('referer'),
        },
      });

    // Update subscriber last activity
    await supabase
      .from('email_subscribers')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', subscriberId);

  } catch (error) {
    console.error('Error tracking email open:', error);
  }

  // Return tracking pixel
  return getTrackingPixel();
}

function getTrackingPixel() {
  // 1x1 transparent PNG pixel
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );

  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': pixel.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
