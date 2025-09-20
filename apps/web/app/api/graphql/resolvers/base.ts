import { GraphQLScalarType, Kind } from 'graphql';
import { GraphQLError } from 'graphql';
import { GraphQLUpload } from 'graphql-upload';

// Custom scalar resolvers
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'A date-time string at UTC, such as 2007-12-03T10:15:30Z',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    throw new GraphQLError('Value must be a Date object or ISO date string');
  },
  parseValue(value: any) {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new GraphQLError('Invalid date string');
      }
      return date;
    }
    throw new GraphQLError('Value must be a string');
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      const date = new Date(ast.value);
      if (isNaN(date.getTime())) {
        throw new GraphQLError('Invalid date string');
      }
      return date;
    }
    throw new GraphQLError('Value must be a string');
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'A JSON object',
  serialize(value: any) {
    return value;
  },
  parseValue(value: any) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
        try {
          return JSON.parse(ast.value);
        } catch {
          throw new GraphQLError('Invalid JSON string');
        }
      case Kind.OBJECT:
      case Kind.LIST:
        return ast.value;
      default:
        throw new GraphQLError('Value must be a JSON object or string');
    }
  },
});

const EmailAddressScalar = new GraphQLScalarType({
  name: 'EmailAddress',
  description: 'A valid email address',
  serialize(value: any) {
    if (typeof value === 'string' && isValidEmail(value)) {
      return value;
    }
    throw new GraphQLError('Value must be a valid email address');
  },
  parseValue(value: any) {
    if (typeof value === 'string' && isValidEmail(value)) {
      return value;
    }
    throw new GraphQLError('Value must be a valid email address');
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING && isValidEmail(ast.value)) {
      return ast.value;
    }
    throw new GraphQLError('Value must be a valid email address');
  },
});

const URLScalar = new GraphQLScalarType({
  name: 'URL',
  description: 'A valid URL',
  serialize(value: any) {
    if (typeof value === 'string' && isValidURL(value)) {
      return value;
    }
    throw new GraphQLError('Value must be a valid URL');
  },
  parseValue(value: any) {
    if (typeof value === 'string' && isValidURL(value)) {
      return value;
    }
    throw new GraphQLError('Value must be a valid URL');
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING && isValidURL(ast.value)) {
      return ast.value;
    }
    throw new GraphQLError('Value must be a valid URL');
  },
});

const UUIDScalar = new GraphQLScalarType({
  name: 'UUID',
  description: 'A valid UUID',
  serialize(value: any) {
    if (typeof value === 'string' && isValidUUID(value)) {
      return value;
    }
    throw new GraphQLError('Value must be a valid UUID');
  },
  parseValue(value: any) {
    if (typeof value === 'string' && isValidUUID(value)) {
      return value;
    }
    throw new GraphQLError('Value must be a valid UUID');
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING && isValidUUID(ast.value)) {
      return ast.value;
    }
    throw new GraphQLError('Value must be a valid UUID');
  },
});

// Validation functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export const baseResolvers = {
  // Scalar type resolvers
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  EmailAddress: EmailAddressScalar,
  URL: URLScalar,
  UUID: UUIDScalar,
  Upload: GraphQLUpload,

  Query: {
    // API Info
    apiInfo: async () => {
      return {
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.floor(process.uptime()),
        features: [
          'GraphQL API',
          'Real-time Subscriptions',
          'File Uploads',
          'Rate Limiting',
          'Caching',
          'Authentication',
          'Authorization',
          'Data Validation',
          'Error Handling',
          'Performance Monitoring',
        ],
      };
    },

    // Health check
    health: async () => {
      return 'OK';
    },
  },

  Mutation: {
    _empty: () => null,
  },

  Subscription: {
    _empty: () => null,
  },
};