import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  getAddress,
  parseUnits,
  formatUnits,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
  type TransactionReceipt,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type {
  NetworkConfig,
  Click,
  Conversion,
  Affiliate,
  TenantConfig,
  RegisterClickRequest,
  RegisterConversionRequest,
  PayCommissionRequest,
  RegisterAffiliateRequest,
  ConfigureTenantRequest,
  TransactionStatus,
  GasEstimate,
  BlockchainError,
  AffiliateStats,
  TenantStats,
} from './types';
import { NETWORK_CONFIGS, DEFAULT_BLOCKCHAIN_CONFIG, GAS_PRESETS } from './config';

/**
 * Main blockchain service for affiliate attribution and commission distribution
 */
export class BlockchainService {
  private publicClient: PublicClient;
  private walletClient: WalletClient | null = null;
  private networkConfig: NetworkConfig;
  private account: any = null;

  constructor(
    private chainId: number = DEFAULT_BLOCKCHAIN_CONFIG.defaultNetwork,
    privateKey?: string
  ) {
    this.networkConfig = NETWORK_CONFIGS[chainId];
    if (!this.networkConfig) {
      throw new Error(`Unsupported network: ${chainId}`);
    }

    // Initialize public client
    this.publicClient = createPublicClient({
      chain: {
        id: this.networkConfig.chainId,
        name: this.networkConfig.name,
        network: this.networkConfig.name.toLowerCase().replace(' ', '-'),
        nativeCurrency: this.networkConfig.currency,
        rpcUrls: {
          default: { http: [this.networkConfig.rpcUrl] },
          public: { http: [this.networkConfig.rpcUrl] },
        },
        blockExplorers: {
          default: {
            name: 'Explorer',
            url: this.networkConfig.explorerUrl,
          },
        },
      },
      transport: http(this.networkConfig.rpcUrl),
    });

    // Initialize wallet client if private key provided
    if (privateKey) {
      this.initializeWallet(privateKey);
    }
  }

  /**
   * Initialize wallet client with private key
   */
  private initializeWallet(privateKey: string): void {
    try {
      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      
      this.walletClient = createWalletClient({
        account: this.account,
        chain: {
          id: this.networkConfig.chainId,
          name: this.networkConfig.name,
          network: this.networkConfig.name.toLowerCase().replace(' ', '-'),
          nativeCurrency: this.networkConfig.currency,
          rpcUrls: {
            default: { http: [this.networkConfig.rpcUrl] },
            public: { http: [this.networkConfig.rpcUrl] },
          },
          blockExplorers: {
            default: {
              name: 'Explorer',
              url: this.networkConfig.explorerUrl,
            },
          },
        },
        transport: http(this.networkConfig.rpcUrl),
      });
    } catch (error) {
      throw new Error(`Failed to initialize wallet: ${error}`);
    }
  }

  /**
   * Get current network configuration
   */
  getNetworkConfig(): NetworkConfig {
    return this.networkConfig;
  }

