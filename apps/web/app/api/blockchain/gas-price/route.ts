import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainService } from '@affiliate-factory/sdk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const speed = searchParams.get('speed') as 'slow' | 'standard' | 'fast' || 'standard';

    // Validate speed parameter
    if (!['slow', 'standard', 'fast'].includes(speed)) {
      return NextResponse.json(
        { error: 'Invalid speed parameter. Must be: slow, standard, or fast' },
        { status: 400 }
      );
    }

    // Get blockchain service instance
    const blockchainService = getBlockchainService();

    // Get network configuration
    const networkConfig = blockchainService.getNetworkConfig();

    // Get optimized gas price
    const gasPrice = await blockchainService.getOptimizedGasPrice(speed);

    // Get current account balance if available
    let balance: string | null = null;
    try {
      const balanceWei = await blockchainService.getBalance();
      balance = blockchainService.formatAmount(balanceWei);
    } catch {
      // Balance not available (no wallet connected)
    }

    return NextResponse.json({
      network: {
        chainId: networkConfig.chainId,
        name: networkConfig.name,
        currency: networkConfig.currency,
      },
      gasPrice: {
        wei: gasPrice.toString(),
        gwei: blockchainService.formatAmount(gasPrice, 9), // Convert to gwei
        speed,
      },
      balance: balance ? {
        wei: (await blockchainService.getBalance()).toString(),
        formatted: balance,
        currency: networkConfig.currency.symbol,
      } : null,
      estimates: {
        registerClick: {
          gasLimit: '150000', // Estimated gas limit
          cost: (gasPrice * BigInt(150000)).toString(),
          formattedCost: blockchainService.formatAmount(gasPrice * BigInt(150000)),
        },
        registerConversion: {
          gasLimit: '200000', // Estimated gas limit
          cost: (gasPrice * BigInt(200000)).toString(),
          formattedCost: blockchainService.formatAmount(gasPrice * BigInt(200000)),
        },
        payCommission: {
          gasLimit: '180000', // Estimated gas limit
          cost: (gasPrice * BigInt(180000)).toString(),
          formattedCost: blockchainService.formatAmount(gasPrice * BigInt(180000)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching gas price:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch gas price',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}