import { AutomationAction } from '../types';
import { EmailService } from '../email-service';

export interface ActionContext {
  tenantId: string;
  subscriberId: string;
  automationId: string;
  executionId: string;
  triggerData?: Record<string, any>;
  emailService?: EmailService;
}

export abstract class BaseAction {
  abstract type: string;
  abstract execute(context: ActionContext, config: Record<string, any>): Promise<ActionResult>;
  abstract getDefaultConfig(): Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: Record<string, any>;
  nextActionDelay?: number; // minutes to wait before next action
}

export class SendEmailAction extends BaseAction {
  type = 'send_email';

  async execute(context: ActionContext, config: Record<string, any>): Promise<ActionResult> {
    try {
      if (!context.emailService) {
        throw new Error('Email service not available');
      }

      const { templateId, subject, customContent } = config;
      
      // Get subscriber details
      const subscriber = await this.getSubscriber(context.subscriberId);
      if (!subscriber) {
        throw new Error('Subscriber not found');
      }

      let htmlContent: string;
      let textContent: string;

      if (templateId) {
        // Use template
        const template = await this.getTemplate(templateId);
        if (!template) {
          throw new Error('Template not found');
        }
        htmlContent = this.personalizeContent(template.html_content, subscriber, context.triggerData);
        textContent = template.text_content ? this.personalizeContent(template.text_content, subscriber, context.triggerData) : '';
      } else if (customContent) {
        // Use custom content
        htmlContent = this.personalizeContent(customContent.html, subscriber, context.triggerData);
        textContent = customContent.text ? this.personalizeContent(customContent.text, subscriber, context.triggerData) : '';
      } else {
        throw new Error('No template or custom content provided');
      }

      const personalizedSubject = this.personalizeContent(subject, subscriber, context.triggerData);

      const result = await context.emailService.sendEmail({
        to: subscriber.email,
        subject: personalizedSubject,
        html: htmlContent,
        text: textContent,
        metadata: {
          automationId: context.automationId,
          executionId: context.executionId,
          subscriberId: context.subscriberId,
          tenantId: context.tenantId,
        },
      });

      return {
        success: result.success,
        error: result.error,
        data: {
          messageId: result.messageId,
          email: subscriber.email,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getDefaultConfig(): Record<string, any> {
    return {
      templateId: null,
      subject: 'Hello {{firstName}}',
      customContent: null,
    };
  }

  private async getSubscriber(subscriberId: string): Promise<any> {
    // This would fetch from the database
    // Implementation depends on your database client
    return null;
  }

  private async getTemplate(templateId: string): Promise<any> {
    // This would fetch from the database
    return null;
  }

  private personalizeContent(content: string, subscriber: any, triggerData?: any): string {
    let personalized = content
      .replace(/\{\{firstName\}\}/g, subscriber.first_name || '')
      .replace(/\{\{lastName\}\}/g, subscriber.last_name || '')
      .replace(/\{\{email\}\}/g, subscriber.email || '')
      .replace(/\{\{name\}\}/g, subscriber.first_name || subscriber.email || 'there');

    // Add trigger data personalization
    if (triggerData) {
      Object.entries(triggerData).forEach(([key, value]) => {
        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        personalized = personalized.replace(placeholder, String(value));
      });
    }

    return personalized;
  }
}

export class AddToListAction extends BaseAction {
  type = 'add_to_list';

  async execute(context: ActionContext, config: Record<string, any>): Promise<ActionResult> {
    try {
      const { listId } = config;
      
      if (!listId) {
        throw new Error('List ID is required');
      }

      // Add subscriber to list
      await this.addSubscriberToList(context.subscriberId, listId);

      return {
        success: true,
        data: {
          listId,
          subscriberId: context.subscriberId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getDefaultConfig(): Record<string, any> {
    return {
      listId: null,
    };
  }

  private async addSubscriberToList(subscriberId: string, listId: string): Promise<void> {
    // Implementation would insert into email_list_subscribers table
  }
}

export class RemoveFromListAction extends BaseAction {
  type = 'remove_from_list';

  async execute(context: ActionContext, config: Record<string, any>): Promise<ActionResult> {
    try {
      const { listId } = config;
      
      if (!listId) {
        throw new Error('List ID is required');
      }

      // Remove subscriber from list
      await this.removeSubscriberFromList(context.subscriberId, listId);

      return {
        success: true,
        data: {
          listId,
          subscriberId: context.subscriberId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getDefaultConfig(): Record<string, any> {
    return {
      listId: null,
    };
  }

  private async removeSubscriberFromList(subscriberId: string, listId: string): Promise<void> {
    // Implementation would update email_list_subscribers table
  }
}

export class AddTagAction extends BaseAction {
  type = 'add_tag';

  async execute(context: ActionContext, config: Record<string, any>): Promise<ActionResult> {
    try {
      const { tag } = config;
      
      if (!tag) {
        throw new Error('Tag is required');
      }

      // Add tag to subscriber
      await this.addTagToSubscriber(context.subscriberId, tag);

      return {
        success: true,
        data: {
          tag,
          subscriberId: context.subscriberId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getDefaultConfig(): Record<string, any> {
    return {
      tag: '',
    };
  }

  private async addTagToSubscriber(subscriberId: string, tag: string): Promise<void> {
    // Implementation would update subscriber's tags array
  }
}

export class RemoveTagAction extends BaseAction {
  type = 'remove_tag';

  async execute(context: ActionContext, config: Record<string, any>): Promise<ActionResult> {
    try {
      const { tag } = config;
      
      if (!tag) {
        throw new Error('Tag is required');
      }

      // Remove tag from subscriber
      await this.removeTagFromSubscriber(context.subscriberId, tag);

      return {
        success: true,
        data: {
          tag,
          subscriberId: context.subscriberId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getDefaultConfig(): Record<string, any> {
    return {
      tag: '',
    };
  }

  private async removeTagFromSubscriber(subscriberId: string, tag: string): Promise<void> {
    // Implementation would update subscriber's tags array
  }
}

export class UpdateFieldAction extends BaseAction {
  type = 'update_field';

  async execute(context: ActionContext, config: Record<string, any>): Promise<ActionResult> {
    try {
      const { field, value } = config;
      
      if (!field) {
        throw new Error('Field name is required');
      }

      // Update subscriber field
      await this.updateSubscriberField(context.subscriberId, field, value);

      return {
        success: true,
        data: {
          field,
          value,
          subscriberId: context.subscriberId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getDefaultConfig(): Record<string, any> {
    return {
      field: '',
      value: '',
    };
  }

  private async updateSubscriberField(subscriberId: string, field: string, value: any): Promise<void> {
    // Implementation would update subscriber's custom_fields
  }
}

export class WaitAction extends BaseAction {
  type = 'wait';

  async execute(context: ActionContext, config: Record<string, any>): Promise<ActionResult> {
    const { amount, unit } = config;
    
    if (!amount || !unit) {
      return {
        success: false,
        error: 'Wait amount and unit are required',
      };
    }

    // Convert to minutes
    const multiplier = {
      minutes: 1,
      hours: 60,
      days: 60 * 24,
      weeks: 60 * 24 * 7,
    }[unit];

    if (!multiplier) {
      return {
        success: false,
        error: 'Invalid time unit',
      };
    }

    const delayMinutes = amount * multiplier;

    return {
      success: true,
      nextActionDelay: delayMinutes,
      data: {
        delayMinutes,
        amount,
        unit,
      },
    };
  }

  getDefaultConfig(): Record<string, any> {
    return {
      amount: 1,
      unit: 'hours',
    };
  }
}

export class ConditionAction extends BaseAction {
  type = 'condition';

  async execute(context: ActionContext, config: Record<string, any>): Promise<ActionResult> {
    try {
      const { conditions, operator = 'AND' } = config;
      
      if (!conditions || !Array.isArray(conditions)) {
        throw new Error('Conditions array is required');
      }

      // Evaluate conditions
      const results = await Promise.all(
        conditions.map(condition => this.evaluateCondition(context, condition))
      );

      let conditionMet: boolean;
      if (operator === 'OR') {
        conditionMet = results.some(result => result);
      } else {
        conditionMet = results.every(result => result);
      }

      return {
        success: true,
        data: {
          conditionMet,
          conditions,
          operator,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getDefaultConfig(): Record<string, any> {
    return {
      conditions: [],
      operator: 'AND',
    };
  }

  private async evaluateCondition(context: ActionContext, condition: any): Promise<boolean> {
    const { field, operator, value } = condition;
    
    // Get subscriber data
    const subscriber = await this.getSubscriberData(context.subscriberId);
    if (!subscriber) return false;

    const fieldValue = this.getFieldValue(subscriber, field);

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'not_contains':
        return !String(fieldValue).includes(String(value));
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'is_null':
        return fieldValue == null;
      case 'is_not_null':
        return fieldValue != null;
      default:
        return false;
    }
  }

  private async getSubscriberData(subscriberId: string): Promise<any> {
    // Fetch subscriber data from database
    return null;
  }

  private getFieldValue(subscriber: any, field: string): any {
    // Navigate nested field paths like 'custom_fields.preference'
    return field.split('.').reduce((obj, key) => obj?.[key], subscriber);
  }
}

// Action factory
export class ActionFactory {
  private static actions = new Map<string, typeof BaseAction>([
    ['send_email', SendEmailAction],
    ['add_to_list', AddToListAction],
    ['remove_from_list', RemoveFromListAction],
    ['add_tag', AddTagAction],
    ['remove_tag', RemoveTagAction],
    ['update_field', UpdateFieldAction],
    ['wait', WaitAction],
    ['condition', ConditionAction],
  ]);

  static create(type: string): BaseAction {
    const ActionClass = this.actions.get(type);
    if (!ActionClass) {
      throw new Error(`Unknown action type: ${type}`);
    }
    return new ActionClass();
  }

  static getSupportedActions(): string[] {
    return Array.from(this.actions.keys());
  }
}