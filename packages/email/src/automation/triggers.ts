import { AutomationTrigger, TriggerType } from '../types';

export interface TriggerContext {
  tenantId: string;
  subscriberId?: string;
  userId?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

export abstract class BaseTrigger {
  abstract type: TriggerType;
  abstract evaluate(context: TriggerContext, conditions: Record<string, any>): Promise<boolean>;
  abstract getDefaultConditions(): Record<string, any>;
}

export class UserSignupTrigger extends BaseTrigger {
  type: TriggerType = 'user_signup';

  async evaluate(context: TriggerContext, conditions: Record<string, any>): Promise<boolean> {
    // Check if this is a new user signup event
    return context.data?.event === 'user_signup';
  }

  getDefaultConditions(): Record<string, any> {
    return {
      event: 'user_signup',
      source: 'any', // website, api, import
    };
  }
}

export class ProductPurchaseTrigger extends BaseTrigger {
  type: TriggerType = 'product_purchase';

  async evaluate(context: TriggerContext, conditions: Record<string, any>): Promise<boolean> {
    if (context.data?.event !== 'product_purchase') return false;

    const purchase = context.data.purchase;
    if (!purchase) return false;

    // Check product conditions
    if (conditions.productIds && conditions.productIds.length > 0) {
      const purchasedProductIds = purchase.items?.map((item: any) => item.productId) || [];
      const hasMatchingProduct = conditions.productIds.some((id: string) => 
        purchasedProductIds.includes(id)
      );
      if (!hasMatchingProduct) return false;
    }

    // Check category conditions
    if (conditions.categories && conditions.categories.length > 0) {
      const purchasedCategories = purchase.items?.map((item: any) => item.category) || [];
      const hasMatchingCategory = conditions.categories.some((category: string) => 
        purchasedCategories.includes(category)
      );
      if (!hasMatchingCategory) return false;
    }

    // Check minimum amount
    if (conditions.minAmount && purchase.total < conditions.minAmount) {
      return false;
    }

    return true;
  }

  getDefaultConditions(): Record<string, any> {
    return {
      event: 'product_purchase',
      productIds: [],
      categories: [],
      minAmount: 0,
    };
  }
}

export class CartAbandonmentTrigger extends BaseTrigger {
  type: TriggerType = 'cart_abandonment';

  async evaluate(context: TriggerContext, conditions: Record<string, any>): Promise<boolean> {
    if (context.data?.event !== 'cart_abandoned') return false;

    const cart = context.data.cart;
    if (!cart) return false;

    // Check minimum cart value
    if (conditions.minCartValue && cart.total < conditions.minCartValue) {
      return false;
    }

    // Check if cart has been abandoned for minimum time
    const abandonedAt = new Date(cart.abandonedAt);
    const minAbandonTime = conditions.minAbandonTimeMinutes || 60;
    const timeDiff = (context.timestamp.getTime() - abandonedAt.getTime()) / (1000 * 60);
    
    if (timeDiff < minAbandonTime) return false;

    return true;
  }

  getDefaultConditions(): Record<string, any> {
    return {
      event: 'cart_abandoned',
      minCartValue: 0,
      minAbandonTimeMinutes: 60,
    };
  }
}

export class UserInactiveTrigger extends BaseTrigger {
  type: TriggerType = 'user_inactive';

