/**
 * Dispute resolution handler for escrow system
 * Manages disputes, arbitration, and resolution processes
 */

import { 
  EscrowDispute, 
  DisputeStatus,
  EscrowTransaction,
  EscrowMilestone,
  EscrowError,
  ValidationError,
  CreateDisputeInput 
} from './types';
import { paymentSplitterService } from './payment-splitter';
import { stripeConnectService } from './stripe-connect';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DisputeResolution {
  disputeId: string;
  resolution: 'buyer_favor' | 'seller_favor' | 'partial_refund' | 'milestone_completion';
  amount?: number;
  reasoning: string;
  arbitratorId: string;
  resolvedAt: Date;
  refundToId?: string;
  releaseToId?: string;
}

export interface ArbitrationCase {
  disputeId: string;
  arbitratorId: string;
  assignedAt: Date;
  deadline: Date;
  status: 'assigned' | 'investigating' | 'evidence_review' | 'resolved';
  evidenceSubmissions: EvidenceSubmission[];
  communications: ArbitrationCommunication[];
}

export interface EvidenceSubmission {
  id: string;
  disputeId: string;
  submittedBy: string;
  type: 'document' | 'screenshot' | 'communication' | 'transaction' | 'other';
  description: string;
  fileUrls: string[];
  submittedAt: Date;
  verified: boolean;
}

export interface ArbitrationCommunication {
  id: string;
  disputeId: string;
  fromId: string;
  toId: string;
  message: string;
  timestamp: Date;
  isPrivate: boolean;
}

export interface DisputeMetrics {
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes: number;
  averageResolutionTimeHours: number;
  resolutionsByType: Record<string, number>;
  arbitratorWorkload: Record<string, number>;
}

export class DisputeHandlerService {
  private maxDisputePeriodDays: number;
  private arbitrationTimeoutDays: number;
  private escalationThresholdHours: number;

  constructor() {
    this.maxDisputePeriodDays = parseInt(process.env.MAX_DISPUTE_PERIOD_DAYS || '30');
    this.arbitrationTimeoutDays = parseInt(process.env.ARBITRATION_TIMEOUT_DAYS || '7');
    this.escalationThresholdHours = parseInt(process.env.ESCALATION_THRESHOLD_HOURS || '48');
  }

