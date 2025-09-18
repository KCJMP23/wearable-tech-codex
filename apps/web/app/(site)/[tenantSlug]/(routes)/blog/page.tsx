import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { getRecentPosts } from '@/lib/content';
import { WoodstockNavigation } from '@/components/WoodstockNavigation';
import { WoodstockFooter } from '@/components/WoodstockFooter';
import { CalendarIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface BlogIndexProps {
  params: { tenantSlug: string };
}

export default async function BlogIndex({ params }: BlogIndexProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }
  const posts = await getRecentPosts(tenant.id);

  const categories = [
    'All Posts',
    'Reviews',
    'Buying Guides',
    'How-To',
    'News',
    'Comparisons',
    'Health & Fitness'
  ];

  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <WoodstockNavigation tenantSlug={tenantSlug} tenantName={tenant.name} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-8 pt-8">
          <Link href={`/${tenantSlug}`} className="hover:text-gray-700">Home</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-900">Blog</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Latest Guides & Reviews
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Expert insights, detailed reviews, and buying guides to help you choose the perfect wearable technology.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category, index) => (
            <button
              key={category}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                index === 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <div className="mb-16">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 lg:p-12">
                <div className="text-white">
                  <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-medium mb-4">
                    Featured Post
                  </span>
                  <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                    {featuredPost.title}
                  </h2>
                  <p className="text-lg opacity-90 mb-6">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-sm opacity-75 mb-6">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{featuredPost.publishedAt ? new Date(featuredPost.publishedAt).toLocaleDateString() : 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      <span>5 min read</span>
                    </div>
                  </div>
                  <Link
                    href={`/${tenantSlug}/blog/${featuredPost.slug}`}
                    className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Read Article <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=600&h=400&fit=crop"
                    alt={featuredPost.title}
                    className="w-full h-64 lg:h-full object-cover rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regular Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {regularPosts.map((post) => (
            <article key={post.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src="https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=250&fit=crop"
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    {post.type}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                  <Link href={`/${tenantSlug}/blog/${post.slug}`} className="hover:text-blue-600 transition-colors">
                    {post.title}
                  </Link>
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'TBD'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>3 min read</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="bg-gray-50 rounded-2xl p-8 md:p-12 text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Stay Updated</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Get the latest wearable tech reviews, buying guides, and exclusive deals delivered straight to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Subscribe
            </button>
          </div>
        </div>

        {/* Load More */}
        <div className="text-center mb-16">
          <button className="bg-gray-100 text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
            Load More Articles
          </button>
        </div>
      </div>

      {/* Footer */}
      <WoodstockFooter tenantSlug={tenantSlug} tenantName={tenant.name} />
    </div>
  );
}
