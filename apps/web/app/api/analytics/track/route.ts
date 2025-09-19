import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/services/analytics';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, event } = body;

    if (!tenantId || !event) {
      return NextResponse.json(
        { error: 'tenantId and event are required' },
        { status: 400 }
      );
    }

    // Enrich event with request data
    const enrichedEvent = {
      ...event,
      device_type: request.headers.get('sec-ch-ua-mobile') === '?1' ? 'mobile' : 'desktop',
      browser: request.headers.get('user-agent')?.split(' ')[0] || 'unknown',
      country: request.headers.get('cf-ipcountry') || 'unknown',
    };

    await analyticsService.trackEvent(tenantId, enrichedEvent);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}