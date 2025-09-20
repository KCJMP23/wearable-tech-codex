// Apollo Client Setup for AffiliateOS GraphQL API
import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { createUploadLink } from 'apollo-upload-client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// HTTP Link for queries and mutations
const httpLink = createHttpLink({
  uri: '/api/graphql',
});

// Upload link for file uploads
const uploadLink = createUploadLink({
  uri: '/api/graphql',
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql/subscriptions',
    connectionParams: () => {
      const token = localStorage.getItem('auth-token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
  })
);

// Auth link to add authentication headers
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('auth-token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error link for global error handling
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );

      // Handle specific error codes
      switch (extensions?.code) {
        case 'UNAUTHENTICATED':
          // Redirect to login
          window.location.href = '/login';
          break;
        case 'RATE_LIMITED':
          // Show rate limit notification
          console.warn('Rate limit exceeded');
          break;
        case 'QUERY_TOO_COMPLEX':
          // Simplify query or show error
          console.warn('Query too complex');
          break;
      }
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
  }
});

// Split link to route queries/mutations vs subscriptions
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([authLink, errorLink, uploadLink])
);

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      // Site pagination
      Site: {
        fields: {
          products: {
            keyArgs: ['filters', 'sort'],
            merge(existing, incoming) {
              return {
                ...incoming,
                edges: [
                  ...(existing?.edges || []),
                  ...incoming.edges,
                ],
              };
            },
          },
          posts: {
            keyArgs: ['filters', 'sort'],
            merge(existing, incoming) {
              return {
                ...incoming,
                edges: [
                  ...(existing?.edges || []),
                  ...incoming.edges,
                ],
              };
            },
          },
        },
      },
      // User sites
      User: {
        fields: {
          sites: {
            merge(existing, incoming) {
              return {
                ...incoming,
                edges: [
                  ...(existing?.edges || []),
                  ...incoming.edges,
                ],
              };
            },
          },
        },
      },
      // Query root
      Query: {
        fields: {
          // Cache analytics separately by site and period
          analytics: {
            keyArgs: ['siteId', 'period'],
          },
          // Cache search results by query and filters
          searchProducts: {
            keyArgs: ['query', 'filters'],
            merge(existing, incoming) {
              return {
                ...incoming,
                edges: [
                  ...(existing?.edges || []),
                  ...incoming.edges,
                ],
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network',
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// React Query Setup (Alternative to Apollo)
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.extensions?.code === 'UNAUTHENTICATED') {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// GraphQL request function for React Query
export async function graphqlRequest<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const token = localStorage.getItem('auth-token');
  
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

// TypeScript types for common operations
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR' | 'DEVELOPER';
  sites: {
    edges: Array<{
      node: Site;
    }>;
  };
}

export interface Site {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  isActive: boolean;
  analytics?: Analytics;
}

export interface Product {
  id: string;
  name: string;
  price?: number;
  affiliateLink: string;
  categories: Category[];
  rating?: number;
}

export interface Analytics {
  visitors: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

// Common GraphQL fragments
export const USER_FRAGMENT = `
  fragment UserFields on User {
    id
    email
    name
    role
    isActive
    createdAt
  }
`;

export const SITE_FRAGMENT = `
  fragment SiteFields on Site {
    id
    name
    slug
    domain
    isActive
    createdAt
    updatedAt
  }
`;

export const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    name
    description
    price
    affiliateLink
    imageUrl
    rating
    createdAt
  }
`;

// Common queries
export const GET_CURRENT_USER = `
  ${USER_FRAGMENT}
  query GetCurrentUser {
    me {
      ...UserFields
      sites(first: 10) {
        edges {
          node {
            ...SiteFields
          }
        }
      }
    }
  }
`;

export const GET_SITE_PRODUCTS = `
  ${PRODUCT_FRAGMENT}
  query GetSiteProducts($siteId: ID!, $first: Int, $after: String) {
    site(id: $siteId) {
      id
      name
      products(first: $first, after: $after) {
        edges {
          node {
            ...ProductFields
            categories {
              id
              name
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
      }
    }
  }
`;

export const SEARCH_PRODUCTS = `
  ${PRODUCT_FRAGMENT}
  query SearchProducts(
    $query: String!
    $filters: [FilterInput!]
    $first: Int
    $after: String
  ) {
    searchProducts(
      query: $query
      filters: $filters
      pagination: { first: $first, after: $after }
    ) {
      edges {
        node {
          ...ProductFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
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
`;

// Real-time subscription hooks
export const ANALYTICS_SUBSCRIPTION = `
  subscription AnalyticsUpdated($siteId: ID!) {
    analyticsUpdated(siteId: $siteId) {
      visitors
      conversions
      revenue
      conversionRate
    }
  }
`;

export const NOTIFICATIONS_SUBSCRIPTION = `
  subscription UserNotifications($userId: ID!) {
    notificationAdded(userId: $userId) {
      id
      title
      message
      type
      priority
      createdAt
    }
  }
`;

// Utility hooks for React
export function useAuthToken() {
  return localStorage.getItem('auth-token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('auth-token', token);
  // Reset Apollo Client cache
  apolloClient.resetStore();
}

export function clearAuthToken() {
  localStorage.removeItem('auth-token');
  // Reset Apollo Client cache
  apolloClient.resetStore();
}

// Export everything
export * from '@apollo/client';
export { createClient as createWsClient } from 'graphql-ws';