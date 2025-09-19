import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getTenantBySlug } from '@/lib/tenant';
import { getPostBySlug, getPostProducts } from '@/lib/content';
import { WoodstockNavigation } from '@/components/WoodstockNavigation';
import { WoodstockFooter } from '@/components/WoodstockFooter';
import { 
  CalendarIcon, 
  ClockIcon,
  ShareIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';

interface BlogPostPageProps {
  params: Promise<{ tenantSlug: string; slug: string }>;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { tenantSlug, slug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const post = await getPostBySlug(tenant.id, slug);
  if (!post) notFound();

  // Comment out products for now to test
  // const products = await getPostProducts(post.id);

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
                <ShareIcon className="h-4 w-4" />
                <BookmarkIcon className="h-4 w-4" />
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
      </article>

      {/* Footer */}
      <WoodstockFooter tenantSlug={tenantSlug} tenantName={tenant.name} />

      {post.jsonld && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(post.jsonld) }} />
      )}
    </div>
  );
}