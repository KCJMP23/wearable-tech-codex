/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.amazon.com' },
      { protocol: 'https', hostname: '**.supabase.co' }
    ]
  },
  transpilePackages: ['@affiliate-factory/ui', '@affiliate-factory/sdk', '@affiliate-factory/content']
};

export default nextConfig;
