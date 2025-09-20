import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { 
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault 
} from '@apollo/server/plugin/landingPage/default';

// Import schema and resolvers
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

// Import middleware and utilities
import { AuthDirective } from './middleware/auth';
import { RateLimitDirective } from './middleware/rateLimit';
import { 
  complexityAnalysisPlugin, 
  depthLimitPlugin,
  createPerformanceMonitor,
  getUserComplexityLimit 
} from './middleware/complexity';
import { createDataLoaders } from './utils/dataLoaders';
import { graphqlCache, queryCache } from './utils/cache';

// Import Supabase and auth
import { createClient } from '@/lib/supabase/server';
import { apiAuth } from '@/lib/api/auth';

// Create executable schema with directives
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  schemaDirectives: {
    auth: AuthDirective,
    rateLimit: RateLimitDirective,
  },
});

// Apply query depth limiting
const schemaWithDepthLimit = depthLimitPlugin(schema);

// Enhanced context creation
async function createContext(req: NextRequest) {
  const startTime = Date.now();
  
  // Extract IP address
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             '127.0.0.1';

  // Authenticate user
  const { user, session } = await apiAuth(req);
  
  // Create Supabase client
  const supabase = createClient();

  // Create DataLoaders for N+1 prevention
  const dataloaders = createDataLoaders(supabase);

  // Create context object
  const context = {
    user,
    session,
    supabase,
    dataloaders,
    cache: graphqlCache,
    queryCache,
    ip,
    startTime,
    
    // Request metadata
    userAgent: req.headers.get('user-agent'),
    origin: req.headers.get('origin'),
    
    // Performance tracking
    metrics: {
      queryStart: startTime,
      dbQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
    },
  };

  return context;
}

// WebSocket server for subscriptions
let wsServer: WebSocketServer | null = null;

if (process.env.NODE_ENV !== 'production') {
  // Only create WebSocket server in development
  // In production, you'd typically use a separate service or Vercel Functions with WebSockets
  try {
    wsServer = new WebSocketServer({
      port: 4000,
      path: '/graphql/subscriptions',
    });

    useServer(
      {
        schema: schemaWithDepthLimit,
        context: async (ctx) => {
          // Create context for subscriptions
          return {
            // Simplified context for WebSocket connections
            user: null, // Would need to implement WebSocket auth
            supabase: createClient(),
            ip: ctx.connectionParams?.ip || 'unknown',
          };
        },
      },
      wsServer
    );
  } catch (error) {
    console.warn('WebSocket server not available:', error);
  }
}

