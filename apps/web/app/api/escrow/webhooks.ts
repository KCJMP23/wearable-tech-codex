/**
 * Stripe webhook handlers for escrow system
 * Processes Stripe events and updates escrow state accordingly
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { 
  StripeWebhookEvent,
  EscrowError,
  PaymentError 
} from './types';
import { stripeConnectService } from './stripe-connect';
import { milestoneTrackerService } from './milestone-tracker';
import { disputeHandlerService } from './dispute-handler';
import { transferAutomationService } from './transfer-automation';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface WebhookEventHandler {
  eventType: string;
  handler: (event: Stripe.Event) => Promise<void>;
  description: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  eventType: string;
  processedAt: Date;
  error?: string;
  details?: Record<string, any>;
}

export class StripeWebhookService {
  private webhookSecret: string;
  private eventHandlers: Map<string, WebhookEventHandler>;
  private maxRetryAttempts: number;

  constructor() {
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    this.maxRetryAttempts = parseInt(process.env.WEBHOOK_MAX_RETRY_ATTEMPTS || '3');
    this.eventHandlers = new Map();
    this.setupEventHandlers();
  }

  /**
   * Process incoming Stripe webhook
   */
  async processWebhook(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.text();
      const signature = request.headers.get('stripe-signature');

      if (!signature) {
        throw new PaymentError('Missing Stripe signature');
      }

      // Verify webhook signature
      const event = stripeConnectService.verifyWebhookSignature(
        body,
        signature,
        this.webhookSecret
      );

      // Process the event
      const result = await this.handleWebhookEvent(event);

      // Log successful processing
      await this.logWebhookEvent(event, result);

      return NextResponse.json({ 
        received: true, 
        eventId: event.id,
        result 
      });

    } catch (error) {
      console.error('Webhook processing failed:', error);
      
      // Log webhook error
      await this.logWebhookError(error as Error);

      if (error instanceof PaymentError) {
        return NextResponse.json(
          { error: 'Webhook verification failed' }, 
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Webhook processing failed' }, 
        { status: 500 }
      );
    }
  }

  /**
   * Handle specific webhook event
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<WebhookProcessingResult> {
    try {
      const handler = this.eventHandlers.get(event.type);
      
      if (!handler) {
        console.log(`Unhandled webhook event type: ${event.type}`);
        return {
          success: true,
          eventId: event.id,
          eventType: event.type,
          processedAt: new Date(),
          details: { message: 'Event type not handled' }
        };
      }

      // Execute the handler
      await handler.handler(event);

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processedAt: new Date(),
        details: { message: `Processed ${event.type} successfully` }
      };

    } catch (error) {
      console.error(`Failed to handle webhook event ${event.id}:`, error);
      
      return {
        success: false,
        eventId: event.id,
        eventType: event.type,
        processedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Payment Intent events
    this.eventHandlers.set('payment_intent.succeeded', {
      eventType: 'payment_intent.succeeded',
      handler: this.handlePaymentIntentSucceeded.bind(this),
      description: 'Payment successfully completed'
    });

    this.eventHandlers.set('payment_intent.payment_failed', {
      eventType: 'payment_intent.payment_failed',
      handler: this.handlePaymentIntentFailed.bind(this),
      description: 'Payment failed'
    });

    this.eventHandlers.set('payment_intent.canceled', {
      eventType: 'payment_intent.canceled',
      handler: this.handlePaymentIntentCanceled.bind(this),
      description: 'Payment intent was canceled'
    });

    // Transfer events
    this.eventHandlers.set('transfer.created', {
      eventType: 'transfer.created',
      handler: this.handleTransferCreated.bind(this),
      description: 'Transfer to Connect account created'
    });

    this.eventHandlers.set('transfer.paid', {
      eventType: 'transfer.paid',
      handler: this.handleTransferPaid.bind(this),
      description: 'Transfer completed successfully'
    });

    this.eventHandlers.set('transfer.failed', {
      eventType: 'transfer.failed',
      handler: this.handleTransferFailed.bind(this),
      description: 'Transfer to Connect account failed'
    });

    // Connect account events
    this.eventHandlers.set('account.updated', {
      eventType: 'account.updated',
      handler: this.handleAccountUpdated.bind(this),
      description: 'Connect account details updated'
    });

    this.eventHandlers.set('account.application.deauthorized', {
      eventType: 'account.application.deauthorized',
      handler: this.handleAccountDeauthorized.bind(this),
      description: 'Connect account disconnected'
    });

    // Payout events
    this.eventHandlers.set('payout.created', {
      eventType: 'payout.created',
      handler: this.handlePayoutCreated.bind(this),
      description: 'Payout to bank account created'
    });

    this.eventHandlers.set('payout.paid', {
      eventType: 'payout.paid',
      handler: this.handlePayoutPaid.bind(this),
      description: 'Payout completed successfully'
    });

    this.eventHandlers.set('payout.failed', {
      eventType: 'payout.failed',
      handler: this.handlePayoutFailed.bind(this),
      description: 'Payout to bank account failed'
    });

    // Charge dispute events
    this.eventHandlers.set('charge.dispute.created', {
      eventType: 'charge.dispute.created',
      handler: this.handleChargeDisputeCreated.bind(this),
      description: 'Chargeback dispute created'
    });

    // Refund events
    this.eventHandlers.set('charge.refunded', {
      eventType: 'charge.refunded',
      handler: this.handleChargeRefunded.bind(this),
      description: 'Charge was refunded'
    });
  }

  /**
   * Handle payment intent succeeded
   */
  private async handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    if (!paymentIntent.metadata.escrowId) {
      console.log('Payment intent not related to escrow');
      return;
    }

    await stripeConnectService.handlePaymentIntentSucceeded(paymentIntent);

    // Check if escrow should move to next stage
    await this.checkEscrowProgression(paymentIntent.metadata.escrowId);
  }

  /**
   * Handle payment intent failed
   */
  private async handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    if (!paymentIntent.metadata.escrowId) {
      return;
    }

    // Update escrow status to reflect payment failure
    await supabase
      .from('escrow_transactions')
      .update({
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', paymentIntent.metadata.escrowId);

    // Log payment failure
    await this.logEscrowEvent(paymentIntent.metadata.escrowId, 'PAYMENT_FAILED', {
      paymentIntentId: paymentIntent.id,
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message,
    });
  }

  /**
   * Handle payment intent canceled
   */
  private async handlePaymentIntentCanceled(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    if (!paymentIntent.metadata.escrowId) {
      return;
    }

    // Update escrow status
    await supabase
      .from('escrow_transactions')
      .update({
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', paymentIntent.metadata.escrowId);

    await this.logEscrowEvent(paymentIntent.metadata.escrowId, 'PAYMENT_CANCELED', {
      paymentIntentId: paymentIntent.id,
      cancellationReason: paymentIntent.cancellation_reason,
    });
  }

  /**
   * Handle transfer created
   */
  private async handleTransferCreated(event: Stripe.Event): Promise<void> {
    const transfer = event.data.object as Stripe.Transfer;
    
    // Extract escrow information from transfer metadata or description
    const escrowId = transfer.metadata?.escrowId;
    if (!escrowId) {
      return;
    }

    await this.logEscrowEvent(escrowId, 'TRANSFER_CREATED', {
      transferId: transfer.id,
      amount: transfer.amount / 100,
      destination: transfer.destination,
    });
  }

  /**
   * Handle transfer paid
   */
  private async handleTransferPaid(event: Stripe.Event): Promise<void> {
    const transfer = event.data.object as Stripe.Transfer;
    
    const escrowId = transfer.metadata?.escrowId;
    if (!escrowId) {
      return;
    }

    await this.logEscrowEvent(escrowId, 'TRANSFER_COMPLETED', {
      transferId: transfer.id,
      amount: transfer.amount / 100,
      completedAt: new Date(transfer.created * 1000).toISOString(),
    });

    // Check if this completes the escrow
    await this.checkEscrowCompletion(escrowId);
  }

  /**
   * Handle transfer failed
   */
  private async handleTransferFailed(event: Stripe.Event): Promise<void> {
    const transfer = event.data.object as Stripe.Transfer;
    
    const escrowId = transfer.metadata?.escrowId;
    if (!escrowId) {
      return;
    }

    // Handle transfer failure - may need to retry or escalate
    await this.logEscrowEvent(escrowId, 'TRANSFER_FAILED', {
      transferId: transfer.id,
      amount: transfer.amount / 100,
      failureCode: transfer.failure_code,
      failureMessage: transfer.failure_message,
    });

    // Create a task to investigate the failed transfer
    await transferAutomationService.scheduleTransfer(
      escrowId,
      new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      'review_deadline',
      undefined,
      { reason: 'transfer_failed', transferId: transfer.id }
    );
  }

  /**
   * Handle Connect account updated
   */
  private async handleAccountUpdated(event: Stripe.Event): Promise<void> {
    const account = event.data.object as Stripe.Account;
    
    await stripeConnectService.handleAccountUpdated(account);
  }

  /**
   * Handle Connect account deauthorized
   */
  private async handleAccountDeauthorized(event: Stripe.Event): Promise<void> {
    const deauthorization = event.data.object as any;
    
    // Update Connect account status to inactive
    await supabase
      .from('stripe_connect_accounts')
      .update({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .eq('stripeAccountId', deauthorization.account);

    // Log deauthorization
    await this.logSystemEvent('CONNECT_ACCOUNT_DEAUTHORIZED', {
      accountId: deauthorization.account,
      deauthorizedAt: new Date().toISOString(),
    });
  }

  /**
   * Handle payout created
   */
  private async handlePayoutCreated(event: Stripe.Event): Promise<void> {
    const payout = event.data.object as Stripe.Payout;
    
    await this.logSystemEvent('PAYOUT_CREATED', {
      payoutId: payout.id,
      amount: payout.amount / 100,
      destination: payout.destination,
      method: payout.method,
    });
  }

  /**
   * Handle payout paid
   */
  private async handlePayoutPaid(event: Stripe.Event): Promise<void> {
    const payout = event.data.object as Stripe.Payout;
    
    await this.logSystemEvent('PAYOUT_COMPLETED', {
      payoutId: payout.id,
      amount: payout.amount / 100,
      arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
    });
  }

  /**
   * Handle payout failed
   */
  private async handlePayoutFailed(event: Stripe.Event): Promise<void> {
    const payout = event.data.object as Stripe.Payout;
    
    await this.logSystemEvent('PAYOUT_FAILED', {
      payoutId: payout.id,
      amount: payout.amount / 100,
      failureCode: payout.failure_code,
      failureMessage: payout.failure_message,
    });
  }

  /**
   * Handle charge dispute created (chargeback)
   */
  private async handleChargeDisputeCreated(event: Stripe.Event): Promise<void> {
    const dispute = event.data.object as Stripe.Dispute;
    
    // Find escrow related to this charge
    const { data: escrows } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('stripePaymentIntentId', dispute.payment_intent);

    if (escrows && escrows.length > 0) {
      const escrow = escrows[0];
      
      // Create dispute in escrow system
      await disputeHandlerService.createDispute(escrow.buyerId, {
        escrowId: escrow.id,
        reason: `Chargeback dispute: ${dispute.reason}`,
        evidence: [],
        requestedAction: 'refund'
      });

      await this.logEscrowEvent(escrow.id, 'CHARGEBACK_DISPUTE_CREATED', {
        disputeId: dispute.id,
        reason: dispute.reason,
        amount: dispute.amount / 100,
        evidence: dispute.evidence,
      });
    }
  }

  /**
   * Handle charge refunded
   */
  private async handleChargeRefunded(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;
    
    // Find escrow related to this charge
    const { data: escrows } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('stripePaymentIntentId', charge.payment_intent);

    if (escrows && escrows.length > 0) {
      const escrow = escrows[0];
      
      // Update escrow status to refunded
      await supabase
        .from('escrow_transactions')
        .update({
          status: 'refunded',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', escrow.id);

      await this.logEscrowEvent(escrow.id, 'ESCROW_REFUNDED', {
        chargeId: charge.id,
        refundAmount: charge.amount_refunded / 100,
        totalAmount: charge.amount / 100,
      });
    }
  }

  /**
   * Check escrow progression after payment events
   */
  private async checkEscrowProgression(escrowId: string): Promise<void> {
    try {
      const { data: escrow } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (!escrow) return;

      // If escrow is funded, check if milestones should be created
      if (escrow.status === 'funded') {
        const { data: milestones } = await supabase
          .from('escrow_milestones')
          .select('*')
          .eq('escrowId', escrowId);

        if (!milestones || milestones.length === 0) {
          // Schedule milestone creation if none exist
          await transferAutomationService.scheduleTransfer(
            escrowId,
            new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
            'review_deadline',
            undefined,
            { action: 'create_milestones' }
          );
        }
      }
    } catch (error) {
      console.error('Failed to check escrow progression:', error);
    }
  }

  /**
   * Check if escrow is completed
   */
  private async checkEscrowCompletion(escrowId: string): Promise<void> {
    try {
      const { data: milestones } = await supabase
        .from('escrow_milestones')
        .select('*')
        .eq('escrowId', escrowId);

      const allCompleted = milestones?.every(m => m.status === 'completed');

      if (allCompleted) {
        await supabase
          .from('escrow_transactions')
          .update({
            status: 'completed',
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .eq('id', escrowId);

        await this.logEscrowEvent(escrowId, 'ESCROW_COMPLETED', {
          completedMilestones: milestones?.length || 0,
          completedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to check escrow completion:', error);
    }
  }

  /**
   * Log webhook event
   */
  private async logWebhookEvent(
    event: Stripe.Event,
    result: WebhookProcessingResult
  ): Promise<void> {
    try {
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId: 'webhook_system',
          userId: 'stripe_webhook',
          action: 'WEBHOOK_PROCESSED',
          details: {
            eventId: event.id,
            eventType: event.type,
            result,
            stripeEvent: {
              id: event.id,
              type: event.type,
              created: event.created,
              livemode: event.livemode,
            },
          },
          createdAt: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log webhook event:', error);
    }
  }

  /**
   * Log webhook error
   */
  private async logWebhookError(error: Error): Promise<void> {
    try {
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId: 'webhook_system',
          userId: 'stripe_webhook',
          action: 'WEBHOOK_ERROR',
          details: {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
        });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }
  }

  /**
   * Log escrow event
   */
  private async logEscrowEvent(
    escrowId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId,
          userId: 'stripe_webhook',
          action,
          details,
          createdAt: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log escrow event:', error);
    }
  }

  /**
   * Log system event
   */
  private async logSystemEvent(
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId: 'system',
          userId: 'stripe_webhook',
          action,
          details,
          createdAt: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log system event:', error);
    }
  }

  /**
   * Get supported webhook events
   */
  getSupportedEvents(): string[] {
    return Array.from(this.eventHandlers.keys());
  }

  /**
   * Get webhook processing statistics
   */
  async getWebhookStats(startDate?: Date, endDate?: Date): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    eventsByType: Record<string, number>;
  }> {
    try {
      const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const end = endDate || new Date();

      const { data: events, error } = await supabase
        .from('escrow_audit_logs')
        .select('*')
        .eq('action', 'WEBHOOK_PROCESSED')
        .gte('createdAt', start.toISOString())
        .lte('createdAt', end.toISOString());

      if (error) {
        throw new EscrowError('Failed to fetch webhook stats', 'DB_ERROR', 500, error);
      }

      const totalEvents = events?.length || 0;
      const successfulEvents = events?.filter(e => e.details?.result?.success).length || 0;
      const failedEvents = totalEvents - successfulEvents;

      const eventsByType: Record<string, number> = {};
      events?.forEach(e => {
        const eventType = e.details?.eventType;
        if (eventType) {
          eventsByType[eventType] = (eventsByType[eventType] || 0) + 1;
        }
      });

      return {
        totalEvents,
        successfulEvents,
        failedEvents,
        eventsByType,
      };
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to get webhook stats', 'SYSTEM_ERROR', 500, error);
    }
  }
}

// Export singleton instance
export const stripeWebhookService = new StripeWebhookService();

// Export webhook handler for Next.js API route
export async function handleStripeWebhook(request: NextRequest): Promise<NextResponse> {
  return stripeWebhookService.processWebhook(request);
}

export default StripeWebhookService;