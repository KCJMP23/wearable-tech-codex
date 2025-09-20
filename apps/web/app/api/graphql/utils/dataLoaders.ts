import DataLoader from 'dataloader';
import { SupabaseClient } from '@supabase/supabase-js';

// Generic DataLoader factory for Supabase
function createSupabaseDataLoader<T>(
  supabase: SupabaseClient,
  tableName: string,
  keyField: string = 'id',
  selectFields: string = '*'
): DataLoader<string, T | null> {
  return new DataLoader<string, T | null>(
    async (ids: readonly string[]) => {
      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .in(keyField, [...ids]);

      if (error) {
        throw new Error(`DataLoader error for ${tableName}: ${error.message}`);
      }

      // Create a map for O(1) lookups
      const itemMap = new Map(data?.map((item: any) => [item[keyField], item]) || []);
      
      // Return items in the same order as requested IDs
      return ids.map(id => itemMap.get(id) || null);
    },
    {
      // Enable caching
      cache: true,
      // Batch requests within 10ms
      batchScheduleFn: callback => setTimeout(callback, 10),
      // Maximum batch size
      maxBatchSize: 100,
    }
  );
}

// Generic one-to-many DataLoader
function createOneToManyDataLoader<T>(
  supabase: SupabaseClient,
  tableName: string,
  foreignKeyField: string,
  selectFields: string = '*'
): DataLoader<string, T[]> {
  return new DataLoader<string, T[]>(
    async (parentIds: readonly string[]) => {
      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .in(foreignKeyField, [...parentIds]);

      if (error) {
        throw new Error(`DataLoader error for ${tableName}: ${error.message}`);
      }

      // Group items by foreign key
      const itemsByParentId = new Map<string, T[]>();
      data?.forEach((item: any) => {
        const parentId = item[foreignKeyField];
        if (!itemsByParentId.has(parentId)) {
          itemsByParentId.set(parentId, []);
        }
        itemsByParentId.get(parentId)!.push(item);
      });

      // Return arrays in the same order as requested parent IDs
      return parentIds.map(parentId => itemsByParentId.get(parentId) || []);
    },
    {
      cache: true,
      batchScheduleFn: callback => setTimeout(callback, 10),
      maxBatchSize: 100,
    }
  );
}

// Create all DataLoaders for the application
export function createDataLoaders(supabase: SupabaseClient) {
  return {
    // User DataLoaders
    userById: createSupabaseDataLoader(supabase, 'users', 'id'),
    userByEmail: createSupabaseDataLoader(supabase, 'users', 'email'),

    // Site DataLoaders
    siteById: createSupabaseDataLoader(supabase, 'tenants', 'id'),
    siteBySlug: createSupabaseDataLoader(supabase, 'tenants', 'slug'),
    sitesByUserId: createOneToManyDataLoader(supabase, 'tenants', 'user_id'),

    // Product DataLoaders
    productById: createSupabaseDataLoader(supabase, 'products', 'id'),
    productsBySiteId: createOneToManyDataLoader(supabase, 'products', 'site_id'),
    productsByCategory: createOneToManyDataLoader(supabase, 'products', 'category_id'),

    // Post DataLoaders
    postById: createSupabaseDataLoader(supabase, 'posts', 'id'),
    postsByAuthorId: createOneToManyDataLoader(supabase, 'posts', 'author_id'),
    postsBySiteId: createOneToManyDataLoader(supabase, 'posts', 'site_id'),

    // Theme DataLoaders
    themeById: createSupabaseDataLoader(supabase, 'themes', 'id'),

    // Category DataLoaders
    categoryById: createSupabaseDataLoader(supabase, 'categories', 'id'),
    categoriesBySiteId: createOneToManyDataLoader(supabase, 'categories', 'site_id'),

    // Tag DataLoaders
    tagById: createSupabaseDataLoader(supabase, 'tags', 'id'),
    tagsBySiteId: createOneToManyDataLoader(supabase, 'tags', 'site_id'),

    // Analytics DataLoaders
    analyticsBySiteId: createSupabaseDataLoader(supabase, 'analytics', 'site_id'),

    // Notification DataLoaders
    notificationById: createSupabaseDataLoader(supabase, 'notifications', 'id'),
    notificationsByUserId: createOneToManyDataLoader(supabase, 'notifications', 'user_id'),

    // Affiliate Network DataLoaders
    affiliateNetworkById: createSupabaseDataLoader(supabase, 'affiliate_networks', 'id'),
    merchantsByNetworkId: createOneToManyDataLoader(supabase, 'merchants', 'network_id'),

    // Email DataLoaders
    emailListById: createSupabaseDataLoader(supabase, 'email_lists', 'id'),
    emailListsBySiteId: createOneToManyDataLoader(supabase, 'email_lists', 'site_id'),
    emailSubscriberById: createSupabaseDataLoader(supabase, 'email_subscribers', 'id'),

    // Complex relationship DataLoaders
    productCategories: new DataLoader<string, any[]>(
      async (productIds: readonly string[]) => {
        const { data, error } = await supabase
          .from('product_categories')
          .select(`
            product_id,
            categories (*)
          `)
          .in('product_id', [...productIds]);

        if (error) throw new Error(error.message);

        const categoriesByProduct = new Map<string, any[]>();
        data?.forEach((item: any) => {
          if (!categoriesByProduct.has(item.product_id)) {
            categoriesByProduct.set(item.product_id, []);
          }
          categoriesByProduct.get(item.product_id)!.push(item.categories);
        });

        return productIds.map(id => categoriesByProduct.get(id) || []);
      }
    ),

    productTags: new DataLoader<string, any[]>(
      async (productIds: readonly string[]) => {
        const { data, error } = await supabase
          .from('product_tags')
          .select(`
            product_id,
            tags (*)
          `)
          .in('product_id', [...productIds]);

        if (error) throw new Error(error.message);

        const tagsByProduct = new Map<string, any[]>();
        data?.forEach((item: any) => {
          if (!tagsByProduct.has(item.product_id)) {
            tagsByProduct.set(item.product_id, []);
          }
          tagsByProduct.get(item.product_id)!.push(item.tags);
        });

        return productIds.map(id => tagsByProduct.get(id) || []);
      }
    ),

    // Counting DataLoaders for performance
    productCountBySiteId: new DataLoader<string, number>(
      async (siteIds: readonly string[]) => {
        const { data, error } = await supabase
          .from('products')
          .select('site_id')
          .in('site_id', [...siteIds]);

        if (error) throw new Error(error.message);

        const countsBySiteId = new Map<string, number>();
        data?.forEach((item: any) => {
          const count = countsBySiteId.get(item.site_id) || 0;
          countsBySiteId.set(item.site_id, count + 1);
        });

        return siteIds.map(id => countsBySiteId.get(id) || 0);
      }
    ),

    postCountBySiteId: new DataLoader<string, number>(
      async (siteIds: readonly string[]) => {
        const { data, error } = await supabase
          .from('posts')
          .select('site_id')
          .in('site_id', [...siteIds]);

        if (error) throw new Error(error.message);

        const countsBySiteId = new Map<string, number>();
        data?.forEach((item: any) => {
          const count = countsBySiteId.get(item.site_id) || 0;
          countsBySiteId.set(item.site_id, count + 1);
        });

        return siteIds.map(id => countsBySiteId.get(id) || 0);
      }
    ),

    // Performance optimization DataLoaders
    siteWithStats: new DataLoader<string, any>(
      async (siteIds: readonly string[]) => {
        const { data, error } = await supabase
          .from('tenants')
          .select(`
            *,
            products:products(count),
            posts:posts(count),
            analytics(*)
          `)
          .in('id', [...siteIds]);

        if (error) throw new Error(error.message);

        const siteMap = new Map(data?.map((site: any) => [site.id, site]) || []);
        return siteIds.map(id => siteMap.get(id) || null);
      }
    ),
  };
}

