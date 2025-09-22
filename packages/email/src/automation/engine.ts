import { createClient } from '@supabase/supabase-js';
import { Automation, AutomationAction, AutomationTrigger } from '../types';
import { TriggerFactory, TriggerContext } from './triggers';
import { ActionFactory, ActionContext, ActionResult } from './actions';
import { EmailService } from '../email-service';

export class AutomationEngine {
  private supabase;
  private emailService?: EmailService;

  constructor(emailService?: EmailService) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.emailService = emailService;
  }

  async processTrigger(
    tenantId: string,
    triggerType: string,
    context: TriggerContext
  ): Promise<void> {
    try {
      // Find active automations with matching trigger
      const { data: automations, error } = await this.supabase
        .from('email_automations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .contains('trigger_config', { type: triggerType });

      if (error) {
        console.error('Error fetching automations:', error);
        return;
      }

      if (!automations || automations.length === 0) {
        return;
      }

      // Process each matching automation
      for (const automation of automations) {
        await this.evaluateAutomation(automation, context);
      }
    } catch (error) {
      console.error('Error processing trigger:', error);
    }
  }

  private async evaluateAutomation(
    automation: any,
    context: TriggerContext
  ): Promise<void> {
    try {
      const trigger = TriggerFactory.create(automation.trigger_config.type);
      const shouldTrigger = await trigger.evaluate(context, automation.trigger_config.conditions);

      if (!shouldTrigger) {
        return;
      }

      if (!context.subscriberId) {
        console.warn('Cannot evaluate automation without subscriberId');
        return;
      }

      // Check if subscriber is already in this automation
      const existingExecution = await this.getActiveExecution(automation.id, context.subscriberId);
      if (existingExecution) {
        return; // Don't trigger again if already active
      }

      // Create new automation execution
      const executionId = await this.createAutomationExecution(
        automation.id,
        context.subscriberId,
        context.data
      );

      // Start executing actions
      await this.executeAutomationActions(automation, executionId, context);
    } catch (error) {
      console.error('Error evaluating automation:', error);
    }
  }

  private async getActiveExecution(automationId: string, subscriberId: string): Promise<any> {
    const { data } = await this.supabase
      .from('email_automation_executions')
      .select('*')
      .eq('automation_id', automationId)
      .eq('subscriber_id', subscriberId)
      .eq('status', 'active')
      .single();

    return data;
  }

  private async createAutomationExecution(
    automationId: string,
    subscriberId: string,
    triggerData?: any
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('email_automation_executions')
      .insert({
        automation_id: automationId,
        subscriber_id: subscriberId,
        trigger_data: triggerData,
        status: 'active',
        current_step: 0,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create automation execution: ${error.message}`);
    }

    return data.id;
  }

  private async executeAutomationActions(
    automation: any,
    executionId: string,
    triggerContext: TriggerContext
  ): Promise<void> {
    const actions: AutomationAction[] = automation.actions;
    const context: ActionContext = {
      tenantId: automation.tenant_id,
      subscriberId: triggerContext.subscriberId!,
      automationId: automation.id,
      executionId,
      triggerData: triggerContext.data,
      emailService: this.emailService,
    };

    let currentStep = 0;

    for (const actionConfig of actions) {
      try {
        // Apply delay if specified
        if (actionConfig.delay) {
          const delayMinutes = this.calculateDelay(actionConfig.delay);
          const nextActionAt = new Date(Date.now() + delayMinutes * 60 * 1000);
          
          // Schedule next action
          await this.scheduleNextAction(executionId, currentStep + 1, nextActionAt);
          return; // Exit - will be resumed by scheduler
        }

        // Execute action
        const action = ActionFactory.create(actionConfig.type);
        const result = await action.execute(context, actionConfig.config);

        // Log action result
        await this.logActionResult(executionId, currentStep, actionConfig.type, result);

        if (!result.success) {
          // Handle action failure
          await this.handleActionFailure(executionId, currentStep, result.error);
          return;
        }

        // Handle wait action
        if (result.nextActionDelay) {
          const nextActionAt = new Date(Date.now() + result.nextActionDelay * 60 * 1000);
          await this.scheduleNextAction(executionId, currentStep + 1, nextActionAt);
          return;
        }

        // Handle condition action
        if (actionConfig.type === 'condition' && result.data?.conditionMet === false) {
          // Skip remaining actions if condition not met
          await this.completeAutomationExecution(executionId);
          return;
        }

        currentStep++;
      } catch (error) {
        await this.handleActionFailure(
          executionId,
          currentStep,
          error instanceof Error ? error.message : 'Unknown error'
        );
        return;
      }
    }

    // All actions completed
    await this.completeAutomationExecution(executionId);
  }

  private calculateDelay(delay: { amount: number; unit: string }): number {
    const multiplier = {
      minutes: 1,
      hours: 60,
      days: 60 * 24,
      weeks: 60 * 24 * 7,
    }[delay.unit] || 1;

    return delay.amount * multiplier;
  }

  private async scheduleNextAction(
    executionId: string,
    nextStep: number,
    nextActionAt: Date
  ): Promise<void> {
    await this.supabase
      .from('email_automation_executions')
      .update({
        current_step: nextStep,
        next_action_at: nextActionAt.toISOString(),
      })
      .eq('id', executionId);
  }

  private async logActionResult(
    executionId: string,
    step: number,
    actionType: string,
    result: ActionResult
  ): Promise<void> {
    // Log to automation execution metadata
    const { data: execution } = await this.supabase
      .from('email_automation_executions')
      .select('metadata')
      .eq('id', executionId)
      .single();

    const metadata = execution?.metadata || {};
    const actionLogs = metadata.actionLogs || [];
    
    actionLogs.push({
      step,
      actionType,
      success: result.success,
      error: result.error,
      data: result.data,
      timestamp: new Date().toISOString(),
    });

    await this.supabase
      .from('email_automation_executions')
      .update({
        metadata: { ...metadata, actionLogs },
      })
      .eq('id', executionId);
  }

  private async handleActionFailure(
    executionId: string,
    step: number,
    error?: string
  ): Promise<void> {
    await this.supabase
      .from('email_automation_executions')
      .update({
        status: 'failed',
        current_step: step,
        metadata: {
          error,
          failedAt: new Date().toISOString(),
        },
      })
      .eq('id', executionId);
  }

  private async completeAutomationExecution(executionId: string): Promise<void> {
    await this.supabase
      .from('email_automation_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId);
  }

  async processScheduledActions(): Promise<void> {
    try {
      // Get executions that are ready for next action
      const { data: executions, error } = await this.supabase
        .from('email_automation_executions')
        .select(`
          *,
          email_automations(*)
        `)
        .eq('status', 'active')
        .not('next_action_at', 'is', null)
        .lte('next_action_at', new Date().toISOString());

      if (error) {
        console.error('Error fetching scheduled executions:', error);
        return;
      }

      if (!executions || executions.length === 0) {
        return;
      }

      // Process each execution
      for (const execution of executions) {
        try {
          // Clear next_action_at to prevent duplicate processing
          await this.supabase
            .from('email_automation_executions')
            .update({ next_action_at: null })
            .eq('id', execution.id);

          const automation = execution.email_automations;
          const triggerContext: TriggerContext = {
            tenantId: automation.tenant_id,
            subscriberId: execution.subscriber_id,
            data: execution.trigger_data,
            timestamp: new Date(),
          };

          // Resume from current step
          await this.resumeAutomationExecution(automation, execution, triggerContext);
        } catch (error) {
          console.error('Error processing scheduled execution:', error);
        }
      }
    } catch (error) {
      console.error('Error processing scheduled actions:', error);
    }
  }

  private async resumeAutomationExecution(
    automation: any,
    execution: any,
    triggerContext: TriggerContext
  ): Promise<void> {
    const actions: AutomationAction[] = automation.actions;
    const startStep = execution.current_step;

    const context: ActionContext = {
      tenantId: automation.tenant_id,
      subscriberId: execution.subscriber_id,
      automationId: automation.id,
      executionId: execution.id,
      triggerData: triggerContext.data,
      emailService: this.emailService,
    };

    // Continue from current step
    for (let i = startStep; i < actions.length; i++) {
      const actionConfig = actions[i];

      try {
        // Execute action
        const action = ActionFactory.create(actionConfig.type);
        const result = await action.execute(context, actionConfig.config);

        // Log action result
        await this.logActionResult(execution.id, i, actionConfig.type, result);

        if (!result.success) {
          await this.handleActionFailure(execution.id, i, result.error);
          return;
        }

        // Handle wait action
        if (result.nextActionDelay) {
          const nextActionAt = new Date(Date.now() + result.nextActionDelay * 60 * 1000);
          await this.scheduleNextAction(execution.id, i + 1, nextActionAt);
          return;
        }

        // Handle condition action
        if (actionConfig.type === 'condition' && result.data?.conditionMet === false) {
          await this.completeAutomationExecution(execution.id);
          return;
        }

        // Update current step
        await this.supabase
          .from('email_automation_executions')
          .update({ current_step: i + 1 })
          .eq('id', execution.id);
      } catch (error) {
        await this.handleActionFailure(
          execution.id,
          i,
          error instanceof Error ? error.message : 'Unknown error'
        );
        return;
      }
    }

    // All actions completed
    await this.completeAutomationExecution(execution.id);
  }

  async getAutomationStats(automationId: string): Promise<{
    totalExecutions: number;
    activeExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    conversionRate: number;
  }> {
    const { data: stats } = await this.supabase
      .from('email_automation_executions')
      .select('status')
      .eq('automation_id', automationId);

    if (!stats) {
      return {
        totalExecutions: 0,
        activeExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        conversionRate: 0,
      };
    }

    const totalExecutions = stats.length;
    const activeExecutions = stats.filter(s => s.status === 'active').length;
    const completedExecutions = stats.filter(s => s.status === 'completed').length;
    const failedExecutions = stats.filter(s => s.status === 'failed').length;
    const conversionRate = totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0;

    return {
      totalExecutions,
      activeExecutions,
      completedExecutions,
      failedExecutions,
      conversionRate,
    };
  }
}
