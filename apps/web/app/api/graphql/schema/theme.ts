import { gql } from 'graphql-tag';

export const themeTypeDefs = gql`
  type Theme implements Node {
    id: ID!
    name: String!
    description: String!
    version: String!
    author: String!
    authorUrl: URL
    
    # Media
    thumbnail: URL!
    screenshots: [URL!]!
    previewUrl: URL
    
    # Configuration
    config: JSON!
    customizations: [ThemeCustomization!]!
    variables: [ThemeVariable!]!
    
    # Categorization
    category: ThemeCategory!
    tags: [String!]!
    
    # Pricing & Availability
    price: Float!
    isPremium: Boolean!
    isDefault: Boolean!
    isActive: Boolean!
    
    # Performance & Features
    features: [String!]!
    requirements: JSON
    compatibility: [String!]!
    
    # Stats & Reviews
    downloads: Int!
    rating: Float!
    reviewCount: Int!
    reviews: ThemeReviewConnection!
    
    # Support & Documentation
    documentation: URL
    support: URL
    changelog: URL
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    publishedAt: DateTime!
    
    # Usage
    sites: SiteConnection!
    installCount: Int!
  }

  enum ThemeCategory {
    BLOG
    BUSINESS
    ECOMMERCE
    PORTFOLIO
    MAGAZINE
    LANDING_PAGE
    MINIMAL
    CREATIVE
    CORPORATE
    PERSONAL
  }

  type ThemeCustomization {
    id: ID!
    name: String!
    type: CustomizationType!
    label: String!
    description: String
    defaultValue: String
    options: [CustomizationOption!]
    category: String!
    sortOrder: Int!
  }

  enum CustomizationType {
    COLOR
    FONT
    SIZE
    SPACING
    BORDER
    SHADOW
    LAYOUT
    IMAGE
    TEXT
    SELECT
    TOGGLE
    SLIDER
  }

  type CustomizationOption {
    label: String!
    value: String!
    preview: URL
  }

  type ThemeVariable {
    name: String!
    value: String!
    type: String!
    category: String!
    description: String
  }

  type ThemeReview {
    id: ID!
    theme: Theme!
    user: User!
    rating: Float!
    title: String!
    content: String!
    verified: Boolean!
    helpful: Int!
    createdAt: DateTime!
  }

  type ThemeReviewConnection implements Connection {
    edges: [ThemeReviewEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    averageRating: Float!
  }

  type ThemeReviewEdge implements Edge {
    node: ThemeReview!
    cursor: String!
  }

  extend type Query {
    # Theme queries
    theme(id: ID!): Theme
    themes(
      category: ThemeCategory
      isPremium: Boolean
      search: String
      pagination: PaginationInput
      sort: [SortInput!]
    ): [Theme!]!
    
    # Featured themes
    featuredThemes(limit: Int = 6): [Theme!]!
    
    # Popular themes
    popularThemes(limit: Int = 10): [Theme!]!
    
    # Theme compatibility
    checkThemeCompatibility(themeId: ID!, siteId: ID!): ThemeCompatibility!
  }

  extend type Mutation {
    # Theme installation
    installTheme(siteId: ID!, themeId: ID!): Site! @auth(requires: USER)
    uninstallTheme(siteId: ID!): Site! @auth(requires: USER)
    
    # Theme customization
    updateThemeCustomization(
      siteId: ID!
      customizations: [ThemeCustomizationInput!]!
    ): Site! @auth(requires: USER)
    
    resetThemeCustomization(siteId: ID!): Site! @auth(requires: USER)
    
    # Theme development (admin)
    createTheme(input: CreateThemeInput!): Theme! @auth(requires: ADMIN)
    updateTheme(id: ID!, input: UpdateThemeInput!): Theme! @auth(requires: ADMIN)
    deleteTheme(id: ID!): MutationResponse! @auth(requires: ADMIN)
    
    # Theme reviews
    createThemeReview(input: CreateThemeReviewInput!): ThemeReview! @auth(requires: USER)
    updateThemeReview(id: ID!, input: UpdateThemeReviewInput!): ThemeReview! @auth(requires: USER)
    deleteThemeReview(id: ID!): MutationResponse! @auth(requires: USER)
  }

  # Input types
  input ThemeCustomizationInput {
    name: String!
    value: String!
  }

  input CreateThemeInput {
    name: String!
    description: String!
    version: String!
    author: String!
    authorUrl: URL
    thumbnail: URL!
    screenshots: [URL!]!
    config: JSON!
    customizations: [ThemeCustomizationDefinitionInput!]!
    category: ThemeCategory!
    tags: [String!]!
    price: Float!
    isPremium: Boolean!
    features: [String!]!
    requirements: JSON
    documentation: URL
    support: URL
  }

  input UpdateThemeInput {
    name: String
    description: String
    version: String
    thumbnail: URL
    screenshots: [URL!]
    config: JSON
    customizations: [ThemeCustomizationDefinitionInput!]
    tags: [String!]
    price: Float
    features: [String!]
    requirements: JSON
    documentation: URL
    support: URL
    isActive: Boolean
  }

  input ThemeCustomizationDefinitionInput {
    name: String!
    type: CustomizationType!
    label: String!
    description: String
    defaultValue: String!
    options: [CustomizationOptionInput!]
    category: String!
    sortOrder: Int
  }

  input CustomizationOptionInput {
    label: String!
    value: String!
    preview: URL
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

  # Return types
  type ThemeCompatibility {
    compatible: Boolean!
    issues: [CompatibilityIssue!]!
    recommendations: [String!]!
  }

  type CompatibilityIssue {
    type: IssueType!
    message: String!
    severity: IssueSeverity!
    resolution: String
  }

  enum IssueType {
    PLUGIN_CONFLICT
    FEATURE_MISSING
    VERSION_INCOMPATIBLE
    CUSTOMIZATION_LOST
    PERFORMANCE_IMPACT
  }

  enum IssueSeverity {
    INFO
    WARNING
    ERROR
    CRITICAL
  }
`;