// DataLoader cache management
export class DataLoaderCache {
  private loaders: Map<string, DataLoader<any, any>>;

  constructor(loaders: ReturnType<typeof createDataLoaders>) {
    this.loaders = new Map(Object.entries(loaders));
  }

  // Clear all caches
  clearAll(): void {
    this.loaders.forEach(loader => loader.clearAll());
  }

  // Clear specific loader cache
  clear(loaderName: string): void {
    const loader = this.loaders.get(loaderName);
    if (loader) {
      loader.clearAll();
    }
  }

  // Clear specific key from specific loader
  clearKey(loaderName: string, key: any): void {
    const loader = this.loaders.get(loaderName);
    if (loader) {
      loader.clear(key);
    }
  }

  // Prime a loader with data
  prime(loaderName: string, key: any, value: any): void {
    const loader = this.loaders.get(loaderName);
    if (loader) {
      loader.prime(key, value);
    }
  }

  // Get cache statistics
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.loaders.forEach((loader, name) => {
      // DataLoader doesn't expose cache size by default
      // This would require custom implementation or wrapper
      stats[name] = {
        name,
        // cacheSize: loader.cacheMap?.size || 0,
        // hitRate: loader.hitRate || 0,
      };
    });

    return stats;
  }
}

// Batch function helpers
export const batchHelpers = {
  // Batch database queries with proper error handling
  async batchQuery<T>(
    supabase: SupabaseClient,
    queries: Array<() => Promise<T>>
  ): Promise<T[]> {
    const results = await Promise.allSettled(queries.map(query => query()));
    
    return results.map((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Batch query ${index} failed:`, result.reason);
        return null as any; // or throw, depending on requirements
      }
      return result.value;
    });
  },

  // Deduplicate and batch requests
  deduplicateRequests<T>(
    requests: T[],
    getKey: (item: T) => string
  ): { unique: T[]; keyMap: Map<string, T[]> } {
    const keyMap = new Map<string, T[]>();
    const seen = new Set<string>();
    const unique: T[] = [];

    requests.forEach(request => {
      const key = getKey(request);
      
      if (!keyMap.has(key)) {
        keyMap.set(key, []);
      }
      keyMap.get(key)!.push(request);

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(request);
      }
    });

    return { unique, keyMap };
  },
};