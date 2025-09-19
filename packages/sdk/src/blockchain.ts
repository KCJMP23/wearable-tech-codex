import { BlockchainService } from '@affiliate-factory/blockchain';
import type {
  Address,
  Hash,
  NetworkConfig,
  BlockchainTransaction,
  RegisterClickRequest,
  RegisterConversionRequest,
  AffiliateStats,
} from '@affiliate-factory/blockchain/types';
import { supabase } from './supabase';
import type { Database } from './database.types';

/**
 * Blockchain integration service for the main SDK
 * Bridges blockchain operations with the Supabase database
 */
export class BlockchainIntegrationService {
  private blockchainService: BlockchainService;

  constructor(chainId?: number, privateKey?: string) {
    this.blockchainService = new BlockchainService(chainId, privateKey);
  }

  /**
   * Register an affiliate click with both blockchain and database
   */
  async registerClick(
    tenantId: string,
    request: RegisterClickRequest
  ): Promise<{ transactionHash: Hash; databaseId: string }> {
    try {
      // Register click on blockchain
      const transactionHash = await this.blockchainService.registerClick(request);

      // Store transaction record in database
      const { data: transaction, error } = await supabase
        .from('blockchain_transactions')
        .insert({
          tenant_id: tenantId,
          transaction_hash: transactionHash,
          transaction_type: 'click',
          user_wallet: request.affiliate,
          product_id: request.productId,
          metadata: {
            affiliate: request.affiliate,
            productId: request.productId,
            signature: request.signature,
            ...request.metadata,
          },
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to store transaction in database:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Start monitoring transaction confirmation
      this.monitorTransactionConfirmation(transactionHash, transaction.id);

      return {
        transactionHash,
        databaseId: transaction.id,
      };
    } catch (error) {
      console.error('Failed to register click:', error);
      throw error;
    }
  }

  /**
   * Register a conversion with both blockchain and database
   */
  async registerConversion(
    tenantId: string,
    request: RegisterConversionRequest
  ): Promise<{ transactionHash: Hash; databaseId: string }> {
    try {
      // Register conversion on blockchain
      const transactionHash = await this.blockchainService.registerConversion(request);

      // Store transaction record in database
      const { data: transaction, error } = await supabase
        .from('blockchain_transactions')
        .insert({
          tenant_id: tenantId,
          transaction_hash: transactionHash,
          transaction_type: 'conversion',
          token_address: request.token,
          amount_wei: request.conversionValue.toString(),
          click_id: request.clickId,
          metadata: {
            clickId: request.clickId,
            conversionValue: request.conversionValue.toString(),
            commissionRate: request.commissionRate?.toString(),
            token: request.token,
            ...request.metadata,
          },
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to store transaction in database:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Start monitoring transaction confirmation
      this.monitorTransactionConfirmation(transactionHash, transaction.id);

      return {
        transactionHash,
        databaseId: transaction.id,
      };
    } catch (error) {
      console.error('Failed to register conversion:', error);
      throw error;
    }
  }

  /**
   * Get affiliate statistics from blockchain
   */
  async getAffiliateStats(affiliate: Address): Promise<AffiliateStats> {
    return await this.blockchainService.getAffiliateStats(affiliate);
  }

  /**
   * Get blockchain transactions for a tenant from database
   */
  async getTransactions(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      transactionType?: string;
      status?: string;
    } = {}
  ): Promise<Database['public']['Tables']['blockchain_transactions']['Row'][]> {
    let query = supabase
      .from('blockchain_transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (options.transactionType) {
      query = query.eq('transaction_type', options.transactionType);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get pending commissions for an affiliate
   */
  async getPendingCommissions(
    tenantId: string,
    affiliate: Address
  ): Promise<Array<{ token: Address; amount: bigint; conversionCount: number }>> {
    // Get conversions that haven't been paid
    const { data: conversions, error } = await supabase
      .from('blockchain_transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_wallet', affiliate)
      .eq('transaction_type', 'conversion')
      .eq('status', 'confirmed')
      .is('confirmed_at', null); // Not yet paid

    if (error) {
      throw new Error(`Failed to fetch pending commissions: ${error.message}`);
    }

    // Group by token and sum amounts
    const commissionMap = new Map<Address, { amount: bigint; count: number }>();

    for (const conversion of conversions || []) {
      if (!conversion.token_address || !conversion.amount_wei) continue;

      const token = conversion.token_address as Address;
      const amount = BigInt(conversion.amount_wei);

      if (commissionMap.has(token)) {
        const existing = commissionMap.get(token)!;
        commissionMap.set(token, {
          amount: existing.amount + amount,
          count: existing.count + 1,
        });
      } else {
        commissionMap.set(token, { amount, count: 1 });
      }
    }

    return Array.from(commissionMap.entries()).map(([token, { amount, count }]) => ({
      token,
      amount,
      conversionCount: count,
    }));
  }

  /**
   * Monitor transaction confirmation and update database
   */
  private async monitorTransactionConfirmation(transactionHash: Hash, databaseId: string): Promise<void> {
    try {
      // Wait for transaction confirmation
      const receipt = await this.blockchainService.waitForTransactionConfirmation(transactionHash);

      // Update database record
      await supabase
        .from('blockchain_transactions')
        .update({
          status: receipt.status === 'success' ? 'confirmed' : 'failed',
          block_number: receipt.blockNumber.toString(),
          gas_used: Number(receipt.gasUsed),
          gas_price: receipt.effectiveGasPrice.toString(),
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', databaseId);

      // If transaction failed, log error
      if (receipt.status !== 'success') {
        console.error(`Transaction ${transactionHash} failed`);
      }
    } catch (error) {
      console.error(`Failed to confirm transaction ${transactionHash}:`, error);
      
      // Update database to reflect failure
      await supabase
        .from('blockchain_transactions')
        .update({
          status: 'failed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', databaseId);
    }
  }

  /**
   * Watch for blockchain events and update database
   */
  startEventMonitoring(tenantId: string): void {
    // Monitor click events
    this.blockchainService.watchEvents('ClickRegistered', async (logs) => {
      for (const log of logs) {
        await this.handleClickEvent(tenantId, log);
      }
    });

    // Monitor conversion events
    this.blockchainService.watchEvents('ConversionRegistered', async (logs) => {
      for (const log of logs) {
        await this.handleConversionEvent(tenantId, log);
      }
    });

    // Monitor commission payment events
    this.blockchainService.watchEvents('CommissionPaid', async (logs) => {
      for (const log of logs) {
        await this.handleCommissionPaidEvent(tenantId, log);
      }
    });
  }

  /**
   * Handle click registered event
   */
  private async handleClickEvent(tenantId: string, log: any): Promise<void> {
    try {
      // Update insights table with click data
      await supabase.from('insights').insert({
        tenant_id: tenantId,
        type: 'blockchain_click',
        source: 'smart_contract',
        headline: 'Affiliate Click Registered',
        body: `Click registered for affiliate ${log.args.affiliate}`,
        kpi: 'clicks',
        value: '1',
        metadata: {
          clickId: log.args.clickId,
          affiliate: log.args.affiliate,
          productId: log.args.productId,
          blockNumber: log.blockNumber?.toString(),
          transactionHash: log.transactionHash,
        },
      });
    } catch (error) {
      console.error('Failed to handle click event:', error);
    }
  }

  /**
   * Handle conversion registered event
   */
  private async handleConversionEvent(tenantId: string, log: any): Promise<void> {
    try {
      // Update insights table with conversion data
      await supabase.from('insights').insert({
        tenant_id: tenantId,
        type: 'blockchain_conversion',
        source: 'smart_contract',
        headline: 'Conversion Registered',
        body: `Conversion registered for affiliate ${log.args.affiliate}`,
        kpi: 'conversion_value',
        value: log.args.conversionValue?.toString(),
        metadata: {
          conversionId: log.args.conversionId,
          clickId: log.args.clickId,
          affiliate: log.args.affiliate,
          commissionAmount: log.args.commissionAmount?.toString(),
          blockNumber: log.blockNumber?.toString(),
          transactionHash: log.transactionHash,
        },
      });
    } catch (error) {
      console.error('Failed to handle conversion event:', error);
    }
  }

  /**
   * Handle commission paid event
   */
  private async handleCommissionPaidEvent(tenantId: string, log: any): Promise<void> {
    try {
      // Update insights table with commission payment data
      await supabase.from('insights').insert({
        tenant_id: tenantId,
        type: 'blockchain_commission',
        source: 'smart_contract',
        headline: 'Commission Paid',
        body: `Commission paid to affiliate ${log.args.affiliate}`,
        kpi: 'commission_paid',
        value: log.args.amount?.toString(),
        metadata: {
          affiliate: log.args.affiliate,
          token: log.args.token,
          amount: log.args.amount?.toString(),
          conversionId: log.args.conversionId,
          blockNumber: log.blockNumber?.toString(),
          transactionHash: log.transactionHash,
        },
      });

      // Update user rewards table
      await supabase.from('user_rewards').insert({
        tenant_id: tenantId,
        user_identifier: log.args.affiliate,
        reward_type: 'commission',
        amount: parseFloat(log.args.amount?.toString() || '0'),
        source: 'affiliate_conversion',
        reference_id: log.args.conversionId,
        status: 'distributed',
        distributed_at: new Date().toISOString(),
        metadata: {
          token: log.args.token,
          blockNumber: log.blockNumber?.toString(),
          transactionHash: log.transactionHash,
        },
      });
    } catch (error) {
      console.error('Failed to handle commission paid event:', error);
    }
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(): NetworkConfig {
    return this.blockchainService.getNetworkConfig();
  }

  /**
   * Switch blockchain network
   */
  async switchNetwork(chainId: number, privateKey?: string): Promise<void> {
    await this.blockchainService.switchNetwork(chainId, privateKey);
  }

  /**
   * Get account balance
   */
  async getBalance(address?: Address): Promise<bigint> {
    return await this.blockchainService.getBalance(address);
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: Address, holderAddress?: Address): Promise<bigint> {
    return await this.blockchainService.getTokenBalance(tokenAddress, holderAddress);
  }

  /**
   * Format amount with proper decimals
   */
  formatAmount(amount: bigint, decimals: number = 18): string {
    return this.blockchainService.formatAmount(amount, decimals);
  }

  /**
   * Parse amount from string
   */
  parseAmount(amount: string, decimals: number = 18): bigint {
    return this.blockchainService.parseAmount(amount, decimals);
  }

  /**
   * Get optimized gas price for transaction speed
   */
  async getOptimizedGasPrice(speed: 'slow' | 'standard' | 'fast' = 'standard'): Promise<bigint> {
    return await this.blockchainService.getOptimizedGasPrice(speed);
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(to: Address, data: `0x${string}`, value: bigint = BigInt(0)) {
    return await this.blockchainService.estimateGas(to, data, value);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(hash: Hash) {
    return await this.blockchainService.getTransactionStatus(hash);
  }
}

// Singleton instance for easy import
let blockchainService: BlockchainIntegrationService | null = null;

export function getBlockchainService(chainId?: number, privateKey?: string): BlockchainIntegrationService {
  if (!blockchainService) {
    blockchainService = new BlockchainIntegrationService(chainId, privateKey);
  }
  return blockchainService;
}

export function createBlockchainService(chainId?: number, privateKey?: string): BlockchainIntegrationService {
  return new BlockchainIntegrationService(chainId, privateKey);
}

// Re-export types for convenience
export type {
  Address,
  Hash,
  NetworkConfig,
  BlockchainTransaction,
  RegisterClickRequest,
  RegisterConversionRequest,
  AffiliateStats,
} from '@affiliate-factory/blockchain/types';