/**
 * Stripe Connect integration for escrow system
 * Handles multi-party payments, account management, and secure transfers
 */

import Stripe from 'stripe';
import { 
  StripeConnectAccount, 
  PaymentSplit, 
  EscrowTransaction,
  EscrowError,
  PaymentError,
  EscrowConfig 
} from './types';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class StripeConnectService {
  private stripe: Stripe;
  private config: EscrowConfig;

  constructor(config: EscrowConfig) {
    this.stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2024-06-20',
    });
    this.config = config;
  }

  /**
   * Create Stripe Connect Express account for a user
   */
  async createConnectAccount(
    userId: string,
    email: string,
    country: string = 'US',
    type: 'express' | 'standard' = 'express'
  ): Promise<StripeConnectAccount> {
    try {
      // Create Stripe Connect account
      const account = await this.stripe.accounts.create({
        type,
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        settings: {
          payouts: {
            schedule: {
              interval: 'manual',
            },
          },
        },
      });

      // Store in database
      const connectAccount: Omit<StripeConnectAccount, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        stripeAccountId: account.id,
        isActive: false,
        hasCompletedOnboarding: false,
        hasPayoutsEnabled: false,
        hasChargesEnabled: false,
        capabilities: [],
        country,
        currency: account.default_currency || 'usd',
      };

      const { data, error } = await supabase
        .from('stripe_connect_accounts')
        .insert(connectAccount)
        .select()
        .single();

      if (error) throw new EscrowError('Failed to store connect account', 'DB_ERROR', 500, error);

      return data;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new PaymentError('Failed to create Stripe Connect account', error);
    }
  }

  /**
   * Create onboarding link for Connect account
   */
  async createOnboardingLink(
    stripeAccountId: string,
    refreshUrl: string,
    returnUrl: string
  ): Promise<string> {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      throw new PaymentError('Failed to create onboarding link', error);
    }
  }

  /**
   * Update Connect account status based on Stripe capabilities
   */
  async updateConnectAccountStatus(stripeAccountId: string): Promise<StripeConnectAccount> {
    try {
      // Fetch account details from Stripe
      const account = await this.stripe.accounts.retrieve(stripeAccountId);

      const capabilities = Object.keys(account.capabilities || {}).filter(
        key => account.capabilities![key] === 'active'
      );

      const hasChargesEnabled = account.charges_enabled || false;
      const hasPayoutsEnabled = account.payouts_enabled || false;
      const hasCompletedOnboarding = account.details_submitted || false;

      // Update database
      const { data, error } = await supabase
        .from('stripe_connect_accounts')
        .update({
          hasCompletedOnboarding,
          hasChargesEnabled,
          hasPayoutsEnabled,
          capabilities,
          isActive: hasChargesEnabled && hasPayoutsEnabled,
          updatedAt: new Date().toISOString(),
        })
        .eq('stripeAccountId', stripeAccountId)
        .select()
        .single();

      if (error) throw new EscrowError('Failed to update account status', 'DB_ERROR', 500, error);

      return data;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new PaymentError('Failed to update Connect account status', error);
    }
  }

  /**
   * Create payment intent for escrow transaction
   */
  async createEscrowPaymentIntent(
    escrow: EscrowTransaction,
    sellerStripeAccountId: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      // Calculate application fee (platform fee)
      const applicationFeeAmount = Math.round(escrow.platformFeeAmount * 100); // Convert to cents

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(escrow.totalAmount * 100), // Convert to cents
        currency: 'usd',
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: sellerStripeAccountId,
        },
        metadata: {
          escrowId: escrow.id,
          buyerId: escrow.buyerId,
          sellerId: escrow.sellerId,
          siteId: escrow.siteId,
        },
        description: `Escrow payment for: ${escrow.description}`,
        capture_method: 'manual', // Manual capture for escrow
      });

      // Update escrow with payment intent ID
      await supabase
        .from('escrow_transactions')
        .update({ 
          stripePaymentIntentId: paymentIntent.id,
          stripeConnectAccountId: sellerStripeAccountId,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', escrow.id);

      return paymentIntent;
    } catch (error) {
      throw new PaymentError('Failed to create escrow payment intent', error);
    }
  }

  /**
   * Capture payment for completed milestone
   */
  async captureEscrowPayment(
    escrowId: string,
    amount?: number
  ): Promise<Stripe.PaymentIntent> {
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

      if (!escrow.stripePaymentIntentId) {
        throw new EscrowError('No payment intent found for escrow', 'INVALID_STATE', 400);
      }

      // Capture the payment
      const captureAmount = amount ? Math.round(amount * 100) : undefined;
      
      const paymentIntent = await this.stripe.paymentIntents.capture(
        escrow.stripePaymentIntentId,
        captureAmount ? { amount_to_capture: captureAmount } : undefined
      );

      return paymentIntent;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new PaymentError('Failed to capture escrow payment', error);
    }
  }

  /**
   * Process payment split and transfer funds
   */
  async processPaymentSplit(
    escrowId: string,
    milestoneAmount: number
  ): Promise<PaymentSplit> {
    try {
      // Get escrow details
      const { data: escrow, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (error || !escrow) {
        throw new EscrowError('Escrow transaction not found', 'NOT_FOUND', 404);
      }

      // Calculate split amounts
      const platformFeeAmount = milestoneAmount * (escrow.platformFeePercent / 100);
      const sellerAmount = milestoneAmount - platformFeeAmount;

      // Create transfer to seller (funds are already in their account via Connect)
      // This is mainly for record keeping as funds were transferred during payment
      const split: PaymentSplit = {
        escrowId,
        sellerId: escrow.sellerId,
        platformId: this.config.platformAccountId,
        sellerAmount,
        platformAmount: platformFeeAmount,
        processedAt: new Date(),
      };

      // Log the split for audit purposes
      await this.logAuditEvent(escrowId, 'PAYMENT_SPLIT_PROCESSED', {
        milestoneAmount,
        sellerAmount,
        platformAmount: platformFeeAmount,
        stripePaymentIntentId: escrow.stripePaymentIntentId,
      });

      return split;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new PaymentError('Failed to process payment split', error);
    }
  }

  /**
   * Create refund for disputed or cancelled escrow
   */
  async createEscrowRefund(
    escrowId: string,
    amount?: number,
    reason?: string
  ): Promise<Stripe.Refund> {
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

      if (!escrow.stripePaymentIntentId) {
        throw new EscrowError('No payment intent found for escrow', 'INVALID_STATE', 400);
      }

      // Create refund
      const refundAmount = amount ? Math.round(amount * 100) : undefined;
      
      const refund = await this.stripe.refunds.create({
        payment_intent: escrow.stripePaymentIntentId,
        amount: refundAmount,
        reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
        metadata: {
          escrowId,
          refundReason: reason || 'Escrow refund',
        },
      });

      // Log refund
      await this.logAuditEvent(escrowId, 'REFUND_CREATED', {
        refundId: refund.id,
        amount: refund.amount / 100,
        reason,
      });

      return refund;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new PaymentError('Failed to create escrow refund', error);
    }
  }

  /**
   * Retrieve Connect account balance
   */
  async getConnectAccountBalance(stripeAccountId: string): Promise<Stripe.Balance> {
    try {
      return await this.stripe.balance.retrieve({
        stripeAccount: stripeAccountId,
      });
    } catch (error) {
      throw new PaymentError('Failed to retrieve account balance', error);
    }
  }

  /**
   * Create payout to Connect account
   */
  async createPayout(
    stripeAccountId: string,
    amount: number,
    currency: string = 'usd'
  ): Promise<Stripe.Payout> {
    try {
      return await this.stripe.payouts.create(
        {
          amount: Math.round(amount * 100),
          currency,
          method: 'instant',
        },
        {
          stripeAccount: stripeAccountId,
        }
      );
    } catch (error) {
      throw new PaymentError('Failed to create payout', error);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      throw new PaymentError('Invalid webhook signature', error);
    }
  }

  /**
   * Handle Connect account updated webhook
   */
  async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    try {
      await this.updateConnectAccountStatus(account.id);
    } catch (error) {
      console.error('Failed to handle account updated webhook:', error);
      throw error;
    }
  }

  /**
   * Handle payment intent succeeded webhook
   */
  async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const escrowId = paymentIntent.metadata.escrowId;
      if (!escrowId) return;

      // Update escrow status to funded
      await supabase
        .from('escrow_transactions')
        .update({ 
          status: 'funded',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', escrowId);

      await this.logAuditEvent(escrowId, 'PAYMENT_SUCCEEDED', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
      });
    } catch (error) {
      console.error('Failed to handle payment intent succeeded webhook:', error);
      throw error;
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    escrowId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId,
          userId: 'system',
          action,
          details,
          createdAt: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }

  /**
   * Get Connect account by user ID
   */
  async getConnectAccountByUserId(userId: string): Promise<StripeConnectAccount | null> {
    try {
      const { data, error } = await supabase
        .from('stripe_connect_accounts')
        .select('*')
        .eq('userId', userId)
        .eq('isActive', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new EscrowError('Failed to fetch Connect account', 'DB_ERROR', 500, error);
      }

      return data || null;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to get Connect account', 'DB_ERROR', 500, error);
    }
  }

  /**
   * Validate Connect account for escrow
   */
  async validateConnectAccount(userId: string): Promise<StripeConnectAccount> {
    const account = await this.getConnectAccountByUserId(userId);
    
    if (!account) {
      throw new EscrowError('No Stripe Connect account found', 'ACCOUNT_REQUIRED', 400);
    }

    if (!account.hasCompletedOnboarding) {
      throw new EscrowError('Stripe Connect onboarding not completed', 'ONBOARDING_REQUIRED', 400);
    }

    if (!account.hasChargesEnabled || !account.hasPayoutsEnabled) {
      throw new EscrowError('Stripe Connect account not fully enabled', 'ACCOUNT_DISABLED', 400);
    }

    return account;
  }
}

// Export singleton instance
const stripeConnectService = new StripeConnectService({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  stripeConnectClientId: process.env.STRIPE_CONNECT_CLIENT_ID!,
  platformAccountId: process.env.STRIPE_PLATFORM_ACCOUNT_ID!,
  maxEscrowAmount: parseInt(process.env.MAX_ESCROW_AMOUNT || '1000000'),
  minEscrowAmount: parseInt(process.env.MIN_ESCROW_AMOUNT || '100'),
  defaultPlatformFeePercent: parseFloat(process.env.DEFAULT_PLATFORM_FEE_PERCENT || '5'),
  maxEscrowPeriodDays: parseInt(process.env.MAX_ESCROW_PERIOD_DAYS || '365'),
  encryptionKey: process.env.ENCRYPTION_KEY!,
  documentStorageBucket: process.env.DOCUMENT_STORAGE_BUCKET!,
});

export { stripeConnectService };
export default StripeConnectService;