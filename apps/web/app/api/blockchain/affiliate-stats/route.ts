import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainService } from '@affiliate-factory/sdk';
import type { Address } from '@affiliate-factory/blockchain/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const affiliate = searchParams.get('affiliate');
    const tenantId = searchParams.get('tenantId');

    // Validate required parameters
    if (!affiliate || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required parameters: affiliate, tenantId' },
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

    // Get affiliate stats from blockchain
    const stats = await blockchainService.getAffiliateStats(affiliate as Address);

    // Get pending commissions from database
    const pendingCommissions = await blockchainService.getPendingCommissions(
      tenantId,
      affiliate as Address
    );

    // Get recent transactions from database
    const recentTransactions = await blockchainService.getTransactions(tenantId, {
      limit: 10,
    });

    // Format the response
    const response = {
      affiliate: affiliate as Address,
      stats: {
        totalEarned: stats.totalEarned.toString(),
        totalClicks: stats.totalClicks.toString(),
        totalConversions: stats.totalConversions.toString(),
        conversionRate: stats.conversionRate,
        averageCommission: stats.averageCommission.toString(),
      },
      pendingCommissions: pendingCommissions.map(pc => ({
        token: pc.token,
        amount: pc.amount.toString(),
        formattedAmount: blockchainService.formatAmount(pc.amount),
        conversionCount: pc.conversionCount,
      })),
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        transactionHash: tx.transaction_hash,
        type: tx.transaction_type,
        status: tx.status,
        amount: tx.amount_wei,
        formattedAmount: tx.amount_wei ? 
          blockchainService.formatAmount(BigInt(tx.amount_wei)) : null,
        createdAt: tx.created_at,
        confirmedAt: tx.confirmed_at,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch affiliate stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}