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
  webpack: (config, { isServer }) => {
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
  
  // Output configuration
  output: 'standalone',
  
  // Module ID strategy for long-term caching
  productionBrowserSourceMaps: false,
};

export default nextConfig;