  /**
   * Switch to a different network
   */
  async switchNetwork(chainId: number, privateKey?: string): Promise<void> {
    this.chainId = chainId;
    this.networkConfig = NETWORK_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported network: ${chainId}`);
    }

    // Reinitialize clients
    this.publicClient = createPublicClient({
      chain: {
        id: this.networkConfig.chainId,
        name: this.networkConfig.name,
        network: this.networkConfig.name.toLowerCase().replace(' ', '-'),
        nativeCurrency: this.networkConfig.currency,
        rpcUrls: {
          default: { http: [this.networkConfig.rpcUrl] },
          public: { http: [this.networkConfig.rpcUrl] },
        },
        blockExplorers: {
          default: {
            name: 'Explorer',
            url: this.networkConfig.explorerUrl,
          },
        },
      },
      transport: http(this.networkConfig.rpcUrl),
    });

    if (privateKey || this.account) {
      this.initializeWallet(privateKey || this.account.privateKey);
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    to: Address,
    data: `0x${string}`,
    value: bigint = BigInt(0)
  ): Promise<GasEstimate> {
    try {
      const gasLimit = await this.publicClient.estimateGas({
        to,
        data,
        value,
        account: this.account?.address,
      });

      const gasPrice = await this.publicClient.getGasPrice();
      const estimatedCost = gasLimit * gasPrice;

      return {
        gasLimit: gasLimit * BigInt(120) / BigInt(100), // 20% buffer
        gasPrice,
        estimatedCost,
      };
    } catch (error) {
      throw this.createBlockchainError('GAS_ESTIMATION_FAILED', error);
    }
  }

  /**
   * Register affiliate click on blockchain
   */
  async registerClick(request: RegisterClickRequest): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Generate click ID
      const clickId = this.generateClickId(request);
      
      // Prepare transaction data
      const data = this.encodeRegisterClick(
        clickId,
        request.affiliate,
        request.tenantId,
        request.productId,
        JSON.stringify(request.metadata || {})
      );

      // Estimate gas
      const gasEstimate = await this.estimateGas(
        this.networkConfig.contracts.affiliateAttribution,
        data
      );

      // Send transaction
      const hash = await this.walletClient.writeContract({
        address: this.networkConfig.contracts.affiliateAttribution,
        abi: this.getAffiliateAttributionABI(),
        functionName: 'registerClick',
        args: [
          clickId,
          request.affiliate,
          request.tenantId,
          request.productId,
          JSON.stringify(request.metadata || {}),
        ],
        gas: gasEstimate.gasLimit,
        gasPrice: gasEstimate.gasPrice,
      });

      return hash;
    } catch (error) {
      throw this.createBlockchainError('REGISTER_CLICK_FAILED', error);
    }
  }

  /**
   * Register conversion on blockchain
   */
  async registerConversion(request: RegisterConversionRequest): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Generate conversion ID
      const conversionId = this.generateConversionId(request);
      
      // Prepare transaction data
      const data = this.encodeRegisterConversion(
        conversionId,
        request.clickId,
        request.conversionValue,
        request.commissionRate || BigInt(0),
        request.token,
        JSON.stringify(request.metadata || {})
      );

      // Estimate gas
      const gasEstimate = await this.estimateGas(
        this.networkConfig.contracts.affiliateAttribution,
        data
      );

      // Send transaction
      const hash = await this.walletClient.writeContract({
        address: this.networkConfig.contracts.affiliateAttribution,
        abi: this.getAffiliateAttributionABI(),
        functionName: 'registerConversion',
        args: [
          conversionId,
          request.clickId,
          request.conversionValue,
          request.commissionRate || BigInt(0),
          request.token,
          JSON.stringify(request.metadata || {}),
        ],
        gas: gasEstimate.gasLimit,
        gasPrice: gasEstimate.gasPrice,
      });

      return hash;
    } catch (error) {
      throw this.createBlockchainError('REGISTER_CONVERSION_FAILED', error);
    }
  }

  /**
   * Pay commission to affiliate
   */
  async payCommission(request: PayCommissionRequest): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet not initialized');
    }

    try {
      const data = this.encodePayCommission(request.conversionId, request.token);

      const gasEstimate = await this.estimateGas(
        this.networkConfig.contracts.affiliateAttribution,
        data
      );

      const hash = await this.walletClient.writeContract({
        address: this.networkConfig.contracts.affiliateAttribution,
        abi: this.getAffiliateAttributionABI(),
        functionName: 'payCommission',
        args: [request.conversionId, request.token],
        gas: gasEstimate.gasLimit,
        gasPrice: gasEstimate.gasPrice,
      });

      return hash;
    } catch (error) {
      throw this.createBlockchainError('PAY_COMMISSION_FAILED', error);
    }
  }

  /**
   * Register new affiliate
   */
  async registerAffiliate(request: RegisterAffiliateRequest): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet not initialized');
    }

    try {
      const data = this.encodeRegisterAffiliate(
        request.affiliate,
        request.email,
        JSON.stringify(request.metadata || {})
      );

      const gasEstimate = await this.estimateGas(
        this.networkConfig.contracts.affiliateAttribution,
        data
      );

      const hash = await this.walletClient.writeContract({
        address: this.networkConfig.contracts.affiliateAttribution,
        abi: this.getAffiliateAttributionABI(),
        functionName: 'registerAffiliate',
        args: [
          request.affiliate,
          request.email,
          JSON.stringify(request.metadata || {}),
        ],
        gas: gasEstimate.gasLimit,
        gasPrice: gasEstimate.gasPrice,
      });

      return hash;
    } catch (error) {
      throw this.createBlockchainError('REGISTER_AFFILIATE_FAILED', error);
    }
  }

  /**
   * Configure tenant settings
   */
  async configureTenant(request: ConfigureTenantRequest): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet not initialized');
    }

    try {
      const data = this.encodeConfigureTenant(
        request.tenantId,
        request.payoutWallet,
        request.defaultCommissionRate,
        request.authorizedTokens,
        request.minPayoutAmount
      );

      const gasEstimate = await this.estimateGas(
        this.networkConfig.contracts.affiliateAttribution,
        data
      );

      const hash = await this.walletClient.writeContract({
        address: this.networkConfig.contracts.affiliateAttribution,
        abi: this.getAffiliateAttributionABI(),
        functionName: 'configureTenant',
        args: [
          request.tenantId,
          request.payoutWallet,
          request.defaultCommissionRate,
          request.authorizedTokens,
          request.minPayoutAmount,
        ],
        gas: gasEstimate.gasLimit,
        gasPrice: gasEstimate.gasPrice,
      });

      return hash;
    } catch (error) {
      throw this.createBlockchainError('CONFIGURE_TENANT_FAILED', error);
    }
  }

  /**
   * Get transaction status and confirmation
   */
  async getTransactionStatus(hash: Hash): Promise<TransactionStatus> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({ hash });
      const currentBlock = await this.publicClient.getBlockNumber();
      
      const confirmations = Number(currentBlock - receipt.blockNumber);
      const requiredConfirmations = DEFAULT_BLOCKCHAIN_CONFIG.confirmationBlocks[this.chainId] || 12;

      return {
        hash,
        status: receipt.status === 'success' ? 
          (confirmations >= requiredConfirmations ? 'confirmed' : 'pending') : 
          'failed',
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        confirmations,
        timestamp: BigInt(Date.now()), // Would need to fetch block timestamp in real implementation
      };
    } catch (error) {
      // Transaction not yet mined
      return {
        hash,
        status: 'pending',
        confirmations: 0,
      };
    }
  }

  /**
   * Get affiliate statistics from blockchain
   */
  async getAffiliateStats(affiliate: Address): Promise<AffiliateStats> {
    try {
      const [totalEarned, totalClicks, totalConversions, active] = await this.publicClient.readContract({
        address: this.networkConfig.contracts.affiliateAttribution,
        abi: this.getAffiliateAttributionABI(),
        functionName: 'getAffiliateStats',
        args: [affiliate],
      }) as [bigint, bigint, bigint, boolean];

      // Get pending commissions for supported tokens
      const pendingCommissions: Record<Address, bigint> = {};
      // This would iterate through supported tokens and get pending amounts

      const conversionRate = totalClicks > 0 ? Number(totalConversions) / Number(totalClicks) : 0;
      const averageCommission = totalConversions > 0 ? totalEarned / totalConversions : BigInt(0);

      return {
        totalEarned,
        totalClicks,
        totalConversions,
        conversionRate,
        averageCommission,
        pendingCommissions,
      };
    } catch (error) {
      throw this.createBlockchainError('GET_AFFILIATE_STATS_FAILED', error);
    }
  }

  /**
   * Monitor blockchain events in real-time
   */
  watchEvents(
    eventName: string,
    callback: (log: any) => void,
    filters?: Record<string, any>
  ): () => void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.networkConfig.contracts.affiliateAttribution,
      abi: this.getAffiliateAttributionABI(),
      eventName,
      args: filters,
      onLogs: callback,
    });

    return unwatch;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransactionConfirmation(
    hash: Hash,
    confirmations: number = DEFAULT_BLOCKCHAIN_CONFIG.confirmationBlocks[this.chainId] || 12
  ): Promise<TransactionReceipt> {
    try {
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
        confirmations,
        timeout: 300_000, // 5 minutes
      });

      return receipt;
    } catch (error) {
      throw this.createBlockchainError('TRANSACTION_CONFIRMATION_FAILED', error);
    }
  }

  /**
   * Get current gas prices with optimization options
   */
  async getOptimizedGasPrice(speed: 'slow' | 'standard' | 'fast' = 'standard'): Promise<bigint> {
    try {
      const baseGasPrice = await this.publicClient.getGasPrice();
      const preset = GAS_PRESETS[speed];
      
      return BigInt(Math.floor(Number(baseGasPrice) * preset.gasMultiplier));
    } catch (error) {
      throw this.createBlockchainError('GET_GAS_PRICE_FAILED', error);
    }
  }

  // Helper methods
  private generateClickId(request: RegisterClickRequest): Hash {
    const data = `${request.affiliate}-${request.tenantId}-${request.productId}-${Date.now()}`;
    return `0x${Buffer.from(data).toString('hex').padEnd(64, '0')}` as Hash;
  }

  private generateConversionId(request: RegisterConversionRequest): Hash {
    const data = `${request.clickId}-${request.conversionValue}-${Date.now()}`;
    return `0x${Buffer.from(data).toString('hex').padEnd(64, '0')}` as Hash;
  }

  private createBlockchainError(code: string, originalError: any): BlockchainError {
    const error = new Error(`Blockchain operation failed: ${code}`) as BlockchainError;
    error.code = code;
    error.reason = originalError.message || originalError.toString();
    error.data = originalError;
    return error;
  }

  // ABI encoding methods (simplified - would use actual contract ABIs)
  private encodeRegisterClick(
    clickId: Hash,
    affiliate: Address,
    tenantId: string,
    productId: string,
    metadata: string
  ): `0x${string}` {
    // This would use the actual contract ABI to encode the function call
    return '0x' as `0x${string}`;
  }

  private encodeRegisterConversion(
    conversionId: Hash,
    clickId: Hash,
    conversionValue: bigint,
    commissionRate: bigint,
    token: Address,
    metadata: string
  ): `0x${string}` {
    return '0x' as `0x${string}`;
  }

  private encodePayCommission(conversionId: Hash, token: Address): `0x${string}` {
    return '0x' as `0x${string}`;
  }

  private encodeRegisterAffiliate(
    affiliate: Address,
    email: string,
    metadata: string
  ): `0x${string}` {
    return '0x' as `0x${string}`;
  }

  private encodeConfigureTenant(
    tenantId: string,
    payoutWallet: Address,
    defaultCommissionRate: bigint,
    authorizedTokens: Address[],
    minPayoutAmount: bigint
  ): `0x${string}` {
    return '0x' as `0x${string}`;
  }

  private getAffiliateAttributionABI(): any {
    // This would return the actual contract ABI
    return [];
  }

  /**
   * Get account balance in native currency
   */
  async getBalance(address?: Address): Promise<bigint> {
    const accountAddress = address || this.account?.address;
    if (!accountAddress) {
      throw new Error('No address provided and no wallet connected');
    }

    return await this.publicClient.getBalance({ address: accountAddress });
  }

  /**
   * Get ERC20 token balance
   */
  async getTokenBalance(tokenAddress: Address, holderAddress?: Address): Promise<bigint> {
    const accountAddress = holderAddress || this.account?.address;
    if (!accountAddress) {
      throw new Error('No address provided and no wallet connected');
    }

    return await this.publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [accountAddress],
    }) as bigint;
  }

  /**
   * Format amount with decimals
   */
  formatAmount(amount: bigint, decimals: number = 18): string {
    return formatUnits(amount, decimals);
  }

  /**
   * Parse amount from string
   */
  parseAmount(amount: string, decimals: number = 18): bigint {
    return parseUnits(amount, decimals);
  }
}