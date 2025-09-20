import { gql } from 'graphql-tag';

export const marketplaceTypeDefs = gql`
  # Plugin Marketplace
  type PluginMarketplace {
    plugins: [MarketplacePlugin!]!
    categories: [PluginCategory!]!
    featured: [MarketplacePlugin!]!
    popular: [MarketplacePlugin!]!
    recent: [MarketplacePlugin!]!
  }

  type MarketplacePlugin {
    id: ID!
    name: String!
    description: String!
    shortDescription: String!
    version: String!
    author: PluginAuthor!
    
    # Media
    icon: URL!
    screenshots: [URL!]!
    banner: URL
    
    # Pricing
    price: Float!
    isPremium: Boolean!
    isFreemium: Boolean!
    pricingModel: PricingModel!
    
    # Stats
    downloads: Int!
    activeInstalls: Int!
    rating: Float!
    reviewCount: Int!
    
    # Categorization
    category: PluginCategory!
    tags: [String!]!
    
    # Technical
    compatibility: [String!]!
    requirements: JSON!
    features: [String!]!
    
    # Support & Documentation
    documentation: URL
    support: URL
    demo: URL
    changelog: URL
    
    # Status
    isActive: Boolean!
    isVerified: Boolean!
    lastUpdated: DateTime!
    
    # Reviews
    reviews: PluginReviewConnection!
  }

  type PluginAuthor {
    id: ID!
    name: String!
    email: EmailAddress!
    website: URL
    avatar: URL
    bio: String
    isVerified: Boolean!
    plugins: [MarketplacePlugin!]!
    totalDownloads: Int!
    averageRating: Float!
  }

  type PluginCategory {
    id: ID!
    name: String!
    slug: String!
    description: String!
    icon: URL
    pluginCount: Int!
    isActive: Boolean!
  }

  enum PricingModel {
    FREE
    ONE_TIME
    SUBSCRIPTION
    FREEMIUM
    USAGE_BASED
  }

  type PluginReview {
    id: ID!
    plugin: MarketplacePlugin!
    user: User!
    rating: Float!
    title: String!
    content: String!
    isVerified: Boolean!
    helpful: Int!
    version: String!
    createdAt: DateTime!
  }

  type PluginReviewConnection implements Connection {
    edges: [PluginReviewEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    averageRating: Float!
    ratingDistribution: [RatingDistribution!]!
  }

  type PluginReviewEdge implements Edge {
    node: PluginReview!
    cursor: String!
  }

  # Theme Marketplace
  type ThemeMarketplace {
    themes: [MarketplaceTheme!]!
    categories: [ThemeCategory!]!
    featured: [MarketplaceTheme!]!
    popular: [MarketplaceTheme!]!
    recent: [MarketplaceTheme!]!
  }

  type MarketplaceTheme {
    id: ID!
    name: String!
    description: String!
    version: String!
    author: ThemeAuthor!
    
    # Media
    thumbnail: URL!
    screenshots: [URL!]!
    previewUrl: URL
    
    # Pricing
    price: Float!
    isPremium: Boolean!
    
    # Stats
    downloads: Int!
    activeInstalls: Int!
    rating: Float!
    reviewCount: Int!
    
    # Categorization
    category: ThemeCategory!
    tags: [String!]!
    
    # Features
    features: [String!]!
    demoContent: Boolean!
    responsive: Boolean!
    rtlSupport: Boolean!
    
    # Technical
    compatibility: [String!]!
    requirements: JSON!
    
    # Support
    documentation: URL
    support: URL
    
    # Status
    isActive: Boolean!
    isVerified: Boolean!
    lastUpdated: DateTime!
    
    # Reviews
    reviews: ThemeReviewConnection!
  }

  type ThemeAuthor {
    id: ID!
    name: String!
    email: EmailAddress!
    website: URL
    avatar: URL
    bio: String
    isVerified: Boolean!
    themes: [MarketplaceTheme!]!
    totalDownloads: Int!
    averageRating: Float!
  }

  type ThemeReviewConnection implements Connection {
    edges: [ThemeReviewEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    averageRating: Float!
    ratingDistribution: [RatingDistribution!]!
  }

  type ThemeReviewEdge implements Edge {
    node: ThemeReview!
    cursor: String!
  }

  # Service Marketplace
  type ServiceMarketplace {
    services: [MarketplaceService!]!
    categories: [ServiceCategory!]!
    featured: [MarketplaceService!]!
    topRated: [MarketplaceService!]!
  }

  type MarketplaceService {
    id: ID!
    title: String!
    description: String!
    provider: ServiceProvider!
    
    # Media
    images: [URL!]!
    video: URL
    
    # Pricing
    startingPrice: Float!
    pricingType: ServicePricingType!
    packages: [ServicePackage!]!
    
    # Stats
    ordersCompleted: Int!
    rating: Float!
    reviewCount: Int!
    responseTime: String!
    
    # Categorization
    category: ServiceCategory!
    subcategory: String!
    tags: [String!]!
    
    # Service Details
    deliveryTime: String!
    revisions: Int!
    features: [String!]!
    extras: [ServiceExtra!]!
    
    # Requirements
    requirements: [ServiceRequirement!]!
    
    # Status
    isActive: Boolean!
    isPromoted: Boolean!
    
    # Reviews
    reviews: ServiceReviewConnection!
  }

  type ServiceProvider {
    id: ID!
    name: String!
    avatar: URL
    bio: String!
    location: String
    languages: [String!]!
    skills: [String!]!
    rating: Float!
    reviewCount: Int!
    completedOrders: Int!
    responseRate: Float!
    onTime: Float!
    memberSince: DateTime!
    isVerified: Boolean!
    level: ProviderLevel!
  }

  enum ProviderLevel {
    NEW_SELLER
    LEVEL_1
    LEVEL_2
    TOP_RATED
  }

  enum ServicePricingType {
    FIXED
    HOURLY
    PACKAGE
    CUSTOM
  }

  type ServicePackage {
    id: ID!
    name: String!
    description: String!
    price: Float!
    deliveryTime: String!
    revisions: Int!
    features: [String!]!
  }

  type ServiceExtra {
    id: ID!
    title: String!
    description: String!
    price: Float!
    deliveryTime: String!
  }

  type ServiceRequirement {
    id: ID!
    question: String!
    type: RequirementType!
    required: Boolean!
    options: [String!]
  }

  enum RequirementType {
    TEXT
    TEXTAREA
    SELECT
    MULTI_SELECT
    FILE
    URL
  }

  type ServiceCategory {
    id: ID!
    name: String!
    slug: String!
    description: String!
    icon: URL
    serviceCount: Int!
    subcategories: [String!]!
  }

  type ServiceReview {
    id: ID!
    service: MarketplaceService!
    buyer: User!
    rating: Float!
    title: String!
    content: String!
    orderValue: Float!
    isVerified: Boolean!
    helpful: Int!
    createdAt: DateTime!
  }

  type ServiceReviewConnection implements Connection {
    edges: [ServiceReviewEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    averageRating: Float!
    ratingDistribution: [RatingDistribution!]!
  }

  type ServiceReviewEdge implements Edge {
    node: ServiceReview!
    cursor: String!
  }

  extend type Query {
    # Plugin Marketplace
    pluginMarketplace: PluginMarketplace!
    marketplacePlugin(id: ID!): MarketplacePlugin
    searchPlugins(
      query: String!
      category: String
      priceRange: PriceRangeInput
      rating: Float
      pagination: PaginationInput
    ): [MarketplacePlugin!]!
    
    # Theme Marketplace  
    themeMarketplace: ThemeMarketplace!
    marketplaceTheme(id: ID!): MarketplaceTheme
    searchThemes(
      query: String!
      category: ThemeCategory
      priceRange: PriceRangeInput
      rating: Float
      pagination: PaginationInput
    ): [MarketplaceTheme!]!
    
    # Service Marketplace
    serviceMarketplace: ServiceMarketplace!
    marketplaceService(id: ID!): MarketplaceService
    searchServices(
      query: String!
      category: String
      priceRange: PriceRangeInput
      deliveryTime: String
      rating: Float
      pagination: PaginationInput
    ): [MarketplaceService!]!
    
    # Provider queries
    serviceProvider(id: ID!): ServiceProvider
    
    # Reviews
    pluginReviews(
      pluginId: ID!
      pagination: PaginationInput
      rating: Int
    ): PluginReviewConnection!
    
    themeReviews(
      themeId: ID!
      pagination: PaginationInput
      rating: Int
    ): ThemeReviewConnection!
    
    serviceReviews(
      serviceId: ID!
      pagination: PaginationInput
      rating: Int
    ): ServiceReviewConnection!
  }

  extend type Mutation {
    # Plugin operations
    purchasePlugin(pluginId: ID!): PurchaseResult! @auth(requires: USER)
    
    # Theme operations
    purchaseTheme(themeId: ID!): PurchaseResult! @auth(requires: USER)
    
    # Service operations
    requestServiceQuote(
      serviceId: ID!
      packageId: ID
      requirements: [ServiceRequirementResponseInput!]!
      message: String
    ): ServiceQuoteRequest! @auth(requires: USER)
    
    orderService(
      serviceId: ID!
      packageId: ID!
      extras: [ID!]
      requirements: [ServiceRequirementResponseInput!]!
    ): ServiceOrder! @auth(requires: USER)
    
    # Reviews
    createPluginReview(input: CreatePluginReviewInput!): PluginReview! @auth(requires: USER)
    createThemeReview(input: CreateThemeReviewInput!): ThemeReview! @auth(requires: USER)
    createServiceReview(input: CreateServiceReviewInput!): ServiceReview! @auth(requires: USER)
    
    updatePluginReview(id: ID!, input: UpdatePluginReviewInput!): PluginReview! @auth(requires: USER)
    updateThemeReview(id: ID!, input: UpdateThemeReviewInput!): ThemeReview! @auth(requires: USER)
    updateServiceReview(id: ID!, input: UpdateServiceReviewInput!): ServiceReview! @auth(requires: USER)
    
    deletePluginReview(id: ID!): MutationResponse! @auth(requires: USER)
    deleteThemeReview(id: ID!): MutationResponse! @auth(requires: USER)
    deleteServiceReview(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Helpful votes
    markReviewHelpful(reviewId: ID!, type: ReviewType!): Boolean!
  }

  # Input types
  input ServiceRequirementResponseInput {
    requirementId: ID!
    response: String!
    files: [Upload!]
  }

  input CreatePluginReviewInput {
    pluginId: ID!
    rating: Float!
    title: String!
    content: String!
    version: String!
  }

  input UpdatePluginReviewInput {
    rating: Float
    title: String
    content: String
  }

  input CreateThemeReviewInput {
    themeId: ID!
    rating: Float!
    title: String!
    content: String!
  }

  input UpdateThemeReviewInput {
    rating: Float
    title: String
    content: String
  }

  input CreateServiceReviewInput {
    serviceId: ID!
    orderId: ID!
    rating: Float!
    title: String!
    content: String!
  }

  input UpdateServiceReviewInput {
    rating: Float
    title: String
    content: String
  }

  enum ReviewType {
    PLUGIN
    THEME
    SERVICE
  }

  # Return types
  type PurchaseResult {
    success: Boolean!
    message: String!
    downloadUrl: URL
    licenseKey: String
    order: Order
  }

  type Order {
    id: ID!
    itemId: ID!
    itemType: OrderItemType!
    price: Float!
    status: OrderStatus!
    createdAt: DateTime!
  }

  enum OrderItemType {
    PLUGIN
    THEME
    SERVICE
  }

  enum OrderStatus {
    PENDING
    COMPLETED
    CANCELLED
    REFUNDED
  }

  type ServiceQuoteRequest {
    id: ID!
    service: MarketplaceService!
    message: String
    estimatedPrice: Float!
    estimatedDelivery: String!
    status: QuoteStatus!
    expiresAt: DateTime!
    createdAt: DateTime!
  }

  enum QuoteStatus {
    PENDING
    ACCEPTED
    DECLINED
    EXPIRED
  }

  type ServiceOrder {
    id: ID!
    service: MarketplaceService!
    buyer: User!
    provider: ServiceProvider!
    package: ServicePackage!
    extras: [ServiceExtra!]!
    totalPrice: Float!
    status: ServiceOrderStatus!
    deliveryDate: DateTime!
    requirements: [ServiceRequirementResponse!]!
    messages: [OrderMessage!]!
    deliverables: [OrderDeliverable!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum ServiceOrderStatus {
    PENDING
    IN_PROGRESS
    DELIVERED
    REVISION_REQUESTED
    COMPLETED
    CANCELLED
    DISPUTED
  }

  type ServiceRequirementResponse {
    requirement: ServiceRequirement!
    response: String!
    files: [URL!]!
  }

  type OrderMessage {
    id: ID!
    sender: MessageSender!
    content: String!
    attachments: [URL!]!
    createdAt: DateTime!
  }

  type OrderDeliverable {
    id: ID!
    name: String!
    description: String!
    files: [URL!]!
    createdAt: DateTime!
  }
`;