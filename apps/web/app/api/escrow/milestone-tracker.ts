/**
 * Milestone tracker for escrow fund releases
 * Manages milestone completion, approval, and automated fund releases
 */

import { 
  EscrowMilestone, 
  MilestoneStatus,
  EscrowTransaction,
  EscrowError,
  ValidationError 
} from './types';
import { paymentSplitterService } from './payment-splitter';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface MilestoneProgress {
  milestoneId: string;
  title: string;
  progress: number; // 0-100
  estimatedCompletion?: Date;
  blockers?: string[];
  lastUpdate: Date;
}

export interface MilestoneApproval {
  milestoneId: string;
  approvedBy: string;
  approvedAt: Date;
  notes?: string;
  attachments?: string[];
  autoRelease: boolean;
  releaseDate?: Date;
}

export interface MilestoneNotification {
  type: 'milestone_completed' | 'milestone_approved' | 'milestone_due' | 'milestone_overdue';
  milestoneId: string;
  escrowId: string;
  recipients: string[];
  message: string;
  scheduledFor?: Date;
}

export class MilestoneTrackerService {
  private autoReleaseDelayHours: number;
  private overdueNotificationHours: number;

  constructor() {
    this.autoReleaseDelayHours = parseInt(process.env.AUTO_RELEASE_DELAY_HOURS || '72');
    this.overdueNotificationHours = parseInt(process.env.OVERDUE_NOTIFICATION_HOURS || '24');
  }

