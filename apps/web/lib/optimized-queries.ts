/**
 * Optimized database queries with caching and batching
 */

import { createServiceClient } from './supabase';
import { unstable_cache } from 'next/cache';
import { cacheConfig, dbOptimization } from '../config/performance';
import type { Product, Post, Tenant } from '@affiliate-factory/sdk';

/**
 * Create a cached database query
 * Uses Next.js unstable_cache for server-side caching
 */
function createCachedQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  revalidate: number = cacheConfig.apiCache.revalidate.products
) {
  return unstable_cache(
    queryFn,
    [queryName],
    {
      revalidate,
      tags: [queryName],
    }
  );
}

/**
 * Optimized product queries
 */
export const productQueries = {
  // Get featured products with field selection and caching
  getFeaturedProducts: createCachedQuery(
    'featured-products',
    async (tenantId: string) => {
      const client = createServiceClient();
      const { data, error } = await client
        .from('products')
        .select(dbOptimization.selectFields.productList.join(','))
        .eq('tenant_id', tenantId)
        .order('rating', { ascending: false })
        .limit(dbOptimization.batchSize.products)
        .gte('rating', 4.0) // Only high-rated products
        .not('affiliate_url', 'is', null); // Ensure affiliate links exist
      
      if (error) throw error;
      return data as Product[];
    },
    cacheConfig.apiCache.revalidate.products
  ),

  // Get products by category with pagination
  getProductsByCategory: createCachedQuery(
    'products-by-category',
    async (tenantId: string, category: string, page: number = 1) => {
      const client = createServiceClient();
      const limit = dbOptimization.pagination.defaultLimit;
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await client
        .from('products')
        .select(dbOptimization.selectFields.productList.join(','), { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('category', category)
        .order('rating', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      return {
        products: data as Product[],
        totalCount: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
    cacheConfig.apiCache.revalidate.products
  ),

  // Get single product with full details
  getProductDetail: createCachedQuery(
    'product-detail',
    async (productId: string) => {
      const client = createServiceClient();
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    cacheConfig.apiCache.revalidate.products
  ),

  // Batch get products by IDs
  getProductsByIds: async (productIds: string[]) => {
    const client = createServiceClient();
    
    // Split into batches to avoid query size limits
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < productIds.length; i += batchSize) {
      batches.push(productIds.slice(i, i + batchSize));
    }
    
    const results = await Promise.all(
      batches.map(async (batch) => {
        const { data, error } = await client
          .from('products')
          .select(dbOptimization.selectFields.productList.join(','))
          .in('id', batch);
        
        if (error) throw error;
        return data as Product[];
      })
    );
    
    return results.flat();
  },
};

/**
 * Optimized post queries
 */
export const postQueries = {
  // Get recent posts with caching
  getRecentPosts: createCachedQuery(
    'recent-posts',
    async (tenantId: string, limit: number = dbOptimization.batchSize.posts) => {
      const client = createServiceClient();
      const { data, error } = await client
        .from('posts')
        .select(dbOptimization.selectFields.postList.join(','))
        .eq('tenant_id', tenantId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Post[];
    },
    cacheConfig.apiCache.revalidate.posts
  ),

  // Get posts with pagination
  getPaginatedPosts: createCachedQuery(
    'paginated-posts',
    async (tenantId: string, page: number = 1) => {
      const client = createServiceClient();
      const limit = dbOptimization.pagination.defaultLimit;
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await client
        .from('posts')
        .select(dbOptimization.selectFields.postList.join(','), { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      return {
        posts: data as Post[],
        totalCount: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
    cacheConfig.apiCache.revalidate.posts
  ),

  // Get post by slug with full content
  getPostBySlug: createCachedQuery(
    'post-by-slug',
    async (tenantId: string, slug: string) => {
      const client = createServiceClient();
      const { data, error } = await client
        .from('posts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
      
      if (error) throw error;
      return data as Post;
    },
    cacheConfig.apiCache.revalidate.posts
  ),

  // Get related posts
  getRelatedPosts: createCachedQuery(
    'related-posts',
    async (postId: string, limit: number = 3) => {
      const client = createServiceClient();
      
      // First get the current post's tags/categories
      const { data: currentPost, error: postError } = await client
        .from('posts')
        .select('taxonomy_ids')
        .eq('id', postId)
        .single();
      
      if (postError) throw postError;
      
      // Find posts with similar taxonomy
      const { data, error } = await client
        .from('posts')
        .select(dbOptimization.selectFields.postList.join(','))
        .overlaps('taxonomy_ids', currentPost.taxonomy_ids)
        .neq('id', postId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Post[];
    },
    cacheConfig.apiCache.revalidate.posts
  ),
};

/**
 * Optimized tenant queries
 */
export const tenantQueries = {
  // Get tenant by slug with long cache
  getTenantBySlug: createCachedQuery(
    'tenant-by-slug',
    async (slug: string) => {
      const client = createServiceClient();
      const { data, error } = await client
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data as Tenant;
    },
    cacheConfig.apiCache.revalidate.tenant
  ),

  // Get tenant configuration
  getTenantConfig: createCachedQuery(
    'tenant-config',
    async (tenantId: string) => {
      const client = createServiceClient();
      const { data, error } = await client
        .from('tenants')
        .select('id, name, slug, theme, domain, status')
        .eq('id', tenantId)
        .single();
      
      if (error) throw error;
      return data;
    },
    cacheConfig.apiCache.revalidate.tenant
  ),
};

/**
 * Optimized taxonomy queries
 */
export const taxonomyQueries = {
  // Get all taxonomy with long cache
  getTaxonomy: createCachedQuery(
    'taxonomy',
    async (tenantId: string) => {
      const client = createServiceClient();
      const { data, error } = await client
        .from('taxonomy')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;
      
      const vertical = data.filter((row: any) => row.kind === 'vertical');
      const horizontal = data.filter((row: any) => row.kind === 'horizontal');
      
      return { vertical, horizontal };
    },
    cacheConfig.apiCache.revalidate.taxonomy
  ),

  // Get taxonomy by slug
  getTaxonomyBySlug: createCachedQuery(
    'taxonomy-by-slug',
    async (tenantId: string, slug: string) => {
      const client = createServiceClient();
      const { data, error } = await client
        .from('taxonomy')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data;
    },
    cacheConfig.apiCache.revalidate.taxonomy
  ),
};

/**
 * Optimized search queries
 */
export const searchQueries = {
  // Full-text search with vector similarity
  searchProducts: async (
    tenantId: string,
    query: string,
    limit: number = 20
  ) => {
    const client = createServiceClient();
    
    // Use PostgreSQL full-text search
    const { data, error } = await client
      .from('products')
      .select(dbOptimization.selectFields.productList.join(','))
      .eq('tenant_id', tenantId)
      .textSearch('title', query, {
        type: 'websearch',
        config: 'english',
      })
      .order('rating', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as Product[];
  },

  // Vector similarity search (if pgvector is enabled)
  semanticSearch: async (
    tenantId: string,
    embedding: number[],
    limit: number = 20
  ) => {
    const client = createServiceClient();
    
    const { data, error } = await client.rpc('match_products', {
      tenant_uuid: tenantId,
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit,
    });
    
    if (error) throw error;
    return data as Product[];
  },
};

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  // Invalidate product caches
  invalidateProducts: async (tags?: string[]) => {
    const { revalidateTag } = await import('next/cache');
    revalidateTag('featured-products');
    revalidateTag('products-by-category');
    if (tags) {
      tags.forEach(tag => revalidateTag(tag));
    }
  },

  // Invalidate post caches
  invalidatePosts: async (tags?: string[]) => {
    const { revalidateTag } = await import('next/cache');
    revalidateTag('recent-posts');
    revalidateTag('paginated-posts');
    if (tags) {
      tags.forEach(tag => revalidateTag(tag));
    }
  },

  // Invalidate all caches
  invalidateAll: async () => {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/', 'layout');
  },
};

// Export all query modules
export default {
  products: productQueries,
  posts: postQueries,
  tenants: tenantQueries,
  taxonomy: taxonomyQueries,
  search: searchQueries,
  cache: cacheInvalidation,
};