import { GraphQLError } from 'graphql';
import { generateApiKey } from '@/lib/api/auth';

export const resolvers = {
  Query: {
    // User queries
    me: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return context.user;
    },

    // Site queries
    site: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const { data, error } = await context.supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .eq('user_id', context.user.id)
        .single();

      if (error) throw new GraphQLError(error.message);
      return data;
    },

    sites: async (_: any, { page = 1, limit = 10 }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const offset = (page - 1) * limit;
      
      const { data, error, count } = await context.supabase
        .from('tenants')
        .select('*', { count: 'exact' })
        .eq('user_id', context.user.id)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw new GraphQLError(error.message);

      return {
        items: data || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },

    // Product queries
    products: async (_: any, { site_id, page = 1, limit = 20 }: any, context: any) => {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await context.supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('site_id', site_id)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw new GraphQLError(error.message);

      return {
        items: data || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },

    searchProducts: async (_: any, { query, limit = 10 }: any, context: any) => {
      const { data, error } = await context.supabase
        .from('products')
        .select('*')
        .textSearch('fts', query)
        .limit(limit);

      if (error) throw new GraphQLError(error.message);
      return data || [];
    },

    // Theme queries
    themes: async (_: any, __: any, context: any) => {
      const { data, error } = await context.supabase
        .from('themes')
        .select('*')
        .eq('is_active', true);

      if (error) throw new GraphQLError(error.message);
      return data || [];
    },

    // Analytics queries
    analytics: async (_: any, { site_id, period = '7d' }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Verify site ownership
      const { data: site } = await context.supabase
        .from('tenants')
        .select('id')
        .eq('id', site_id)
        .eq('user_id', context.user.id)
        .single();

      if (!site) {
        throw new GraphQLError('Site not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Get analytics data
      const { data, error } = await context.supabase
        .from('analytics')
        .select('*')
        .eq('site_id', site_id)
        .gte('created_at', getDateFromPeriod(period))
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return {
          site_id,
          visitors: 0,
          page_views: 0,
          conversion_rate: 0,
          revenue: 0,
          period,
        };
      }

      return { ...data, period };
    },
  },

  Mutation: {
    // Site mutations
    createSite: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const slug = input.name.toLowerCase().replace(/\s+/g, '-');
      
      const { data, error } = await context.supabase
        .from('tenants')
        .insert({
          ...input,
          slug,
          user_id: context.user.id,
        })
        .select()
        .single();

      if (error) throw new GraphQLError(error.message);
      return data;
    },

    updateSite: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const { data, error } = await context.supabase
        .from('tenants')
        .update(input)
        .eq('id', id)
        .eq('user_id', context.user.id)
        .select()
        .single();

      if (error) throw new GraphQLError(error.message);
      return data;
    },

    deleteSite: async (_: any, { id }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const { error } = await context.supabase
        .from('tenants')
        .delete()
        .eq('id', id)
        .eq('user_id', context.user.id);

      if (error) throw new GraphQLError(error.message);
      return true;
    },

    // Product mutations
    createProduct: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Verify site ownership
      const { data: site } = await context.supabase
        .from('tenants')
        .select('id')
        .eq('id', input.site_id)
        .eq('user_id', context.user.id)
        .single();

      if (!site) {
        throw new GraphQLError('Site not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const { data, error } = await context.supabase
        .from('products')
        .insert(input)
        .select()
        .single();

      if (error) throw new GraphQLError(error.message);
      return data;
    },

    // API Key mutations
    generateApiKey: async (_: any, { name }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        const apiKey = await generateApiKey(context.user.id, name);
        return apiKey;
      } catch (error: any) {
        throw new GraphQLError(error.message);
      }
    },

    // Post mutations with AI generation
    generatePost: async (_: any, { site_id, topic }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Call AI generation service
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/generate-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id, topic }),
      });

      if (!response.ok) {
        throw new GraphQLError('Failed to generate post');
      }

      const post = await response.json();
      return post;
    },
  },

  // Field resolvers
  Site: {
    theme: async (parent: any, _: any, context: any) => {
      if (!parent.theme_id) return null;
      
      const { data } = await context.supabase
        .from('themes')
        .select('*')
        .eq('id', parent.theme_id)
        .single();
      
      return data;
    },

    products: async (parent: any, _: any, context: any) => {
      return context.dataloaders.productLoader.load(parent.id);
    },

    posts: async (parent: any, _: any, context: any) => {
      const { data } = await context.supabase
        .from('posts')
        .select('*')
        .eq('site_id', parent.id)
        .order('created_at', { ascending: false });
      
      return data || [];
    },

    analytics: async (parent: any, _: any, context: any) => {
      const { data } = await context.supabase
        .from('analytics')
        .select('*')
        .eq('site_id', parent.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      return data;
    },
  },

  User: {
    sites: async (parent: any, _: any, context: any) => {
      const { data } = await context.supabase
        .from('tenants')
        .select('*')
        .eq('user_id', parent.id)
        .order('created_at', { ascending: false });
      
      return data || [];
    },
  },

  Product: {
    site: async (parent: any, _: any, context: any) => {
      return context.dataloaders.siteLoader.load(parent.site_id);
    },
  },

  Post: {
    site: async (parent: any, _: any, context: any) => {
      return context.dataloaders.siteLoader.load(parent.site_id);
    },
  },
};

function getDateFromPeriod(period: string): string {
  const now = new Date();
  const match = period.match(/(\d+)([dwmy])/);
  
  if (!match) {
    // Default to 7 days
    now.setDate(now.getDate() - 7);
    return now.toISOString();
  }
  
  const [, num, unit] = match;
  const value = parseInt(num, 10);
  
  switch (unit) {
    case 'd':
      now.setDate(now.getDate() - value);
      break;
    case 'w':
      now.setDate(now.getDate() - value * 7);
      break;
    case 'm':
      now.setMonth(now.getMonth() - value);
      break;
    case 'y':
      now.setFullYear(now.getFullYear() - value);
      break;
  }
  
  return now.toISOString();
}