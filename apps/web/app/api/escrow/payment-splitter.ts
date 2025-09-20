/**
 * Payment splitter for multi-party escrow payments
 * Handles complex payment distributions between buyer, seller, and platform
 */

import { 
  PaymentSplit, 
  EscrowTransaction, 
  EscrowMilestone,
  EscrowError,
  PaymentError 
} from './types';
import { stripeConnectService } from './stripe-connect';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface PaymentSplitCalculation {
  totalAmount: number;
  platformFee: number;
  platformFeePercent: number;
  sellerAmount: number;
  processingFee: number;
  netSellerAmount: number;
  splits: PaymentSplit[];
}

export interface MilestonePaymentSplit {
  milestoneId: string;
  milestoneAmount: number;
  calculation: PaymentSplitCalculation;
  releaseDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export class PaymentSplitterService {
  private defaultPlatformFeePercent: number;
  private processingFeePercent: number;
  private maxSplitAmount: number;

  constructor() {
    this.defaultPlatformFeePercent = parseFloat(process.env.DEFAULT_PLATFORM_FEE_PERCENT || '5');
    this.processingFeePercent = parseFloat(process.env.PROCESSING_FEE_PERCENT || '2.9');
    this.maxSplitAmount = parseInt(process.env.MAX_SPLIT_AMOUNT || '1000000');
  }

  /**
   * Calculate payment splits for an escrow transaction
   */
  calculateEscrowSplit(
    escrow: EscrowTransaction,
    releaseAmount?: number
  ): PaymentSplitCalculation {
    const totalAmount = releaseAmount || escrow.totalAmount;
    
    if (totalAmount <= 0) {
      throw new PaymentError('Invalid split amount: must be greater than 0');
    }

    if (totalAmount > this.maxSplitAmount) {
      throw new PaymentError(`Split amount exceeds maximum allowed: ${this.maxSplitAmount}`);
    }

    // Calculate platform fee
    const platformFeePercent = escrow.platformFeePercent || this.defaultPlatformFeePercent;
    const platformFee = totalAmount * (platformFeePercent / 100);

    // Calculate processing fee (typically absorbed by platform or added to total)
    const processingFee = totalAmount * (this.processingFeePercent / 100);

    // Calculate seller amount (total minus platform fee)
    const sellerAmount = totalAmount - platformFee;
    const netSellerAmount = sellerAmount - (processingFee * 0.5); // Split processing fee

    const splits: PaymentSplit[] = [
      {
        escrowId: escrow.id,
        sellerId: escrow.sellerId,
        platformId: process.env.STRIPE_PLATFORM_ACCOUNT_ID!,
        sellerAmount: netSellerAmount,
        platformAmount: platformFee + (processingFee * 0.5),
      }
    ];

    return {
      totalAmount,
      platformFee,
      platformFeePercent,
      sellerAmount,
      processingFee,
      netSellerAmount,
      splits
    };
  }

  /**
   * Calculate milestone-based payment splits
   */
  async calculateMilestoneSplits(escrowId: string): Promise<MilestonePaymentSplit[]> {
    try {
      // Get escrow and milestones
      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new EscrowError('Escrow transaction not found', 'NOT_FOUND', 404);
      }

      const { data: milestones, error: milestonesError } = await supabase
        .from('escrow_milestones')
        .select('*')
        .eq('escrowId', escrowId)
        .order('orderIndex');

      if (milestonesError) {
        throw new EscrowError('Failed to fetch milestones', 'DB_ERROR', 500, milestonesError);
      }

      const splits: MilestonePaymentSplit[] = [];

      for (const milestone of milestones || []) {
        const calculation = this.calculateEscrowSplit(escrow, milestone.amount);
        
        splits.push({
          milestoneId: milestone.id,
          milestoneAmount: milestone.amount,
          calculation,
          releaseDate: milestone.dueDate || new Date(),
          status: milestone.status === 'completed' ? 'pending' : 'pending'
        });
      }

      return splits;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new PaymentError('Failed to calculate milestone splits', error);
    }
  }