// Enhanced Apollo Server
const server = new ApolloServer({
  schema: schemaWithDepthLimit,
  
  // Introspection and playground
  introspection: process.env.NODE_ENV !== 'production',
  
  // CSRF prevention
  csrfPrevention: true,
  
  // Cache configuration
  cache: 'bounded',
  
  // Plugins
  plugins: [
    // Performance monitoring
    createPerformanceMonitor(),
    
    // Query complexity analysis
    complexityAnalysisPlugin,
    
    // Landing page
    process.env.NODE_ENV === 'production'
      ? ApolloServerPluginLandingPageProductionDefault({
          footer: false,
          includeCookies: true,
        })
      : ApolloServerPluginLandingPageLocalDefault({
          footer: false,
          includeCookies: true,
        }),
    
    // Drain HTTP server for WebSocket
    ...(wsServer ? [ApolloServerPluginDrainHttpServer({ httpServer: wsServer as any })] : []),
    
    // Custom caching plugin
    {
      requestDidStart() {
        return {
          willSendResponse(requestContext) {
            const { request, response, context } = requestContext;
            
            // Add cache headers for successful queries
            if (!response.errors && request.operationName) {
              const maxAge = getUserCacheMaxAge(context.user, request.operationName);
              response.http.headers.set('Cache-Control', `max-age=${maxAge}, private`);
            }
            
            // Add performance headers
            const executionTime = Date.now() - context.startTime;
            response.http.headers.set('X-Response-Time', `${executionTime}ms`);
            response.http.headers.set('X-DB-Queries', context.metrics.dbQueries.toString());
            response.http.headers.set('X-Cache-Hits', context.metrics.cacheHits.toString());
          },
        };
      },
    },
    
    // Query caching plugin
    {
      requestDidStart() {
        return {
          async didResolveOperation(requestContext) {
            const { request, context } = requestContext;
            
            // Skip caching for mutations and subscriptions
            if (request.operationName?.includes('mutation') || 
                request.operationName?.includes('subscription')) {
              return;
            }
            
            // Check for cached result
            const cachedResult = await queryCache.getCachedQuery(
              request.operationName || 'unknown',
              request.variables
            );
            
            if (cachedResult) {
              context.metrics.cacheHits++;
              // Note: Apollo Server doesn't directly support returning cached results here
              // This would need to be implemented at the resolver level
            } else {
              context.metrics.cacheMisses++;
            }
          },
          
          async willSendResponse(requestContext) {
            const { request, response, context } = requestContext;
            
            // Cache successful query results
            if (!response.errors && 
                request.operationName && 
                !request.operationName.includes('mutation') &&
                !request.operationName.includes('subscription')) {
              
              const maxAge = getUserCacheMaxAge(context.user, request.operationName);
              await queryCache.cacheQuery(
                request.operationName,
                request.variables,
                response.data,
                maxAge
              );
            }
          },
        };
      },
    },
  ],
  
  // Enhanced error formatting
  formatError: (formattedError, error) => {
    // Log detailed errors internally
    console.error('GraphQL Error:', {
      message: error.message,
      locations: error.locations,
      path: error.path,
      stack: error.stack,
      extensions: error.extensions,
    });
    
    // Return sanitized errors
    if (process.env.NODE_ENV === 'production') {
      // Don't expose internal errors in production
      if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return {
          message: 'An internal error occurred',
          extensions: {
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
          },
        };
      }
    }
    
    return {
      message: formattedError.message,
      locations: formattedError.locations,
      path: formattedError.path,
      extensions: {
        code: formattedError.extensions?.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
        ...formattedError.extensions,
      },
    };
  },
  
  // Response formatting
  formatResponse: (response, requestContext) => {
    // Add metadata to response
    return {
      ...response,
      extensions: {
        ...response.extensions,
        executionTime: Date.now() - requestContext.context.startTime,
        cacheInfo: {
          hits: requestContext.context.metrics.cacheHits,
          misses: requestContext.context.metrics.cacheMisses,
        },
      },
    };
  },
});

// Helper function to determine cache max age based on user and operation
function getUserCacheMaxAge(user: any, operationName: string): number {
  // Analytics data - short cache
  if (operationName.includes('analytics') || operationName.includes('realTime')) {
    return 60; // 1 minute
  }
  
  // User-specific data - medium cache
  if (operationName.includes('me') || operationName.includes('myData')) {
    return 300; // 5 minutes
  }
  
  // Static content - long cache
  if (operationName.includes('themes') || operationName.includes('templates')) {
    return 3600; // 1 hour
  }
  
  // Default cache
  return 180; // 3 minutes
}

// Enhanced Next.js handler with additional features
const handler = startServerAndCreateNextHandler(server, {
  context: createContext,
});

// Health check endpoint
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  
  if (url.pathname.endsWith('/health')) {
    // Health check
    const isHealthy = await graphqlCache.isHealthy();
    const status = isHealthy ? 200 : 503;
    
    return new Response(JSON.stringify({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      cache: {
        connected: isHealthy,
        stats: isHealthy ? await graphqlCache.getStats() : null,
      },
    }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  if (url.pathname.endsWith('/schema')) {
    // Schema introspection endpoint
    return new Response(JSON.stringify({
      schema: typeDefs.map(def => def.loc?.source.body).join('\n'),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Default GraphQL handler
  return handler(request);
}

export async function POST(request: NextRequest) {
  // Add request size limit
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
    return new Response(JSON.stringify({
      errors: [{
        message: 'Request too large',
        extensions: { code: 'REQUEST_TOO_LARGE' },
      }],
    }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return handler(request);
}