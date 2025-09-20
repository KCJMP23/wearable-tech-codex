import { gql } from 'graphql-tag';

export const baseTypeDefs = gql`
  # Scalar types
  scalar DateTime
  scalar JSON
  scalar Upload
  scalar EmailAddress
  scalar URL
  scalar UUID

  # Enums
  enum SortOrder {
    ASC
    DESC
  }

  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  # Directives
  directive @cacheControl(maxAge: Int, scope: CacheControlScope) on FIELD_DEFINITION | OBJECT
  directive @auth(requires: UserRole = USER) on OBJECT | FIELD_DEFINITION
  directive @rateLimit(max: Int!, window: String!) on FIELD_DEFINITION

  # User roles and permissions
  enum UserRole {
    ADMIN
    USER
    MODERATOR
    DEVELOPER
  }

  enum Permission {
    READ
    WRITE
    DELETE
    ADMIN
  }

  # Pagination interface
  interface Node {
    id: ID!
  }

  interface Connection {
    edges: [Edge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  interface Edge {
    node: Node!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # Common input types
  input PaginationInput {
    first: Int
    after: String
    last: Int
    before: String
  }

  input SortInput {
    field: String!
    order: SortOrder = ASC
  }

  input FilterInput {
    field: String!
    operator: FilterOperator!
    value: String!
  }

  enum FilterOperator {
    EQUALS
    NOT_EQUALS
    CONTAINS
    NOT_CONTAINS
    STARTS_WITH
    ENDS_WITH
    GREATER_THAN
    LESS_THAN
    GREATER_THAN_OR_EQUAL
    LESS_THAN_OR_EQUAL
    IN
    NOT_IN
    IS_NULL
    IS_NOT_NULL
  }

  # Error types
  type Error {
    message: String!
    code: String!
    path: [String!]
    extensions: JSON
  }

  type MutationResponse {
    success: Boolean!
    message: String
    errors: [Error!]
  }

  # API Info
  type APIInfo {
    version: String!
    environment: String!
    uptime: Int!
    features: [String!]!
  }

  type Query {
    # System queries
    apiInfo: APIInfo! @cacheControl(maxAge: 300)
    
    # Health check
    health: String!
  }

  type Mutation {
    # Placeholder for mutations
    _empty: String
  }

  type Subscription {
    # Placeholder for subscriptions  
    _empty: String
  }
`;