import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainService } from '@affiliate-factory/sdk';
import type { Address, Hash } from '@affiliate-factory/blockchain/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, clickId, conversionValue, commissionRate, token, metadata } = body;

    // Validate required fields
    if (!tenantId || !clickId || !conversionValue || !token) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, clickId, conversionValue, token' },
        { status: 400 }
      );
    }

    // Validate ethereum address format for token
    if (!/^0x[a-fA-F0-9]{40}$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid token address format' },
        { status: 400 }
      );
    }

    // Validate click ID format
    if (!/^0x[a-fA-F0-9]{64}$/.test(clickId)) {
      return NextResponse.json(
        { error: 'Invalid click ID format' },
        { status: 400 }
      );
    }

    // Validate conversion value is positive
    const conversionValueBigInt = BigInt(conversionValue);
    if (conversionValueBigInt <= 0) {
      return NextResponse.json(
        { error: 'Conversion value must be positive' },
        { status: 400 }
      );
    }

    // Get blockchain service instance
    const blockchainService = getBlockchainService();

    // Register conversion on blockchain and database
    const result = await blockchainService.registerConversion(tenantId, {
      clickId: clickId as Hash,
      conversionValue: conversionValueBigInt,
      commissionRate: commissionRate ? BigInt(commissionRate) : undefined,
      token: token as Address,
      metadata,
    });

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      databaseId: result.databaseId,
      message: 'Conversion registered successfully',
    });
  } catch (error) {
    console.error('Error registering conversion:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to register conversion',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}