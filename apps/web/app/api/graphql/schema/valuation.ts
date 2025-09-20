import { gql } from 'graphql-tag';

export const valuationTypeDefs = gql`
  type SiteValuation {
    id: ID!
    siteId: ID!
    site: Site!
    
    # Valuation Results
    estimatedValue: Float!
    valueRange: ValueRange!
    confidence: Float!
    grade: ValuationGrade!
    
    # Metrics Used
    monthlyRevenue: Float!
    monthlyTraffic: Int!
    domainAge: Int!
    backlinks: Int!
    domainAuthority: Float!
    pageAuthority: Float!
    
    # Revenue Analysis
    revenueMultiple: Float!
    revenueGrowth: Float!
    profitMargin: Float!
    
    # Traffic Analysis
    organicTraffic: Int!
    trafficGrowth: Float!
    trafficValue: Float!
    
    # Content Analysis
    contentQuality: Float!
    contentVolume: Int!
    contentUniqueness: Float!
    
    # Technical Analysis
    siteSpeed: Float!
    mobileOptimization: Float!
    seoScore: Float!
    
    # Market Analysis
    niche: String!
    competition: Float!
    marketTrend: Float!
    
    # Risk Assessment
    riskFactors: [RiskFactor!]!
    riskScore: Float!
    
    # Comparable Sales
    comparableSales: [ComparableSale!]!
    
    # Recommendations
    improvements: [ValuationImprovement!]!
    
    # Timestamps
    valuationDate: DateTime!
    expiresAt: DateTime!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ValueRange {
    min: Float!
    max: Float!
    median: Float!
  }

  enum ValuationGrade {
    A_PLUS
    A
    B_PLUS
    B
    C_PLUS
    C
    D
    F
  }

  type RiskFactor {
    type: RiskType!
    severity: RiskSeverity!
    description: String!
    impact: Float!
    mitigation: String
  }

  enum RiskType {
    REVENUE_CONCENTRATION
    TRAFFIC_SOURCE_DEPENDENCY
    TECHNICAL_DEBT
    CONTENT_QUALITY
    LEGAL_COMPLIANCE
    MARKET_SATURATION
    PLATFORM_DEPENDENCY
    MONETIZATION_MODEL
  }

  enum RiskSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  type ComparableSale {
    id: ID!
    domain: String!
    salePrice: Float!
    monthlyRevenue: Float!
    monthlyTraffic: Int!
    multiple: Float!
    saleDate: DateTime!
    marketplace: String!
    similarity: Float!
  }

  type ValuationImprovement {
    category: ImprovementCategory!
    title: String!
    description: String!
    estimatedImpact: Float!
    difficulty: ImprovementDifficulty!
    timeline: String!
    priority: ImprovementPriority!
  }

  enum ImprovementCategory {
    REVENUE_OPTIMIZATION
    TRAFFIC_GROWTH
    CONTENT_ENHANCEMENT
    TECHNICAL_IMPROVEMENT
    SEO_OPTIMIZATION
    USER_EXPERIENCE
    MONETIZATION
    RISK_REDUCTION
  }

  enum ImprovementDifficulty {
    EASY
    MEDIUM
    HARD
    EXPERT
  }

  enum ImprovementPriority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  # Valuation History
  type ValuationHistory {
    siteId: ID!
    valuations: [HistoricalValuation!]!
    valueGrowth: Float!
    trend: ValuationTrend!
  }

  type HistoricalValuation {
    value: Float!
    date: DateTime!
    factors: JSON!
  }

  enum ValuationTrend {
    INCREASING
    STABLE
    DECREASING
    VOLATILE
  }

  # Marketplace Listings
  type MarketplaceListing {
    id: ID!
    siteId: ID!
    site: Site!
    
    # Listing Details
    title: String!
    description: String!
    askingPrice: Float!
    reservePrice: Float
    
    # Listing Status
    status: ListingStatus!
    isActive: Boolean!
    isFeatured: Boolean!
    
    # Viewing & Interest
    views: Int!
    watchers: Int!
    inquiries: Int!
    
    # Offers
    offers: [Offer!]!
    highestOffer: Float
    
    # Marketplace Info
    marketplace: Marketplace!
    listingFee: Float!
    commissionRate: Float!
    
    # Timestamps
    listedAt: DateTime!
    expiresAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum ListingStatus {
    DRAFT
    ACTIVE
    PAUSED
    SOLD
    EXPIRED
    REMOVED
  }

  type Marketplace {
    id: ID!
    name: String!
    url: URL!
    description: String!
    logo: URL!
    commissionRate: Float!
    listingFee: Float!
    features: [String!]!
    popularity: Float!
    avgSaleTime: Int!
    successRate: Float!
  }

  type Offer {
    id: ID!
    listingId: ID!
    
    # Offer Details
    amount: Float!
    terms: String
    financing: OfferFinancing
    
    # Buyer Info
    buyerName: String!
    buyerEmail: EmailAddress!
    isVerified: Boolean!
    
    # Status
    status: OfferStatus!
    
    # Communication
    messages: [OfferMessage!]!
    
    # Timestamps
    expiresAt: DateTime!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum OfferStatus {
    PENDING
    ACCEPTED
    REJECTED
    COUNTER_OFFERED
    EXPIRED
    WITHDRAWN
  }

  type OfferFinancing {
    downPayment: Float!
    monthlyPayment: Float!
    term: Int!
    interestRate: Float!
  }

  type OfferMessage {
    id: ID!
    sender: MessageSender!
    content: String!
    attachments: [URL!]!
    createdAt: DateTime!
  }

  enum MessageSender {
    BUYER
    SELLER
    MARKETPLACE
  }

  extend type Query {
    # Valuation queries
    siteValuation(siteId: ID!): SiteValuation @auth(requires: USER)
    valuationHistory(siteId: ID!): ValuationHistory! @auth(requires: USER)
    
    # Quick valuation estimate
    quickValuation(
      domain: String!
      monthlyRevenue: Float
      monthlyTraffic: Int
    ): QuickValuationResult!
    
    # Marketplace queries
    marketplaces: [Marketplace!]!
    marketplace(id: ID!): Marketplace!
    
    # Listing queries
    marketplaceListings(
      pagination: PaginationInput
      filters: [FilterInput!]
      sort: [SortInput!]
    ): [MarketplaceListing!]!
    
    myListings(
      status: ListingStatus
      pagination: PaginationInput
    ): [MarketplaceListing!]! @auth(requires: USER)
    
    listing(id: ID!): MarketplaceListing!
    
    # Comparable sales
    comparableSales(
      niche: String
      revenueRange: PriceRangeInput
      trafficRange: IntRangeInput
      limit: Int = 10
    ): [ComparableSale!]!
  }

  extend type Mutation {
    # Valuation
    requestValuation(siteId: ID!): SiteValuation! @auth(requires: USER) @rateLimit(max: 3, window: "1d")
    updateValuation(siteId: ID!): SiteValuation! @auth(requires: USER) @rateLimit(max: 1, window: "1h")
    
    # Marketplace listings
    createListing(input: CreateListingInput!): MarketplaceListing! @auth(requires: USER)
    updateListing(id: ID!, input: UpdateListingInput!): MarketplaceListing! @auth(requires: USER)
    deleteListing(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Listing management
    activateListing(id: ID!): MarketplaceListing! @auth(requires: USER)
    pauseListing(id: ID!): MarketplaceListing! @auth(requires: USER)
    
    # Offers
    createOffer(input: CreateOfferInput!): Offer!
    updateOffer(id: ID!, input: UpdateOfferInput!): Offer! @auth(requires: USER)
    acceptOffer(id: ID!): Offer! @auth(requires: USER)
    rejectOffer(id: ID!, reason: String): Offer! @auth(requires: USER)
    counterOffer(id: ID!, amount: Float!, terms: String): Offer! @auth(requires: USER)
    withdrawOffer(id: ID!): Offer!
    
    # Communication
    sendOfferMessage(input: SendOfferMessageInput!): OfferMessage!
  }

  extend type Subscription {
    # Valuation updates
    valuationUpdated(siteId: ID!): SiteValuation! @auth(requires: USER)
    
    # Listing updates
    listingUpdated(listingId: ID!): MarketplaceListing!
    newOffer(listingId: ID!): Offer! @auth(requires: USER)
    offerUpdated(offerId: ID!): Offer!
    
    # Messages
    newOfferMessage(offerId: ID!): OfferMessage!
  }

  # Input types
  input CreateListingInput {
    siteId: ID!
    marketplaceId: ID!
    title: String!
    description: String!
    askingPrice: Float!
    reservePrice: Float
    isFeatured: Boolean = false
    expiresAt: DateTime
  }

  input UpdateListingInput {
    title: String
    description: String
    askingPrice: Float
    reservePrice: Float
    isFeatured: Boolean
    expiresAt: DateTime
  }

  input CreateOfferInput {
    listingId: ID!
    amount: Float!
    terms: String
    financing: OfferFinancingInput
    buyerName: String!
    buyerEmail: EmailAddress!
    expiresAt: DateTime!
  }

  input UpdateOfferInput {
    amount: Float
    terms: String
    financing: OfferFinancingInput
    expiresAt: DateTime
  }

  input OfferFinancingInput {
    downPayment: Float!
    monthlyPayment: Float!
    term: Int!
    interestRate: Float!
  }

  input SendOfferMessageInput {
    offerId: ID!
    content: String!
    attachments: [URL!]
  }

  input IntRangeInput {
    min: Int
    max: Int
  }

  # Return types
  type QuickValuationResult {
    estimatedValue: Float!
    valueRange: ValueRange!
    confidence: Float!
    methodology: String!
    factors: [ValuationFactor!]!
    disclaimer: String!
  }

  type ValuationFactor {
    name: String!
    value: Float!
    weight: Float!
    impact: Float!
    description: String!
  }
`;
