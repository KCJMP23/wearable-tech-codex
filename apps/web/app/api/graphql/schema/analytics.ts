import { gql } from 'graphql-tag';

export const analyticsTypeDefs = gql`
  type Analytics {
    id: ID!
    siteId: ID!
    site: Site!
    period: String!
    startDate: DateTime!
    endDate: DateTime!
    
    # Traffic Metrics
    visitors: Int!
    uniqueVisitors: Int!
    pageViews: Int!
    sessions: Int!
    bounceRate: Float!
    avgSessionDuration: Int!
    
    # Revenue Metrics
    revenue: Float!
    conversions: Int!
    conversionRate: Float!
    avgOrderValue: Float!
    totalClicks: Int!
    clickThroughRate: Float!
    
    # Performance Metrics
    avgPageLoadTime: Float!
    coreWebVitals: CoreWebVitals!
    
    # Audience Insights
    topPages: [PageStat!]!
    topReferrers: [ReferrerStat!]!
    topCountries: [CountryStat!]!
    deviceBreakdown: [DeviceStat!]!
    browserBreakdown: [BrowserStat!]!
    
    # Content Performance
    topProducts: [ProductStat!]!
    topPosts: [PostStat!]!
    
    # Time-based Data
    hourlyData: [HourlyData!]!
    dailyData: [DailyData!]!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CoreWebVitals {
    lcp: Float!  # Largest Contentful Paint
    fid: Float!  # First Input Delay
    cls: Float!  # Cumulative Layout Shift
    fcp: Float!  # First Contentful Paint
    ttfb: Float! # Time to First Byte
    score: Float!
    grade: String!
  }

  type PageStat {
    page: String!
    url: URL!
    views: Int!
    uniqueViews: Int!
    avgTimeOnPage: Int!
    bounceRate: Float!
    entrances: Int!
    exits: Int!
  }

  type ProductStat {
    product: Product!
    views: Int!
    clicks: Int!
    conversions: Int!
    revenue: Float!
    conversionRate: Float!
  }

  type PostStat {
    post: Post!
    views: Int!
    uniqueViews: Int!
    avgTimeOnPage: Int!
    shares: Int!
    comments: Int!
    engagement: Float!
  }

  type BrowserStat {
    browser: String!
    version: String!
    visits: Int!
    percentage: Float!
  }

  type HourlyData {
    hour: Int!
    visitors: Int!
    pageViews: Int!
    revenue: Float!
    conversions: Int!
  }

  type DailyData {
    date: DateTime!
    visitors: Int!
    pageViews: Int!
    revenue: Float!
    conversions: Int!
    bounceRate: Float!
  }

  # Real-time Analytics
  type RealTimeAnalytics {
    siteId: ID!
    activeVisitors: Int!
    activePages: [ActivePageStat!]!
    recentEvents: [AnalyticsEvent!]!
    liveConversions: [LiveConversion!]!
    trafficSources: [TrafficSource!]!
    updatedAt: DateTime!
  }

  type ActivePageStat {
    page: String!
    activeVisitors: Int!
    avgTimeOnPage: Int!
  }

  type AnalyticsEvent {
    id: ID!
    type: EventType!
    page: String!
    userId: String
    sessionId: String!
    timestamp: DateTime!
    properties: JSON
  }

  enum EventType {
    PAGE_VIEW
    PRODUCT_VIEW
    PRODUCT_CLICK
    CONVERSION
    SIGNUP
    DOWNLOAD
    FORM_SUBMIT
    VIDEO_PLAY
    SCROLL
    CLICK
    SEARCH
  }

  type LiveConversion {
    id: ID!
    product: Product!
    amount: Float!
    country: String!
    timestamp: DateTime!
  }

  type TrafficSource {
    source: String!
    medium: String!
    campaign: String
    visitors: Int!
    percentage: Float!
  }

  # Goals and Funnels
  type Goal {
    id: ID!
    siteId: ID!
    name: String!
    description: String!
    type: GoalType!
    conditions: [GoalCondition!]!
    value: Float
    isActive: Boolean!
    completions: Int!
    conversionRate: Float!
    createdAt: DateTime!
  }

  enum GoalType {
    PAGE_VIEW
    TIME_ON_SITE
    PRODUCT_PURCHASE
    FORM_SUBMISSION
    DOWNLOAD
    CUSTOM_EVENT
  }

  type GoalCondition {
    field: String!
    operator: String!
    value: String!
  }

  type Funnel {
    id: ID!
    siteId: ID!
    name: String!
    description: String!
    steps: [FunnelStep!]!
    conversions: [FunnelConversion!]!
    overallConversionRate: Float!
    createdAt: DateTime!
  }

  type FunnelStep {
    id: ID!
    name: String!
    conditions: [GoalCondition!]!
    visitors: Int!
    conversionRate: Float!
    dropoffRate: Float!
    order: Int!
  }

  type FunnelConversion {
    stepId: ID!
    visitors: Int!
    conversions: Int!
    conversionRate: Float!
  }

  extend type Query {
    # Analytics queries
    analytics(
      siteId: ID!
      period: String = "7d"
      startDate: DateTime
      endDate: DateTime
    ): Analytics! @auth(requires: USER)
    
    # Real-time analytics
    realTimeAnalytics(siteId: ID!): RealTimeAnalytics! @auth(requires: USER)
    
    # Custom reports
    customReport(
      siteId: ID!
      metrics: [String!]!
      dimensions: [String!]!
      filters: [AnalyticsFilter!]
      period: String = "7d"
    ): CustomReport! @auth(requires: USER)
    
    # Goals and funnels
    goals(siteId: ID!): [Goal!]! @auth(requires: USER)
    goal(id: ID!): Goal! @auth(requires: USER)
    funnels(siteId: ID!): [Funnel!]! @auth(requires: USER)
    funnel(id: ID!): Funnel! @auth(requires: USER)
    
    # Export data
    exportAnalytics(
      siteId: ID!
      format: ExportFormat!
      period: String = "7d"
      metrics: [String!]
    ): ExportResult! @auth(requires: USER)
  }

  extend type Mutation {
    # Track custom events
    trackEvent(input: TrackEventInput!): Boolean!
    
    # Goal management
    createGoal(input: CreateGoalInput!): Goal! @auth(requires: USER)
    updateGoal(id: ID!, input: UpdateGoalInput!): Goal! @auth(requires: USER)
    deleteGoal(id: ID!): MutationResponse! @auth(requires: USER)
    
    # Funnel management
    createFunnel(input: CreateFunnelInput!): Funnel! @auth(requires: USER)
    updateFunnel(id: ID!, input: UpdateFunnelInput!): Funnel! @auth(requires: USER)
    deleteFunnel(id: ID!): MutationResponse! @auth(requires: USER)
  }

  extend type Subscription {
    # Real-time analytics updates
    analyticsUpdated(siteId: ID!): Analytics! @auth(requires: USER)
    realTimeUpdated(siteId: ID!): RealTimeAnalytics! @auth(requires: USER)
    
    # Live events
    liveEvents(siteId: ID!): AnalyticsEvent! @auth(requires: USER)
    liveConversions(siteId: ID!): LiveConversion! @auth(requires: USER)
  }

  # Input types
  input AnalyticsFilter {
    field: String!
    operator: FilterOperator!
    value: String!
  }

  input TrackEventInput {
    siteId: ID!
    type: EventType!
    page: String!
    userId: String
    sessionId: String!
    properties: JSON
  }

  input CreateGoalInput {
    siteId: ID!
    name: String!
    description: String!
    type: GoalType!
    conditions: [GoalConditionInput!]!
    value: Float
  }

  input UpdateGoalInput {
    name: String
    description: String
    conditions: [GoalConditionInput!]
    value: Float
    isActive: Boolean
  }

  input GoalConditionInput {
    field: String!
    operator: String!
    value: String!
  }

  input CreateFunnelInput {
    siteId: ID!
    name: String!
    description: String!
    steps: [FunnelStepInput!]!
  }

  input UpdateFunnelInput {
    name: String
    description: String
    steps: [FunnelStepInput!]
  }

  input FunnelStepInput {
    name: String!
    conditions: [GoalConditionInput!]!
    order: Int!
  }

  # Return types
  type CustomReport {
    siteId: ID!
    period: String!
    metrics: [ReportMetric!]!
    dimensions: [ReportDimension!]!
    data: [JSON!]!
    summary: JSON!
    generatedAt: DateTime!
  }

  type ReportMetric {
    name: String!
    value: Float!
    change: Float
    changePercent: Float
  }

  type ReportDimension {
    name: String!
    values: [String!]!
  }
`;
