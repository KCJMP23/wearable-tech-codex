export type PostType =
  | 'howto'
  | 'listicle'
  | 'answer'
  | 'review'
  | 'roundup'
  | 'alternative'
  | 'evergreen';

export type PublishStatus = 'draft' | 'scheduled' | 'published';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
  theme: Record<string, unknown>;
  logoUrl: string | null;
  colorTokens: Record<string, string>;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
}

export interface ProductImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface ProductFeature {
  title: string;
  description: string;
}

export interface Product {
  id: string;
  tenantId: string;
  asin: string;
  title: string;
  brand: string | null;
  images: ProductImage[];
  features: ProductFeature[];
  rating: number | null;
  reviewCount: number | null;
  priceSnapshot: string | null;
  currency: string | null;
  category: string | null;
  subcategory: string | null;
  deviceType: string | null;
  compatibility: Record<string, unknown>;
  regulatoryNotes: string | null;
  healthMetrics: string[];
  batteryLifeHours: number | null;
  waterResistance: string | null;
  affiliateUrl: string;
  source: string;
  lastVerifiedAt: string | null;
  raw: Record<string, unknown>;
}

export interface PostSeo {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
}

export interface JsonLdPayload {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
}

export interface PostImage extends ProductImage {
  attribution?: string;
}

export interface Post {
  id: string;
  tenantId: string;
  type: PostType;
  title: string;
  slug: string;
  excerpt: string;
  bodyMdx: string;
  images: PostImage[];
  status: PublishStatus;
  publishedAt: string | null;
  seo: PostSeo;
  jsonld: JsonLdPayload | null;
}

export interface QuizSchemaNode {
  id: string;
  question: string;
  type: 'single' | 'multi' | 'scale';
  choices: Array<{
    id: string;
    label: string;
    value: string;
    next?: string | null;
  }>;
  scoring?: Record<string, number>;
}

export interface Quiz {
  id: string;
  tenantId: string;
  title: string;
  schema: QuizSchemaNode[];
  active: boolean;
}

export interface InsightCard {
  id: string;
  tenantId: string;
  kpi: string;
  value: number;
  window: string;
  headline: string;
  body: string;
  actionLabel?: string;
  action?: {
    type: 'run-agent' | 'open-url' | 'schedule';
    payload: Record<string, unknown>;
  };
  computedAt: string;
}

