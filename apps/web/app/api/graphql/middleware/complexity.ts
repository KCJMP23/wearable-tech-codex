import { costAnalysis, maximumCost } from 'graphql-query-complexity';
import { GraphQLError } from 'graphql';
import depthLimit from 'graphql-depth-limit';

// Query complexity analysis configuration
export const complexityAnalysisPlugin = {
  requestDidStart() {
    return {
      didResolveOperation({ request, document }: any) {
        // Calculate query complexity
        const complexity = costAnalysis({
          maximumCost: 1000, // Default maximum cost
          defaultCost: 1,
          scalarCost: 1,
          objectCost: 1,
          listFactor: 10,
          introspectionCost: 1000,
          createError: (max: number, actual: number) => {
            return new GraphQLError(
              `Query is too complex: ${actual}. Maximum allowed complexity: ${max}`,
              {
                extensions: {
                  code: 'QUERY_TOO_COMPLEX',
                  http: { status: 400 },
                  complexity: {
                    maximum: max,
                    actual: actual,
                  },
                },
              }
            );
          },
        });

        // Apply complexity analysis
        return complexity(document);
      },
    };
  },
};

// Query depth limiting
export const depthLimitPlugin = depthLimit(15, {
  ignore: ['__schema', '__type'], // Ignore introspection queries
});

// Custom complexity calculator for different field types
export const fieldComplexityCalculator = {
  // Simple field complexity
  simpleField: () => 1,

  // Collection field complexity based on pagination
  collection: (args: any) => {
    const limit = args.limit || args.first || args.last || 20;
    return Math.min(limit, 100); // Cap at 100
  },

  // Search field complexity
  search: (args: any) => {
    const limit = args.limit || 20;
    const searchComplexity = args.query ? 5 : 1; // Search adds complexity
    return Math.min(limit * searchComplexity, 200);
  },

  // Analytics field complexity
  analytics: (args: any) => {
    const period = args.period || '7d';
    let complexity = 10; // Base analytics complexity

    // Increase complexity for longer periods
    if (period.includes('y')) complexity *= 12;
    else if (period.includes('m')) complexity *= 4;
    else if (period.includes('w')) complexity *= 2;

    return complexity;
  },

  // Nested relationship complexity
  relationship: (args: any, childComplexity: number) => {
    return childComplexity * 2; // Relationships add overhead
  },

  // Real-time data complexity
  realTime: () => 50, // Real-time data is expensive

  // File upload complexity
  upload: () => 100, // File operations are expensive

  // AI-powered operations complexity
  aiOperation: (args: any) => {
    let complexity = 200; // Base AI complexity

    // Increase based on content length
    if (args.content && args.content.length > 1000) {
      complexity += Math.floor(args.content.length / 1000) * 50;
    }

    return Math.min(complexity, 1000); // Cap at 1000
  },
};

// User-based complexity limits
export function getUserComplexityLimit(user: any): number {
  if (!user) return 100; // Anonymous users get low limit

  switch (user.role) {
    case 'ADMIN':
    case 'DEVELOPER':
      return 10000; // Very high limit for admins
    case 'MODERATOR':
      return 5000;
    default:
      if (user.isPremium) {
        return 2000; // Higher limit for premium users
      } else {
        return 500; // Standard limit for free users
      }
  }
}

// Complexity validation middleware
export function validateComplexity(context: any, complexity: number): void {
  const userLimit = getUserComplexityLimit(context.user);

  if (complexity > userLimit) {
    throw new GraphQLError(
      `Query complexity ${complexity} exceeds your limit of ${userLimit}`,
      {
        extensions: {
          code: 'COMPLEXITY_LIMIT_EXCEEDED',
          http: { status: 400 },
          complexity: {
            actual: complexity,
            limit: userLimit,
            userTier: context.user?.role || 'ANONYMOUS',
          },
        },
      }
    );
  }
}

// Time-based complexity limiting (to prevent sustained abuse)
export async function checkComplexityRateLimit(
  context: any,
  complexity: number
): Promise<void> {
  const key = `complexity:${context.user?.id || context.ip}`;
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxComplexity = getUserComplexityLimit(context.user) * 10; // 10x hourly limit

  // This would integrate with Redis to track cumulative complexity
  // Implementation depends on your caching strategy
}

// Query analysis for monitoring
export function analyzeQuery(info: any): {
  fieldCount: number;
  depth: number;
  hasFileUploads: boolean;
  hasRealTimeFields: boolean;
  hasAIFields: boolean;
} {
  const analysis = {
    fieldCount: 0,
    depth: 0,
    hasFileUploads: false,
    hasRealTimeFields: false,
    hasAIFields: false,
  };

  // This would recursively analyze the query AST
  // to provide insights for monitoring and optimization

  return analysis;
}

// Performance monitoring
export function createPerformanceMonitor() {
  return {
    requestDidStart() {
      return {
        willSendResponse(requestContext: any) {
          const { request, response, context } = requestContext;
          
          // Log slow queries
          const executionTime = Date.now() - context.startTime;
          if (executionTime > 5000) { // 5 seconds
            console.warn('Slow GraphQL query detected:', {
              query: request.query,
              variables: request.variables,
              executionTime,
              user: context.user?.id,
              complexity: context.complexity,
            });
          }

          // Monitor error rates
          if (response.errors && response.errors.length > 0) {
            console.error('GraphQL errors:', {
              errors: response.errors,
              query: request.query,
              variables: request.variables,
              user: context.user?.id,
            });
          }
        },
      };
    },
  };
}