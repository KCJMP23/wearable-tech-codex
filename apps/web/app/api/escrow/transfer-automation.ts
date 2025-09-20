/**
 * Automated transfer process for escrow system
 * Handles automatic fund releases, scheduling, and approval workflows
 */

import { 
  EscrowTransaction, 
  EscrowMilestone,
  EscrowStatus,
  MilestoneStatus,
  EscrowError 
} from './types';
import { milestoneTrackerService } from './milestone-tracker';
import { paymentSplitterService } from './payment-splitter';
import { stripeConnectService } from './stripe-connect';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AutoTransferRule {
  id: string;
  escrowId: string;
  type: 'time_based' | 'approval_based' | 'milestone_based' | 'conditional';
  conditions: TransferCondition[];
  actions: TransferAction[];
  priority: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  lastExecuted?: Date;
  executionCount: number;
}

export interface TransferCondition {
  type: 'time_elapsed' | 'milestone_completed' | 'approval_received' | 'dispute_resolved' | 'document_uploaded';
  parameters: Record<string, any>;
  operator: 'AND' | 'OR';
}

export interface TransferAction {
  type: 'release_funds' | 'send_notification' | 'update_status' | 'create_task' | 'schedule_review';
  parameters: Record<string, any>;
  delayMinutes?: number;
}

export interface ScheduledTransfer {
  id: string;
  escrowId: string;
  milestoneId?: string;
  scheduledFor: Date;
  type: 'automatic_release' | 'reminder_notification' | 'escalation' | 'review_deadline';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempts: number;
  maxAttempts: number;
  lastAttempt?: Date;
  error?: string;
  createdAt: Date;
}

export interface TransferApprovalWorkflow {
  escrowId: string;
  milestoneId?: string;
  requiredApprovals: ApprovalStep[];
  currentStep: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'expired';
  startedAt: Date;
  completedAt?: Date;
}

export interface ApprovalStep {
  stepNumber: number;
  approverRole: 'buyer' | 'seller' | 'admin' | 'arbitrator';
  approverId?: string;
  approvalType: 'automatic' | 'manual' | 'conditional';
  conditions?: TransferCondition[];
  timeoutHours: number;
  status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'expired';
  approvedAt?: Date;
  notes?: string;
}

export interface AutomationMetrics {
  totalEscrows: number;
  automatedTransfers: number;
  automationRate: number;
  averageProcessingTime: number;
  failureRate: number;
  scheduledTransfers: number;
  completedTransfers: number;
}

export class TransferAutomationService {
  private defaultApprovalTimeoutHours: number;
  private maxRetryAttempts: number;
  private automationCheckIntervalMinutes: number;

  constructor() {
    this.defaultApprovalTimeoutHours = parseInt(process.env.DEFAULT_APPROVAL_TIMEOUT_HOURS || '72');
    this.maxRetryAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
    this.automationCheckIntervalMinutes = parseInt(process.env.AUTOMATION_CHECK_INTERVAL_MINUTES || '15');
  }

