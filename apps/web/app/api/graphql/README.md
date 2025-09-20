# AffiliateOS GraphQL API

A comprehensive, production-ready GraphQL API for the AffiliateOS platform with advanced features including real-time subscriptions, intelligent caching, rate limiting, and robust security.

## 🚀 Features

### Core GraphQL Features
- **Complete Type System**: Comprehensive schema covering all platform entities
- **Real-time Subscriptions**: WebSocket-based live updates
- **Query Optimization**: DataLoader for N+1 query prevention
- **Intelligent Caching**: Multi-level caching with Redis
- **Performance Monitoring**: Built-in metrics and monitoring

### Security & Performance
- **Authentication & Authorization**: JWT-based with role-based access control
- **Rate Limiting**: User-tier based rate limiting
- **Query Complexity Analysis**: Prevent expensive queries
- **Query Depth Limiting**: Protect against deeply nested queries
- **CSRF Protection**: Built-in CSRF prevention

### Advanced Features
- **File Uploads**: GraphQL-based file upload support
- **Batch Operations**: Efficient bulk operations
- **Field-level Permissions**: Granular access control
- **Multi-tenant Data Isolation**: Secure tenant separation
- **Error Handling**: Comprehensive error handling with proper codes

## 📋 API Endpoints

### Main GraphQL Endpoint
```
POST /api/graphql
```

### Additional Endpoints
```
GET /api/graphql/health - Health check
GET /api/graphql/schema - Schema introspection
WS /api/graphql/subscriptions - WebSocket subscriptions
```

## 🎯 Schema Overview

### Core Types

#### User Management
```graphql
type User {
  id: ID!
  email: EmailAddress!
  name: String
  role: UserRole!
  sites: SiteConnection!
  # ... more fields
}
```

#### Site Management
```graphql
type Site {
  id: ID!
  name: String!
  domain: String
  products: ProductConnection!
  analytics: SiteAnalytics
  # ... more fields
}
```

#### Product Catalog
```graphql
type Product {
  id: ID!
  name: String!
  price: Float
  affiliateLink: String!
  categories: [Category!]!
  # ... more fields
}
```

#### Content Management
```graphql
type Post {
  id: ID!
  title: String!
  content: String!
  aiGenerated: Boolean!
  # ... more fields
}
```

#### Analytics & Insights
```graphql
type Analytics {
  visitors: Int!
  conversions: Int!
  revenue: Float!
  realTimeData: RealTimeAnalytics!
  # ... more fields
}
```

## 🔐 Authentication

### JWT Authentication
```javascript
// Headers
{
  "Authorization": "Bearer <jwt_token>"
}
```

### API Key Authentication
```javascript
// Headers
{
  "X-API-Key": "<api_key>"
}
```

### User Roles
- `USER` - Basic user access
- `MODERATOR` - Enhanced permissions
- `ADMIN` - Full administrative access
- `DEVELOPER` - API development access

## 📊 Rate Limiting

### User-based Limits
- **Free Users**: 100 requests/hour
- **Premium Users**: 1,000 requests/hour
- **Admins**: 10,000 requests/hour

### Operation-specific Limits
- **AI Operations**: 10 requests/hour
- **File Uploads**: 20 requests/hour
- **Bulk Operations**: 5 requests/hour

## 🎛️ Query Examples

### Basic Queries

#### Get Current User
```graphql
query Me {
  me {
    id
    email
    name
    sites {
      edges {
        node {
          id
          name
          domain
        }
      }
    }
  }
}
```

