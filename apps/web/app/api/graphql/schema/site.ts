import { gql } from 'graphql-tag';

export const siteTypeDefs = gql`
  type Site implements Node {
    id: ID!
    name: String!
    slug: String!
    domain: String
    subdomain: String
    customDomain: String
    isCustomDomainVerified: Boolean!
    
    # Content & Branding
    title: String
    description: String
    logo: URL
    favicon: URL
    socialImage: URL
    
    # Theme & Design
    themeId: String
    theme: Theme
    customCSS: String
    settings: JSON
    
    # Status & Configuration
    isActive: Boolean!
    isPublic: Boolean!
    isPremium: Boolean!
    maintenanceMode: Boolean!
    
    # SEO & Analytics
    seoTitle: String
    seoDescription: String
    seoKeywords: [String!]
    analyticsId: String
    gtmId: String
    
    # Monetization
    affiliateDisclaimer: String
    cookiePolicy: String
    privacyPolicy: String
    termsOfService: String
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    publishedAt: DateTime
    
    # Relationships
    owner: User!
    collaborators: [SiteCollaborator!]!
    products: ProductConnection!
    posts: PostConnection!
    categories: [Category!]!
    tags: [Tag!]!
    pages: [Page!]!
    menus: [Menu!]!
    
    # Analytics & Performance
    analytics: SiteAnalytics
    performance: SitePerformance
    seo: SiteSEO
    
    # Valuation
    valuation: SiteValuation
    
    # Backups
    backups: [SiteBackup!]!
    
    # Plugins & Integrations
    plugins: [SitePlugin!]!
    integrations: [SiteIntegration!]!
  }

  type SiteCollaborator {
    id: ID!
    user: User!
    role: CollaboratorRole!
    permissions: [Permission!]!
    invitedAt: DateTime!
    acceptedAt: DateTime
    isActive: Boolean!
  }

  enum CollaboratorRole {
    OWNER
    ADMIN
    EDITOR
    CONTRIBUTOR
    VIEWER
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    description: String
    parent: Category
    children: [Category!]!
    image: URL
    seoTitle: String
    seoDescription: String
    productCount: Int!
    postCount: Int!
    isActive: Boolean!
    sortOrder: Int!
    createdAt: DateTime!
  }

  type Tag {
    id: ID!
    name: String!
    slug: String!
    description: String
    color: String
    productCount: Int!
    postCount: Int!
    createdAt: DateTime!
  }

  type Page {
    id: ID!
    title: String!
    slug: String!
    content: String!
    excerpt: String
    featuredImage: URL
    template: String
    isPublished: Boolean!
    seoTitle: String
    seoDescription: String
    publishedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Menu {
    id: ID!
    name: String!
    location: String!
    items: [MenuItem!]!
    isActive: Boolean!
    createdAt: DateTime!
  }

  type MenuItem {
    id: ID!
    label: String!
    url: String
    type: MenuItemType!
    target: String
    cssClass: String
    parent: MenuItem
    children: [MenuItem!]!
    sortOrder: Int!
    isActive: Boolean!
  }

  enum MenuItemType {
    CUSTOM
    PAGE
    CATEGORY
    POST
    PRODUCT
    EXTERNAL
  }

  type SiteBackup {
    id: ID!
    name: String!
    description: String
    size: Int!
    status: BackupStatus!
    type: BackupType!
    downloadUrl: URL
    createdAt: DateTime!
    expiresAt: DateTime
  }

  enum BackupStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    FAILED
    EXPIRED
  }

  enum BackupType {
    FULL
    INCREMENTAL
    MANUAL
    SCHEDULED
  }

  type SitePlugin {
    id: ID!
    plugin: Plugin!
    isActive: Boolean!
    settings: JSON
    version: String!
    installedAt: DateTime!
    updatedAt: DateTime!
  }

  type Plugin {
    id: ID!
    name: String!
    description: String!
    version: String!
    author: String!
    icon: URL
    category: String!
    price: Float
    isPremium: Boolean!
    rating: Float
    downloads: Int!
    features: [String!]!
    requirements: JSON
    documentation: URL
    support: URL
  }

  type SiteIntegration {
    id: ID!
    integration: Integration!
    isActive: Boolean!
    settings: JSON
    credentials: JSON @auth(requires: ADMIN)
    status: IntegrationStatus!
    lastSyncAt: DateTime
    errorMessage: String
    installedAt: DateTime!
  }

  type Integration {
    id: ID!
    name: String!
    description: String!
    icon: URL
    category: IntegrationCategory!
    provider: String!
    webhook: URL
    authType: AuthType!
    features: [String!]!
    pricing: IntegrationPricing
    documentation: URL
  }

  enum IntegrationCategory {
    ANALYTICS
    EMAIL_MARKETING
    AFFILIATE_NETWORK
    PAYMENT
    SOCIAL_MEDIA
    SEO
    BACKUP
    SECURITY
    PERFORMANCE
  }

  enum IntegrationStatus {
    CONNECTED
    DISCONNECTED
    ERROR
    PENDING
    SYNCING
  }

  enum AuthType {
    API_KEY
    OAUTH2
    BASIC_AUTH
    WEBHOOK
    NO_AUTH
  }

  type IntegrationPricing {
    type: PricingType!
    price: Float
    currency: String
    billingCycle: BillingCycle
    freeQuota: Int
  }

  enum PricingType {
    FREE
    PAID
    FREEMIUM
    USAGE_BASED
  }

  enum BillingCycle {
    MONTHLY
    YEARLY
    ONE_TIME
    USAGE_BASED
  }

  type SiteConnection implements Connection {
    edges: [SiteEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type SiteEdge implements Edge {
    node: Site!
    cursor: String!
  }

  extend type Query {
    # Site queries
    site(id: ID, slug: String, domain: String): Site
    sites(
      pagination: PaginationInput
      filters: [FilterInput!]
      sort: [SortInput!]
    ): SiteConnection! @auth(requires: USER)
    
    # My sites
    mySites(
      pagination: PaginationInput
      filters: [FilterInput!]
    ): SiteConnection! @auth(requires: USER)
    
    # Site search
    searchSites(
      query: String!
      limit: Int = 10
    ): [Site!]! @auth(requires: USER)
    
    # Site availability
    checkSlugAvailability(slug: String!): Boolean!
    checkDomainAvailability(domain: String!): Boolean!
    
    # Categories and tags
    categories(siteId: ID!): [Category!]!
    tags(siteId: ID!): [Tag!]!
    
    # Plugins and integrations
    availablePlugins(
      category: String
      search: String
      pagination: PaginationInput
    ): [Plugin!]!
    
    availableIntegrations(
      category: IntegrationCategory
      search: String
    ): [Integration!]!
  }

  extend type Mutation {
    # Site management
    createSite(input: CreateSiteInput!): Site! @auth(requires: USER) @rateLimit(max: 10, window: "1h")
    updateSite(id: ID!, input: UpdateSiteInput!): Site! @auth(requires: USER)
    deleteSite(id: ID!): MutationResponse! @auth(requires: USER)
    duplicateSite(id: ID!, name: String!): Site! @auth(requires: USER)
    
    # Domain management
    setCustomDomain(siteId: ID!, domain: String!): Site! @auth(requires: USER)
    verifyCustomDomain(siteId: ID!): Site! @auth(requires: USER)
    removeCustomDomain(siteId: ID!): Site! @auth(requires: USER)
    
    # Collaborator management
    inviteCollaborator(
      siteId: ID!
      email: EmailAddress!
      role: CollaboratorRole!
    ): SiteCollaborator! @auth(requires: USER)
    
    updateCollaborator(
      id: ID!
      role: CollaboratorRole
      permissions: [Permission!]
    ): SiteCollaborator! @auth(requires: USER)
    
    removeCollaborator(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Content management
    createCategory(input: CreateCategoryInput!): Category! @auth(requires: USER)
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category! @auth(requires: USER)
    deleteCategory(id: ID!): MutationResponse! @auth(requires: USER)
    
    createTag(input: CreateTagInput!): Tag! @auth(requires: USER)
    updateTag(id: ID!, input: UpdateTagInput!): Tag! @auth(requires: USER)
    deleteTag(id: ID!): MutationResponse! @auth(requires: USER)
    
    createPage(input: CreatePageInput!): Page! @auth(requires: USER)
    updatePage(id: ID!, input: UpdatePageInput!): Page! @auth(requires: USER)
    deletePage(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Menu management
    createMenu(input: CreateMenuInput!): Menu! @auth(requires: USER)
    updateMenu(id: ID!, input: UpdateMenuInput!): Menu! @auth(requires: USER)
    deleteMenu(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Backup management
    createBackup(
      siteId: ID!
      name: String!
      description: String
      type: BackupType = MANUAL
    ): SiteBackup! @auth(requires: USER) @rateLimit(max: 3, window: "1d")
    
    restoreBackup(backupId: ID!): MutationResponse! @auth(requires: USER)
    deleteBackup(backupId: ID!): MutationResponse! @auth(requires: USER)
    
    # Plugin management
    installPlugin(siteId: ID!, pluginId: ID!): SitePlugin! @auth(requires: USER)
    updatePlugin(sitePluginId: ID!, settings: JSON): SitePlugin! @auth(requires: USER)
    uninstallPlugin(sitePluginId: ID!): MutationResponse! @auth(requires: USER)
    
    # Integration management
    connectIntegration(
      siteId: ID!
      integrationId: ID!
      credentials: JSON!
      settings: JSON
    ): SiteIntegration! @auth(requires: USER)
    
    updateIntegration(
      siteIntegrationId: ID!
      settings: JSON
      credentials: JSON
    ): SiteIntegration! @auth(requires: USER)
    
    disconnectIntegration(siteIntegrationId: ID!): MutationResponse! @auth(requires: USER)
    syncIntegration(siteIntegrationId: ID!): SiteIntegration! @auth(requires: USER)
  }

  extend type Subscription {
    # Site updates
    siteUpdated(siteId: ID!): Site! @auth(requires: USER)
    siteDeleted(siteId: ID!): ID! @auth(requires: USER)
    
    # Backup progress
    backupProgress(backupId: ID!): SiteBackup! @auth(requires: USER)
    
    # Integration status
    integrationStatus(integrationId: ID!): SiteIntegration! @auth(requires: USER)
  }

  # Input types
  input CreateSiteInput {
    name: String!
    slug: String
    description: String
    themeId: String
    isPublic: Boolean = true
    settings: JSON
  }

  input UpdateSiteInput {
    name: String
    description: String
    title: String
    logo: URL
    favicon: URL
    socialImage: URL
    themeId: String
    customCSS: String
    settings: JSON
    isActive: Boolean
    isPublic: Boolean
    maintenanceMode: Boolean
    seoTitle: String
    seoDescription: String
    seoKeywords: [String!]
    analyticsId: String
    gtmId: String
    affiliateDisclaimer: String
    cookiePolicy: String
    privacyPolicy: String
    termsOfService: String
  }

  input CreateCategoryInput {
    siteId: ID!
    name: String!
    slug: String
    description: String
    parentId: ID
    image: URL
    seoTitle: String
    seoDescription: String
    sortOrder: Int
  }

  input UpdateCategoryInput {
    name: String
    slug: String
    description: String
    parentId: ID
    image: URL
    seoTitle: String
    seoDescription: String
    isActive: Boolean
    sortOrder: Int
  }

  input CreateTagInput {
    siteId: ID!
    name: String!
    slug: String
    description: String
    color: String
  }

  input UpdateTagInput {
    name: String
    slug: String
    description: String
    color: String
  }

  input CreatePageInput {
    siteId: ID!
    title: String!
    slug: String
    content: String!
    excerpt: String
    featuredImage: URL
    template: String
    isPublished: Boolean = false
    seoTitle: String
    seoDescription: String
  }

  input UpdatePageInput {
    title: String
    slug: String
    content: String
    excerpt: String
    featuredImage: URL
    template: String
    isPublished: Boolean
    seoTitle: String
    seoDescription: String
  }

  input CreateMenuInput {
    siteId: ID!
    name: String!
    location: String!
    items: [MenuItemInput!]
  }

  input UpdateMenuInput {
    name: String
    location: String
    items: [MenuItemInput!]
    isActive: Boolean
  }

  input MenuItemInput {
    label: String!
    url: String
    type: MenuItemType!
    target: String
    cssClass: String
    parentId: ID
    sortOrder: Int
    isActive: Boolean = true
  }
`;