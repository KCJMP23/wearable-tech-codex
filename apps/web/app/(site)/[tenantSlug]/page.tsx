import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NewsletterSection } from '../../../components/NewsletterSection';
import { getTenantBySlug } from '../../../lib/tenant';
import { getFeaturedProducts, getRecentPosts } from '../../../lib/content';
import { ProductCard } from '../../../components/ProductCard';
import { HeroSlideshow } from '../../../components/HeroSlideshow';
import { WoodstockNavigation } from '../../../components/WoodstockNavigation';
import { CategoryNavigation } from '../../../components/CategoryNavigation';
import { WoodstockFooter } from '../../../components/WoodstockFooter';
import { FAQAccordion } from '../../../components/FAQAccordion';
import { ProductCarousel } from '../../../components/ProductCarousel';
import { NewsletterModalProvider } from '../../../components/NewsletterModalProvider';
import { StickyCategories } from '../../../components/StickyCategories';
import { TrendingProducts } from '../../../components/TrendingProducts';
import { ProductInsights } from '../../../components/ProductInsights';
import { SeasonalShowcase } from '../../../components/SeasonalShowcase';

interface TenantPageProps {
  params: Promise<{ tenantSlug: string }>;
}

// TODO: Load categories dynamically from database based on tenant niche
// For now, using generic categories that will be replaced with database-driven ones
const getDefaultCategories = (niche: string) => [
  { id: 'featured', name: 'Featured', pinned: true },
  { id: 'bestsellers', name: 'Best Sellers' },
  { id: 'new-arrivals', name: 'New Arrivals' },
  { id: 'trending', name: 'Trending' },
  { id: 'deals', name: 'Deals' },
  { id: 'premium', name: 'Premium' },
  { id: 'budget', name: 'Budget-Friendly' },
  { id: 'accessories', name: 'Accessories' },
];

// Generic FAQ that adapts to any niche
const getGenericFaqItems = (niche: string) => [
  {
    id: 'product-quality',
    question: `How do you ensure product quality for ${niche.toLowerCase()}?`,
    answer: `We use AI-powered analysis to evaluate thousands of customer reviews, expert opinions, and product specifications. Our algorithm considers factors like durability, performance, customer satisfaction, and value for money to recommend only the highest-rated ${niche.toLowerCase()}.`
  },
  {
    id: 'price-tracking',
    question: 'How does your price tracking work?',
    answer: 'Our system monitors prices across multiple retailers 24/7. When prices drop on products you\'re interested in, we send instant alerts. We also track price history to help you identify the best time to buy and avoid paying more than necessary.'
  },
  {
    id: 'recommendations',
    question: 'How are product recommendations personalized?',
    answer: 'Our AI analyzes your browsing history, preferences, budget range, and stated needs to suggest products that match your specific requirements. We also consider seasonal trends, expert reviews, and real customer feedback to ensure relevant recommendations.'
  },
  {
    id: 'affiliate-disclosure',
    question: 'Do you earn commission from purchases?',
    answer: 'Yes, we may earn a small commission when you purchase through our affiliate links. This doesn\'t cost you anything extra and helps us maintain our free service. Our recommendations are always based on merit and value, not commission rates.'
  },
  {
    id: 'return-policy',
    question: 'What if I\'m not satisfied with a recommended product?',
    answer: 'Return policies depend on the retailer where you make your purchase. We provide links to return policies and customer service contacts for each retailer. Many offer 30-day return windows, and we can help you navigate any issues.'
  },
  {
    id: 'updates',
    question: 'How often do you update product information?',
    answer: 'Product information, prices, and availability are updated multiple times daily. Reviews and ratings are refreshed weekly, and our AI re-evaluates recommendations based on new data, seasonal trends, and market changes.'
  }
];

// Generic hero slides that adapt to any niche
const getGenericHeroSlides = (niche: string) => [
  {
    id: 'slide-1',
    title: `Premium ${niche}`,
    subtitle: 'New Collection',
    description: `Discover the latest and greatest ${niche.toLowerCase()} curated by our AI-powered platform.`,
    buttonText: 'Shop Now',
    buttonLink: '/products',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop',
    textPosition: 'left' as const,
  },
  {
    id: 'slide-2',
    title: 'Best Sellers',
    subtitle: 'Top Rated',
    description: `The most popular ${niche.toLowerCase()} chosen by thousands of satisfied customers.`,
    buttonText: 'Discover',
    buttonLink: '/collections/best-sellers',
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1920&h=1080&fit=crop',
    textPosition: 'center' as const,
  },
  {
    id: 'slide-3',
    title: 'Smart Shopping',
    subtitle: 'AI-Powered',
    description: 'Get personalized recommendations and never miss a great deal with our intelligent platform.',
    buttonText: 'Learn More',
    buttonLink: '/guides',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=1080&fit=crop',
    textPosition: 'right' as const,
  },
];