  /**
   * Create automatic transfer rule
   */
  async createAutoTransferRule(
    escrowId: string,
    createdBy: string,
    rule: Omit<AutoTransferRule, 'id' | 'createdAt' | 'lastExecuted' | 'executionCount'>
  ): Promise<AutoTransferRule> {
    try {
      // Validate escrow exists
      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new EscrowError('Escrow transaction not found', 'NOT_FOUND', 404);
      }

      // Validate rule conditions and actions
      this.validateTransferRule(rule);

      const autoRule: AutoTransferRule = {
        id: crypto.randomUUID(),
        escrowId,
        createdBy,
        createdAt: new Date(),
        executionCount: 0,
        ...rule,
      };

      // Store rule (this would typically go in a dedicated table)
      await this.logAutomationEvent(escrowId, 'AUTO_TRANSFER_RULE_CREATED', {
        ruleId: autoRule.id,
        type: rule.type,
        conditions: rule.conditions,
        actions: rule.actions,
        createdBy,
      });

      return autoRule;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to create auto transfer rule', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Schedule automatic transfer
   */
  async scheduleTransfer(
    escrowId: string,
    scheduledFor: Date,
    type: ScheduledTransfer['type'],
    milestoneId?: string,
    parameters?: Record<string, any>
  ): Promise<ScheduledTransfer> {
    try {
      const scheduledTransfer: ScheduledTransfer = {
        id: crypto.randomUUID(),
        escrowId,
        milestoneId,
        scheduledFor,
        type,
        status: 'pending',
        attempts: 0,
        maxAttempts: this.maxRetryAttempts,
        createdAt: new Date(),
      };

      // Store scheduled transfer (this would typically go in a dedicated table)
      await this.logAutomationEvent(escrowId, 'TRANSFER_SCHEDULED', {
        scheduledTransferId: scheduledTransfer.id,
        scheduledFor: scheduledFor.toISOString(),
        type,
        milestoneId,
        parameters,
      });

      return scheduledTransfer;
    } catch (error) {
      throw new EscrowError('Failed to schedule transfer', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Process automatic milestone release
   */
  async processAutomaticMilestoneRelease(
    milestoneId: string,
    triggeredBy: string = 'system_automation'
  ): Promise<any> {
    try {
      // Get milestone
      const { data: milestone, error: milestoneError } = await supabase
        .from('escrow_milestones')
        .select('*')
        .eq('id', milestoneId)
        .single();

      if (milestoneError || !milestone) {
        throw new EscrowError('Milestone not found', 'NOT_FOUND', 404);
      }

      // Check if milestone is eligible for automatic release
      if (milestone.status !== 'approved') {
        throw new EscrowError('Milestone not approved for automatic release', 'INVALID_STATE', 400);
      }

      // Check approval timeout
      const approvedAt = new Date(milestone.approvedAt!);
      const releaseTime = new Date();
      releaseTime.setHours(releaseTime.getHours() - this.defaultApprovalTimeoutHours);

      if (approvedAt > releaseTime) {
        throw new EscrowError('Approval timeout period not elapsed', 'TIMEOUT_NOT_ELAPSED', 400);
      }

      // Process the release
      const result = await milestoneTrackerService.releaseMilestoneFunds(
        milestoneId,
        triggeredBy
      );

      // Log automatic release
      await this.logAutomationEvent(milestone.escrowId, 'AUTOMATIC_MILESTONE_RELEASE', {
        milestoneId,
        amount: milestone.amount,
        triggeredBy,
        approvedAt: milestone.approvedAt,
        releasedAt: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to process automatic milestone release', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Setup approval workflow for escrow
   */
  async setupApprovalWorkflow(
    escrowId: string,
    milestoneId: string | undefined,
    requiredApprovals: Omit<ApprovalStep, 'status' | 'approvedAt'>[]
  ): Promise<TransferApprovalWorkflow> {
    try {
      const workflow: TransferApprovalWorkflow = {
        escrowId,
        milestoneId,
        requiredApprovals: requiredApprovals.map(approval => ({
          ...approval,
          status: 'pending',
        })),
        currentStep: 0,
        status: 'pending',
        startedAt: new Date(),
      };

      // Log workflow creation
      await this.logAutomationEvent(escrowId, 'APPROVAL_WORKFLOW_CREATED', {
        milestoneId,
        stepCount: requiredApprovals.length,
        approvers: requiredApprovals.map(a => a.approverRole),
      });

      return workflow;
    } catch (error) {
      throw new EscrowError('Failed to setup approval workflow', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Process approval step
   */
  async processApprovalStep(
    workflowId: string,
    stepNumber: number,
    approverId: string,
    decision: 'approved' | 'rejected',
    notes?: string
  ): Promise<TransferApprovalWorkflow> {
    try {
      // This would typically fetch from a dedicated workflows table
      // For now, we'll simulate the workflow processing

      const workflow: TransferApprovalWorkflow = {
        escrowId: 'example-escrow-id',
        currentStep: stepNumber,
        status: decision === 'approved' ? 'approved' : 'rejected',
        startedAt: new Date(),
        requiredApprovals: [{
          stepNumber,
          approverRole: 'buyer',
          approvalType: 'manual',
          timeoutHours: this.defaultApprovalTimeoutHours,
          status: decision,
          approvedAt: new Date(),
          approverId,
          notes,
        }],
      };

      // Log approval step
      await this.logAutomationEvent(workflow.escrowId, 'APPROVAL_STEP_PROCESSED', {
        workflowId,
        stepNumber,
        approverId,
        decision,
        notes,
      });

      // If all steps approved, trigger next action
      if (workflow.status === 'approved') {
        await this.triggerWorkflowCompletion(workflow);
      }

      return workflow;
    } catch (error) {
      throw new EscrowError('Failed to process approval step', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Process pending automations
   */
  async processPendingAutomations(): Promise<void> {
    try {
      console.log('Processing pending automations...');

      // Process overdue milestones for automatic release
      await this.processOverdueMilestones();

      // Process scheduled transfers
      await this.processScheduledTransfers();

      // Process expired approval workflows
      await this.processExpiredApprovals();

      // Check automation rules
      await this.evaluateAutomationRules();

    } catch (error) {
      console.error('Error processing pending automations:', error);
      throw error;
    }
  }

  /**
   * Get automation metrics
   */
  async getAutomationMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<AutomationMetrics> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || new Date();

      // Get automation events from audit logs
      const { data: automationEvents, error } = await supabase
        .from('escrow_audit_logs')
        .select('*')
        .in('action', [
          'AUTOMATIC_MILESTONE_RELEASE',
          'TRANSFER_SCHEDULED',
          'APPROVAL_WORKFLOW_CREATED',
          'AUTO_TRANSFER_RULE_CREATED'
        ])
        .gte('createdAt', start.toISOString())
        .lte('createdAt', end.toISOString());

      if (error) {
        throw new EscrowError('Failed to fetch automation metrics', 'DB_ERROR', 500, error);
      }

      const events = automationEvents || [];
      const automatedTransfers = events.filter(e => e.action === 'AUTOMATIC_MILESTONE_RELEASE').length;
      const scheduledTransfers = events.filter(e => e.action === 'TRANSFER_SCHEDULED').length;

      // Get total escrows in period
      const { data: escrows } = await supabase
        .from('escrow_transactions')
        .select('id')
        .gte('createdAt', start.toISOString())
        .lte('createdAt', end.toISOString());

      const totalEscrows = escrows?.length || 0;

      const metrics: AutomationMetrics = {
        totalEscrows,
        automatedTransfers,
        automationRate: totalEscrows > 0 ? (automatedTransfers / totalEscrows) * 100 : 0,
        averageProcessingTime: 0, // Would calculate from actual processing times
        failureRate: 0, // Would calculate from failed automation attempts
        scheduledTransfers,
        completedTransfers: automatedTransfers,
      };

      return metrics;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to get automation metrics', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Cancel scheduled transfer
   */
  async cancelScheduledTransfer(
    scheduledTransferId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<void> {
    try {
      // This would typically update a dedicated scheduled_transfers table
      await this.logAutomationEvent('unknown', 'SCHEDULED_TRANSFER_CANCELLED', {
        scheduledTransferId,
        cancelledBy,
        reason: reason || 'No reason provided',
        cancelledAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new EscrowError('Failed to cancel scheduled transfer', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Process overdue milestones
   */
  private async processOverdueMilestones(): Promise<void> {
    try {
      // Get approved milestones that are past the auto-release timeout
      const timeoutDate = new Date();
      timeoutDate.setHours(timeoutDate.getHours() - this.defaultApprovalTimeoutHours);

      const { data: overdueMilestones, error } = await supabase
        .from('escrow_milestones')
        .select('*')
        .eq('status', 'approved')
        .lt('approvedAt', timeoutDate.toISOString());

      if (error) {
        console.error('Failed to fetch overdue milestones:', error);
        return;
      }

      for (const milestone of overdueMilestones || []) {
        try {
          await this.processAutomaticMilestoneRelease(milestone.id);
        } catch (error) {
          console.error(`Failed to auto-release milestone ${milestone.id}:`, error);
          // Continue with other milestones
        }
      }
    } catch (error) {
      console.error('Error processing overdue milestones:', error);
    }
  }

  /**
   * Process scheduled transfers
   */
  private async processScheduledTransfers(): Promise<void> {
    try {
      const now = new Date();
      
      // This would typically query a dedicated scheduled_transfers table
      // For now, we'll simulate processing scheduled transfers
      console.log('Processing scheduled transfers for:', now.toISOString());
    } catch (error) {
      console.error('Error processing scheduled transfers:', error);
    }
  }

  /**
   * Process expired approval workflows
   */
  private async processExpiredApprovals(): Promise<void> {
    try {
      // This would typically check for workflows with expired timeouts
      console.log('Processing expired approval workflows...');
    } catch (error) {
      console.error('Error processing expired approvals:', error);
    }
  }

  /**
   * Evaluate automation rules
   */
  private async evaluateAutomationRules(): Promise<void> {
    try {
      // This would typically evaluate active automation rules
      console.log('Evaluating automation rules...');
    } catch (error) {
      console.error('Error evaluating automation rules:', error);
    }
  }

  /**
   * Trigger workflow completion
   */
  private async triggerWorkflowCompletion(workflow: TransferApprovalWorkflow): Promise<void> {
    try {
      if (workflow.milestoneId) {
        await this.processAutomaticMilestoneRelease(workflow.milestoneId, 'workflow_completion');
      }

      await this.logAutomationEvent(workflow.escrowId, 'APPROVAL_WORKFLOW_COMPLETED', {
        milestoneId: workflow.milestoneId,
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to trigger workflow completion:', error);
    }
  }

  /**
   * Validate transfer rule
   */
  private validateTransferRule(rule: Omit<AutoTransferRule, 'id' | 'createdAt' | 'lastExecuted' | 'executionCount'>): void {
    if (!rule.conditions || rule.conditions.length === 0) {
      throw new EscrowError('Transfer rule must have at least one condition', 'VALIDATION_ERROR', 400);
    }

    if (!rule.actions || rule.actions.length === 0) {
      throw new EscrowError('Transfer rule must have at least one action', 'VALIDATION_ERROR', 400);
    }

    // Validate condition types
    const validConditionTypes = ['time_elapsed', 'milestone_completed', 'approval_received', 'dispute_resolved', 'document_uploaded'];
    for (const condition of rule.conditions) {
      if (!validConditionTypes.includes(condition.type)) {
        throw new EscrowError(`Invalid condition type: ${condition.type}`, 'VALIDATION_ERROR', 400);
      }
    }

    // Validate action types
    const validActionTypes = ['release_funds', 'send_notification', 'update_status', 'create_task', 'schedule_review'];
    for (const action of rule.actions) {
      if (!validActionTypes.includes(action.type)) {
        throw new EscrowError(`Invalid action type: ${action.type}`, 'VALIDATION_ERROR', 400);
      }
    }
  }

  /**
   * Log automation event
   */
  private async logAutomationEvent(
    escrowId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId,
          userId: 'system_automation',
          action,
          details,
          createdAt: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log automation event:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }
}

// Export singleton instance
export const transferAutomationService = new TransferAutomationService();
export default TransferAutomationService;