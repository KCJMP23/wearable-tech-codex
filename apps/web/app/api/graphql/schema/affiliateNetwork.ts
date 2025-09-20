import { gql } from 'graphql-tag';

export const affiliateNetworkTypeDefs = gql`
  type AffiliateNetwork implements Node {
    id: ID!
    name: String!
    slug: String!
    description: String!
    logo: URL!
    website: URL!
    
    # Configuration
    apiEndpoint: URL
    trackingDomain: String!
    defaultCommission: Float!
    commissionType: CommissionType!
    
    # Features & Capabilities
    features: [NetworkFeature!]!
    supportedCountries: [String!]!
    categories: [String!]!
    
    # Integration
    apiVersion: String!
    authMethod: AuthMethod!
    webhookSupport: Boolean!
    bulkOperations: Boolean!
    realTimeTracking: Boolean!
    
    # Stats & Performance
    merchantCount: Int!
    productCount: Int!
    avgEPC: Float! # Earnings Per Click
    avgConversionRate: Float!
    avgCookieLife: Int! # in days
    
    # Status
    isActive: Boolean!
    isVerified: Boolean!
    lastSyncAt: DateTime
    
    # Relationships
    merchants: [Merchant!]!
    integrations: [NetworkIntegration!]!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum NetworkFeature {
    DEEP_LINKING
    PRODUCT_FEEDS
    COMMISSION_TRACKING
    CLICK_TRACKING
    CONVERSION_TRACKING
    REAL_TIME_REPORTING
    SUB_ID_TRACKING
    MOBILE_TRACKING
    COUPON_CODES
    CASHBACK
    API_ACCESS
    WEBHOOK_NOTIFICATIONS
  }

  enum AuthMethod {
    API_KEY
    OAUTH2
    BASIC_AUTH
    JWT
    CUSTOM
  }

  type Merchant {
    id: ID!
    networkId: ID!
    network: AffiliateNetwork!
    
    # Basic Info
    name: String!
    description: String!
    logo: URL
    website: URL!
    
    # Program Details
    commissionRate: Float!
    commissionType: CommissionType!
    cookieLife: Int!
    programTerms: String!
    
    # Categories
    category: String!
    subcategories: [String!]!
    
    # Geographic
    supportedCountries: [String!]!
    
    # Status & Performance
    isActive: Boolean!
    epc: Float! # Earnings Per Click
    conversionRate: Float!
    avgOrderValue: Float!
    
    # Product Feed
    productFeedUrl: URL
    productCount: Int!
    lastProductSync: DateTime
    
    # Tracking
    trackingTemplate: String!
    
    # Relationships
    products: ProductConnection!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type NetworkIntegration {
    id: ID!
    networkId: ID!
    network: AffiliateNetwork!
    siteId: ID!
    site: Site!
    
    # Integration Settings
    apiKey: String! @auth(requires: USER)
    apiSecret: String @auth(requires: USER)
    publisherId: String!
    subId: String
    
    # Configuration
    isActive: Boolean!
    autoSync: Boolean!
    syncFrequency: SyncFrequency!
    
    # Tracking Settings
    trackingEnabled: Boolean!
    customTrackingDomain: String
    
    # Product Sync Settings
    syncProducts: Boolean!
    productFilters: JSON
    categoryMapping: JSON
    
    # Performance
    totalClicks: Int!
    totalConversions: Int!
    totalRevenue: Float!
    
    # Status
    lastSyncAt: DateTime
    syncStatus: SyncStatus!
    syncErrors: [SyncError!]!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum SyncFrequency {
    REAL_TIME
    HOURLY
    DAILY
    WEEKLY
    MANUAL
  }

  enum SyncStatus {
    SYNCING
    COMPLETED
    FAILED
    PAUSED
    NEVER_SYNCED
  }

  type SyncError {
    id: ID!
    message: String!
    details: JSON
    timestamp: DateTime!
    resolved: Boolean!
  }

  # Affiliate Links & Tracking
  type AffiliateLink {
    id: ID!
    originalUrl: URL!
    affiliateUrl: URL!
    shortUrl: URL
    
    # Tracking
    trackingId: String!
    campaignId: String
    subId: String
    
    # Metadata
    productId: ID
    product: Product
    merchantId: ID
    merchant: Merchant!
    networkId: ID!
    network: AffiliateNetwork!
    
    # Performance
    clicks: Int!
    conversions: Int!
    revenue: Float!
    
    # Status
    isActive: Boolean!
    
    # Timestamps
    lastClickAt: DateTime
    createdAt: DateTime!
    expiresAt: DateTime
  }

  # Click Tracking
  type ClickEvent {
    id: ID!
    linkId: ID!
    link: AffiliateLink!
    
    # User Info
    ipAddress: String!
    userAgent: String!
    referrer: URL
    
    # Geographic
    country: String
    region: String
    city: String
    
    # Device Info
    device: String
    browser: String
    os: String
    
    # Tracking
    sessionId: String
    userId: String
    
    timestamp: DateTime!
  }

  # Conversion Tracking
  type ConversionEvent {
    id: ID!
    linkId: ID!
    link: AffiliateLink!
    clickEventId: ID
    
    # Order Details
    orderId: String!
    orderValue: Float!
    commission: Float!
    currency: String!
    
    # Product Details
    products: [ConversionProduct!]!
    
    # Status
    status: ConversionStatus!
    
    # Timestamps
    conversionTime: DateTime!
    confirmationTime: DateTime
    paymentTime: DateTime
  }

  type ConversionProduct {
    id: String!
    name: String!
    category: String!
    price: Float!
    quantity: Int!
    commission: Float!
  }

  enum ConversionStatus {
    PENDING
    CONFIRMED
    CANCELLED
    RETURNED
    PAID
  }

  # Commission Management
  type Commission {
    id: ID!
    networkId: ID!
    network: AffiliateNetwork!
    merchantId: ID!
    merchant: Merchant!
    conversionId: ID!
    conversion: ConversionEvent!
    
    # Commission Details
    amount: Float!
    rate: Float!
    type: CommissionType!
    
    # Status
    status: CommissionStatus!
    
    # Payment
    paymentDate: DateTime
    paymentMethod: String
    paymentReference: String
    
    # Timestamps
    earnedAt: DateTime!
    confirmedAt: DateTime
    paidAt: DateTime
  }

  enum CommissionStatus {
    PENDING
    CONFIRMED
    PAID
    CANCELLED
    DISPUTED
  }

  # Network Statistics
  type NetworkStats {
    networkId: ID!
    network: AffiliateNetwork!
    period: String!
    
    # Traffic Stats
    totalClicks: Int!
    uniqueClicks: Int!
    
    # Conversion Stats
    totalConversions: Int!
    conversionRate: Float!
    
    # Revenue Stats
    totalRevenue: Float!
    totalCommissions: Float!
    avgOrderValue: Float!
    epc: Float!
    
    # Top Performers
    topMerchants: [MerchantStat!]!
    topProducts: [ProductStat!]!
    topCountries: [CountryStat!]!
  }

  type MerchantStat {
    merchant: Merchant!
    clicks: Int!
    conversions: Int!
    revenue: Float!
    commissions: Float!
    conversionRate: Float!
  }

  extend type Query {
    # Affiliate Networks
    affiliateNetworks(
      isActive: Boolean
      category: String
      search: String
      pagination: PaginationInput
    ): [AffiliateNetwork!]!
    
    affiliateNetwork(id: ID, slug: String): AffiliateNetwork
    
    # Merchants
    merchants(
      networkId: ID
      category: String
      isActive: Boolean
      search: String
      pagination: PaginationInput
    ): [Merchant!]!
    
    merchant(id: ID!): Merchant
    
    # Network Integrations
    networkIntegrations(siteId: ID!): [NetworkIntegration!]! @auth(requires: USER)
    networkIntegration(id: ID!): NetworkIntegration @auth(requires: USER)
    
    # Affiliate Links
    affiliateLinks(
      siteId: ID!
      networkId: ID
      merchantId: ID
      pagination: PaginationInput
    ): [AffiliateLink!]! @auth(requires: USER)
    
    affiliateLink(id: ID!): AffiliateLink @auth(requires: USER)
    
    # Click Tracking
    clickEvents(
      linkId: ID!
      period: String = "7d"
      pagination: PaginationInput
    ): [ClickEvent!]! @auth(requires: USER)
    
    # Conversions
    conversions(
      siteId: ID!
      networkId: ID
      status: ConversionStatus
      period: String = "30d"
      pagination: PaginationInput
    ): [ConversionEvent!]! @auth(requires: USER)
    
    # Commissions
    commissions(
      siteId: ID!
      networkId: ID
      status: CommissionStatus
      period: String = "30d"
      pagination: PaginationInput
    ): [Commission!]! @auth(requires: USER)
    
    # Statistics
    networkStats(
      networkId: ID!
      siteId: ID
      period: String = "30d"
    ): NetworkStats! @auth(requires: USER)
    
    # Link Generation
    generateAffiliateLink(
      originalUrl: URL!
      networkId: ID!
      merchantId: ID
      campaignId: String
      subId: String
    ): AffiliateLink! @auth(requires: USER)
  }

  extend type Mutation {
    # Network Integration
    connectNetwork(
      input: ConnectNetworkInput!
    ): NetworkIntegration! @auth(requires: USER)
    
    updateNetworkIntegration(
      id: ID!
      input: UpdateNetworkIntegrationInput!
    ): NetworkIntegration! @auth(requires: USER)
    
    disconnectNetwork(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Sync Operations
    syncNetwork(integrationId: ID!): NetworkIntegration! @auth(requires: USER)
    syncMerchants(integrationId: ID!): NetworkIntegration! @auth(requires: USER)
    syncProducts(integrationId: ID!, merchantId: ID): NetworkIntegration! @auth(requires: USER)
    
    # Affiliate Links
    createAffiliateLink(
      input: CreateAffiliateLinkInput!
    ): AffiliateLink! @auth(requires: USER)
    
    updateAffiliateLink(
      id: ID!
      input: UpdateAffiliateLinkInput!
    ): AffiliateLink! @auth(requires: USER)
    
    deleteAffiliateLink(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Bulk Operations
    bulkCreateAffiliateLinks(
      inputs: [CreateAffiliateLinkInput!]!
    ): [AffiliateLink!]! @auth(requires: USER)
    
    # Click Tracking (used by redirect service)
    trackClick(
      linkId: ID!
      userAgent: String!
      ipAddress: String!
      referrer: URL
    ): ClickEvent!
    
    # Conversion Tracking (webhook endpoint)
    trackConversion(
      input: TrackConversionInput!
    ): ConversionEvent!
    
    # Admin Operations
    createAffiliateNetwork(
      input: CreateAffiliateNetworkInput!
    ): AffiliateNetwork! @auth(requires: ADMIN)
    
    updateAffiliateNetwork(
      id: ID!
      input: UpdateAffiliateNetworkInput!
    ): AffiliateNetwork! @auth(requires: ADMIN)
    
    deleteAffiliateNetwork(id: ID!): MutationResponse! @auth(requires: ADMIN)
  }

  extend type Subscription {
    # Real-time tracking
    clickTracked(siteId: ID!): ClickEvent! @auth(requires: USER)
    conversionTracked(siteId: ID!): ConversionEvent! @auth(requires: USER)
    commissionEarned(siteId: ID!): Commission! @auth(requires: USER)
    
    # Sync status
    syncStatusChanged(integrationId: ID!): NetworkIntegration! @auth(requires: USER)
  }

  # Input types
  input ConnectNetworkInput {
    siteId: ID!
    networkId: ID!
    apiKey: String!
    apiSecret: String
    publisherId: String!
    subId: String
    autoSync: Boolean = true
    syncFrequency: SyncFrequency = DAILY
    syncProducts: Boolean = true
    productFilters: JSON
  }

  input UpdateNetworkIntegrationInput {
    apiKey: String
    apiSecret: String
    publisherId: String
    subId: String
    isActive: Boolean
    autoSync: Boolean
    syncFrequency: SyncFrequency
    syncProducts: Boolean
    productFilters: JSON
    categoryMapping: JSON
  }

  input CreateAffiliateLinkInput {
    siteId: ID!
    originalUrl: URL!
    networkId: ID!
    merchantId: ID
    productId: ID
    campaignId: String
    subId: String
    expiresAt: DateTime
  }

  input UpdateAffiliateLinkInput {
    campaignId: String
    subId: String
    isActive: Boolean
    expiresAt: DateTime
  }

  input TrackConversionInput {
    clickEventId: ID
    trackingId: String!
    orderId: String!
    orderValue: Float!
    currency: String!
    products: [ConversionProductInput!]!
    conversionTime: DateTime
  }

  input ConversionProductInput {
    id: String!
    name: String!
    category: String!
    price: Float!
    quantity: Int!
  }

  input CreateAffiliateNetworkInput {
    name: String!
    slug: String!
    description: String!
    logo: URL!
    website: URL!
    apiEndpoint: URL
    trackingDomain: String!
    defaultCommission: Float!
    commissionType: CommissionType!
    features: [NetworkFeature!]!
    supportedCountries: [String!]!
    categories: [String!]!
    authMethod: AuthMethod!
  }

  input UpdateAffiliateNetworkInput {
    name: String
    description: String
    logo: URL
    website: URL
    apiEndpoint: URL
    trackingDomain: String
    defaultCommission: Float
    commissionType: CommissionType
    features: [NetworkFeature!]
    supportedCountries: [String!]
    categories: [String!]
    isActive: Boolean
  }
`;