export interface CalendarItem {
  id: string;
  tenantId: string;
  itemType: 'post' | 'newsletter' | 'social' | 'agent';
  refId: string | null;
  title: string;
  status: 'planned' | 'scheduled' | 'published' | 'done' | 'blocked';
  runAt: string;
  meta: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  tenantId: string;
  agent: string;
  input: Record<string, unknown>;
  status: 'queued' | 'running' | 'done' | 'error';
  result: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AgentRunInput<T = Record<string, unknown>> {
  tenantSlug: string;
  agent: string;
  input: T;
}

export interface AgentRunResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export interface AmazonProductResponse {
  asin: string;
  detailPageURL: string;
  title?: string;
  brand?: string;
  features?: string[];
  images?: ProductImage[];
  rating?: number;
  reviewCount?: number;
  price?: {
    amount: number;
    currency: string;
  };
}

export interface RedditTrend {
  subreddit: string;
  title: string;
  url: string;
  score: number;
  comments: number;
  tags: string[];
}

export interface SearchSnippet {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export interface NewsletterCampaign {
  id: string;
  tenantId: string;
  subject: string;
  preheader?: string;
  html: string;
  segment: string;
  scheduledAt: string;
}

export interface SegmentDefinition {
  id: string;
  name: string;
  rules: Record<string, unknown>;
}

// =============================================================================
// Phase 2: Proprietary Affiliate Network Types
// =============================================================================

export type BrandStatus = 'pending' | 'active' | 'suspended';
export type BrandTier = 'standard' | 'premium' | 'exclusive';
export type PartnershipStatus = 'pending' | 'active' | 'suspended' | 'expired';
export type BlockchainTransactionType = 'click' | 'conversion' | 'commission' | 'reward';
export type BlockchainTransactionStatus = 'pending' | 'confirmed' | 'failed';
export type RewardType = 'points' | 'tokens' | 'cashback';
export type RewardStatus = 'pending' | 'distributed' | 'expired';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  commissionRate: number | null; // Base commission rate
  exclusiveRate: number | null; // Exclusive partner rate
  contactEmail: string | null;
  apiEndpoint: string | null;
  apiKeyEncrypted: string | null;
  status: BrandStatus;
  tier: BrandTier;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BrandPartnership {
  id: string;
  tenantId: string;
  brandId: string;
  commissionRate: number | null; // Negotiated rate for this tenant
  status: PartnershipStatus;
  contractStartDate: string | null;
  contractEndDate: string | null;
  exclusive: boolean;
  performanceBonus: Record<string, unknown>; // Bonus structure
  createdAt: string;
  updatedAt: string;
  // Joined fields
  brand?: Brand;
}

export interface PrivateMarketplaceProduct {
  id: string;
  brandId: string;
  productId: string; // Brand's internal product ID
  title: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  currency: string;
  images: ProductImage[];
  features: string[];
  category: string | null;
  commissionRate: number | null;
  exclusive: boolean;
  stockQuantity: number | null;
  availabilityStart: string | null;
  availabilityEnd: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  brand?: Brand;
}

export interface BlockchainTransaction {
  id: string;
  tenantId: string;
  transactionHash: string | null; // Ethereum tx hash
  transactionType: BlockchainTransactionType;
  userWallet: string | null; // Ethereum wallet address
  amountWei: bigint | null; // Amount in wei
  tokenAddress: string | null; // Token contract address
  productId: string | null;
  clickId: string | null;
  conversionId: string | null;
  metadata: Record<string, unknown>;
  blockNumber: bigint | null;
  gasUsed: number | null;
  gasPrice: bigint | null;
  status: BlockchainTransactionStatus;
  createdAt: string;
  confirmedAt: string | null;
}

export interface UserReward {
  id: string;
  tenantId: string;
  userIdentifier: string; // email, wallet address, or user ID
  rewardType: RewardType;
  amount: number;
  source: string | null; // purchase, referral, engagement
  referenceId: string | null; // Reference to transaction/action
  status: RewardStatus;
  expiresAt: string | null;
  distributedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// =============================================================================
// Phase 2: Mobile Ecosystem Types
// =============================================================================

export type NotificationType = 'push' | 'email' | 'sms' | 'in_app';
export type NotificationStatus = 'scheduled' | 'sent' | 'delivered' | 'opened' | 'failed';
export type DeviceType = 'ios' | 'android' | 'web' | 'desktop';

export interface MobileDevice {
  id: string;
  tenantId: string;
  userIdentifier: string;
  deviceType: DeviceType;
  deviceToken: string; // FCM/APNS token
  appVersion: string | null;
  osVersion: string | null;
  timezone: string | null;
  language: string | null;
  active: boolean;
  lastSeenAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCampaign {
  id: string;
  tenantId: string;
  name: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl: string | null;
  deepLink: string | null;
  targetAudience: Record<string, unknown>; // Segment criteria
  scheduledAt: string | null;
  sentAt: string | null;
  status: NotificationStatus;
  deliveryStats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  campaignId: string;
  tenantId: string;
  deviceId: string | null;
  userIdentifier: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  body: string;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MobileAnalytics {
  id: string;
  tenantId: string;
  deviceId: string | null;
  userIdentifier: string | null;
  eventType: string; // app_open, page_view, product_click, etc.
  eventData: Record<string, unknown>;
  sessionId: string | null;
  appVersion: string | null;
  timestamp: string;
  createdAt: string;
}

export interface TenantSettings {
  id: string;
  tenantId: string;
  settingKey: string;
  settingValue: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Common mobile settings interfaces
export interface PushNotificationSettings {
  enabled: boolean;
  dealAlerts: boolean;
  contentUpdates: boolean;
  weeklyDigest: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    timezone: string;
  };
}

export interface MobileAppSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultCurrency: string;
  priceAlertThreshold: number;
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
}

// =============================================================================
// Phase 2: API Economy Types
// =============================================================================

export type DeveloperTier = 'free' | 'pro' | 'enterprise';
export type AppStatus = 'pending_review' | 'approved' | 'suspended' | 'archived';
export type AppCategory = 'integration' | 'analytics' | 'content' | 'automation' | 'social' | 'commerce';
export type PricingModel = 'free' | 'usage' | 'subscription' | 'revenue_share';
export type InstallationStatus = 'active' | 'suspended' | 'uninstalled';
export type ApiPermission = 
  | 'read:products' 
  | 'write:products' 
  | 'read:content' 
  | 'write:content' 
  | 'read:analytics' 
  | 'write:analytics' 
  | 'read:settings' 
  | 'write:settings'
  | 'admin:all';

export interface DeveloperProfile {
  id: string;
  userId: string | null; // Reference to auth users if using Supabase Auth
  name: string;
  company: string | null;
  email: string;
  website: string | null;
  bio: string | null;
  avatarUrl: string | null;
  verified: boolean;
  tier: DeveloperTier;
  createdAt: string;
  updatedAt: string;
}

export interface DeveloperApp {
  id: string;
  developerId: string;
  name: string;
  description: string | null;
  category: AppCategory;
  apiKey: string;
  secretKeyHash: string;
  webhookUrl: string | null;
  webhookSecret: string | null;
  permissions: ApiPermission[];
  pricingModel: PricingModel;
  pricingDetails: Record<string, unknown>;
  status: AppStatus;
  installsCount: number;
  rating: number | null;
  ratingCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  developer?: DeveloperProfile;
}

export interface AppInstallation {
  id: string;
  tenantId: string;
  appId: string;
  status: InstallationStatus;
  config: Record<string, unknown>;
  installedBy: string | null; // user who installed
  installedAt: string;
  lastUsedAt: string | null;
  usageStats: {
    totalRequests: number;
    lastRequest: string | null;
    requestsThisMonth: number;
    errorsThisMonth: number;
  };
  // Joined fields
  app?: DeveloperApp;
  tenant?: Tenant;
}

export interface ApiUsageLog {
  id: string;
  appId: string;
  tenantId: string | null;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number | null;
  requestSizeBytes: number | null;
  responseSizeBytes: number | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  // Joined fields
  app?: DeveloperApp;
}

export interface Webhook {
  id: string;
  tenantId: string;
  appId: string | null;
  name: string;
  url: string;
  secret: string | null;
  events: string[]; // tenant.created, content.published, etc.
  active: boolean;
  retryCount: number;
  timeoutSeconds: number;
  headers: Record<string, string>;
  lastTriggeredAt: string | null;
  lastStatus: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  attempt: number;
  statusCode: number | null;
  responseBody: string | null;
  responseHeaders: Record<string, string> | null;
  deliveredAt: string | null;
  errorMessage: string | null;
  nextRetryAt: string | null;
  createdAt: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    requestId?: string;
    timestamp?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    requestId?: string;
    timestamp?: string;
  };
}

export interface CreateBrandRequest {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  commissionRate?: number;
  exclusiveRate?: number;
  contactEmail?: string;
  apiEndpoint?: string;
  tier?: BrandTier;
  metadata?: Record<string, unknown>;
}

export interface CreatePartnershipRequest {
  brandId: string;
  commissionRate?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  exclusive?: boolean;
  performanceBonus?: Record<string, unknown>;
}

export interface CreateAppRequest {
  name: string;
  description?: string;
  category: AppCategory;
  webhookUrl?: string;
  permissions: ApiPermission[];
  pricingModel?: PricingModel;
  pricingDetails?: Record<string, unknown>;
}

export interface InstallAppRequest {
  appId: string;
  config?: Record<string, unknown>;
}

export interface CreateNotificationCampaignRequest {
  name: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  deepLink?: string;
  targetAudience?: Record<string, unknown>;
  scheduledAt?: string;
}

export interface RegisterDeviceRequest {
  userIdentifier: string;
  deviceType: DeviceType;
  deviceToken: string;
  appVersion?: string;
  osVersion?: string;
  timezone?: string;
  language?: string;
}

// =============================================================================
// Database Join Types (for complex queries)
// =============================================================================

export interface BrandWithPartnerships extends Brand {
  partnerships: BrandPartnership[];
  marketplaceProducts: PrivateMarketplaceProduct[];
}

export interface TenantWithSettings extends Tenant {
  settings: Record<string, unknown>;
  mobileDevices: MobileDevice[];
  installedApps: AppInstallation[];
}

export interface AppWithStats extends DeveloperApp {
  installations: AppInstallation[];
  usageStats: {
    totalInstalls: number;
    activeInstalls: number;
    monthlyRequests: number;
    averageRating: number;
  };
}

// =============================================================================
// Analytics & Reporting Types
// =============================================================================

export interface RevenueAnalytics {
  totalRevenue: number;
  affiliateRevenue: number;
  marketplaceRevenue: number;
  period: string;
  breakdown: {
    amazon: number;
    brands: Record<string, number>;
    marketplace: number;
  };
}

export interface ConversionFunnel {
  step: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface DeveloperAnalytics {
  totalApps: number;
  totalInstalls: number;
  monthlyRevenue: number;
  topApps: Array<{
    appId: string;
    name: string;
    installs: number;
    revenue: number;
  }>;
}

// =============================================================================
// Event Types for Webhooks
// =============================================================================

export type WebhookEventType = 
  | 'tenant.created'
  | 'tenant.updated'
  | 'tenant.deleted'
  | 'product.created'
  | 'product.updated' 
  | 'product.deleted'
  | 'content.published'
  | 'content.updated'
  | 'partnership.created'
  | 'partnership.updated'
  | 'conversion.tracked'
  | 'reward.distributed'
  | 'app.installed'
  | 'app.uninstalled';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  tenantId: string;
  data: Record<string, unknown>;
  timestamp: string;
}
