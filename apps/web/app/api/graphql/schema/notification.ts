import { gql } from 'graphql-tag';

export const notificationTypeDefs = gql`
  type Notification implements Node {
    id: ID!
    userId: ID!
    user: User!
    
    # Content
    title: String!
    message: String!
    data: JSON
    
    # Categorization
    type: NotificationType!
    category: NotificationCategory!
    priority: NotificationPriority!
    
    # Media
    icon: URL
    image: URL
    
    # Action
    actionUrl: URL
    actionText: String
    
    # Status
    isRead: Boolean!
    isArchived: Boolean!
    
    # Timestamps
    readAt: DateTime
    createdAt: DateTime!
    expiresAt: DateTime
  }

  enum NotificationType {
    SYSTEM
    SECURITY
    MARKETING
    PRODUCT_UPDATE
    SITE_ACTIVITY
    REVENUE
    ANALYTICS
    BACKUP
    MAINTENANCE
    SOCIAL
    REMINDER
    WARNING
    ERROR
    SUCCESS
    INFO
  }

  enum NotificationCategory {
    ACCOUNT
    SITE
    PRODUCT
    POST
    ANALYTICS
    REVENUE
    SECURITY
    SYSTEM
    MARKETING
    SOCIAL
    BACKUP
    MAINTENANCE
  }

  enum NotificationPriority {
    LOW
    NORMAL
    HIGH
    URGENT
  }

  type NotificationConnection implements Connection {
    edges: [NotificationEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    unreadCount: Int!
  }

  type NotificationEdge implements Edge {
    node: Notification!
    cursor: String!
  }

  # Notification Settings
  type NotificationSettings {
    userId: ID!
    
    # Email notifications
    emailEnabled: Boolean!
    emailTypes: [NotificationType!]!
    emailFrequency: EmailFrequency!
    
    # Push notifications
    pushEnabled: Boolean!
    pushTypes: [NotificationType!]!
    
    # In-app notifications
    inAppEnabled: Boolean!
    inAppTypes: [NotificationType!]!
    
    # SMS notifications
    smsEnabled: Boolean!
    smsTypes: [NotificationType!]!
    phoneNumber: String
    
    # Digest settings
    digestEnabled: Boolean!
    digestFrequency: DigestFrequency!
    digestTime: String!
    
    # Do not disturb
    doNotDisturbEnabled: Boolean!
    doNotDisturbStart: String
    doNotDisturbEnd: String
    
    updatedAt: DateTime!
  }

  enum EmailFrequency {
    IMMEDIATE
    HOURLY
    DAILY
    WEEKLY
    NEVER
  }

  enum DigestFrequency {
    DAILY
    WEEKLY
    MONTHLY
    NEVER
  }

  # Push Subscription
  type PushSubscription {
    id: ID!
    userId: ID!
    endpoint: String!
    keys: PushKeys!
    userAgent: String!
    isActive: Boolean!
    createdAt: DateTime!
    lastUsed: DateTime
  }

  type PushKeys {
    p256dh: String!
    auth: String!
  }

  # Notification Templates
  type NotificationTemplate {
    id: ID!
    name: String!
    description: String!
    type: NotificationType!
    category: NotificationCategory!
    
    # Content templates
    titleTemplate: String!
    messageTemplate: String!
    emailTemplate: String
    smsTemplate: String
    
    # Styling
    icon: URL
    color: String
    
    # Variables
    variables: [TemplateVariable!]!
    
    # Status
    isActive: Boolean!
    
    # Usage stats
    sentCount: Int!
    openRate: Float!
    clickRate: Float!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TemplateVariable {
    name: String!
    description: String!
    type: VariableType!
    required: Boolean!
    defaultValue: String
  }

  enum VariableType {
    STRING
    NUMBER
    DATE
    URL
    EMAIL
    PHONE
    BOOLEAN
    OBJECT
  }

  # Notification Analytics
  type NotificationAnalytics {
    period: String!
    totalSent: Int!
    totalDelivered: Int!
    totalOpened: Int!
    totalClicked: Int!
    deliveryRate: Float!
    openRate: Float!
    clickRate: Float!
    
    # By type
    byType: [NotificationTypeStat!]!
    
    # By channel
    byChannel: [NotificationChannelStat!]!
    
    # Time series
    dailyStats: [DailyNotificationStat!]!
  }

  type NotificationTypeStat {
    type: NotificationType!
    sent: Int!
    delivered: Int!
    opened: Int!
    clicked: Int!
    openRate: Float!
    clickRate: Float!
  }

  type NotificationChannelStat {
    channel: NotificationChannel!
    sent: Int!
    delivered: Int!
    opened: Int!
    clicked: Int!
    deliveryRate: Float!
    openRate: Float!
    clickRate: Float!
  }

  enum NotificationChannel {
    EMAIL
    PUSH
    IN_APP
    SMS
  }

  type DailyNotificationStat {
    date: DateTime!
    sent: Int!
    delivered: Int!
    opened: Int!
    clicked: Int!
  }

  extend type Query {
    # Notifications
    notifications(
      pagination: PaginationInput
      filters: [FilterInput!]
      unreadOnly: Boolean = false
      types: [NotificationType!]
      categories: [NotificationCategory!]
    ): NotificationConnection! @auth(requires: USER)
    
    notification(id: ID!): Notification @auth(requires: USER)
    
    # Notification settings
    notificationSettings: NotificationSettings! @auth(requires: USER)
    
    # Templates (admin)
    notificationTemplates(
      type: NotificationType
      category: NotificationCategory
      pagination: PaginationInput
    ): [NotificationTemplate!]! @auth(requires: ADMIN)
    
    notificationTemplate(id: ID!): NotificationTemplate @auth(requires: ADMIN)
    
    # Analytics (admin)
    notificationAnalytics(
      period: String = "7d"
      type: NotificationType
      channel: NotificationChannel
    ): NotificationAnalytics! @auth(requires: ADMIN)
  }

  extend type Mutation {
    # Notification management
    markNotificationRead(id: ID!): Notification! @auth(requires: USER)
    markNotificationUnread(id: ID!): Notification! @auth(requires: USER)
    markAllNotificationsRead: MutationResponse! @auth(requires: USER)
    
    archiveNotification(id: ID!): Notification! @auth(requires: USER)
    deleteNotification(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Bulk operations
    bulkMarkRead(ids: [ID!]!): MutationResponse! @auth(requires: USER)
    bulkArchive(ids: [ID!]!): MutationResponse! @auth(requires: USER)
    bulkDelete(ids: [ID!]!): MutationResponse! @auth(requires: USER)
    
    # Settings
    updateNotificationSettings(
      input: UpdateNotificationSettingsInput!
    ): NotificationSettings! @auth(requires: USER)
    
    # Push subscriptions
    subscribeToPush(
      subscription: PushSubscriptionInput!
    ): PushSubscription! @auth(requires: USER)
    
    unsubscribeFromPush(
      subscriptionId: ID!
    ): MutationResponse! @auth(requires: USER)
    
    # Send notifications (admin/system)
    sendNotification(
      input: SendNotificationInput!
    ): Notification! @auth(requires: ADMIN) @rateLimit(max: 100, window: "1h")
    
    sendBulkNotification(
      input: SendBulkNotificationInput!
    ): BulkNotificationResult! @auth(requires: ADMIN) @rateLimit(max: 10, window: "1h")
    
    # Templates (admin)
    createNotificationTemplate(
      input: CreateNotificationTemplateInput!
    ): NotificationTemplate! @auth(requires: ADMIN)
    
    updateNotificationTemplate(
      id: ID!
      input: UpdateNotificationTemplateInput!
    ): NotificationTemplate! @auth(requires: ADMIN)
    
    deleteNotificationTemplate(id: ID!): MutationResponse! @auth(requires: ADMIN)
    
    # Test notifications
    testNotification(
      templateId: ID!
      channel: NotificationChannel!
      variables: JSON
    ): MutationResponse! @auth(requires: ADMIN)
  }

  extend type Subscription {
    # Real-time notifications
    notificationAdded(userId: ID!): Notification! @auth(requires: USER)
    notificationUpdated(userId: ID!): Notification! @auth(requires: USER)
    
    # Notification counts
    unreadCountChanged(userId: ID!): Int! @auth(requires: USER)
  }

  # Input types
  input UpdateNotificationSettingsInput {
    emailEnabled: Boolean
    emailTypes: [NotificationType!]
    emailFrequency: EmailFrequency
    
    pushEnabled: Boolean
    pushTypes: [NotificationType!]
    
    inAppEnabled: Boolean
    inAppTypes: [NotificationType!]
    
    smsEnabled: Boolean
    smsTypes: [NotificationType!]
    phoneNumber: String
    
    digestEnabled: Boolean
    digestFrequency: DigestFrequency
    digestTime: String
    
    doNotDisturbEnabled: Boolean
    doNotDisturbStart: String
    doNotDisturbEnd: String
  }

  input PushSubscriptionInput {
    endpoint: String!
    keys: PushKeysInput!
    userAgent: String!
  }

  input PushKeysInput {
    p256dh: String!
    auth: String!
  }

  input SendNotificationInput {
    userId: ID!
    templateId: ID
    type: NotificationType!
    category: NotificationCategory!
    title: String!
    message: String!
    data: JSON
    actionUrl: URL
    actionText: String
    priority: NotificationPriority = NORMAL
    channels: [NotificationChannel!]!
    expiresAt: DateTime
  }

  input SendBulkNotificationInput {
    userIds: [ID!]!
    userFilters: UserFilterInput
    templateId: ID
    type: NotificationType!
    category: NotificationCategory!
    title: String!
    message: String!
    data: JSON
    actionUrl: URL
    actionText: String
    priority: NotificationPriority = NORMAL
    channels: [NotificationChannel!]!
    scheduleAt: DateTime
    expiresAt: DateTime
  }

  input UserFilterInput {
    roles: [UserRole!]
    isActive: Boolean
    isPremium: Boolean
    lastLoginAfter: DateTime
    createdAfter: DateTime
    hasNotifications: Boolean
  }

  input CreateNotificationTemplateInput {
    name: String!
    description: String!
    type: NotificationType!
    category: NotificationCategory!
    titleTemplate: String!
    messageTemplate: String!
    emailTemplate: String
    smsTemplate: String
    icon: URL
    color: String
    variables: [TemplateVariableInput!]!
  }

  input UpdateNotificationTemplateInput {
    name: String
    description: String
    titleTemplate: String
    messageTemplate: String
    emailTemplate: String
    smsTemplate: String
    icon: URL
    color: String
    variables: [TemplateVariableInput!]
    isActive: Boolean
  }

  input TemplateVariableInput {
    name: String!
    description: String!
    type: VariableType!
    required: Boolean!
    defaultValue: String
  }

  # Return types
  type BulkNotificationResult {
    success: Boolean!
    totalSent: Int!
    failed: Int!
    errors: [NotificationError!]!
    scheduledId: ID
  }

  type NotificationError {
    userId: ID!
    channel: NotificationChannel!
    error: String!
  }
`;