  /**
   * Create milestones for an escrow transaction
   */
  async createMilestones(
    escrowId: string,
    milestones: Array<{
      title: string;
      description: string;
      amount: number;
      dueDate?: Date;
      requiresApproval?: boolean;
    }>
  ): Promise<EscrowMilestone[]> {
    try {
      // Validate escrow exists and is in correct state
      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new EscrowError('Escrow transaction not found', 'NOT_FOUND', 404);
      }

      if (escrow.status !== 'pending' && escrow.status !== 'funded') {
        throw new ValidationError('Cannot create milestones for escrow in current state');
      }

      // Validate milestone amounts sum to total escrow amount
      const totalMilestoneAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
      if (Math.abs(totalMilestoneAmount - escrow.totalAmount) > 0.01) {
        throw new ValidationError('Milestone amounts must sum to total escrow amount');
      }

      // Create milestones
      const milestoneInserts = milestones.map((milestone, index) => ({
        escrowId,
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount,
        status: 'pending' as MilestoneStatus,
        orderIndex: index,
        dueDate: milestone.dueDate?.toISOString(),
        requiresApproval: milestone.requiresApproval ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('escrow_milestones')
        .insert(milestoneInserts)
        .select();

      if (error) {
        throw new EscrowError('Failed to create milestones', 'DB_ERROR', 500, error);
      }

      // Update escrow status to in_progress
      await supabase
        .from('escrow_transactions')
        .update({ 
          status: 'in_progress',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', escrowId);

      // Log milestone creation
      await this.logMilestoneEvent(escrowId, 'MILESTONES_CREATED', {
        milestoneCount: milestones.length,
        totalAmount: totalMilestoneAmount,
      });

      return data;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to create milestones', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Update milestone progress
   */
  async updateMilestoneProgress(
    milestoneId: string,
    progress: number,
    notes?: string,
    attachments?: string[],
    updatedBy?: string
  ): Promise<EscrowMilestone> {
    try {
      if (progress < 0 || progress > 100) {
        throw new ValidationError('Progress must be between 0 and 100');
      }

      // Get current milestone
      const { data: milestone, error: milestoneError } = await supabase
        .from('escrow_milestones')
        .select('*')
        .eq('id', milestoneId)
        .single();

      if (milestoneError || !milestone) {
        throw new EscrowError('Milestone not found', 'NOT_FOUND', 404);
      }

      if (milestone.status === 'completed' || milestone.status === 'approved') {
        throw new ValidationError('Cannot update progress of completed milestone');
      }

      // Determine new status based on progress
      let newStatus: MilestoneStatus = milestone.status;
      if (progress === 100 && milestone.status !== 'completed') {
        newStatus = 'completed';
      } else if (progress > 0 && milestone.status === 'pending') {
        newStatus = 'in_progress';
      }

      // Update milestone
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      if (notes) updateData.notes = notes;
      if (attachments) updateData.attachments = attachments;
      if (newStatus === 'completed') updateData.completedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('escrow_milestones')
        .update(updateData)
        .eq('id', milestoneId)
        .select()
        .single();

      if (error) {
        throw new EscrowError('Failed to update milestone', 'DB_ERROR', 500, error);
      }

      // Log progress update
      await this.logMilestoneEvent(milestone.escrowId, 'MILESTONE_PROGRESS_UPDATED', {
        milestoneId,
        progress,
        previousStatus: milestone.status,
        newStatus,
        updatedBy,
      });

      // Handle milestone completion
      if (newStatus === 'completed') {
        await this.handleMilestoneCompletion(data);
      }

      return data;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to update milestone progress', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Approve milestone for payment release
   */
  async approveMilestone(
    milestoneId: string,
    approvedBy: string,
    notes?: string,
    autoRelease: boolean = true,
    releaseDelayHours?: number
  ): Promise<MilestoneApproval> {
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

      if (milestone.status !== 'completed') {
        throw new ValidationError('Milestone must be completed before approval');
      }

      // Calculate release date
      const releaseDate = new Date();
      releaseDate.setHours(releaseDate.getHours() + (releaseDelayHours || this.autoReleaseDelayHours));

      // Update milestone to approved
      const { data, error } = await supabase
        .from('escrow_milestones')
        .update({
          status: 'approved',
          approvedAt: new Date().toISOString(),
          notes: notes || milestone.notes,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', milestoneId)
        .select()
        .single();

      if (error) {
        throw new EscrowError('Failed to approve milestone', 'DB_ERROR', 500, error);
      }

      const approval: MilestoneApproval = {
        milestoneId,
        approvedBy,
        approvedAt: new Date(),
        notes,
        autoRelease,
        releaseDate: autoRelease ? releaseDate : undefined,
      };

      // Schedule automatic release if enabled
      if (autoRelease) {
        await this.scheduleAutomaticRelease(milestoneId, releaseDate);
      }

      // Log approval
      await this.logMilestoneEvent(milestone.escrowId, 'MILESTONE_APPROVED', {
        milestoneId,
        approvedBy,
        autoRelease,
        releaseDate: releaseDate.toISOString(),
      });

      return approval;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to approve milestone', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Reject milestone and request changes
   */
  async rejectMilestone(
    milestoneId: string,
    rejectedBy: string,
    reason: string,
    requestedChanges?: string[]
  ): Promise<EscrowMilestone> {
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

      if (milestone.status !== 'completed') {
        throw new ValidationError('Can only reject completed milestones');
      }

      // Update milestone to rejected/in_progress
      const { data, error } = await supabase
        .from('escrow_milestones')
        .update({
          status: 'in_progress',
          notes: `Rejected: ${reason}. ${requestedChanges ? `Changes requested: ${requestedChanges.join(', ')}` : ''}`,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', milestoneId)
        .select()
        .single();

      if (error) {
        throw new EscrowError('Failed to reject milestone', 'DB_ERROR', 500, error);
      }

      // Log rejection
      await this.logMilestoneEvent(milestone.escrowId, 'MILESTONE_REJECTED', {
        milestoneId,
        rejectedBy,
        reason,
        requestedChanges,
      });

      return data;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to reject milestone', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Release funds for approved milestone
   */
  async releaseMilestoneFunds(
    milestoneId: string,
    releasedBy: string,
    force: boolean = false
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

      if (!force && milestone.status !== 'approved') {
        throw new ValidationError('Milestone must be approved before fund release');
      }

      // Process payment split
      const paymentSplit = await paymentSplitterService.processMilestoneSplit(
        milestone.escrowId,
        milestoneId,
        releasedBy
      );

      // Check if all milestones are completed
      const { data: allMilestones } = await supabase
        .from('escrow_milestones')
        .select('*')
        .eq('escrowId', milestone.escrowId);

      const allCompleted = allMilestones?.every(m => 
        m.id === milestoneId || m.status === 'completed'
      );

      // Update escrow status if all milestones are complete
      if (allCompleted) {
        await supabase
          .from('escrow_transactions')
          .update({
            status: 'completed',
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .eq('id', milestone.escrowId);
      }

      // Log fund release
      await this.logMilestoneEvent(milestone.escrowId, 'MILESTONE_FUNDS_RELEASED', {
        milestoneId,
        releasedBy,
        amount: milestone.amount,
        paymentSplit,
        force,
      });

      return paymentSplit;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to release milestone funds', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Get milestones for an escrow with progress tracking
   */
  async getEscrowMilestones(escrowId: string): Promise<EscrowMilestone[]> {
    try {
      const { data, error } = await supabase
        .from('escrow_milestones')
        .select('*')
        .eq('escrowId', escrowId)
        .order('orderIndex');

      if (error) {
        throw new EscrowError('Failed to fetch milestones', 'DB_ERROR', 500, error);
      }

      return data || [];
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to get escrow milestones', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Get overdue milestones
   */
  async getOverdueMilestones(): Promise<EscrowMilestone[]> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('escrow_milestones')
        .select('*')
        .lt('dueDate', now)
        .in('status', ['pending', 'in_progress'])
        .order('dueDate');

      if (error) {
        throw new EscrowError('Failed to fetch overdue milestones', 'DB_ERROR', 500, error);
      }

      return data || [];
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to get overdue milestones', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Process automatic milestone releases
   */
  async processAutomaticReleases(): Promise<void> {
    try {
      // Find milestones ready for automatic release
      const releaseTime = new Date();
      releaseTime.setHours(releaseTime.getHours() - this.autoReleaseDelayHours);

      const { data: readyMilestones, error } = await supabase
        .from('escrow_milestones')
        .select('*')
        .eq('status', 'approved')
        .lt('approvedAt', releaseTime.toISOString());

      if (error) {
        throw new EscrowError('Failed to fetch milestones for auto-release', 'DB_ERROR', 500, error);
      }

      // Process each milestone
      for (const milestone of readyMilestones || []) {
        try {
          await this.releaseMilestoneFunds(milestone.id, 'system_auto_release');
        } catch (error) {
          console.error(`Failed to auto-release milestone ${milestone.id}:`, error);
          // Continue with other milestones
        }
      }
    } catch (error) {
      console.error('Failed to process automatic releases:', error);
      throw error;
    }
  }

  /**
   * Handle milestone completion
   */
  private async handleMilestoneCompletion(milestone: EscrowMilestone): Promise<void> {
    try {
      // Send notification to buyer for approval
      const notification: MilestoneNotification = {
        type: 'milestone_completed',
        milestoneId: milestone.id,
        escrowId: milestone.escrowId,
        recipients: [], // Will be populated with buyer ID
        message: `Milestone "${milestone.title}" has been completed and is ready for review.`,
      };

      // If auto-approval is enabled and milestone doesn't require approval
      if (!milestone.requiresApproval) {
        await this.approveMilestone(milestone.id, 'system_auto_approve');
      }

      // Schedule reminder notifications
      await this.scheduleReminderNotifications(milestone);
    } catch (error) {
      console.error('Failed to handle milestone completion:', error);
      // Don't throw - this shouldn't break the main flow
    }
  }

  /**
   * Schedule automatic release
   */
  private async scheduleAutomaticRelease(
    milestoneId: string,
    releaseDate: Date
  ): Promise<void> {
    // This would typically integrate with a job queue system
    // For now, we'll just log the scheduled release
    console.log(`Scheduled automatic release for milestone ${milestoneId} at ${releaseDate}`);
  }

  /**
   * Schedule reminder notifications
   */
  private async scheduleReminderNotifications(milestone: EscrowMilestone): Promise<void> {
    // This would typically integrate with a notification system
    console.log(`Scheduled reminder notifications for milestone ${milestone.id}`);
  }

  /**
   * Log milestone event
   */
  private async logMilestoneEvent(
    escrowId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId,
          userId: details.updatedBy || details.approvedBy || details.rejectedBy || details.releasedBy || 'system',
          action,
          details,
          createdAt: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log milestone event:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }
}

// Export singleton instance
export const milestoneTrackerService = new MilestoneTrackerService();
export default MilestoneTrackerService;