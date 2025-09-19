/**
 * Optimized React Query hooks with caching and prefetching strategies
 */

import { useQuery, usePrefetchQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { cacheConfig, dbOptimization } from '../config/performance';
import type { Product, Post, Quiz, InsightCard } from '@affiliate-factory/sdk';
import { createBrowserClient } from '../lib/supabase-browser';

// Query Keys Factory
export const queryKeys = {
  all: ['affiliate'] as const,
  tenants: () => [...queryKeys.all, 'tenants'] as const,
  tenant: (slug: string) => [...queryKeys.tenants(), slug] as const,
  
  products: () => [...queryKeys.all, 'products'] as const,
  productList: (tenantId: string, filters?: any) => 
    [...queryKeys.products(), 'list', tenantId, filters] as const,
  productDetail: (productId: string) => 
    [...queryKeys.products(), 'detail', productId] as const,
  productsByCategory: (tenantId: string, category: string) =>
    [...queryKeys.products(), 'category', tenantId, category] as const,
  
  posts: () => [...queryKeys.all, 'posts'] as const,
  postList: (tenantId: string) => [...queryKeys.posts(), 'list', tenantId] as const,
  postDetail: (tenantId: string, slug: string) => 
    [...queryKeys.posts(), 'detail', tenantId, slug] as const,
  postsByTaxonomy: (tenantId: string, taxonomy: string) =>
    [...queryKeys.posts(), 'taxonomy', tenantId, taxonomy] as const,
  
  taxonomy: (tenantId: string) => [...queryKeys.all, 'taxonomy', tenantId] as const,
  quiz: (tenantId: string) => [...queryKeys.all, 'quiz', tenantId] as const,
  insights: (tenantId: string) => [...queryKeys.all, 'insights', tenantId] as const,
};

// Optimized fetch functions with field selection
const fetchFunctions = {
  async fetchProducts(tenantId: string, limit = dbOptimization.batchSize.products) {
    const client = createBrowserClient();
    const { data, error } = await client
      .from('products')
      .select(dbOptimization.selectFields.productList.join(','))
      .eq('tenant_id', tenantId)
      .order('rating', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as Product[];
  },

  async fetchProductDetail(productId: string) {
    const client = createBrowserClient();
    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (error) throw error;
    return data as Product;
  },

  async fetchPosts(tenantId: string, limit = dbOptimization.batchSize.posts) {
    const client = createBrowserClient();
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

  async fetchPostDetail(tenantId: string, slug: string) {
    const client = createBrowserClient();
    const { data, error } = await client
      .from('posts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    return data as Post;
  },

  async fetchTaxonomy(tenantId: string) {
    const client = createBrowserClient();
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

  async fetchQuiz(tenantId: string) {
    const client = createBrowserClient();
    const { data, error } = await client
      .from('quiz')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as Quiz | null;
  },

  async fetchInsights(tenantId: string) {
    const client = createBrowserClient();
    const { data, error } = await client
      .from('insights_view')
      .select('*')
      .eq('tenant_id', tenantId)
      .limit(dbOptimization.batchSize.insights);
    
    if (error) throw error;
    return data as InsightCard[];
  }
};

// Custom Hooks with Optimized Caching

/**
 * Fetch products with optimized caching
 */
export function useProducts(tenantId: string, options?: { limit?: number; suspense?: boolean }) {
  const queryOptions = {
    queryKey: queryKeys.productList(tenantId),
    queryFn: () => fetchFunctions.fetchProducts(tenantId, options?.limit),
    staleTime: cacheConfig.staleTime.products,
    gcTime: cacheConfig.cacheTime.products,
  };

  if (options?.suspense) {
    return useSuspenseQuery(queryOptions);
  }
  
  return useQuery(queryOptions);
}

/**
 * Fetch single product with caching
 */
export function useProduct(productId: string) {
  return useQuery({
    queryKey: queryKeys.productDetail(productId),
    queryFn: () => fetchFunctions.fetchProductDetail(productId),
    staleTime: cacheConfig.staleTime.products,
    gcTime: cacheConfig.cacheTime.products,
  });
}

/**
 * Fetch posts with optimized caching
 */
export function usePosts(tenantId: string, options?: { limit?: number; suspense?: boolean }) {
  const queryOptions = {
    queryKey: queryKeys.postList(tenantId),
    queryFn: () => fetchFunctions.fetchPosts(tenantId, options?.limit),
    staleTime: cacheConfig.staleTime.posts,
    gcTime: cacheConfig.cacheTime.posts,
  };

  if (options?.suspense) {
    return useSuspenseQuery(queryOptions);
  }
  
  return useQuery(queryOptions);
}

/**
 * Fetch single post with caching
 */
export function usePost(tenantId: string, slug: string) {
  return useQuery({
    queryKey: queryKeys.postDetail(tenantId, slug),
    queryFn: () => fetchFunctions.fetchPostDetail(tenantId, slug),
    staleTime: cacheConfig.staleTime.posts,
    gcTime: cacheConfig.cacheTime.posts,
  });
}

/**
 * Fetch taxonomy with long cache time
 */
export function useTaxonomy(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.taxonomy(tenantId),
    queryFn: () => fetchFunctions.fetchTaxonomy(tenantId),
    staleTime: cacheConfig.staleTime.taxonomy,
    gcTime: cacheConfig.cacheTime.taxonomy,
  });
}

/**
 * Fetch quiz data with caching
 */
export function useQuiz(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.quiz(tenantId),
    queryFn: () => fetchFunctions.fetchQuiz(tenantId),
    staleTime: cacheConfig.staleTime.quiz,
    gcTime: cacheConfig.cacheTime.quiz,
  });
}

/**
 * Fetch insights with short cache time for freshness
 */
export function useInsights(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.insights(tenantId),
    queryFn: () => fetchFunctions.fetchInsights(tenantId),
    staleTime: cacheConfig.staleTime.insights,
    gcTime: cacheConfig.cacheTime.default,
  });
}

/**
 * Prefetch hooks for optimistic loading
 */
export function usePrefetchProducts(tenantId: string) {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.productList(tenantId),
      queryFn: () => fetchFunctions.fetchProducts(tenantId),
      staleTime: cacheConfig.staleTime.products,
    });
  };
}

export function usePrefetchPosts(tenantId: string) {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.postList(tenantId),
      queryFn: () => fetchFunctions.fetchPosts(tenantId),
      staleTime: cacheConfig.staleTime.posts,
    });
  };
}

/**
 * Invalidation helpers for cache management
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateProducts: () => queryClient.invalidateQueries({ queryKey: queryKeys.products() }),
    invalidatePosts: () => queryClient.invalidateQueries({ queryKey: queryKeys.posts() }),
    invalidateTenant: (slug: string) => queryClient.invalidateQueries({ queryKey: queryKeys.tenant(slug) }),
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
  };
}