#### Get Site with Products
```graphql
query GetSite($siteId: ID!) {
  site(id: $siteId) {
    id
    name
    products(first: 10) {
      edges {
        node {
          id
          name
          price
          affiliateLink
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

#### Search Products
```graphql
query SearchProducts($query: String!, $filters: [FilterInput!]) {
  searchProducts(
    query: $query
    filters: $filters
    pagination: { first: 20 }
  ) {
    edges {
      node {
        id
        name
        price
        rating
        categories {
          name
        }
      }
    }
    facets {
      field
      values {
        value
        count
      }
    }
  }
}
```

### Mutations

#### Create Site
```graphql
mutation CreateSite($input: CreateSiteInput!) {
  createSite(input: $input) {
    id
    name
    slug
    domain
  }
}
```

#### Generate AI Content
```graphql
mutation GeneratePost($siteId: ID!, $input: GeneratePostInput!) {
  generatePost(siteId: $siteId, input: $input) {
    id
    title
    content
    aiGenerated
  }
}
```

### Subscriptions

#### Real-time Analytics
```graphql
subscription AnalyticsUpdated($siteId: ID!) {
  analyticsUpdated(siteId: $siteId) {
    visitors
    conversions
    revenue
  }
}
```

#### Live Notifications
```graphql
subscription UserNotifications($userId: ID!) {
  notificationAdded(userId: $userId) {
    id
    title
    message
    type
  }
}
```

## 🛠️ Advanced Features

### Pagination
Uses Relay-style cursor pagination:
```graphql
type ProductConnection {
  edges: [ProductEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

### Filtering & Sorting
```graphql
input FilterInput {
  field: String!
  operator: FilterOperator!
  value: String!
}

input SortInput {
  field: String!
  order: SortOrder!
}
```

### File Uploads
```graphql
mutation UploadProductImage($productId: ID!, $file: Upload!) {
  uploadProductImage(productId: $productId, file: $file) {
    id
    url
    alt
  }
}
```

### Batch Operations
```graphql
mutation BulkUpdateProducts(
  $productIds: [ID!]!
  $input: BulkUpdateProductInput!
) {
  bulkUpdateProducts(productIds: $productIds, input: $input) {
    id
    name
    updatedAt
  }
}
```

## 📈 Performance Optimization

### DataLoader Implementation
- Automatic batching of database queries
- N+1 query prevention
- Intelligent caching

### Caching Strategy
- **Query-level caching**: Full query result caching
- **Field-level caching**: Individual field caching
- **DataLoader caching**: Request-scoped caching
- **Redis caching**: Persistent cross-request caching

### Query Complexity Analysis
- Cost analysis for each field
- User-tier based limits
- Automatic query optimization suggestions

## 🚨 Error Handling

### Error Codes
- `UNAUTHENTICATED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `RATE_LIMITED` - Rate limit exceeded
- `QUERY_TOO_COMPLEX` - Query complexity limit exceeded
- `VALIDATION_ERROR` - Input validation failed

### Error Response Format
```json
{
  "errors": [
    {
      "message": "Authentication required",
      "extensions": {
        "code": "UNAUTHENTICATED",
        "timestamp": "2024-01-01T00:00:00Z"
      },
      "locations": [...],
      "path": [...]
    }
  ]
}
```

## 📊 Monitoring & Analytics

### Performance Metrics
- Query execution time
- Database query count
- Cache hit/miss rates
- Memory usage

### Request Headers
```
X-Response-Time: 150ms
X-DB-Queries: 3
X-Cache-Hits: 5
```

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0",
  "cache": {
    "connected": true,
    "stats": {...}
  }
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...

# Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379

# API Configuration
API_VERSION=1.0.0
GRAPHQL_INTROSPECTION=true
GRAPHQL_PLAYGROUND=true

# Rate Limiting
RATE_LIMIT_FREE_USER=100
RATE_LIMIT_PREMIUM_USER=1000
RATE_LIMIT_ADMIN=10000

# Caching
CACHE_TTL_DEFAULT=300
CACHE_TTL_ANALYTICS=60
CACHE_TTL_STATIC=3600
```

## 🚀 Getting Started

### Development
```bash
# Install dependencies
pnpm install

# Start Redis (for caching)
redis-server

# Start development server
pnpm dev

# Access GraphQL Playground
open http://localhost:3000/api/graphql
```

### Production Deployment
```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

## 🧪 Testing

### Unit Tests
```bash
pnpm test:unit
```

### Integration Tests
```bash
pnpm test:integration
```

### Load Testing
```bash
# Using GraphQL-specific load testing
pnpm test:load
```

## 📚 Additional Resources

### GraphQL Playground
Available at `/api/graphql` in development mode with:
- Schema exploration
- Query autocompletion
- Real-time query execution
- Subscription testing

### Schema Documentation
Auto-generated documentation available through introspection

### Example Client Code
Check `/examples` directory for:
- React Query integration
- Apollo Client setup
- Real-time subscription examples
- File upload implementations

## 🤝 Contributing

1. Follow the schema-first approach
2. Add comprehensive tests for new resolvers
3. Update documentation for schema changes
4. Ensure proper error handling
5. Implement appropriate caching strategies

## 📄 License

MIT License - see LICENSE file for details.