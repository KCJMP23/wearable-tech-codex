import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/services/analytics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const timeRange = searchParams.get('timeRange') as '1h' | '24h' | '7d' | '30d' || '24h';

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const metrics = await analyticsService.getRealtimeMetrics(tenantId, timeRange);
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching realtime analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}