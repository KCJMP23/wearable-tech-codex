import { z } from 'zod';

// Email Provider Types
export type EmailProvider = 'sendgrid' | 'mailgun' | 'ses' | 'smtp';

export const EmailConfigSchema = z.object({
  provider: z.enum(['sendgrid', 'mailgun', 'ses', 'smtp']),
  apiKey: z.string().optional(),
  domain: z.string().optional(),
  region: z.string().optional(),
  fromEmail: z.string().email(),
  fromName: z.string(),
  replyTo: z.string().email().optional(),
  trackOpens: z.boolean().default(true),
  trackClicks: z.boolean().default(true),
  unsubscribeUrl: z.string().url().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
});

export type EmailConfig = z.infer<typeof EmailConfigSchema>;

// Email Message Types
export const EmailMessageSchema = z.object({
  to: z.array(z.string().email()).or(z.string().email()),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string(),
  html: z.string(),
  text: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // base64 encoded
    contentType: z.string(),
  })).optional(),
  headers: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type EmailMessage = z.infer<typeof EmailMessageSchema>;

// Email Status Types
export type EmailStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'sending' 
  | 'sent' 
  | 'delivered' 
  | 'opened' 
  | 'clicked' 
  | 'bounced' 
  | 'complained' 
  | 'unsubscribed' 
  | 'failed';

// Campaign Types
export type CampaignType = 
  | 'newsletter' 
  | 'promotional' 
  | 'transactional' 
  | 'welcome' 
  | 'abandoned_cart' 
  | 'product_recommendation' 
  | 'reengagement' 
  | 'birthday' 
  | 'seasonal';

export const CampaignSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  type: z.enum(['newsletter', 'promotional', 'transactional', 'welcome', 'abandoned_cart', 'product_recommendation', 'reengagement', 'birthday', 'seasonal']),
  subject: z.string(),
  preheader: z.string().optional(),
  fromName: z.string(),
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional(),
  htmlContent: z.string(),
  textContent: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']),
  scheduledAt: z.date().optional(),
  sentAt: z.date().optional(),
  listIds: z.array(z.string().uuid()),
  segmentIds: z.array(z.string().uuid()).optional(),
  abTestConfig: z.object({
    enabled: z.boolean(),
    testPercentage: z.number().min(0).max(100),
    variants: z.array(z.object({
      name: z.string(),
      subject: z.string(),
      htmlContent: z.string(),
      percentage: z.number().min(0).max(100),
    })),
  }).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type Campaign = z.infer<typeof CampaignSchema>;

// Automation Types
export type TriggerType = 
  | 'user_signup' 
  | 'product_purchase' 
  | 'cart_abandonment' 
  | 'user_inactive' 
  | 'birthday' 
  | 'anniversary' 
  | 'product_view' 
  | 'category_interest'
  | 'time_based'
  | 'api_trigger';

export const AutomationTriggerSchema = z.object({
  type: z.enum(['user_signup', 'product_purchase', 'cart_abandonment', 'user_inactive', 'birthday', 'anniversary', 'product_view', 'category_interest', 'time_based', 'api_trigger']),
  conditions: z.record(z.any()),
  delay: z.object({
    amount: z.number(),
    unit: z.enum(['minutes', 'hours', 'days', 'weeks']),
  }).optional(),
});

export const AutomationActionSchema = z.object({
  type: z.enum(['send_email', 'add_to_list', 'remove_from_list', 'add_tag', 'remove_tag', 'update_field', 'wait', 'condition']),
  config: z.record(z.any()),
  delay: z.object({
    amount: z.number(),
    unit: z.enum(['minutes', 'hours', 'days', 'weeks']),
  }).optional(),
});

export const AutomationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().default(false),
  trigger: AutomationTriggerSchema,
  actions: z.array(AutomationActionSchema),
  tags: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Automation = z.infer<typeof AutomationSchema>;
export type AutomationTrigger = z.infer<typeof AutomationTriggerSchema>;
export type AutomationAction = z.infer<typeof AutomationActionSchema>;

// Segmentation Types
export type SegmentOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'is_null' | 'is_not_null';

export const SegmentConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'in', 'not_in', 'is_null', 'is_not_null']),
  value: z.any(),
  logicalOperator: z.enum(['AND', 'OR']).optional(),
});

export const SegmentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  conditions: z.array(SegmentConditionSchema),
  isActive: z.boolean().default(true),
  subscriberCount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Segment = z.infer<typeof SegmentSchema>;
export type SegmentCondition = z.infer<typeof SegmentConditionSchema>;

// Subscriber Types
export type SubscriberStatus = 'active' | 'unsubscribed' | 'bounced' | 'complained' | 'pending';

export const SubscriberSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: z.enum(['active', 'unsubscribed', 'bounced', 'complained', 'pending']),
  source: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  lastActiveAt: z.date().optional(),
  subscribedAt: z.date(),
  unsubscribedAt: z.date().optional(),
  bounceCount: z.number().default(0),
  complaintCount: z.number().default(0),
});

export type Subscriber = z.infer<typeof SubscriberSchema>;

// Analytics Types
export const EmailAnalyticsSchema = z.object({
  campaignId: z.string().uuid().optional(),
  automationId: z.string().uuid().optional(),
  subscriberId: z.string().uuid(),
  event: z.enum(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed']),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  location: z.object({
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
  url: z.string().url().optional(),
  messageId: z.string().optional(),
});

export type EmailAnalytics = z.infer<typeof EmailAnalyticsSchema>;

// Template Types
export const TemplateSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['newsletter', 'promotional', 'transactional', 'welcome', 'abandoned_cart', 'product_recommendation', 'reengagement', 'birthday', 'seasonal']),
  subject: z.string(),
  preheader: z.string().optional(),
  htmlContent: z.string(),
  textContent: z.string().optional(),
  thumbnail: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Template = z.infer<typeof TemplateSchema>;

// List Types
export const EmailListSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  subscriberCount: z.number().default(0),
  tags: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EmailList = z.infer<typeof EmailListSchema>;

// API Response Types
export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface EmailProviderResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

// Webhook Types
export interface WebhookEvent {
  provider: EmailProvider;
  event: string;
  timestamp: Date;
  messageId: string;
  email: string;
  metadata?: Record<string, any>;
}

// Compliance Types
export interface ComplianceConfig {
  canSpamCompliant: boolean;
  gdprCompliant: boolean;
  unsubscribeUrl: string;
  privacyPolicyUrl: string;
  companyAddress: string;
  companyName: string;
}
