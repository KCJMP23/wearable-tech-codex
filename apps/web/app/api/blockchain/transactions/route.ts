import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainService } from '@affiliate-factory/sdk';
import type { Hash } from '@affiliate-factory/blockchain/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const transactionType = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Validate required parameters
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing required parameter: tenantId' },
        { status: 400 }
      );
    }

    // Get blockchain service instance
    const blockchainService = getBlockchainService();

    // Fetch transactions from database
    const transactions = await blockchainService.getTransactions(tenantId, {
      transactionType: transactionType || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    // Format the response
    const response = {
      transactions: transactions.map(tx => ({
        id: tx.id,
        transactionHash: tx.transaction_hash,
        type: tx.transaction_type,
        userWallet: tx.user_wallet,
        amount: tx.amount_wei,
        formattedAmount: tx.amount_wei ? 
          blockchainService.formatAmount(BigInt(tx.amount_wei)) : null,
        tokenAddress: tx.token_address,
        productId: tx.product_id,
        clickId: tx.click_id,
        conversionId: tx.conversion_id,
        status: tx.status,
        blockNumber: tx.block_number,
        gasUsed: tx.gas_used,
        gasPrice: tx.gas_price,
        metadata: tx.metadata,
        createdAt: tx.created_at,
        confirmedAt: tx.confirmed_at,
      })),
      pagination: {
        total: transactions.length,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionHash } = body;

    // Validate required fields
    if (!transactionHash) {
      return NextResponse.json(
        { error: 'Missing required field: transactionHash' },
        { status: 400 }
      );
    }

    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    // Get blockchain service instance
    const blockchainService = getBlockchainService();

    // Get transaction status from blockchain
    const status = await blockchainService.getTransactionStatus(transactionHash as Hash);

    return NextResponse.json({
      transactionHash,
      status: status.status,
      blockNumber: status.blockNumber?.toString(),
      blockHash: status.blockHash,
      gasUsed: status.gasUsed?.toString(),
      effectiveGasPrice: status.effectiveGasPrice?.toString(),
      confirmations: status.confirmations,
      timestamp: status.timestamp?.toString(),
    });
  } catch (error) {
    console.error('Error fetching transaction status:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch transaction status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}