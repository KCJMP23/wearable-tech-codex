import { gql } from 'graphql-tag';

export const postTypeDefs = gql`
  type Post implements Node {
    id: ID!
    siteId: ID!
    site: Site!
    
    # Content
    title: String!
    slug: String!
    content: String!
    excerpt: String
    featuredImage: URL
    gallery: [URL!]
    
    # Categorization
    categories: [Category!]!
    tags: [Tag!]!
    
    # Publishing
    status: PostStatus!
    isPublished: Boolean!
    publishedAt: DateTime
    scheduledAt: DateTime
    
    # SEO
    seoTitle: String
    seoDescription: String
    seoKeywords: [String!]
    canonicalUrl: URL
    
    # Author & Attribution
    author: User!
    coAuthors: [User!]!
    
    # Engagement
    views: Int!
    likes: Int!
    shares: Int!
    comments: PostCommentConnection!
    readingTime: Int!
    
    # AI & Generation
    aiGenerated: Boolean!
    generationPrompt: String
    template: PostTemplate
    
    # Affiliate Integration
    affiliateProducts: [Product!]!
    featuredProducts: [Product!]!
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Related Content
    relatedPosts: [Post!]!
    series: PostSeries
    
    # Analytics
    analytics: PostAnalytics
    
    # Rich Data
    structuredData: JSON
    tableOfContents: [TOCItem!]!
  }

  enum PostStatus {
    DRAFT
    PUBLISHED
    SCHEDULED
    ARCHIVED
    PRIVATE
    PENDING_REVIEW
  }

  type PostTemplate {
    id: ID!
    name: String!
    description: String!
    content: String!
    fields: [TemplateField!]!
    category: String!
    isAI: Boolean!
  }

  type TemplateField {
    name: String!
    type: FieldType!
    label: String!
    placeholder: String
    required: Boolean!
    options: [String!]
  }

  enum FieldType {
    TEXT
    TEXTAREA
    RICH_TEXT
    SELECT
    MULTI_SELECT
    IMAGE
    URL
    NUMBER
    DATE
    BOOLEAN
  }

  type PostSeries {
    id: ID!
    name: String!
    description: String!
    image: URL
    posts: [Post!]!
    sortOrder: Int!
  }

  type TOCItem {
    id: String!
    title: String!
    level: Int!
    anchor: String!
    children: [TOCItem!]!
  }

  type PostComment {
    id: ID!
    post: Post!
    author: String!
    email: EmailAddress
    website: URL
    content: String!
    isApproved: Boolean!
    parent: PostComment
    children: [PostComment!]!
    likes: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type PostCommentConnection implements Connection {
    edges: [PostCommentEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    approvedCount: Int!
    pendingCount: Int!
  }

  type PostCommentEdge implements Edge {
    node: PostComment!
    cursor: String!
  }

  type PostConnection implements Connection {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type PostEdge implements Edge {
    node: Post!
    cursor: String!
    relevance: Float
  }

  type PostAnalytics {
    postId: ID!
    period: String!
    views: Int!
    uniqueViews: Int!
    avgTimeOnPage: Int!
    bounceRate: Float!
    socialShares: Int!
    comments: Int!
    likes: Int!
    scrollDepth: Float!
    exitRate: Float!
    topReferrers: [ReferrerStat!]!
    readingProgress: [ReadingProgressStat!]!
  }

  type ReadingProgressStat {
    percentage: Int!
    users: Int!
    avgTime: Int!
  }

  extend type Query {
    # Post queries
    post(id: ID, slug: String, siteId: ID): Post
    posts(
      siteId: ID
      pagination: PaginationInput
      filters: [FilterInput!]
      sort: [SortInput!]
      search: String
      categoryIds: [ID!]
      tagIds: [ID!]
      authorIds: [ID!]
      status: PostStatus
      published: Boolean
      featured: Boolean
    ): PostConnection!
    
    # Post search
    searchPosts(
      query: String!
      siteId: ID
      pagination: PaginationInput
    ): PostConnection!
    
    # Related posts
    relatedPosts(
      postId: ID!
      limit: Int = 5
    ): [Post!]!
    
    # Post templates
    postTemplates(
      category: String
      isAI: Boolean
    ): [PostTemplate!]!
    
    # Post series
    postSeries(siteId: ID!): [PostSeries!]!
    
    # Post analytics
    postAnalytics(
      postId: ID!
      period: String = "7d"
    ): PostAnalytics! @auth(requires: USER)
    
    # Comments
    postComments(
      postId: ID!
      pagination: PaginationInput
      approved: Boolean
    ): PostCommentConnection!
  }

  extend type Mutation {
    # Post management
    createPost(input: CreatePostInput!): Post! @auth(requires: USER)
    updatePost(id: ID!, input: UpdatePostInput!): Post! @auth(requires: USER)
    deletePost(id: ID!): MutationResponse! @auth(requires: USER)
    duplicatePost(id: ID!, siteId: ID): Post! @auth(requires: USER)
    
    # Post publishing
    publishPost(id: ID!): Post! @auth(requires: USER)
    unpublishPost(id: ID!): Post! @auth(requires: USER)
    schedulePost(id: ID!, scheduledAt: DateTime!): Post! @auth(requires: USER)
    
    # Bulk operations
    bulkUpdatePosts(
      postIds: [ID!]!
      input: BulkUpdatePostInput!
    ): [Post!]! @auth(requires: USER)
    
    bulkDeletePosts(postIds: [ID!]!): MutationResponse! @auth(requires: USER)
    
    # AI Content Generation
    generatePost(
      siteId: ID!
      input: GeneratePostInput!
    ): Post! @auth(requires: USER) @rateLimit(max: 5, window: "1h")
    
    improvePost(
      postId: ID!
      type: ImprovementType!
      instructions: String
    ): Post! @auth(requires: USER) @rateLimit(max: 10, window: "1h")
    
    generatePostOutline(
      topic: String!
      keywords: [String!]
      wordCount: Int
    ): PostOutline! @auth(requires: USER) @rateLimit(max: 20, window: "1h")
    
    # Template management
    createPostTemplate(input: CreatePostTemplateInput!): PostTemplate! @auth(requires: USER)
    updatePostTemplate(id: ID!, input: UpdatePostTemplateInput!): PostTemplate! @auth(requires: USER)
    deletePostTemplate(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Series management
    createPostSeries(input: CreatePostSeriesInput!): PostSeries! @auth(requires: USER)
    updatePostSeries(id: ID!, input: UpdatePostSeriesInput!): PostSeries! @auth(requires: USER)
    deletePostSeries(id: ID!): MutationResponse! @auth(requires: USER)
    addPostToSeries(postId: ID!, seriesId: ID!, sortOrder: Int): Post! @auth(requires: USER)
    removePostFromSeries(postId: ID!): Post! @auth(requires: USER)
    
    # Comment management
    createComment(input: CreateCommentInput!): PostComment!
    updateComment(id: ID!, input: UpdateCommentInput!): PostComment! @auth(requires: USER)
    deleteComment(id: ID!): MutationResponse! @auth(requires: USER)
    approveComment(id: ID!): PostComment! @auth(requires: USER)
    rejectComment(id: ID!): PostComment! @auth(requires: USER)
    
    # Content optimization
    optimizeForSEO(postId: ID!): Post! @auth(requires: USER) @rateLimit(max: 5, window: "1h")
    generateMetaDescription(postId: ID!): Post! @auth(requires: USER)
    suggestTags(postId: ID!): [String!]! @auth(requires: USER)
    
    # Social media
    shareToSocial(
      postId: ID!
      platforms: [SocialPlatform!]!
      message: String
    ): [SocialShare!]! @auth(requires: USER)
  }

  extend type Subscription {
    # Post updates
    postUpdated(postId: ID!): Post! @auth(requires: USER)
    postPublished(siteId: ID!): Post! @auth(requires: USER)
    postDeleted(siteId: ID!): ID! @auth(requires: USER)
    
    # Comment updates
    commentAdded(postId: ID!): PostComment!
    commentApproved(postId: ID!): PostComment! @auth(requires: USER)
    
    # Real-time analytics
    postViews(postId: ID!): Int!
  }

  # Enums
  enum ImprovementType {
    SEO_OPTIMIZATION
    READABILITY
    ENGAGEMENT
    LENGTH_EXPANSION
    LENGTH_REDUCTION
    TONE_ADJUSTMENT
    KEYWORD_OPTIMIZATION
  }

  enum SocialPlatform {
    TWITTER
    FACEBOOK
    LINKEDIN
    PINTEREST
    INSTAGRAM
    REDDIT
  }

  # Input types
  input CreatePostInput {
    siteId: ID!
    title: String!
    slug: String
    content: String!
    excerpt: String
    featuredImage: URL
    gallery: [URL!]
    categoryIds: [ID!]
    tagIds: [ID!]
    coAuthorIds: [ID!]
    status: PostStatus = DRAFT
    publishedAt: DateTime
    scheduledAt: DateTime
    seoTitle: String
    seoDescription: String
    seoKeywords: [String!]
    canonicalUrl: URL
    affiliateProductIds: [ID!]
    featuredProductIds: [ID!]
    seriesId: ID
    templateId: ID
  }

  input UpdatePostInput {
    title: String
    slug: String
    content: String
    excerpt: String
    featuredImage: URL
    gallery: [URL!]
    categoryIds: [ID!]
    tagIds: [ID!]
    coAuthorIds: [ID!]
    status: PostStatus
    publishedAt: DateTime
    scheduledAt: DateTime
    seoTitle: String
    seoDescription: String
    seoKeywords: [String!]
    canonicalUrl: URL
    affiliateProductIds: [ID!]
    featuredProductIds: [ID!]
    seriesId: ID
  }

  input BulkUpdatePostInput {
    categoryIds: [ID!]
    tagIds: [ID!]
    status: PostStatus
    isPublished: Boolean
    authorId: ID
  }

  input GeneratePostInput {
    topic: String!
    keywords: [String!]
    tone: ContentTone = PROFESSIONAL
    length: ContentLength = MEDIUM
    includeProducts: Boolean = true
    targetAudience: String
    templateId: ID
    outline: PostOutlineInput
  }

  input PostOutlineInput {
    sections: [OutlineSectionInput!]!
    wordCount: Int
    includeIntroduction: Boolean = true
    includeConclusion: Boolean = true
    includeFAQ: Boolean = false
  }

  input OutlineSectionInput {
    title: String!
    description: String
    wordCount: Int
    subsections: [String!]
  }

  input CreatePostTemplateInput {
    name: String!
    description: String!
    content: String!
    fields: [TemplateFieldInput!]!
    category: String!
    isAI: Boolean = false
  }

  input UpdatePostTemplateInput {
    name: String
    description: String
    content: String
    fields: [TemplateFieldInput!]
    category: String
    isAI: Boolean
  }

  input TemplateFieldInput {
    name: String!
    type: FieldType!
    label: String!
    placeholder: String
    required: Boolean = false
    options: [String!]
  }

  input CreatePostSeriesInput {
    siteId: ID!
    name: String!
    description: String!
    image: URL
  }

  input UpdatePostSeriesInput {
    name: String
    description: String
    image: URL
  }

  input CreateCommentInput {
    postId: ID!
    author: String!
    email: EmailAddress!
    website: URL
    content: String!
    parentId: ID
  }

  input UpdateCommentInput {
    content: String!
  }

  # Complex return types
  enum ContentTone {
    PROFESSIONAL
    CASUAL
    FRIENDLY
    AUTHORITATIVE
    CONVERSATIONAL
    TECHNICAL
    HUMOROUS
    INSPIRATIONAL
  }

  enum ContentLength {
    SHORT      # 300-600 words
    MEDIUM     # 600-1200 words  
    LONG       # 1200-2500 words
    VERY_LONG  # 2500+ words
  }

  type PostOutline {
    title: String!
    introduction: String!
    sections: [OutlineSection!]!
    conclusion: String!
    faq: [FAQItem!]
    estimatedWordCount: Int!
    estimatedReadingTime: Int!
  }

  type OutlineSection {
    title: String!
    description: String!
    keyPoints: [String!]!
    subsections: [String!]!
    estimatedWordCount: Int!
  }

  type FAQItem {
    question: String!
    answer: String!
  }

  type SocialShare {
    platform: SocialPlatform!
    success: Boolean!
    url: URL
    message: String
    error: String
  }
`;