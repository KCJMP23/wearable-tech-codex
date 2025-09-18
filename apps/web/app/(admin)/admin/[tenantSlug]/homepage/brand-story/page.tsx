import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantBySlug } from '@/lib/tenant';

interface BrandStoryPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function BrandStoryPage({ params }: BrandStoryPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  // Mock brand story data - in real app this would come from database
  const brandStory = {
    headline: "Pioneering the Future of Wearable Technology",
    subheadline: "Where innovation meets lifestyle in every device we curate",
    description: "For over a decade, we've been at the forefront of wearable technology, carefully selecting and reviewing the devices that will shape how we live, work, and stay connected. Our mission is to help you discover the perfect wearable companion for your unique lifestyle.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop",
    ctaText: "Explore Our Story",
    ctaLink: "/about",
    stats: [
      { label: "Devices Reviewed", value: "500+" },
      { label: "Happy Customers", value: "50K+" },
      { label: "Years of Expertise", value: "12" },
      { label: "Partner Brands", value: "25+" }
    ],
    lastUpdated: "2024-01-15T10:00:00Z",
    active: true
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Story</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your brand story section that appears on the homepage. This tells visitors who you are and what you stand for.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Preview
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Section Status</h3>
            <p className="text-sm text-gray-500">Control whether the brand story appears on your homepage</p>
          </div>
          <div className="flex items-center">
            <label htmlFor="brand-story-toggle" className="mr-3 text-sm font-medium text-gray-700">
              {brandStory.active ? 'Active' : 'Inactive'}
            </label>
            <button
              type="button"
              className={`${brandStory.active ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              id="brand-story-toggle"
            >
              <span
                className={`${brandStory.active ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Content</h3>
          <p className="text-sm text-gray-500">Edit your brand story content and messaging</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Headline */}
          <div>
            <label htmlFor="headline" className="block text-sm font-medium text-gray-700">
              Headline
            </label>
            <input
              type="text"
              id="headline"
              name="headline"
              defaultValue={brandStory.headline}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your main headline"
            />
            <p className="mt-2 text-sm text-gray-500">The main heading that captures attention</p>
          </div>

          {/* Subheadline */}
          <div>
            <label htmlFor="subheadline" className="block text-sm font-medium text-gray-700">
              Subheadline
            </label>
            <input
              type="text"
              id="subheadline"
              name="subheadline"
              defaultValue={brandStory.subheadline}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter supporting headline"
            />
            <p className="mt-2 text-sm text-gray-500">A supporting line that adds context</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={brandStory.description}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Tell your brand story..."
            />
            <p className="mt-2 text-sm text-gray-500">Your brand story that connects with customers</p>
          </div>

          {/* Image */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">
              Background Image
            </label>
            <div className="mt-1 flex items-center space-x-4">
              <img
                src={brandStory.image}
                alt="Brand story"
                className="h-24 w-32 object-cover rounded-lg border border-gray-200"
              />
              <div>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Change Image
                </button>
                <p className="mt-2 text-sm text-gray-500">Recommended: 1200x800px, high quality</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="cta-text" className="block text-sm font-medium text-gray-700">
                Button Text
              </label>
              <input
                type="text"
                id="cta-text"
                name="cta-text"
                defaultValue={brandStory.ctaText}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Button text"
              />
            </div>
            <div>
              <label htmlFor="cta-link" className="block text-sm font-medium text-gray-700">
                Button Link
              </label>
              <input
                type="text"
                id="cta-link"
                name="cta-link"
                defaultValue={brandStory.ctaLink}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="/about or full URL"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Brand Statistics</h3>
          <p className="text-sm text-gray-500">Showcase key numbers that build trust</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {brandStory.stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Stat {index + 1} Label
                    </label>
                    <input
                      type="text"
                      defaultValue={stat.label}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Happy Customers"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Value
                    </label>
                    <input
                      type="text"
                      defaultValue={stat.value}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., 50K+"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Optimization */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">AI Content Optimization</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>
                AI can help optimize your brand story for better engagement:
              </p>
              <ul className="mt-2 list-disc list-inside">
                <li>A/B test different headlines and descriptions</li>
                <li>Suggest seasonal messaging updates</li>
                <li>Optimize for emotional impact and conversions</li>
                <li>Generate variations for different audience segments</li>
              </ul>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                type="button"
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
              >
                Generate AI Suggestions
              </button>
              <button
                type="button"
                className="bg-white text-green-600 border border-green-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-green-50"
              >
                View Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Live Preview</h3>
          <p className="text-sm text-gray-500">See how your brand story will appear on the homepage</p>
        </div>
        
        <div className="p-6">
          <div className="relative rounded-lg overflow-hidden">
            <img
              src={brandStory.image}
              alt="Brand story preview"
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="text-center text-white max-w-2xl px-6">
                <h2 className="text-3xl font-bold mb-2">{brandStory.headline}</h2>
                <p className="text-lg mb-4">{brandStory.subheadline}</p>
                <p className="mb-6">{brandStory.description}</p>
                <button className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700">
                  {brandStory.ctaText}
                </button>
              </div>
            </div>
          </div>
          
          {/* Stats preview */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {brandStory.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breadcrumb back to homepage */}
      <div className="mt-6">
        <Link
          href={`/admin/${tenantSlug}/homepage`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Homepage Management
        </Link>
      </div>
    </div>
  );
}