  async evaluate(context: TriggerContext, conditions: Record<string, any>): Promise<boolean> {
    if (!context.subscriberId) return false;

    // This would typically be triggered by a scheduled job
    // checking subscriber activity
    const inactiveDays = conditions.inactiveDays || 30;
    const lastActiveAt = context.data?.lastActiveAt;
    
    if (!lastActiveAt) return false;

    const daysSinceActive = Math.floor(
      (context.timestamp.getTime() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceActive >= inactiveDays;
  }

  getDefaultConditions(): Record<string, any> {
    return {
      inactiveDays: 30,
    };
  }
}

export class BirthdayTrigger extends BaseTrigger {
  type: TriggerType = 'birthday';

  async evaluate(context: TriggerContext, conditions: Record<string, any>): Promise<boolean> {
    const birthday = context.data?.birthday;
    if (!birthday) return false;

    const birthdayDate = new Date(birthday);
    const today = new Date(context.timestamp);
    
    // Check if today is the birthday (ignoring year)
    return (
      birthdayDate.getMonth() === today.getMonth() &&
      birthdayDate.getDate() === today.getDate()
    );
  }

  getDefaultConditions(): Record<string, any> {
    return {
      event: 'birthday',
    };
  }
}

export class ProductViewTrigger extends BaseTrigger {
  type: TriggerType = 'product_view';

  async evaluate(context: TriggerContext, conditions: Record<string, any>): Promise<boolean> {
    if (context.data?.event !== 'product_view') return false;

    const productId = context.data.productId;
    const category = context.data.category;

    // Check specific product
    if (conditions.productIds && conditions.productIds.length > 0) {
      if (!conditions.productIds.includes(productId)) return false;
    }

    // Check category
    if (conditions.categories && conditions.categories.length > 0) {
      if (!conditions.categories.includes(category)) return false;
    }

    // Check view count threshold
    if (conditions.minViewCount) {
      const viewCount = context.data.viewCount || 1;
      if (viewCount < conditions.minViewCount) return false;
    }

    return true;
  }

  getDefaultConditions(): Record<string, any> {
    return {
      event: 'product_view',
      productIds: [],
      categories: [],
      minViewCount: 1,
    };
  }
}

export class TimeBasedTrigger extends BaseTrigger {
  type: TriggerType = 'time_based';

  async evaluate(context: TriggerContext, conditions: Record<string, any>): Promise<boolean> {
    // This trigger is typically evaluated by a cron job
    const schedule = conditions.schedule; // cron expression
    const timezone = conditions.timezone || 'UTC';
    
    // In a real implementation, you'd use a cron parser
    // For now, we'll do basic time checks
    const now = new Date(context.timestamp);
    
    if (conditions.dayOfWeek) {
      const dayOfWeek = now.getDay(); // 0 = Sunday
      if (conditions.dayOfWeek !== dayOfWeek) return false;
    }

    if (conditions.hour !== undefined) {
      if (now.getHours() !== conditions.hour) return false;
    }

    return true;
  }

  getDefaultConditions(): Record<string, any> {
    return {
      schedule: '0 9 * * 1', // 9 AM every Monday
      timezone: 'UTC',
    };
  }
}

export class APITrigger extends BaseTrigger {
  type: TriggerType = 'api_trigger';

  async evaluate(context: TriggerContext, conditions: Record<string, any>): Promise<boolean> {
    // API triggers are always valid when called
    // Additional validation can be done based on conditions
    const requiredFields = conditions.requiredFields || [];
    
    for (const field of requiredFields) {
      if (!context.data?.[field]) return false;
    }

    return true;
  }

  getDefaultConditions(): Record<string, any> {
    return {
      requiredFields: [],
    };
  }
}

// Trigger factory
export class TriggerFactory {
  private static triggers = new Map<TriggerType, new () => BaseTrigger>([
    ['user_signup', UserSignupTrigger],
    ['product_purchase', ProductPurchaseTrigger],
    ['cart_abandonment', CartAbandonmentTrigger],
    ['user_inactive', UserInactiveTrigger],
    ['birthday', BirthdayTrigger],
    ['product_view', ProductViewTrigger],
    ['time_based', TimeBasedTrigger],
    ['api_trigger', APITrigger],
  ]);

  static create(type: TriggerType): BaseTrigger {
    const TriggerClass = this.triggers.get(type);
    if (!TriggerClass) {
      throw new Error(`Unknown trigger type: ${type}`);
    }
    return new TriggerClass();
  }

  static getSupportedTriggers(): TriggerType[] {
    return Array.from(this.triggers.keys());
  }
}
