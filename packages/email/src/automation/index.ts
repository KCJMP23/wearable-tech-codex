export { AutomationEngine } from './engine';
export { TriggerFactory, BaseTrigger, type TriggerContext } from './triggers';
export { ActionFactory, BaseAction, type ActionContext, type ActionResult } from './actions';

// Export pre-built automation templates
export const AUTOMATION_TEMPLATES = {
  welcome_series: {
    name: 'Welcome Email Series',
    description: 'A 3-email welcome sequence for new subscribers',
    trigger: {
      type: 'user_signup',
      conditions: {
        event: 'user_signup',
        source: 'any',
      },
    },
    actions: [
      {
        type: 'send_email',
        config: {
          templateId: 'welcome_email_1',
          subject: 'Welcome to {{companyName}}, {{firstName}}!',
        },
      },
      {
        type: 'wait',
        config: {
          amount: 3,
          unit: 'days',
        },
      },
      {
        type: 'send_email',
        config: {
          templateId: 'welcome_email_2',
          subject: 'Getting started with {{companyName}}',
        },
      },
      {
        type: 'wait',
        config: {
          amount: 7,
          unit: 'days',
        },
      },
      {
        type: 'send_email',
        config: {
          templateId: 'welcome_email_3',
          subject: 'Your first week with {{companyName}}',
        },
      },
    ],
  },

  abandoned_cart: {
    name: 'Abandoned Cart Recovery',
    description: 'Recover abandoned carts with a 3-email sequence',
    trigger: {
      type: 'cart_abandonment',
      conditions: {
        event: 'cart_abandoned',
        minCartValue: 10,
        minAbandonTimeMinutes: 60,
      },
    },
    actions: [
      {
        type: 'send_email',
        config: {
          templateId: 'abandoned_cart_1',
          subject: 'You left something in your cart!',
        },
      },
      {
        type: 'wait',
        config: {
          amount: 24,
          unit: 'hours',
        },
      },
      {
        type: 'send_email',
        config: {
          templateId: 'abandoned_cart_2',
          subject: 'Still thinking about your purchase?',
        },
      },
      {
        type: 'wait',
        config: {
          amount: 3,
          unit: 'days',
        },
      },
      {
        type: 'send_email',
        config: {
          templateId: 'abandoned_cart_3',
          subject: 'Last chance - 10% off your cart',
        },
      },
    ],
  },

  product_recommendation: {
    name: 'Product Recommendation',
    description: 'Send personalized product recommendations based on purchase history',
    trigger: {
      type: 'product_purchase',
      conditions: {
        event: 'product_purchase',
        minAmount: 50,
      },
    },
    actions: [
      {
        type: 'wait',
        config: {
          amount: 7,
          unit: 'days',
        },
      },
      {
        type: 'send_email',
        config: {
          templateId: 'product_recommendation',
          subject: 'You might also like these products',
        },
      },
    ],
  },

  reengagement: {
    name: 'Re-engagement Campaign',
    description: 'Win back inactive subscribers',
    trigger: {
      type: 'user_inactive',
      conditions: {
        inactiveDays: 30,
      },
    },
    actions: [
      {
        type: 'send_email',
        config: {
          templateId: 'reengagement_1',
          subject: 'We miss you, {{firstName}}!',
        },
      },
      {
        type: 'wait',
        config: {
          amount: 7,
          unit: 'days',
        },
      },
      {
        type: 'condition',
        config: {
          conditions: [
            {
              field: 'last_active_at',
              operator: 'greater_than',
              value: '7 days ago',
            },
          ],
        },
      },
      {
        type: 'send_email',
        config: {
          templateId: 'reengagement_2',
          subject: 'Last chance to stay subscribed',
        },
      },
      {
        type: 'wait',
        config: {
          amount: 14,
          unit: 'days',
        },
      },
      {
        type: 'condition',
        config: {
          conditions: [
            {
              field: 'last_active_at',
              operator: 'greater_than',
              value: '14 days ago',
            },
          ],
        },
      },
      {
        type: 'remove_from_list',
        config: {
          listId: 'main_list',
        },
      },
      {
        type: 'add_tag',
        config: {
          tag: 'inactive_unsubscribed',
        },
      },
    ],
  },

  birthday: {
    name: 'Birthday Campaign',
    description: 'Send birthday wishes and special offers',
    trigger: {
      type: 'birthday',
      conditions: {
        event: 'birthday',
      },
    },
    actions: [
      {
        type: 'send_email',
        config: {
          templateId: 'birthday_email',
          subject: 'Happy Birthday, {{firstName}}! 🎉',
        },
      },
      {
        type: 'add_tag',
        config: {
          tag: 'birthday_email_sent',
        },
      },
    ],
  },

  post_purchase: {
    name: 'Post-Purchase Follow-up',
    description: 'Follow up after purchase with useful information',
    trigger: {
      type: 'product_purchase',
      conditions: {
        event: 'product_purchase',
      },
    },
    actions: [
      {
        type: 'send_email',
        config: {
          templateId: 'purchase_confirmation',
          subject: 'Thanks for your purchase!',
        },
      },
      {
        type: 'wait',
        config: {
          amount: 3,
          unit: 'days',
        },
      },
      {
        type: 'send_email',
        config: {
          templateId: 'product_tips',
          subject: 'Getting the most out of your purchase',
        },
      },
      {
        type: 'wait',
        config: {
          amount: 14,
          unit: 'days',
        },
      },
      {
        type: 'send_email',
        config: {
          templateId: 'review_request',
          subject: 'How was your experience?',
        },
      },
    ],
  },
};