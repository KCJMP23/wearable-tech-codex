import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainService } from '@affiliate-factory/sdk';
import type { Address } from '@affiliate-factory/blockchain/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, affiliate, productId, metadata, signature } = body;

    // Validate required fields
    if (!tenantId || !affiliate || !productId) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, affiliate, productId' },
        { status: 400 }
      );
    }

    // Validate ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(affiliate)) {
      return NextResponse.json(
        { error: 'Invalid affiliate address format' },
        { status: 400 }
      );
    }

    // Get blockchain service instance
    const blockchainService = getBlockchainService();

    // Register click on blockchain and database
    const result = await blockchainService.registerClick(tenantId, {
      affiliate: affiliate as Address,
      tenantId,
      productId,
      metadata,
      signature,
    });

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      databaseId: result.databaseId,
      message: 'Click registered successfully',
    });
  } catch (error) {
    console.error('Error registering click:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to register click',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}