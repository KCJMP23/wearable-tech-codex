import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainService } from '@affiliate-factory/sdk';

export async function GET(request: NextRequest) {
  try {
    // Get blockchain service instance
    const blockchainService = getBlockchainService();

    // Get current network configuration
    const networkConfig = blockchainService.getNetworkConfig();

    return NextResponse.json({
      network: {
        chainId: networkConfig.chainId,
        name: networkConfig.name,
        rpcUrl: networkConfig.rpcUrl,
        explorerUrl: networkConfig.explorerUrl,
        currency: networkConfig.currency,
        contracts: networkConfig.contracts,
        gasSettings: {
          gasPrice: networkConfig.gasSettings.gasPrice?.toString(),
          maxFeePerGas: networkConfig.gasSettings.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: networkConfig.gasSettings.maxPriorityFeePerGas?.toString(),
        },
      },
      isMainnet: [1, 137].includes(networkConfig.chainId), // Ethereum and Polygon mainnet
      isTestnet: [11155111, 80001].includes(networkConfig.chainId), // Sepolia and Mumbai
      isLocal: networkConfig.chainId === 31337, // Hardhat local
    });
  } catch (error) {
    console.error('Error fetching network info:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch network info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainId } = body;

    // Validate required fields
    if (!chainId) {
      return NextResponse.json(
        { error: 'Missing required field: chainId' },
        { status: 400 }
      );
    }

    // Validate chainId is a number
    if (typeof chainId !== 'number') {
      return NextResponse.json(
        { error: 'chainId must be a number' },
        { status: 400 }
      );
    }

    // Get blockchain service instance
    const blockchainService = getBlockchainService();

    // Switch network
    await blockchainService.switchNetwork(chainId);

    // Get new network configuration
    const networkConfig = blockchainService.getNetworkConfig();

    return NextResponse.json({
      success: true,
      message: `Switched to network: ${networkConfig.name}`,
      network: {
        chainId: networkConfig.chainId,
        name: networkConfig.name,
        currency: networkConfig.currency,
        contracts: networkConfig.contracts,
      },
    });
  } catch (error) {
    console.error('Error switching network:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to switch network',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}