  /**
   * Process payment split for a milestone
   */
  async processMilestoneSplit(
    escrowId: string,
    milestoneId: string,
    approvedBy: string
  ): Promise<PaymentSplit> {
    try {
      // Validate milestone is ready for payment
      const { data: milestone, error: milestoneError } = await supabase
        .from('escrow_milestones')
        .select('*')
        .eq('id', milestoneId)
        .eq('escrowId', escrowId)
        .single();

      if (milestoneError || !milestone) {
        throw new EscrowError('Milestone not found', 'NOT_FOUND', 404);
      }

      if (milestone.status !== 'approved') {
        throw new EscrowError('Milestone must be approved before payment split', 'INVALID_STATE', 400);
      }

      // Get escrow transaction
      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new EscrowError('Escrow transaction not found', 'NOT_FOUND', 404);
      }

      // Calculate split
      const calculation = this.calculateEscrowSplit(escrow, milestone.amount);

      // Process the payment through Stripe Connect
      const paymentSplit = await stripeConnectService.processPaymentSplit(
        escrowId,
        milestone.amount
      );

      // Update milestone as processed
      await supabase
        .from('escrow_milestones')
        .update({
          status: 'completed',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', milestoneId);

      // Log the split processing
      await this.logPaymentSplit(escrowId, milestoneId, calculation, approvedBy);

      return paymentSplit;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new PaymentError('Failed to process milestone split', error);
    }
  }

  /**
   * Process bulk milestone splits for completed milestones
   */
  async processBulkMilestoneSplits(
    escrowId: string,
    milestoneIds: string[],
    approvedBy: string
  ): Promise<PaymentSplit[]> {
    const results: PaymentSplit[] = [];
    const errors: Array<{ milestoneId: string; error: string }> = [];

    for (const milestoneId of milestoneIds) {
      try {
        const split = await this.processMilestoneSplit(escrowId, milestoneId, approvedBy);
        results.push(split);
      } catch (error) {
        errors.push({
          milestoneId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (errors.length > 0) {
      throw new PaymentError('Some milestone splits failed', { errors, successful: results });
    }

    return results;
  }

  /**
   * Calculate refund splits for disputed transactions
   */
  calculateRefundSplit(
    escrow: EscrowTransaction,
    refundAmount: number,
    refundToSeller: boolean = false
  ): PaymentSplitCalculation {
    if (refundAmount <= 0 || refundAmount > escrow.totalAmount) {
      throw new PaymentError('Invalid refund amount');
    }

    const platformFeePercent = escrow.platformFeePercent || this.defaultPlatformFeePercent;
    
    if (refundToSeller) {
      // Refund to seller (rare case)
      const platformFee = refundAmount * (platformFeePercent / 100);
      const sellerAmount = refundAmount - platformFee;

      return {
        totalAmount: refundAmount,
        platformFee,
        platformFeePercent,
        sellerAmount,
        processingFee: 0,
        netSellerAmount: sellerAmount,
        splits: [{
          escrowId: escrow.id,
          sellerId: escrow.sellerId,
          platformId: process.env.STRIPE_PLATFORM_ACCOUNT_ID!,
          sellerAmount,
          platformAmount: platformFee,
        }]
      };
    } else {
      // Refund to buyer (standard case)
      // Platform typically absorbs processing fees on refunds
      return {
        totalAmount: refundAmount,
        platformFee: 0,
        platformFeePercent: 0,
        sellerAmount: 0,
        processingFee: refundAmount * (this.processingFeePercent / 100),
        netSellerAmount: 0,
        splits: [{
          escrowId: escrow.id,
          sellerId: escrow.buyerId, // Refunding to buyer
          platformId: process.env.STRIPE_PLATFORM_ACCOUNT_ID!,
          sellerAmount: refundAmount,
          platformAmount: -(refundAmount * (this.processingFeePercent / 100)), // Platform absorbs processing fee
        }]
      };
    }
  }

  /**
   * Process partial refund with adjusted splits
   */
  async processPartialRefund(
    escrowId: string,
    refundAmount: number,
    reason: string,
    approvedBy: string
  ): Promise<{ refund: any; remainingSplit: PaymentSplitCalculation }> {
    try {
      // Get escrow transaction
      const { data: escrow, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (error || !escrow) {
        throw new EscrowError('Escrow transaction not found', 'NOT_FOUND', 404);
      }

      // Calculate refund split
      const refundSplit = this.calculateRefundSplit(escrow, refundAmount);

      // Process refund through Stripe
      const refund = await stripeConnectService.createEscrowRefund(
        escrowId,
        refundAmount,
        reason
      );

      // Calculate remaining amount split
      const remainingAmount = escrow.totalAmount - refundAmount;
      const remainingSplit = this.calculateEscrowSplit(escrow, remainingAmount);

      // Update escrow with partial refund
      await supabase
        .from('escrow_transactions')
        .update({
          totalAmount: remainingAmount,
          sellerAmount: remainingSplit.netSellerAmount,
          platformFeeAmount: remainingSplit.platformFee,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', escrowId);

      // Log the partial refund
      await this.logPartialRefund(escrowId, refundAmount, reason, approvedBy);

      return { refund, remainingSplit };
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new PaymentError('Failed to process partial refund', error);
    }
  }

  /**
   * Validate split calculations
   */
  validateSplit(calculation: PaymentSplitCalculation): boolean {
    const { totalAmount, platformFee, netSellerAmount, processingFee } = calculation;
    
    // Check if splits add up correctly
    const totalSplit = platformFee + netSellerAmount + processingFee;
    const tolerance = 0.01; // Allow for small rounding differences
    
    if (Math.abs(totalSplit - totalAmount) > tolerance) {
      throw new PaymentError('Payment split calculation error: amounts do not match');
    }

    // Validate all amounts are non-negative
    if (platformFee < 0 || netSellerAmount < 0 || processingFee < 0) {
      throw new PaymentError('Payment split calculation error: negative amounts detected');
    }

    return true;
  }

  /**
   * Get payment split history for an escrow
   */
  async getPaymentSplitHistory(escrowId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('escrow_audit_logs')
        .select('*')
        .eq('escrowId', escrowId)
        .in('action', ['PAYMENT_SPLIT_PROCESSED', 'PARTIAL_REFUND_PROCESSED', 'MILESTONE_SPLIT_PROCESSED'])
        .order('createdAt', { ascending: false });

      if (error) {
        throw new EscrowError('Failed to fetch payment split history', 'DB_ERROR', 500, error);
      }

      return data || [];
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new PaymentError('Failed to get payment split history', error);
    }
  }

  /**
   * Log payment split event
   */
  private async logPaymentSplit(
    escrowId: string,
    milestoneId: string,
    calculation: PaymentSplitCalculation,
    approvedBy: string
  ): Promise<void> {
    try {
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId,
          userId: approvedBy,
          action: 'MILESTONE_SPLIT_PROCESSED',
          details: {
            milestoneId,
            calculation,
            timestamp: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log payment split:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }

  /**
   * Log partial refund event
   */
  private async logPartialRefund(
    escrowId: string,
    refundAmount: number,
    reason: string,
    approvedBy: string
  ): Promise<void> {
    try {
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId,
          userId: approvedBy,
          action: 'PARTIAL_REFUND_PROCESSED',
          details: {
            refundAmount,
            reason,
            timestamp: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log partial refund:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }
}

// Export singleton instance
export const paymentSplitterService = new PaymentSplitterService();
export default PaymentSplitterService;