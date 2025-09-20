import { GraphQLError } from 'graphql';
import { SchemaDirectiveVisitor } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLField } from 'graphql';

export class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const requiredRole = this.args.requires;

    field.resolve = async function (source, args, context, info) {
      // Check if user is authenticated
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      // Check user role if specified
      if (requiredRole && context.user.role !== requiredRole) {
        // Check if user has sufficient privileges
        const roleHierarchy = {
          USER: 0,
          MODERATOR: 1,
          ADMIN: 2,
          DEVELOPER: 3,
        };

        const userLevel = roleHierarchy[context.user.role] ?? -1;
        const requiredLevel = roleHierarchy[requiredRole] ?? 999;

        if (userLevel < requiredLevel) {
          throw new GraphQLError('Insufficient permissions', {
            extensions: {
              code: 'FORBIDDEN',
              http: { status: 403 },
            },
          });
        }
      }

      // Check if user is active
      if (!context.user.isActive) {
        throw new GraphQLError('Account is inactive', {
          extensions: {
            code: 'ACCOUNT_INACTIVE',
            http: { status: 403 },
          },
        });
      }

      return resolve.call(this, source, args, context, info);
    };
  }
}

// Field-level authorization helper
export function requireAuth(role?: string) {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;

    descriptor.value = function (source: any, args: any, context: any, info: any) {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      if (role && context.user.role !== role) {
        throw new GraphQLError('Insufficient permissions', {
          extensions: {
            code: 'FORBIDDEN',
            http: { status: 403 },
          },
        });
      }

      return method.call(this, source, args, context, info);
    };
  };
}

// Resource ownership check
export function requireOwnership(resourceField: string) {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;

    descriptor.value = async function (source: any, args: any, context: any, info: any) {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      // Check resource ownership
      const resourceId = args.id || args[resourceField];
      if (resourceId) {
        const isOwner = await checkResourceOwnership(
          context.user.id,
          resourceId,
          resourceField,
          context.supabase
        );

        if (!isOwner && context.user.role !== 'ADMIN') {
          throw new GraphQLError('Access denied to this resource', {
            extensions: {
              code: 'FORBIDDEN',
              http: { status: 403 },
            },
          });
        }
      }

      return method.call(this, source, args, context, info);
    };
  };
}

// Check if user owns the resource
async function checkResourceOwnership(
  userId: string,
  resourceId: string,
  resourceType: string,
  supabase: any
): Promise<boolean> {
  let table: string;
  let userField = 'user_id';

  switch (resourceType) {
    case 'site':
    case 'siteId':
      table = 'tenants';
      break;
    case 'product':
    case 'productId':
      // Check ownership through site
      const { data: product } = await supabase
        .from('products')
        .select('site_id')
        .eq('id', resourceId)
        .single();
      
      if (!product) return false;
      
      const { data: site } = await supabase
        .from('tenants')
        .select('user_id')
        .eq('id', product.site_id)
        .single();
      
      return site?.user_id === userId;
    case 'post':
    case 'postId':
      table = 'posts';
      userField = 'author_id';
      break;
    default:
      return false;
  }

  const { data } = await supabase
    .from(table)
    .select(userField)
    .eq('id', resourceId)
    .single();

  return data?.[userField] === userId;
}

// Multi-tenant data isolation
export function requireTenantAccess(tenantField: string = 'siteId') {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;

    descriptor.value = async function (source: any, args: any, context: any, info: any) {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      const tenantId = args[tenantField];
      if (tenantId) {
        const hasAccess = await checkTenantAccess(
          context.user.id,
          tenantId,
          context.supabase
        );

        if (!hasAccess && context.user.role !== 'ADMIN') {
          throw new GraphQLError('Access denied to this tenant', {
            extensions: {
              code: 'FORBIDDEN',
              http: { status: 403 },
            },
          });
        }
      }

      return method.call(this, source, args, context, info);
    };
  };
}

async function checkTenantAccess(
  userId: string,
  tenantId: string,
  supabase: any
): Promise<boolean> {
  // Check if user owns the tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('user_id')
    .eq('id', tenantId)
    .single();

  if (tenant?.user_id === userId) {
    return true;
  }

  // Check if user is a collaborator
  const { data: collaborator } = await supabase
    .from('site_collaborators')
    .select('id')
    .eq('site_id', tenantId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  return !!collaborator;
}