  /**
   * Create a new dispute
   */
  async createDispute(
    initiatorId: string,
    disputeData: CreateDisputeInput
  ): Promise<EscrowDispute> {
    try {
      // Validate escrow exists and is in disputable state
      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', disputeData.escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new EscrowError('Escrow transaction not found', 'NOT_FOUND', 404);
      }

      if (!['funded', 'in_progress'].includes(escrow.status)) {
        throw new ValidationError('Cannot dispute escrow in current state');
      }

      // Check if initiator is part of the escrow
      if (![escrow.buyerId, escrow.sellerId].includes(initiatorId)) {
        throw new ValidationError('Only buyer or seller can initiate disputes');
      }

      // Determine respondent
      const respondentId = initiatorId === escrow.buyerId ? escrow.sellerId : escrow.buyerId;

      // Validate milestone if specified
      let milestone: EscrowMilestone | null = null;
      if (disputeData.milestoneId) {
        const { data: milestoneData, error: milestoneError } = await supabase
          .from('escrow_milestones')
          .select('*')
          .eq('id', disputeData.milestoneId)
          .eq('escrowId', disputeData.escrowId)
          .single();

        if (milestoneError || !milestoneData) {
          throw new ValidationError('Milestone not found or not part of this escrow');
        }
        milestone = milestoneData;
      }

      // Check for existing active disputes
      const { data: existingDisputes } = await supabase
        .from('escrow_disputes')
        .select('*')
        .eq('escrowId', disputeData.escrowId)
        .in('status', ['open', 'investigating', 'arbitration']);

      if (existingDisputes && existingDisputes.length > 0) {
        throw new ValidationError('There is already an active dispute for this escrow');
      }

      // Create dispute
      const disputeInsert = {
        escrowId: disputeData.escrowId,
        milestoneId: disputeData.milestoneId,
        initiatorId,
        respondentId,
        status: 'open' as DisputeStatus,
        reason: disputeData.reason,
        evidence: disputeData.evidence || [],
        requestedAction: disputeData.requestedAction,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data: dispute, error } = await supabase
        .from('escrow_disputes')
        .insert(disputeInsert)
        .select()
        .single();

      if (error) {
        throw new EscrowError('Failed to create dispute', 'DB_ERROR', 500, error);
      }

      // Update escrow status to dispute
      await supabase
        .from('escrow_transactions')
        .update({
          status: 'dispute',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', disputeData.escrowId);

      // Log dispute creation
      await this.logDisputeEvent(dispute.id, initiatorId, 'DISPUTE_CREATED', {
        reason: disputeData.reason,
        requestedAction: disputeData.requestedAction,
        milestoneId: disputeData.milestoneId,
      });

      // Schedule automatic escalation if not resolved
      await this.scheduleEscalation(dispute.id);

      return dispute;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to create dispute', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Respond to a dispute
   */
  async respondToDispute(
    disputeId: string,
    respondentId: string,
    response: string,
    evidence?: string[],
    counterOffer?: {
      action: 'partial_refund' | 'milestone_completion' | 'alternative_solution';
      amount?: number;
      description: string;
    }
  ): Promise<EscrowDispute> {
    try {
      // Get dispute
      const { data: dispute, error: disputeError } = await supabase
        .from('escrow_disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      if (disputeError || !dispute) {
        throw new EscrowError('Dispute not found', 'NOT_FOUND', 404);
      }

      if (dispute.respondentId !== respondentId) {
        throw new ValidationError('Only the respondent can respond to this dispute');
      }

      if (dispute.status !== 'open') {
        throw new ValidationError('Cannot respond to dispute in current state');
      }

      // Update dispute with response
      const { data: updatedDispute, error } = await supabase
        .from('escrow_disputes')
        .update({
          status: 'investigating',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', disputeId)
        .select()
        .single();

      if (error) {
        throw new EscrowError('Failed to update dispute', 'DB_ERROR', 500, error);
      }

      // Store response details
      await this.logDisputeEvent(disputeId, respondentId, 'DISPUTE_RESPONSE', {
        response,
        evidence: evidence || [],
        counterOffer,
      });

      return updatedDispute;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to respond to dispute', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Escalate dispute to arbitration
   */
  async escalateToArbitration(
    disputeId: string,
    escalatedBy?: string
  ): Promise<ArbitrationCase> {
    try {
      // Get dispute
      const { data: dispute, error: disputeError } = await supabase
        .from('escrow_disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      if (disputeError || !dispute) {
        throw new EscrowError('Dispute not found', 'NOT_FOUND', 404);
      }

      if (!['open', 'investigating'].includes(dispute.status)) {
        throw new ValidationError('Dispute cannot be escalated in current state');
      }

      // Find available arbitrator
      const arbitratorId = await this.assignArbitrator(disputeId);

      // Update dispute status
      await supabase
        .from('escrow_disputes')
        .update({
          status: 'arbitration',
          arbitratorId,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', disputeId);

      // Create arbitration case
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + this.arbitrationTimeoutDays);

      const arbitrationCase: ArbitrationCase = {
        disputeId,
        arbitratorId,
        assignedAt: new Date(),
        deadline,
        status: 'assigned',
        evidenceSubmissions: [],
        communications: [],
      };

      // Log escalation
      await this.logDisputeEvent(disputeId, escalatedBy || 'system', 'ESCALATED_TO_ARBITRATION', {
        arbitratorId,
        deadline: deadline.toISOString(),
      });

      return arbitrationCase;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to escalate dispute to arbitration', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(
    disputeId: string,
    resolution: DisputeResolution
  ): Promise<{ dispute: EscrowDispute; financialResult?: any }> {
    try {
      // Get dispute and escrow
      const { data: dispute, error: disputeError } = await supabase
        .from('escrow_disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      if (disputeError || !dispute) {
        throw new EscrowError('Dispute not found', 'NOT_FOUND', 404);
      }

      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', dispute.escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new EscrowError('Escrow transaction not found', 'NOT_FOUND', 404);
      }

      let financialResult: any = null;

      // Process resolution based on type
      switch (resolution.resolution) {
        case 'buyer_favor':
          // Full refund to buyer
          financialResult = await stripeConnectService.createEscrowRefund(
            dispute.escrowId,
            resolution.amount || escrow.totalAmount,
            'Dispute resolved in buyer favor'
          );
          
          await supabase
            .from('escrow_transactions')
            .update({ status: 'refunded' })
            .eq('id', dispute.escrowId);
          break;

        case 'seller_favor':
          // Release full amount to seller
          if (dispute.milestoneId) {
            financialResult = await paymentSplitterService.processMilestoneSplit(
              dispute.escrowId,
              dispute.milestoneId,
              resolution.arbitratorId
            );
          } else {
            // Release all pending milestones
            const { data: milestones } = await supabase
              .from('escrow_milestones')
              .select('*')
              .eq('escrowId', dispute.escrowId)
              .in('status', ['pending', 'in_progress', 'completed']);

            for (const milestone of milestones || []) {
              await paymentSplitterService.processMilestoneSplit(
                dispute.escrowId,
                milestone.id,
                resolution.arbitratorId
              );
            }
          }
          
          await supabase
            .from('escrow_transactions')
            .update({ status: 'completed' })
            .eq('id', dispute.escrowId);
          break;

        case 'partial_refund':
          // Partial refund processing
          if (!resolution.amount) {
            throw new ValidationError('Amount required for partial refund');
          }
          
          financialResult = await paymentSplitterService.processPartialRefund(
            dispute.escrowId,
            resolution.amount,
            'Dispute resolution: partial refund',
            resolution.arbitratorId
          );
          break;

        case 'milestone_completion':
          // Mark specific milestone as completed and release funds
          if (!dispute.milestoneId) {
            throw new ValidationError('Milestone ID required for milestone completion resolution');
          }
          
          financialResult = await paymentSplitterService.processMilestoneSplit(
            dispute.escrowId,
            dispute.milestoneId,
            resolution.arbitratorId
          );
          break;
      }

      // Update dispute as resolved
      const { data: resolvedDispute, error } = await supabase
        .from('escrow_disputes')
        .update({
          status: 'resolved',
          resolution: resolution.reasoning,
          resolutionAmount: resolution.amount,
          resolvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', disputeId)
        .select()
        .single();

      if (error) {
        throw new EscrowError('Failed to update dispute resolution', 'DB_ERROR', 500, error);
      }

      // Log resolution
      await this.logDisputeEvent(disputeId, resolution.arbitratorId, 'DISPUTE_RESOLVED', {
        resolution: resolution.resolution,
        amount: resolution.amount,
        reasoning: resolution.reasoning,
        financialResult,
      });

      return { dispute: resolvedDispute, financialResult };
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to resolve dispute', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Submit evidence for dispute
   */
  async submitEvidence(
    disputeId: string,
    submittedBy: string,
    evidence: {
      type: EvidenceSubmission['type'];
      description: string;
      fileUrls: string[];
    }
  ): Promise<EvidenceSubmission> {
    try {
      // Validate dispute exists and is active
      const { data: dispute, error: disputeError } = await supabase
        .from('escrow_disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      if (disputeError || !dispute) {
        throw new EscrowError('Dispute not found', 'NOT_FOUND', 404);
      }

      if (dispute.status === 'resolved' || dispute.status === 'closed') {
        throw new ValidationError('Cannot submit evidence to closed dispute');
      }

      // Validate submitter is involved in the dispute
      if (![dispute.initiatorId, dispute.respondentId, dispute.arbitratorId].includes(submittedBy)) {
        throw new ValidationError('Only dispute parties or arbitrator can submit evidence');
      }

      const evidenceSubmission: EvidenceSubmission = {
        id: crypto.randomUUID(),
        disputeId,
        submittedBy,
        type: evidence.type,
        description: evidence.description,
        fileUrls: evidence.fileUrls,
        submittedAt: new Date(),
        verified: false,
      };

      // Log evidence submission
      await this.logDisputeEvent(disputeId, submittedBy, 'EVIDENCE_SUBMITTED', {
        evidenceType: evidence.type,
        description: evidence.description,
        fileCount: evidence.fileUrls.length,
      });

      return evidenceSubmission;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to submit evidence', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Get dispute details with all related data
   */
  async getDisputeDetails(disputeId: string): Promise<{
    dispute: EscrowDispute;
    escrow: EscrowTransaction;
    milestone?: EscrowMilestone;
    auditLog: any[];
  }> {
    try {
      // Get dispute
      const { data: dispute, error: disputeError } = await supabase
        .from('escrow_disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      if (disputeError || !dispute) {
        throw new EscrowError('Dispute not found', 'NOT_FOUND', 404);
      }

      // Get escrow
      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', dispute.escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new EscrowError('Escrow transaction not found', 'NOT_FOUND', 404);
      }

      // Get milestone if specified
      let milestone: EscrowMilestone | undefined;
      if (dispute.milestoneId) {
        const { data: milestoneData } = await supabase
          .from('escrow_milestones')
          .select('*')
          .eq('id', dispute.milestoneId)
          .single();
        
        milestone = milestoneData;
      }

      // Get audit log
      const { data: auditLog } = await supabase
        .from('escrow_audit_logs')
        .select('*')
        .eq('escrowId', dispute.escrowId)
        .order('createdAt', { ascending: false });

      return {
        dispute,
        escrow,
        milestone,
        auditLog: auditLog || [],
      };
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to get dispute details', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Get dispute metrics for admin dashboard
   */
  async getDisputeMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<DisputeMetrics> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || new Date();

      // Get dispute counts
      const { data: disputes, error } = await supabase
        .from('escrow_disputes')
        .select('*')
        .gte('createdAt', start.toISOString())
        .lte('createdAt', end.toISOString());

      if (error) {
        throw new EscrowError('Failed to fetch dispute metrics', 'DB_ERROR', 500, error);
      }

      const totalDisputes = disputes?.length || 0;
      const openDisputes = disputes?.filter(d => ['open', 'investigating', 'arbitration'].includes(d.status)).length || 0;
      const resolvedDisputes = disputes?.filter(d => d.status === 'resolved').length || 0;

      // Calculate average resolution time
      const resolvedWithTime = disputes?.filter(d => d.status === 'resolved' && d.resolvedAt) || [];
      const averageResolutionTimeHours = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((sum, d) => {
            const created = new Date(d.createdAt);
            const resolved = new Date(d.resolvedAt!);
            return sum + ((resolved.getTime() - created.getTime()) / (1000 * 60 * 60));
          }, 0) / resolvedWithTime.length
        : 0;

      // Resolution types
      const resolutionsByType: Record<string, number> = {};
      disputes?.forEach(d => {
        if (d.status === 'resolved' && d.resolution) {
          // Parse resolution to extract type
          const resolutionType = d.resolution.includes('buyer') ? 'buyer_favor' :
                               d.resolution.includes('seller') ? 'seller_favor' :
                               d.resolution.includes('partial') ? 'partial_refund' : 'other';
          resolutionsByType[resolutionType] = (resolutionsByType[resolutionType] || 0) + 1;
        }
      });

      // Arbitrator workload
      const arbitratorWorkload: Record<string, number> = {};
      disputes?.forEach(d => {
        if (d.arbitratorId) {
          arbitratorWorkload[d.arbitratorId] = (arbitratorWorkload[d.arbitratorId] || 0) + 1;
        }
      });

      return {
        totalDisputes,
        openDisputes,
        resolvedDisputes,
        averageResolutionTimeHours,
        resolutionsByType,
        arbitratorWorkload,
      };
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to get dispute metrics', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Assign arbitrator to dispute
   */
  private async assignArbitrator(disputeId: string): Promise<string> {
    // This would typically integrate with an arbitrator pool
    // For now, return a default arbitrator ID
    const defaultArbitratorId = process.env.DEFAULT_ARBITRATOR_ID || 'system_arbitrator';
    return defaultArbitratorId;
  }

  /**
   * Schedule automatic escalation
   */
  private async scheduleEscalation(disputeId: string): Promise<void> {
    // This would typically integrate with a job queue system
    console.log(`Scheduled escalation for dispute ${disputeId} in ${this.escalationThresholdHours} hours`);
  }

  /**
   * Log dispute event
   */
  private async logDisputeEvent(
    disputeId: string,
    userId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      // Get escrow ID from dispute
      const { data: dispute } = await supabase
        .from('escrow_disputes')
        .select('escrowId')
        .eq('id', disputeId)
        .single();

      if (dispute) {
        await supabase
          .from('escrow_audit_logs')
          .insert({
            escrowId: dispute.escrowId,
            userId,
            action,
            details: { disputeId, ...details },
            createdAt: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Failed to log dispute event:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }
}

// Export singleton instance
export const disputeHandlerService = new DisputeHandlerService();
export default DisputeHandlerService;