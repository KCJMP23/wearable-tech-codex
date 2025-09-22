// Global polyfill for SSR compatibility - comprehensive approach
// This must run immediately to fix the build-time issue
(function() {
  // Server-side polyfill for self
  if (typeof global !== 'undefined') {
    if (typeof global.self === 'undefined') {
      global.self = globalThis || global;
    }
  }
  if (typeof globalThis !== 'undefined') {
    if (typeof globalThis.self === 'undefined') {
      globalThis.self = globalThis;
    }
  }
  
  // Additional webpack global setup
  if (typeof global !== 'undefined') {
    global.window = global.window || undefined;
    global.document = global.document || undefined;
    global.navigator = global.navigator || undefined;
    global.location = global.location || undefined;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.amazon.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'm.media-amazon.com' }
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Webpack optimizations
  webpack: (config, { isServer, webpack }) => {
    // Fix "exports is not defined" error
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    // Add comprehensive polyfills for browser globals in server environment
    if (isServer) {
      // Modify entry to add polyfill
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        
        // Add polyfill to all server entries
        for (const [key, entry] of Object.entries(entries)) {
          if (Array.isArray(entry)) {
            entries[key] = ['./webpack-polyfill.js', ...entry];
          } else if (typeof entry === 'string') {
            entries[key] = ['./webpack-polyfill.js', entry];
          }
        }
        
        return entries;
      };
      
      // Simple and direct webpack substitution
      config.plugins.push(
        new webpack.DefinePlugin({
          'typeof self': '"object"',
          'self': 'globalThis',
        })
      );
    }

    // Fix for rate-limiter-flexible TypeScript definitions
    config.module.rules.push({
      test: /\.d\.ts$/,
      use: 'ignore-loader',
    });
    
    // Configure fallbacks for Node.js modules in client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        module: false,
        url: false,
        buffer: false,
        util: false,
        stream: false,
        path: false,
      };
      
      // Fix exports issue and self polyfill
      config.resolve.alias = {
        ...config.resolve.alias,
        'exports': false,
      };
    }
    
    // Exclude problematic packages from webpack processing
    config.resolve.alias = {
      ...config.resolve.alias,
      'rate-limiter-flexible': isServer ? 'rate-limiter-flexible' : false,
    };
    // Enable tree shaking
    config.optimization = {
      ...config.optimization,
      // Remove usedExports as it conflicts with Next.js caching
      sideEffects: false,
      
      // Code splitting optimizations
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
            maxSize: 200 * 1024, // 200kb max chunk
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            maxSize: 100 * 1024, // 100kb max chunk
          },
          lib: {
            test: /[\\/]lib[\\/]/,
            name: 'lib',
            priority: 15,
            reuseExistingChunk: true,
          },
        },
      },
    };

    // Module federation for micro-frontends (optional)
    if (!isServer) {
      config.optimization.runtimeChunk = {
        name: 'runtime',
      };
    }

    return config;
  },
  
  // Experimental features for performance
  experimental: {
    // Enable optimizeCss for smaller CSS bundles
    optimizeCss: true,
  },
  
  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },
  
  // Rewrites for CDN
  async rewrites() {
    return {
      beforeFiles: [
        // CDN rewrites for static assets
        {
          source: '/cdn/:path*',
          destination: process.env.CDN_URL ? `${process.env.CDN_URL}/:path*` : '/:path*',
        },
      ],
    };
  },
  
  transpilePackages: ['@affiliate-factory/ui', '@affiliate-factory/sdk', '@affiliate-factory/content'],
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Disable ESLint during builds for MVP deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during builds for MVP deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Output configuration
  output: 'standalone',
  
  
  // Module ID strategy for long-term caching
  productionBrowserSourceMaps: false,
};

export default nextConfig;