export default async function TenantHomePage({ params }: TenantPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const [products, posts] = await Promise.all([
    getFeaturedProducts(tenant.id),
    getRecentPosts(tenant.id)
  ]);

  const tenantNiche = (tenant as any).niche || 'Products';
  const categories = getDefaultCategories(tenantNiche);
  const faqItems = getGenericFaqItems(tenantNiche);
  const heroSlides = getGenericHeroSlides(tenantNiche);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <WoodstockNavigation tenantSlug={tenantSlug} tenantName={tenant.name} />
      
      {/* Hero Slideshow */}
      <HeroSlideshow slides={heroSlides} />
      
      {/* Category Navigation with Pinning */}
      <CategoryNavigation categories={categories} />
      
      {/* Featured Collections */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Curated Collections</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover handpicked collections designed for every aspect of your wellness journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Large Featured Collection */}
            <div className="lg:col-span-2">
              <Link
                href={`/${tenantSlug}/collections/new-arrivals`}
                className="group relative block overflow-hidden rounded-2xl bg-gray-900 shadow-xl hover:shadow-2xl transition-all duration-500"
              >
                <div className="aspect-[21/9] overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=1400&h=600&fit=crop"
                    alt="New Arrivals Collection"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent"></div>
                </div>
                <div className="absolute inset-0 flex items-center">
                  <div className="p-8 lg:p-12 text-white">
                    <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium mb-4">
                      New Arrivals
                    </div>
                    <h3 className="text-3xl lg:text-4xl font-bold mb-4">
                      Latest in Wearable Tech
                    </h3>
                    <p className="text-lg lg:text-xl text-white/90 mb-6 max-w-md">
                      Experience the cutting-edge of health monitoring and fitness tracking
                    </p>
                    <div className="inline-flex items-center text-white font-semibold group-hover:text-blue-200 transition-colors">
                      Explore Collection
                      <svg className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Collection Cards */}
            {[
              {
                title: 'Performance Athletes',
                description: 'Professional-grade tracking for serious athletes',
                image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop',
                link: '/collections/performance',
                badge: 'Pro Series'
              },
              {
                title: 'Everyday Wellness',
                description: 'Simple, elegant devices for daily health monitoring',
                image: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=600&h=400&fit=crop',
                link: '/collections/wellness',
                badge: 'Best Sellers'
              },
              {
                title: 'Sleep & Recovery',
                description: 'Advanced sleep tracking and recovery optimization',
                image: 'https://images.unsplash.com/photo-1520697830682-bbb6e85e2796?w=600&h=400&fit=crop',
                link: '/collections/sleep',
                badge: 'Featured'
              }
            ].map((collection) => (
              <Link
                key={collection.title}
                href={`/${tenantSlug}${collection.link}`}
                className="group relative block overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={collection.image}
                    alt={collection.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="inline-block bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-900">
                    {collection.badge}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-blue-200 transition-colors">
                    {collection.title}
                  </h3>
                  <p className="text-sm text-white/90 mb-3">
                    {collection.description}
                  </p>
                  <div className="inline-flex items-center text-sm font-medium group-hover:text-blue-200 transition-colors">
                    Shop Collection
                    <svg className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* Featured Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h2>
            <p className="text-lg text-gray-600">Find the perfect {tenantNiche.toLowerCase()} for your lifestyle</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: 'Best Sellers',
                image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
                link: '/products?category=bestsellers'
              },
              {
                name: 'New Arrivals',
                image: 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=400&h=300&fit=crop',
                link: '/products?category=new-arrivals'
              },
              {
                name: 'Premium',
                image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=300&fit=crop',
                link: '/products?category=premium'
              },
              {
                name: 'Budget-Friendly',
                image: 'https://images.unsplash.com/photo-1608481337062-4093bf3ed404?w=400&h=300&fit=crop',
                link: '/products?category=budget'
              }
            ].map((category) => (
              <Link
                key={category.name}
                href={`/${tenantSlug}${category.link}`}
                className="group relative overflow-hidden rounded-lg bg-white shadow-md hover:shadow-xl transition-all duration-300"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
              <p className="text-lg text-gray-600 mt-2">Handpicked by our AI agents and verified nightly</p>
            </div>
            <Link
              href={`/${tenantSlug}/products`}
              className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              View All Products →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                Our Mission
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Empowering Your 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Health Journey</span>
              </h2>
              <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
                <p>
                  We believe that technology should seamlessly integrate into your life, 
                  providing insights that matter without disrupting what makes you human.
                </p>
                <p>
                  Our AI-powered platform curates the best wearable technology, ensuring 
                  you find devices that truly enhance your wellness journey. From fitness 
                  enthusiasts to health-conscious individuals, we're here to guide you 
                  toward better living.
                </p>
                <p>
                  Every product recommendation is backed by real-time data analysis, 
                  expert reviews, and community feedback, giving you confidence in 
                  every purchase decision.
                </p>
              </div>
              
              <div className="mt-10 grid grid-cols-2 gap-6">
                <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">50K+</div>
                  <div className="text-sm text-gray-600 font-medium">Products Analyzed</div>
                </div>
                <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="text-3xl font-bold text-green-600 mb-2">98%</div>
                  <div className="text-sm text-gray-600 font-medium">Customer Satisfaction</div>
                </div>
              </div>
              
              <div className="mt-8">
                <Link
                  href={`/${tenantSlug}/about`}
                  className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-8 py-4 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Learn Our Story
                  <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=800&fit=crop"
                    alt="Health monitoring technology"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
                </div>
                
                {/* Floating Stats Cards */}
                <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">Real-time Sync</div>
                      <div className="text-xs text-gray-600">24/7 Monitoring</div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">AI Insights</div>
                      <div className="text-xs text-gray-600">Smart Analysis</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promotional Banner */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Get Personalized Recommendations
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Take our quick quiz to discover the perfect wearable tech for your lifestyle and goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${tenantSlug}/quiz`}
              className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
            >
              Take the Quiz
            </Link>
            <Link
              href={`/${tenantSlug}/guides`}
              className="inline-block border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white hover:text-blue-600 transition-colors"
            >
              Read Buying Guides
            </Link>
          </div>
        </div>
      </section>

      {/* Product Carousel - Trending Now */}
      <ProductCarousel
        products={products.slice(8, 16)}
        title="Trending Now"
        subtitle="Most popular wearables this week"
        tenantSlug={tenantSlug}
        className="bg-white"
      />

      {/* Latest Content */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Latest Insights</h2>
            <p className="text-lg text-gray-600 mt-2">Expert guides, reviews, and comparisons</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {posts.slice(0, 3).map((post) => (
              <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                    {post.type}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    <Link 
                      href={`/${tenantSlug}/blog/${post.slug}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                  <Link
                    href={`/${tenantSlug}/blog/${post.slug}`}
                    className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                  >
                    Read More →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Seasonal Showcase - AI-Powered Recommendations */}
      <SeasonalShowcase tenantSlug={tenantSlug} tenantId={tenant.id} />

      {/* Single Wide Banner */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mt-8">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 shadow-xl">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative p-8 lg:p-16 text-center text-white">
                <div className="max-w-4xl mx-auto">
                  <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold mb-6">
                    🎯 EXCLUSIVE OFFER
                  </div>
                  <h3 className="text-4xl lg:text-6xl font-bold mb-6">
                    Join the Wellness Revolution
                  </h3>
                  <p className="text-xl lg:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
                    Get exclusive access to pre-launch products, expert insights, and member-only discounts
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link
                      href={`/${tenantSlug}/membership`}
                      className="inline-flex items-center bg-white text-blue-600 font-bold px-8 py-4 rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Become a Member
                      <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                    <div className="flex items-center text-white/90">
                      <span className="text-sm">✨ First month free</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
                <div className="absolute top-32 right-16 w-16 h-16 bg-white/5 rounded-full"></div>
                <div className="absolute bottom-16 left-20 w-24 h-24 bg-white/5 rounded-full"></div>
                <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instagram Feed Integration */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Join Our Community</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
              See how our customers are living their best lives with wearable technology. Share your journey with #WearableTechLife
            </p>
            <a
              href="https://instagram.com/wearabletechlife"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Follow @WearableTechLife
            </a>
          </div>

          {/* Instagram Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {[
              {
                id: 1,
                image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=400&fit=crop",
                caption: "Morning run with my new smartwatch! 🏃‍♀️⌚ #WearableTechLife #FitnessGoals",
                likes: 342,
                comments: 28
              },
              {
                id: 2,
                image: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&h=400&fit=crop",
                caption: "Sleep tracking has changed my wellness routine completely 😴📊 #HealthTech",
                likes: 189,
                comments: 15
              },
              {
                id: 3,
                image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
                caption: "Gym session powered by data 💪📈 #WorkoutMotivation #SmartFitness",
                likes: 276,
                comments: 21
              },
              {
                id: 4,
                image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
                caption: "The perfect blend of style and technology ✨⌚ #TechFashion",
                likes: 398,
                comments: 34
              },
              {
                id: 5,
                image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop",
                caption: "Heart rate monitoring during meditation 🧘‍♂️❤️ #Mindfulness #HealthData",
                likes: 156,
                comments: 12
              },
              {
                id: 6,
                image: "https://images.unsplash.com/photo-1520697830682-bbb6e85e2796?w=400&h=400&fit=crop",
                caption: "Post-workout recovery insights 📊🔋 #RecoveryDay #WellnessTech",
                likes: 223,
                comments: 18
              }
            ].map((post) => (
              <div key={post.id} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 cursor-pointer">
                <img
                  src={post.image}
                  alt={`Instagram post ${post.id}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="text-white text-center p-4">
                    <div className="flex items-center justify-center space-x-4 mb-2">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
                        </svg>
                        <span className="text-sm font-medium">{post.likes}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-sm font-medium">{post.comments}</span>
                      </div>
                    </div>
                    <p className="text-xs text-white/90 line-clamp-2">{post.caption}</p>
                  </div>
                </div>

                {/* Instagram icon */}
                <div className="absolute top-2 right-2">
                  <svg className="w-6 h-6 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Share Your Journey</h3>
              <p className="text-gray-600 mb-6">
                Got amazing results with your wearable tech? Tag us in your posts and get featured on our community showcase!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://instagram.com/wearabletechlife"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Follow Us
                </a>
                <div className="inline-flex items-center text-gray-600 bg-gray-100 px-6 py-3 rounded-full">
                  <span className="font-medium">#WearableTechLife</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <NewsletterSection tenantSlug={tenantSlug} />

      {/* Trust Indicators & Brand Logos */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mb-16">
            <div className="group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Verified Products</h3>
              <p className="text-gray-600 leading-relaxed">Every product verified nightly via Amazon PA-API ensuring accuracy and availability</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Powered Curation</h3>
              <p className="text-gray-600 leading-relaxed">Smart algorithms analyze thousands of products to recommend only the best</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Best Prices</h3>
              <p className="text-gray-600 leading-relaxed">Real-time price tracking and deal alerts to save you money</p>
            </div>
          </div>

          {/* Brand Logos */}
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Trusted by Leading Brands</h3>
            <p className="text-lg text-gray-600">We partner with the world's top wearable technology manufacturers</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center opacity-60 hover:opacity-100 transition-opacity duration-300">
            {/* Apple */}
            <div className="flex items-center justify-center h-16 bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
              <svg className="h-8 w-8 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            
            {/* Samsung */}
            <div className="flex items-center justify-center h-16 bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
              <svg className="h-6 w-20 text-gray-800" viewBox="0 0 200 40" fill="currentColor">
                <path d="M20 5c-8.27 0-15 6.73-15 15s6.73 15 15 15 15-6.73 15-15S28.27 5 20 5zm0 25c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10z"/>
                <text x="45" y="25" fontSize="14" fontWeight="bold">SAMSUNG</text>
              </svg>
            </div>
            
            {/* Fitbit */}
            <div className="flex items-center justify-center h-16 bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
              <svg className="h-8 w-16 text-gray-800" viewBox="0 0 100 40" fill="currentColor">
                <circle cx="15" cy="20" r="3"/>
                <circle cx="25" cy="15" r="3"/>
                <circle cx="35" cy="12" r="3"/>
                <circle cx="45" cy="15" r="3"/>
                <circle cx="55" cy="20" r="3"/>
                <text x="65" y="25" fontSize="10" fontWeight="bold">Fitbit</text>
              </svg>
            </div>
            
            {/* Garmin */}
            <div className="flex items-center justify-center h-16 bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
              <svg className="h-8 w-16 text-gray-800" viewBox="0 0 100 40" fill="currentColor">
                <polygon points="20,10 30,10 25,20"/>
                <polygon points="15,20 35,20 25,30"/>
                <text x="40" y="25" fontSize="10" fontWeight="bold">GARMIN</text>
              </svg>
            </div>
            
            {/* Oura */}
            <div className="flex items-center justify-center h-16 bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
              <svg className="h-8 w-8 text-gray-800" viewBox="0 0 40 40" fill="currentColor">
                <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="3"/>
                <circle cx="20" cy="15" r="2"/>
              </svg>
              <span className="ml-2 text-sm font-bold">ŌURA</span>
            </div>
            
            {/* Polar */}
            <div className="flex items-center justify-center h-16 bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
              <svg className="h-8 w-8 text-gray-800" viewBox="0 0 40 40" fill="currentColor">
                <polygon points="20,5 35,35 5,35"/>
              </svg>
              <span className="ml-2 text-sm font-bold">POLAR</span>
            </div>
          </div>

          {/* Enhanced Social Proof Section */}
          <div className="mt-16 space-y-8">
            {/* Stats Bar */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold mb-2">4.9/5</div>
                  <div className="text-sm text-white/80">Average Rating</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-2">50K+</div>
                  <div className="text-sm text-white/80">Happy Customers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-2">99.8%</div>
                  <div className="text-sm text-white/80">Satisfaction Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-2">24/7</div>
                  <div className="text-sm text-white/80">Expert Support</div>
                </div>
              </div>
            </div>

            {/* Customer Reviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "Sarah Johnson",
                  role: "Fitness Enthusiast",
                  avatar: "https://images.unsplash.com/photo-1494790108755-2616b612f754?w=80&h=80&fit=crop&crop=face",
                  rating: 5,
                  review: "This platform helped me find the perfect fitness tracker. The personalized recommendations were spot-on, and I saved money with their price alerts!",
                  product: "Apple Watch Series 9"
                },
                {
                  name: "Mike Chen",
                  role: "Health Professional",
                  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
                  rating: 5,
                  review: "As a healthcare professional, I appreciate the detailed health metrics comparison. The AI curation really understands what matters for patient monitoring.",
                  product: "Oura Ring Gen3"
                },
                {
                  name: "Emily Rodriguez",
                  role: "Marathon Runner",
                  avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
                  rating: 5,
                  review: "The expert guides helped me choose between different GPS watches. Their real-time price tracking saved me $150 on my Garmin purchase!",
                  product: "Garmin Forerunner 965"
                }
              ].map((testimonial, index) => (
                <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center mb-4">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover mr-4"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.role}</div>
                    </div>
                  </div>
                  
                  <div className="flex mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <svg key={i} className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                  </div>
                  
                  <blockquote className="text-gray-700 mb-4 leading-relaxed">
                    "{testimonial.review}"
                  </blockquote>
                  
                  <div className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full inline-block">
                    Purchased: {testimonial.product}
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Trusted & Verified</h3>
                <p className="text-gray-600">Our platform is verified by leading security and trust organizations</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center opacity-70">
                <div className="text-center">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium text-gray-800">SSL Secured</div>
                </div>
                
                <div className="text-center">
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium text-gray-800">Loved by Users</div>
                </div>
                
                <div className="text-center">
                  <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium text-gray-800">Verified Reviews</div>
                </div>
                
                <div className="text-center">
                  <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium text-gray-800">Best Prices</div>
                </div>
              </div>
            </div>

            {/* Review Summary */}
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Join thousands of satisfied customers who found their perfect wearable tech
              </p>
              <Link
                href={`/${tenantSlug}/reviews`}
                className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                Read All Reviews
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Categories with Pinning Effect */}
      {/* Sticky Categories Section - Like Woodstock Theme */}
      <StickyCategories tenantSlug={tenantSlug} tenantId={tenant.id} />

      {/* Trending Products Section */}
      <TrendingProducts tenantSlug={tenantSlug} tenantNiche={tenantNiche} />

      {/* Product Insights Section */}
      <ProductInsights tenantSlug={tenantSlug} tenantNiche={tenantNiche} />

      {/* FAQ Section */}
      <FAQAccordion items={faqItems} />

      {/* Footer */}
      <WoodstockFooter tenantSlug={tenantSlug} tenantName={tenant.name} />
      
      {/* Newsletter Modal */}
      <NewsletterModalProvider tenantSlug={tenantSlug} />
    </div>
  );
}
