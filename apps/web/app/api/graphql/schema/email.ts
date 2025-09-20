import { gql } from 'graphql-tag';

export const emailTypeDefs = gql`
  # Email Campaigns
  type EmailCampaign implements Node {
    id: ID!
    siteId: ID!
    site: Site!
    
    # Campaign Details
    name: String!
    subject: String!
    preheader: String
    content: String!
    plainTextContent: String
    
    # Design & Template
    templateId: ID
    template: EmailTemplate
    design: JSON
    
    # Targeting
    listIds: [ID!]!
    lists: [EmailList!]!
    segmentIds: [ID!]
    segments: [EmailSegment!]!
    
    # Scheduling
    status: CampaignStatus!
    scheduledAt: DateTime
    sentAt: DateTime
    
    # A/B Testing
    isABTest: Boolean!
    abTestConfig: ABTestConfig
    
    # Performance
    stats: CampaignStats!
    
    # Automation
    isAutomation: Boolean!
    automationTrigger: AutomationTrigger
    
    # Settings
    settings: CampaignSettings!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum CampaignStatus {
    DRAFT
    SCHEDULED
    SENDING
    SENT
    PAUSED
    CANCELLED
    COMPLETED
  }

  type CampaignStats {
    totalSent: Int!
    delivered: Int!
    opened: Int!
    clicked: Int!
    unsubscribed: Int!
    bounced: Int!
    complained: Int!
    
    deliveryRate: Float!
    openRate: Float!
    clickRate: Float!
    unsubscribeRate: Float!
    bounceRate: Float!
    complaintRate: Float!
    
    revenue: Float!
    conversions: Int!
    conversionRate: Float!
    
    lastUpdated: DateTime!
  }

  type ABTestConfig {
    testType: ABTestType!
    splitPercentage: Float!
    winnerCriteria: WinnerCriteria!
    testDuration: Int! # hours
    variants: [CampaignVariant!]!
    winner: CampaignVariant
    isComplete: Boolean!
  }

  enum ABTestType {
    SUBJECT_LINE
    CONTENT
    SEND_TIME
    FROM_NAME
    TEMPLATE
  }

  enum WinnerCriteria {
    OPEN_RATE
    CLICK_RATE
    CONVERSION_RATE
    REVENUE
  }

  type CampaignVariant {
    id: ID!
    name: String!
    subject: String!
    content: String!
    percentage: Float!
    stats: CampaignStats!
  }

  type AutomationTrigger {
    type: TriggerType!
    conditions: [TriggerCondition!]!
    delay: Int # minutes
  }

  enum TriggerType {
    WELCOME_SERIES
    ABANDONED_CART
    POST_PURCHASE
    WIN_BACK
    BIRTHDAY
    ANNIVERSARY
    PRODUCT_RECOMMENDATION
    PRICE_DROP
    BACK_IN_STOCK
    CUSTOM_EVENT
  }

  type TriggerCondition {
    field: String!
    operator: String!
    value: String!
  }

  type CampaignSettings {
    fromName: String!
    fromEmail: EmailAddress!
    replyTo: EmailAddress
    trackOpens: Boolean!
    trackClicks: Boolean!
    googleAnalytics: Boolean!
    socialSharing: Boolean!
    unsubscribeFooter: Boolean!
  }

  # Email Lists
  type EmailList implements Node {
    id: ID!
    siteId: ID!
    site: Site!
    
    name: String!
    description: String
    isDefault: Boolean!
    
    # Subscribers
    subscriberCount: Int!
    activeCount: Int!
    unsubscribedCount: Int!
    cleanedCount: Int!
    
    # Settings
    doubleOptIn: Boolean!
    welcomeEmail: Boolean!
    welcomeEmailId: ID
    
    # Growth
    growthRate: Float!
    churnRate: Float!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Email Subscribers
  type EmailSubscriber implements Node {
    id: ID!
    email: EmailAddress!
    
    # Personal Info
    firstName: String
    lastName: String
    name: String
    phone: String
    
    # Geographic
    country: String
    region: String
    city: String
    timezone: String
    
    # Subscription Details
    status: SubscriberStatus!
    subscribedAt: DateTime!
    unsubscribedAt: DateTime
    confirmedAt: DateTime
    lastEmailedAt: DateTime
    
    # Preferences
    preferences: SubscriberPreferences!
    
    # Lists & Segments
    lists: [EmailList!]!
    segments: [EmailSegment!]!
    
    # Activity
    emailsSent: Int!
    emailsOpened: Int!
    emailsClicked: Int!
    openRate: Float!
    clickRate: Float!
    
    # Custom Fields
    customFields: JSON
    
    # Tags
    tags: [String!]!
    
    # Engagement Score
    engagementScore: Float!
    lastEngaged: DateTime
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum SubscriberStatus {
    SUBSCRIBED
    UNSUBSCRIBED
    PENDING
    CLEANED
    BOUNCED
    COMPLAINED
  }

  type SubscriberPreferences {
    frequency: EmailFrequency!
    contentTypes: [String!]!
    categories: [String!]!
    formats: [EmailFormat!]!
  }

  enum EmailFormat {
    HTML
    TEXT
    BOTH
  }

  # Email Segments
  type EmailSegment implements Node {
    id: ID!
    siteId: ID!
    site: Site!
    
    name: String!
    description: String
    conditions: [SegmentCondition!]!
    
    # Subscriber Count
    subscriberCount: Int!
    
    # Auto-update
    isAutoUpdate: Boolean!
    lastUpdated: DateTime
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SegmentCondition {
    field: String!
    operator: SegmentOperator!
    value: String!
    logicalOperator: LogicalOperator
  }

  enum SegmentOperator {
    EQUALS
    NOT_EQUALS
    CONTAINS
    NOT_CONTAINS
    STARTS_WITH
    ENDS_WITH
    GREATER_THAN
    LESS_THAN
    IS_SET
    IS_NOT_SET
    IN_LIST
    NOT_IN_LIST
  }

  enum LogicalOperator {
    AND
    OR
  }

  # Email Templates
  type EmailTemplate implements Node {
    id: ID!
    name: String!
    description: String!
    
    # Template Content
    subject: String!
    content: String!
    plainTextContent: String
    preheader: String
    
    # Design
    thumbnail: URL
    design: JSON
    
    # Categorization
    category: TemplateCategory!
    tags: [String!]!
    
    # Usage
    usageCount: Int!
    rating: Float!
    
    # Status
    isActive: Boolean!
    isPremium: Boolean!
    
    # Variables
    variables: [TemplateVariable!]!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum TemplateCategory {
    WELCOME
    NEWSLETTER
    PROMOTION
    ANNOUNCEMENT
    PRODUCT_UPDATE
    EVENT
    ABANDONED_CART
    WIN_BACK
    SURVEY
    THANK_YOU
    INVOICE
    RECEIPT
    CUSTOM
  }

  # Email Analytics
  type EmailAnalytics {
    siteId: ID!
    period: String!
    
    # Campaign Performance
    campaignsSent: Int!
    totalSent: Int!
    totalDelivered: Int!
    totalOpened: Int!
    totalClicked: Int!
    totalUnsubscribed: Int!
    totalBounced: Int!
    totalComplaints: Int!
    
    # Rates
    avgDeliveryRate: Float!
    avgOpenRate: Float!
    avgClickRate: Float!
    avgUnsubscribeRate: Float!
    avgBounceRate: Float!
    avgComplaintRate: Float!
    
    # Revenue
    totalRevenue: Float!
    totalConversions: Int!
    avgConversionRate: Float!
    revenuePerEmail: Float!
    
    # List Growth
    newSubscribers: Int!
    unsubscribers: Int!
    netGrowth: Int!
    growthRate: Float!
    
    # Top Performers
    topCampaigns: [CampaignStat!]!
    topLists: [ListStat!]!
    topSegments: [SegmentStat!]!
    
    # Time-based Data
    dailyStats: [DailyEmailStat!]!
    hourlyStats: [HourlyEmailStat!]!
  }

  type CampaignStat {
    campaign: EmailCampaign!
    sent: Int!
    opened: Int!
    clicked: Int!
    openRate: Float!
    clickRate: Float!
    revenue: Float!
  }

  type ListStat {
    list: EmailList!
    subscribers: Int!
    growth: Int!
    churn: Int!
    engagement: Float!
  }

  type SegmentStat {
    segment: EmailSegment!
    subscribers: Int!
    engagement: Float!
    revenue: Float!
  }

  type DailyEmailStat {
    date: DateTime!
    sent: Int!
    delivered: Int!
    opened: Int!
    clicked: Int!
    subscribed: Int!
    unsubscribed: Int!
    revenue: Float!
  }

  type HourlyEmailStat {
    hour: Int!
    sent: Int!
    opened: Int!
    clicked: Int!
  }

  extend type Query {
    # Campaigns
    emailCampaigns(
      siteId: ID!
      status: CampaignStatus
      pagination: PaginationInput
      sort: [SortInput!]
    ): [EmailCampaign!]! @auth(requires: USER)
    
    emailCampaign(id: ID!): EmailCampaign @auth(requires: USER)
    
    # Lists
    emailLists(siteId: ID!): [EmailList!]! @auth(requires: USER)
    emailList(id: ID!): EmailList @auth(requires: USER)
    
    # Subscribers
    emailSubscribers(
      listId: ID
      segmentId: ID
      status: SubscriberStatus
      search: String
      pagination: PaginationInput
      sort: [SortInput!]
    ): [EmailSubscriber!]! @auth(requires: USER)
    
    emailSubscriber(id: ID, email: EmailAddress): EmailSubscriber @auth(requires: USER)
    
    # Segments
    emailSegments(siteId: ID!): [EmailSegment!]! @auth(requires: USER)
    emailSegment(id: ID!): EmailSegment @auth(requires: USER)
    
    # Templates
    emailTemplates(
      category: TemplateCategory
      isPremium: Boolean
      search: String
      pagination: PaginationInput
    ): [EmailTemplate!]!
    
    emailTemplate(id: ID!): EmailTemplate
    
    # Analytics
    emailAnalytics(
      siteId: ID!
      period: String = "30d"
    ): EmailAnalytics! @auth(requires: USER)
    
    # Preview
    previewEmail(
      campaignId: ID!
      email: EmailAddress
    ): EmailPreview! @auth(requires: USER)
  }

  extend type Mutation {
    # Campaign Management
    createEmailCampaign(
      input: CreateEmailCampaignInput!
    ): EmailCampaign! @auth(requires: USER)
    
    updateEmailCampaign(
      id: ID!
      input: UpdateEmailCampaignInput!
    ): EmailCampaign! @auth(requires: USER)
    
    deleteEmailCampaign(id: ID!): MutationResponse! @auth(requires: USER)
    
    duplicateEmailCampaign(id: ID!): EmailCampaign! @auth(requires: USER)
    
    # Campaign Actions
    scheduleEmailCampaign(
      id: ID!
      scheduledAt: DateTime!
    ): EmailCampaign! @auth(requires: USER)
    
    sendEmailCampaign(id: ID!): EmailCampaign! @auth(requires: USER)
    pauseEmailCampaign(id: ID!): EmailCampaign! @auth(requires: USER)
    cancelEmailCampaign(id: ID!): EmailCampaign! @auth(requires: USER)
    
    # Test Emails
    sendTestEmail(
      campaignId: ID!
      emails: [EmailAddress!]!
    ): MutationResponse! @auth(requires: USER)
    
    # List Management
    createEmailList(
      input: CreateEmailListInput!
    ): EmailList! @auth(requires: USER)
    
    updateEmailList(
      id: ID!
      input: UpdateEmailListInput!
    ): EmailList! @auth(requires: USER)
    
    deleteEmailList(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Subscriber Management
    addSubscriber(
      input: AddSubscriberInput!
    ): EmailSubscriber! @auth(requires: USER)
    
    updateSubscriber(
      id: ID!
      input: UpdateSubscriberInput!
    ): EmailSubscriber! @auth(requires: USER)
    
    deleteSubscriber(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Bulk Subscriber Operations
    importSubscribers(
      listId: ID!
      data: String!
      options: ImportSubscriberOptions
    ): ImportResult! @auth(requires: USER)
    
    bulkUpdateSubscribers(
      subscriberIds: [ID!]!
      input: BulkUpdateSubscriberInput!
    ): [EmailSubscriber!]! @auth(requires: USER)
    
    bulkDeleteSubscribers(
      subscriberIds: [ID!]!
    ): MutationResponse! @auth(requires: USER)
    
    # Subscription Management (public)
    subscribe(input: SubscribeInput!): EmailSubscriber!
    unsubscribe(token: String!): MutationResponse!
    updatePreferences(
      token: String!
      preferences: SubscriberPreferencesInput!
    ): EmailSubscriber!
    
    # Segment Management
    createEmailSegment(
      input: CreateEmailSegmentInput!
    ): EmailSegment! @auth(requires: USER)
    
    updateEmailSegment(
      id: ID!
      input: UpdateEmailSegmentInput!
    ): EmailSegment! @auth(requires: USER)
    
    deleteEmailSegment(id: ID!): MutationResponse! @auth(requires: USER)
    
    refreshEmailSegment(id: ID!): EmailSegment! @auth(requires: USER)
    
    # Template Management
    createEmailTemplate(
      input: CreateEmailTemplateInput!
    ): EmailTemplate! @auth(requires: USER)
    
    updateEmailTemplate(
      id: ID!
      input: UpdateEmailTemplateInput!
    ): EmailTemplate! @auth(requires: USER)
    
    deleteEmailTemplate(id: ID!): MutationResponse! @auth(requires: USER)
  }

  extend type Subscription {
    # Campaign Updates
    campaignStatusChanged(campaignId: ID!): EmailCampaign! @auth(requires: USER)
    campaignStatsUpdated(campaignId: ID!): CampaignStats! @auth(requires: USER)
    
    # List Updates
    listGrowthUpdated(listId: ID!): EmailList! @auth(requires: USER)
    
    # Real-time Analytics
    emailAnalyticsUpdated(siteId: ID!): EmailAnalytics! @auth(requires: USER)
  }

  # Input Types
  input CreateEmailCampaignInput {
    siteId: ID!
    name: String!
    subject: String!
    preheader: String
    content: String!
    plainTextContent: String
    templateId: ID
    listIds: [ID!]!
    segmentIds: [ID!]
    settings: CampaignSettingsInput!
    isABTest: Boolean = false
    abTestConfig: ABTestConfigInput
    scheduledAt: DateTime
  }

  input UpdateEmailCampaignInput {
    name: String
    subject: String
    preheader: String
    content: String
    plainTextContent: String
    listIds: [ID!]
    segmentIds: [ID!]
    settings: CampaignSettingsInput
    abTestConfig: ABTestConfigInput
    scheduledAt: DateTime
  }

  input CampaignSettingsInput {
    fromName: String!
    fromEmail: EmailAddress!
    replyTo: EmailAddress
    trackOpens: Boolean = true
    trackClicks: Boolean = true
    googleAnalytics: Boolean = false
    socialSharing: Boolean = false
    unsubscribeFooter: Boolean = true
  }

  input ABTestConfigInput {
    testType: ABTestType!
    splitPercentage: Float!
    winnerCriteria: WinnerCriteria!
    testDuration: Int!
    variants: [CampaignVariantInput!]!
  }

  input CampaignVariantInput {
    name: String!
    subject: String!
    content: String!
    percentage: Float!
  }

  input CreateEmailListInput {
    siteId: ID!
    name: String!
    description: String
    doubleOptIn: Boolean = true
    welcomeEmail: Boolean = false
    welcomeEmailId: ID
  }

  input UpdateEmailListInput {
    name: String
    description: String
    doubleOptIn: Boolean
    welcomeEmail: Boolean
    welcomeEmailId: ID
  }

  input AddSubscriberInput {
    listIds: [ID!]!
    email: EmailAddress!
    firstName: String
    lastName: String
    phone: String
    customFields: JSON
    tags: [String!]
    preferences: SubscriberPreferencesInput
  }

  input UpdateSubscriberInput {
    firstName: String
    lastName: String
    phone: String
    customFields: JSON
    tags: [String!]
    preferences: SubscriberPreferencesInput
    status: SubscriberStatus
  }

  input BulkUpdateSubscriberInput {
    listIds: [ID!]
    tags: [String!]
    status: SubscriberStatus
    customFields: JSON
  }

  input SubscriberPreferencesInput {
    frequency: EmailFrequency
    contentTypes: [String!]
    categories: [String!]
    formats: [EmailFormat!]
  }

  input ImportSubscriberOptions {
    updateExisting: Boolean = false
    doubleOptIn: Boolean = true
    sendWelcome: Boolean = false
  }

  input SubscribeInput {
    listId: ID!
    email: EmailAddress!
    firstName: String
    lastName: String
    customFields: JSON
    source: String
    doubleOptIn: Boolean = true
  }

  input CreateEmailSegmentInput {
    siteId: ID!
    name: String!
    description: String
    conditions: [SegmentConditionInput!]!
    isAutoUpdate: Boolean = true
  }

  input UpdateEmailSegmentInput {
    name: String
    description: String
    conditions: [SegmentConditionInput!]
    isAutoUpdate: Boolean
  }

  input SegmentConditionInput {
    field: String!
    operator: SegmentOperator!
    value: String!
    logicalOperator: LogicalOperator
  }

  input CreateEmailTemplateInput {
    name: String!
    description: String!
    subject: String!
    content: String!
    plainTextContent: String
    preheader: String
    category: TemplateCategory!
    tags: [String!]
    variables: [TemplateVariableInput!]
  }

  input UpdateEmailTemplateInput {
    name: String
    description: String
    subject: String
    content: String
    plainTextContent: String
    preheader: String
    category: TemplateCategory
    tags: [String!]
    variables: [TemplateVariableInput!]
    isActive: Boolean
  }

  # Return Types
  type EmailPreview {
    subject: String!
    preheader: String
    htmlContent: String!
    textContent: String!
    size: Int!
    spamScore: Float!
    deliverabilityScore: Float!
    warnings: [String!]!
  }
`;