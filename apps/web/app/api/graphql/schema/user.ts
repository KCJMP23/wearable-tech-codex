import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  type User implements Node {
    id: ID!
    email: EmailAddress!
    name: String
    firstName: String
    lastName: String
    avatar_url: URL
    bio: String
    website: URL
    location: String
    timezone: String
    role: UserRole!
    permissions: [Permission!]!
    isActive: Boolean!
    isVerified: Boolean!
    lastLoginAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relationships
    sites: SiteConnection!
    apiKeys: [ApiKey!]! @auth(requires: USER)
    notifications: NotificationConnection!
    subscriptions: [Subscription!]!
    usageStats: UserUsageStats!
    preferences: UserPreferences!
  }

  type UserUsageStats {
    sitesCount: Int!
    productsCount: Int!
    postsCount: Int!
    totalRevenue: Float!
    totalViews: Int!
    totalClicks: Int!
    conversionRate: Float!
  }

  type UserPreferences {
    theme: String!
    language: String!
    timezone: String!
    emailNotifications: Boolean!
    pushNotifications: Boolean!
    marketingEmails: Boolean!
    weeklyReports: Boolean!
    monthlyReports: Boolean!
  }

  type ApiKey {
    id: ID!
    name: String!
    key: String! @auth(requires: USER)
    isActive: Boolean!
    lastUsedAt: DateTime
    permissions: [Permission!]!
    rateLimit: RateLimit!
    createdAt: DateTime!
    expiresAt: DateTime
  }

  type RateLimit {
    maxRequests: Int!
    windowMs: Int!
    currentUsage: Int!
    resetAt: DateTime!
  }

  type UserConnection implements Connection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type UserEdge implements Edge {
    node: User!
    cursor: String!
  }

  # User Authentication
  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
    expiresIn: Int!
  }

  type LogoutResponse {
    success: Boolean!
    message: String!
  }

  extend type Query {
    # Current user
    me: User @auth(requires: USER)
    
    # User management (admin only)
    user(id: ID!): User @auth(requires: ADMIN)
    users(
      pagination: PaginationInput
      filters: [FilterInput!]
      sort: [SortInput!]
    ): UserConnection! @auth(requires: ADMIN)
    
    # Search users
    searchUsers(
      query: String!
      limit: Int = 10
    ): [User!]! @auth(requires: ADMIN)
  }

  extend type Mutation {
    # Authentication
    login(email: EmailAddress!, password: String!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!
    logout: LogoutResponse! @auth(requires: USER)
    refreshToken(refreshToken: String!): AuthPayload!
    
    # Password management
    forgotPassword(email: EmailAddress!): MutationResponse!
    resetPassword(token: String!, password: String!): MutationResponse!
    changePassword(
      currentPassword: String!
      newPassword: String!
    ): MutationResponse! @auth(requires: USER)
    
    # Profile management
    updateProfile(input: UpdateProfileInput!): User! @auth(requires: USER)
    uploadAvatar(file: Upload!): User! @auth(requires: USER)
    deleteAccount(password: String!): MutationResponse! @auth(requires: USER)
    
    # API Key management
    createApiKey(input: CreateApiKeyInput!): ApiKey! @auth(requires: USER) @rateLimit(max: 5, window: "1h")
    updateApiKey(id: ID!, input: UpdateApiKeyInput!): ApiKey! @auth(requires: USER)
    deleteApiKey(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Admin operations
    promoteUser(id: ID!, role: UserRole!): User! @auth(requires: ADMIN)
    suspendUser(id: ID!, reason: String): User! @auth(requires: ADMIN)
    unsuspendUser(id: ID!): User! @auth(requires: ADMIN)
    deleteUser(id: ID!): MutationResponse! @auth(requires: ADMIN)
  }

  extend type Subscription {
    # User notifications
    userNotifications(userId: ID!): Notification! @auth(requires: USER)
    
    # Profile updates
    profileUpdated(userId: ID!): User! @auth(requires: USER)
  }

  # Input types
  input RegisterInput {
    email: EmailAddress!
    password: String!
    name: String!
    firstName: String
    lastName: String
    timezone: String
    acceptsTerms: Boolean!
    acceptsMarketing: Boolean = false
  }

  input UpdateProfileInput {
    name: String
    firstName: String
    lastName: String
    bio: String
    website: URL
    location: String
    timezone: String
    preferences: UserPreferencesInput
  }

  input UserPreferencesInput {
    theme: String
    language: String
    timezone: String
    emailNotifications: Boolean
    pushNotifications: Boolean
    marketingEmails: Boolean
    weeklyReports: Boolean
    monthlyReports: Boolean
  }

  input CreateApiKeyInput {
    name: String!
    permissions: [Permission!]!
    expiresAt: DateTime
    rateLimit: RateLimitInput
  }

  input UpdateApiKeyInput {
    name: String
    permissions: [Permission!]
    isActive: Boolean
    expiresAt: DateTime
    rateLimit: RateLimitInput
  }

  input RateLimitInput {
    maxRequests: Int!
    windowMs: Int!
  }
`;