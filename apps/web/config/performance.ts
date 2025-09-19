/**
 * Performance Configuration for AffiliateOS
 * Optimizes caching, prefetching, and resource loading strategies
 */

// Cache Configuration
export const cacheConfig = {
  // React Query stale times (in milliseconds)
  staleTime: {
    default: 5 * 60 * 1000, // 5 minutes
    products: 10 * 60 * 1000, // 10 minutes for product data
    posts: 15 * 60 * 1000, // 15 minutes for blog posts
    tenant: 30 * 60 * 1000, // 30 minutes for tenant config
    taxonomy: 60 * 60 * 1000, // 1 hour for taxonomy
    insights: 5 * 60 * 1000, // 5 minutes for insights
    quiz: 60 * 60 * 1000, // 1 hour for quiz data
  },
  
  // Cache times for React Query
  cacheTime: {
    default: 10 * 60 * 1000, // 10 minutes
    products: 30 * 60 * 1000, // 30 minutes
    posts: 30 * 60 * 1000, // 30 minutes
    tenant: 60 * 60 * 1000, // 1 hour
    taxonomy: 2 * 60 * 60 * 1000, // 2 hours
  },
  
  // Next.js API route cache configuration
  apiCache: {
    revalidate: {
      products: 300, // 5 minutes
      posts: 600, // 10 minutes
      tenant: 1800, // 30 minutes
      taxonomy: 3600, // 1 hour
    }
  },
  
  // Browser cache headers
  browserCache: {
    static: 'public, max-age=31536000, immutable', // 1 year for static assets
    images: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400', // 1 day
    api: 'public, max-age=0, s-maxage=300, stale-while-revalidate=600', // 5 min server cache
    dynamic: 'private, no-cache, no-store, must-revalidate', // No cache for dynamic content
  }
};

// Image Optimization Configuration
export const imageConfig = {
  quality: {
    default: 85,
    thumbnail: 75,
    hero: 90,
    product: 85,
  },
  
  sizes: {
    thumbnail: '(max-width: 640px) 100vw, 320px',
    card: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
    hero: '(max-width: 1280px) 100vw, 1280px',
    product: '(max-width: 768px) 100vw, 50vw',
  },
  
  // Lazy loading configuration
  lazyLoading: {
    rootMargin: '50px', // Start loading 50px before entering viewport
    threshold: 0.01, // Trigger when 1% visible
  },
  
  // Priority loading for above-the-fold images
  priority: {
    hero: true,
    firstProduct: true,
    logo: true,
  }
};

// Code Splitting Configuration
export const codeSplittingConfig = {
  // Components to lazy load
  lazyComponents: [
    'ProductReviews',
    'ProductComparison',
    'QuizWidget',
    'NewsletterSignup',
    'ShareButtons',
    'CommentSection',
    'RelatedProducts',
    'ProductGallery',
    'ChatbotDock',
  ],
  
  // Routes that should be prefetched
  prefetchRoutes: [
    '/products',
    '/blog',
    '/quiz',
  ],
  
  // Chunk size limits (in KB)
  chunkSizes: {
    vendor: 200,
    common: 100,
    page: 50,
  }
};

// Database Query Optimization
export const dbOptimization = {
  // Batch size for queries
  batchSize: {
    products: 20,
    posts: 10,
    insights: 6,
  },
  
  // Query pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  
  // Fields to select (avoid SELECT *)
  selectFields: {
    productList: ['id', 'title', 'brand', 'images', 'rating', 'priceSnapshot', 'affiliateUrl'],
    postList: ['id', 'title', 'slug', 'excerpt', 'images', 'publishedAt'],
    productDetail: '*', // Full data for detail pages
  },
  
  // Indexes to ensure exist
  requiredIndexes: [
    'products_tenant_id_rating_idx',
    'posts_tenant_id_published_at_idx',
    'posts_slug_idx',
    'taxonomy_tenant_id_kind_idx',
    'insights_tenant_id_computed_at_idx',
  ]
};

// CDN Configuration
export const cdnConfig = {
  // Cloudflare configuration
  cloudflare: {
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    
    // Cache rules
    cacheRules: [
      {
        pattern: '/images/*',
        edge_ttl: 2592000, // 30 days
        browser_ttl: 86400, // 1 day
      },
      {
        pattern: '/_next/static/*',
        edge_ttl: 31536000, // 1 year
        browser_ttl: 31536000, // 1 year
      },
      {
        pattern: '/api/*',
        edge_ttl: 300, // 5 minutes
        browser_ttl: 0, // No browser cache
      }
    ],
    
    // Purge patterns
    purgePatterns: {
      products: '/api/products*',
      posts: '/api/posts*',
      all: '/*',
    }
  },
  
  // Asset optimization
  assets: {
    compress: true,
    minify: true,
    webp: true,
    avif: true,
  }
};

// Performance Budgets
export const performanceBudgets = {
  // Core Web Vitals targets
  webVitals: {
    lcp: 2500, // Largest Contentful Paint (ms)
    fid: 100, // First Input Delay (ms)
    cls: 0.1, // Cumulative Layout Shift
    fcp: 1800, // First Contentful Paint (ms)
    ttfb: 600, // Time to First Byte (ms)
  },
  
  // Bundle size budgets (KB)
  bundles: {
    main: 200,
    vendor: 300,
    total: 800,
  },
  
  // Resource count limits
  resources: {
    scripts: 10,
    stylesheets: 5,
    fonts: 3,
    images: 20,
  }
};

// Monitoring Configuration
export const monitoringConfig = {
  // Performance monitoring
  enableRUM: true, // Real User Monitoring
  sampleRate: 0.1, // Sample 10% of users
  
  // Metrics to track
  metrics: [
    'web-vitals',
    'navigation-timing',
    'resource-timing',
    'user-timing',
  ],
  
  // Alert thresholds
  alerts: {
    errorRate: 0.01, // 1%
    p95ResponseTime: 3000, // 3 seconds
    cacheHitRate: 0.8, // 80%
  }
};

// Preloading Strategy
export const preloadingConfig = {
  // Resources to preload
  preload: [
    { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
    { href: '/_next/static/css/app.css', as: 'style' },
  ],
  
  // Resources to prefetch
  prefetch: [
    '/api/products/featured',
    '/api/posts/recent',
  ],
  
  // DNS prefetch for external domains
  dnsPrefetch: [
    'https://m.media-amazon.com',
    'https://images.unsplash.com',
    'https://cdn.jsdelivr.net',
  ],
  
  // Preconnect to critical origins
  preconnect: [
    { href: 'https://fonts.googleapis.com', crossorigin: 'anonymous' },
    { href: process.env.NEXT_PUBLIC_SUPABASE_URL!, crossorigin: 'anonymous' },
  ]
};

// Service Worker Configuration
export const serviceWorkerConfig = {
  enabled: process.env.NODE_ENV === 'production',
  
  // Cache strategies
  strategies: {
    // Network first for API calls
    api: 'NetworkFirst',
    // Cache first for static assets
    static: 'CacheFirst',
    // Stale while revalidate for images
    images: 'StaleWhileRevalidate',
  },
  
  // Offline fallback pages
  offlineFallback: {
    page: '/offline',
    image: '/images/placeholder.webp',
  }
};

export default {
  cacheConfig,
  imageConfig,
  codeSplittingConfig,
  dbOptimization,
  cdnConfig,
  performanceBudgets,
  monitoringConfig,
  preloadingConfig,
  serviceWorkerConfig,
};