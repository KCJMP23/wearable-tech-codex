import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getTenantBySlug } from '@/lib/tenant';
import { getPostBySlug, getPostProducts } from '@/lib/content';
import { WoodstockNavigation } from '@/components/WoodstockNavigation';
import { WoodstockFooter } from '@/components/WoodstockFooter';
import { ProductCard } from '@/components/ProductCard';
import { 
  CalendarIcon, 
  ClockIcon, 
  ShareIcon,
  BookmarkIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

interface BlogPostPageProps {
  params: { tenantSlug: string; slug: string };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { tenantSlug, slug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const post = await getPostBySlug(tenant.id, slug);
  if (!post) notFound();
  const products = await getPostProducts(post.id);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <WoodstockNavigation tenantSlug={tenantSlug} tenantName={tenant.name} />
      
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-8 pt-8">
          <Link href={`/${tenantSlug}`} className="hover:text-gray-700">Home</Link>
          <span className="mx-2">›</span>
          <Link href={`/${tenantSlug}/blog`} className="hover:text-gray-700">Blog</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-900 truncate">{post.title}</span>
        </nav>

        {/* Article Header */}
        <header className="mb-12">
          <div className="mb-4">
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {post.type}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {post.title}
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {post.excerpt}
          </p>

          {/* Author and Meta */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-b border-gray-200 py-6">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&h=48&fit=crop&crop=face"
                alt="Author"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <div className="font-semibold text-gray-900">Mike Chen</div>
                <div className="text-sm text-gray-600">Senior Tech Editor</div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'TBD'}</span>
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                <span>8 min read</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors">
                  <ShareIcon className="h-4 w-4" />
                  <span>Share</span>
                </button>
                <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors">
                  <BookmarkIcon className="h-4 w-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        <div className="mb-12">
          <img 
            src="https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&h=400&fit=crop"
            alt={post.title}
            className="w-full h-96 object-cover rounded-lg"
          />
        </div>

        {/* Featured Products */}
        {products.length > 0 && (
          <section className="mb-12">
            <div className="bg-blue-50 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Products Featured in This Article</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.slice(0, 3).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Article Content */}
        <div className="prose prose-lg prose-gray max-w-none mb-12">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.bodyMdx || `
# Introduction

This comprehensive guide covers everything you need to know about the latest wearable technology trends. We've spent weeks testing and analyzing the top devices to bring you our expert recommendations.

## Key Features to Consider

When choosing a wearable device, consider these essential factors:

- **Battery Life**: Look for devices that last at least 2-3 days on a single charge
- **Health Monitoring**: Advanced sensors for heart rate, sleep, and activity tracking
- **Water Resistance**: Essential for swimmers and active users
- **Smartphone Integration**: Seamless connectivity with your device ecosystem

## Our Top Recommendations

Based on our extensive testing, here are our current top picks in each category.

### Best Overall Smartwatch

The latest Apple Watch continues to set the standard for smartwatch excellence, offering unmatched health tracking capabilities and seamless iPhone integration.

### Best Fitness Tracker

For dedicated fitness enthusiasts, the Garmin series provides unparalleled accuracy and battery life for serious athletes.

## Conclusion

The wearable technology landscape continues to evolve rapidly, with new innovations emerging regularly. Stay tuned for our upcoming reviews and comparisons.
            `}
          </ReactMarkdown>
        </div>

        {/* Article Rating */}
        <div className="bg-gray-50 rounded-lg p-6 mb-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate this article</h3>
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon key={star} className="h-6 w-6 text-gray-300 hover:text-yellow-400 cursor-pointer transition-colors" />
            ))}
          </div>
          <p className="text-sm text-gray-600">Help us improve our content by rating this article</p>
        </div>

        {/* Related Articles */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map((i) => (
              <article key={i} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <img 
                  src={`https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=200&fit=crop&seed=${i}`}
                  alt="Related article"
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Related Wearable Tech Guide #{i}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Discover the latest trends and recommendations in wearable technology.
                  </p>
                  <Link href="#" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                    Read More →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Newsletter CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white mb-12">
          <h2 className="text-2xl font-bold mb-4">Stay Updated with Our Latest Reviews</h2>
          <p className="mb-6 opacity-90">
            Get expert insights and exclusive deals delivered to your inbox weekly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </article>

      {/* Footer */}
      <WoodstockFooter tenantSlug={tenantSlug} tenantName={tenant.name} />

      {post.jsonld && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(post.jsonld) }} />
      )}
    </div>
  );
}
