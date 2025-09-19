import { NextRequest, NextResponse } from 'next/server';
import { experimentService } from '@/lib/services/experiments';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> }
) {
  try {
    const { experimentId } = await params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const stats = await experimentService.getExperimentStats(tenantId, experimentId);
    const analysis = await experimentService.analyzeExperimentPerformance(tenantId, experimentId);
    
    return NextResponse.json({ stats, analysis });
  } catch (error) {
    console.error('Error fetching experiment stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiment statistics' },
      { status: 500 }
    );
  }
}