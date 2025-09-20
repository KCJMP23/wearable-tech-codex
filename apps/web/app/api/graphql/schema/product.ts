import { gql } from 'graphql-tag';

export const productTypeDefs = gql`
  type Product implements Node {
    id: ID!
    siteId: ID!
    site: Site!
    
    # Basic Information
    name: String!
    slug: String!
    description: String
    shortDescription: String
    features: [String!]
    specifications: JSON
    
    # Pricing & Commerce
    price: Float
    originalPrice: Float
    salePrice: Float
    currency: String!
    priceHistory: [PriceHistoryItem!]!
    isOnSale: Boolean!
    discountPercentage: Float
    
    # Affiliate Information
    affiliateLink: String!
    affiliateNetwork: AffiliateNetwork
    affiliateId: String
    commission: Float
    commissionType: CommissionType!
    
    # Images & Media
    images: [ProductImage!]!
    videos: [ProductVideo!]!
    featuredImage: URL
    gallery: [URL!]
    
    # Categorization
    categories: [Category!]!
    tags: [Tag!]!
    brand: Brand
    
    # Ratings & Reviews
    rating: Float
    reviewCount: Int!
    reviews: ProductReviewConnection!
    
    # Inventory & Availability
    inStock: Boolean!
    stockQuantity: Int
    availability: AvailabilityStatus!
    
    # SEO & Meta
    seoTitle: String
    seoDescription: String
    seoKeywords: [String!]
    
    # Status & Publishing
    status: ProductStatus!
    isPublished: Boolean!
    isFeatured: Boolean!
    publishedAt: DateTime
    
    # Analytics & Performance
    views: Int!
    clicks: Int!
    conversions: Int!
    conversionRate: Float!
    revenue: Float!
    
    # AI & Automation
    aiGenerated: Boolean!
    lastUpdatedBy: String
    autoUpdate: Boolean!
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    lastCheckedAt: DateTime
    
    # Related Products
    relatedProducts: [Product!]!
    similarProducts: [Product!]!
    bundleProducts: [Product!]!
    
    # Comparison
    comparisonProducts: [Product!]!
    competitorProducts: [CompetitorProduct!]!
    
    # Social Proof
    socialMentions: Int!
    trendingScore: Float!
    
    # Rich Data
    structuredData: JSON
    schema: JSON
  }

  type ProductImage {
    id: ID!
    url: URL!
    alt: String
    caption: String
    isMain: Boolean!
    sortOrder: Int!
    width: Int
    height: Int
    size: Int
  }

  type ProductVideo {
    id: ID!
    url: URL!
    title: String
    description: String
    thumbnail: URL
    duration: Int
    platform: VideoPlatform!
    embedCode: String
  }

  enum VideoPlatform {
    YOUTUBE
    VIMEO
    SELF_HOSTED
    AMAZON
  }

  type Brand {
    id: ID!
    name: String!
    slug: String!
    logo: URL
    description: String
    website: URL
    products: ProductConnection!
    isVerified: Boolean!
    rating: Float
    foundedYear: Int
  }

  type PriceHistoryItem {
    id: ID!
    price: Float!
    date: DateTime!
    source: String!
  }

  enum CommissionType {
    PERCENTAGE
    FIXED
    TIERED
    PERFORMANCE_BASED
  }

  enum AvailabilityStatus {
    IN_STOCK
    OUT_OF_STOCK
    PREORDER
    BACKORDER
    DISCONTINUED
    UNKNOWN
  }

  enum ProductStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
    PENDING_REVIEW
    REJECTED
  }

  type ProductReview {
    id: ID!
    product: Product!
    author: String!
    authorEmail: EmailAddress
    rating: Float!
    title: String!
    content: String!
    pros: [String!]
    cons: [String!]
    verified: Boolean!
    helpful: Int!
    notHelpful: Int!
    images: [URL!]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProductReviewConnection implements Connection {
    edges: [ProductReviewEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    averageRating: Float!
    ratingDistribution: [RatingDistribution!]!
  }

  type ProductReviewEdge implements Edge {
    node: ProductReview!
    cursor: String!
  }

  type RatingDistribution {
    rating: Int!
    count: Int!
    percentage: Float!
  }

  type CompetitorProduct {
    id: ID!
    name: String!
    price: Float
    url: URL!
    source: String!
    lastChecked: DateTime!
    isAvailable: Boolean!
  }

  type ProductConnection implements Connection {
    edges: [ProductEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    facets: [ProductFacet!]!
  }

  type ProductEdge implements Edge {
    node: Product!
    cursor: String!
    relevance: Float
  }

  type ProductFacet {
    field: String!
    values: [ProductFacetValue!]!
  }

  type ProductFacetValue {
    value: String!
    count: Int!
    selected: Boolean!
  }

  # Product Analytics
  type ProductAnalytics {
    productId: ID!
    period: String!
    views: Int!
    clicks: Int!
    conversions: Int!
    revenue: Float!
    conversionRate: Float!
    avgTimeOnPage: Int!
    bounceRate: Float!
    topReferrers: [ReferrerStat!]!
    topCountries: [CountryStat!]!
    deviceBreakdown: [DeviceStat!]!
  }

  type ReferrerStat {
    source: String!
    visits: Int!
    conversions: Int!
    revenue: Float!
  }

  type CountryStat {
    country: String!
    visits: Int!
    conversions: Int!
    revenue: Float!
  }

  type DeviceStat {
    device: String!
    visits: Int!
    conversions: Int!
    revenue: Float!
  }

  extend type Query {
    # Product queries
    product(id: ID, slug: String): Product
    products(
      siteId: ID
      pagination: PaginationInput
      filters: [FilterInput!]
      sort: [SortInput!]
      search: String
      categoryIds: [ID!]
      tagIds: [ID!]
      brandIds: [ID!]
      priceRange: PriceRangeInput
      inStock: Boolean
      featured: Boolean
    ): ProductConnection!
    
    # Product search with facets
    searchProducts(
      query: String!
      siteId: ID
      filters: [FilterInput!]
      facets: [String!]
      pagination: PaginationInput
    ): ProductConnection!
    
    # Product recommendations
    recommendedProducts(
      productId: ID!
      type: RecommendationType = RELATED
      limit: Int = 10
    ): [Product!]!
    
    # Product comparison
    compareProducts(productIds: [ID!]!): ProductComparison!
    
    # Product analytics
    productAnalytics(
      productId: ID!
      period: String = "7d"
    ): ProductAnalytics! @auth(requires: USER)
    
    # Brand queries
    brand(id: ID, slug: String): Brand
    brands(
      siteId: ID
      pagination: PaginationInput
      search: String
    ): [Brand!]!
    
    # Product reviews
    productReviews(
      productId: ID!
      pagination: PaginationInput
      rating: Int
      verified: Boolean
    ): ProductReviewConnection!
  }

  extend type Mutation {
    # Product management
    createProduct(input: CreateProductInput!): Product! @auth(requires: USER)
    updateProduct(id: ID!, input: UpdateProductInput!): Product! @auth(requires: USER)
    deleteProduct(id: ID!): MutationResponse! @auth(requires: USER)
    duplicateProduct(id: ID!, siteId: ID): Product! @auth(requires: USER)
    
    # Bulk operations
    bulkUpdateProducts(
      productIds: [ID!]!
      input: BulkUpdateProductInput!
    ): [Product!]! @auth(requires: USER)
    
    bulkDeleteProducts(productIds: [ID!]!): MutationResponse! @auth(requires: USER)
    
    # Product import/export
    importProducts(
      siteId: ID!
      source: ImportSource!
      data: String!
      options: ImportOptionsInput
    ): ImportResult! @auth(requires: USER) @rateLimit(max: 3, window: "1h")
    
    exportProducts(
      siteId: ID!
      format: ExportFormat!
      filters: [FilterInput!]
    ): ExportResult! @auth(requires: USER)
    
    # Product media
    uploadProductImage(
      productId: ID!
      file: Upload!
      alt: String
      isMain: Boolean = false
    ): ProductImage! @auth(requires: USER)
    
    updateProductImage(
      imageId: ID!
      alt: String
      caption: String
      sortOrder: Int
    ): ProductImage! @auth(requires: USER)
    
    deleteProductImage(imageId: ID!): MutationResponse! @auth(requires: USER)
    
    # Product categorization
    assignCategories(
      productId: ID!
      categoryIds: [ID!]!
    ): Product! @auth(requires: USER)
    
    assignTags(
      productId: ID!
      tagIds: [ID!]!
    ): Product! @auth(requires: USER)
    
    # Product reviews
    createProductReview(input: CreateProductReviewInput!): ProductReview!
    updateProductReview(id: ID!, input: UpdateProductReviewInput!): ProductReview!
    deleteProductReview(id: ID!): MutationResponse! @auth(requires: USER)
    moderateProductReview(id: ID!, approved: Boolean!): ProductReview! @auth(requires: USER)
    
    # Product automation
    generateProductDescription(
      productId: ID!
      style: ContentStyle = PROFESSIONAL
    ): Product! @auth(requires: USER) @rateLimit(max: 10, window: "1h")
    
    updateProductPrices(siteId: ID!): [Product!]! @auth(requires: USER) @rateLimit(max: 1, window: "1h")
    
    # Brand management
    createBrand(input: CreateBrandInput!): Brand! @auth(requires: USER)
    updateBrand(id: ID!, input: UpdateBrandInput!): Brand! @auth(requires: USER)
    deleteBrand(id: ID!): MutationResponse! @auth(requires: USER)
  }

  extend type Subscription {
    # Product updates
    productUpdated(productId: ID!): Product! @auth(requires: USER)
    productAdded(siteId: ID!): Product! @auth(requires: USER)
    productDeleted(siteId: ID!): ID! @auth(requires: USER)
    
    # Price updates
    priceUpdated(productId: ID!): Product!
    
    # Stock updates
    stockUpdated(productId: ID!): Product!
    
    # Review updates
    reviewAdded(productId: ID!): ProductReview!
  }

  # Enums
  enum RecommendationType {
    RELATED
    SIMILAR
    FREQUENTLY_BOUGHT_TOGETHER
    TRENDING
    RECENTLY_VIEWED
    PRICE_SIMILAR
  }

  enum ImportSource {
    CSV
    AMAZON
    SHOPIFY
    WOOCOMMERCE
    API
    XML
    JSON
  }

  enum ExportFormat {
    CSV
    JSON
    XML
    XLSX
  }

  enum ContentStyle {
    PROFESSIONAL
    CASUAL
    TECHNICAL
    MARKETING
    CONVERSATIONAL
  }

  # Input types
  input CreateProductInput {
    siteId: ID!
    name: String!
    slug: String
    description: String
    shortDescription: String
    features: [String!]
    specifications: JSON
    price: Float
    originalPrice: Float
    currency: String = "USD"
    affiliateLink: String!
    affiliateNetworkId: ID
    affiliateId: String
    commission: Float
    commissionType: CommissionType = PERCENTAGE
    images: [ProductImageInput!]
    categoryIds: [ID!]
    tagIds: [ID!]
    brandId: ID
    inStock: Boolean = true
    stockQuantity: Int
    isPublished: Boolean = false
    isFeatured: Boolean = false
    seoTitle: String
    seoDescription: String
    seoKeywords: [String!]
    autoUpdate: Boolean = true
  }

  input UpdateProductInput {
    name: String
    slug: String
    description: String
    shortDescription: String
    features: [String!]
    specifications: JSON
    price: Float
    originalPrice: Float
    salePrice: Float
    currency: String
    affiliateLink: String
    affiliateNetworkId: ID
    affiliateId: String
    commission: Float
    commissionType: CommissionType
    categoryIds: [ID!]
    tagIds: [ID!]
    brandId: ID
    inStock: Boolean
    stockQuantity: Int
    status: ProductStatus
    isPublished: Boolean
    isFeatured: Boolean
    seoTitle: String
    seoDescription: String
    seoKeywords: [String!]
    autoUpdate: Boolean
  }

  input BulkUpdateProductInput {
    categoryIds: [ID!]
    tagIds: [ID!]
    brandId: ID
    status: ProductStatus
    isPublished: Boolean
    isFeatured: Boolean
    commission: Float
    commissionType: CommissionType
  }

  input ProductImageInput {
    url: URL!
    alt: String
    caption: String
    isMain: Boolean = false
    sortOrder: Int
  }

  input PriceRangeInput {
    min: Float
    max: Float
  }

  input ImportOptionsInput {
    updateExisting: Boolean = false
    publishAfterImport: Boolean = false
    defaultCategory: ID
    defaultBrand: ID
    skipDuplicates: Boolean = true
  }

  input CreateProductReviewInput {
    productId: ID!
    author: String!
    authorEmail: EmailAddress
    rating: Float!
    title: String!
    content: String!
    pros: [String!]
    cons: [String!]
    images: [URL!]
  }

  input UpdateProductReviewInput {
    rating: Float
    title: String
    content: String
    pros: [String!]
    cons: [String!]
    images: [URL!]
  }

  input CreateBrandInput {
    siteId: ID!
    name: String!
    slug: String
    logo: URL
    description: String
    website: URL
    foundedYear: Int
  }

  input UpdateBrandInput {
    name: String
    slug: String
    logo: URL
    description: String
    website: URL
    foundedYear: Int
  }

  # Complex return types
  type ProductComparison {
    products: [Product!]!
    comparison: [ComparisonField!]!
    winner: Product
    summary: String
  }

  type ComparisonField {
    field: String!
    label: String!
    values: [ComparisonValue!]!
    best: ID
  }

  type ComparisonValue {
    productId: ID!
    value: String!
    score: Float
  }

  type ImportResult {
    success: Boolean!
    message: String
    imported: Int!
    updated: Int!
    skipped: Int!
    errors: [ImportError!]!
    summary: ImportSummary!
  }

  type ImportError {
    row: Int!
    field: String
    message: String!
    data: JSON
  }

  type ImportSummary {
    totalRows: Int!
    validRows: Int!
    invalidRows: Int!
    duplicates: Int!
    categories: [String!]!
    brands: [String!]!
  }

  type ExportResult {
    success: Boolean!
    downloadUrl: URL!
    fileName: String!
    size: Int!
    expiresAt: DateTime!
  }
`;