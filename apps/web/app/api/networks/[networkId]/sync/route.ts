import { NextRequest, NextResponse } from 'next/server';
import { affiliateNetworkService } from '@/lib/services/affiliate-networks';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ networkId: string }> }
) {
  try {
    const { networkId } = await params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    await affiliateNetworkService.syncNetworkData(tenantId, networkId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing network:', error);
    return NextResponse.json(
      { error: 'Failed to sync network data' },
      { status: 500 }
    );
  }
}