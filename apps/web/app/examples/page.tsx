import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ExamplesPage() {
  const examples = [
    {
      name: "TechGear Pro",
      category: "Electronics",
      url: "techgearpro.example.com",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600",
      revenue: "$125K/mo",
      products: "1,200+",
      description: "Premium electronics and gadgets store with AI-powered recommendations"
    },
    {
      name: "Fashion Forward",
      category: "Fashion",
      url: "fashionforward.example.com",
      image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=600",
      revenue: "$89K/mo",
      products: "3,500+",
      description: "Trendy clothing store using AI agents for seasonal collections"
    },
    {
      name: "Home Haven",
      category: "Home & Garden",
      url: "homehaven.example.com",
      image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600",
      revenue: "$67K/mo",
      products: "800+",
      description: "Modern home decor with personalized shopping experiences"
    },
    {
      name: "FitLife Store",
      category: "Health & Fitness",
      url: "fitlife.example.com",
      image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600",
      revenue: "$156K/mo",
      products: "450+",
      description: "Fitness equipment and supplements with AI nutrition advisor"
    },
    {
      name: "Pet Paradise",
      category: "Pets",
      url: "petparadise.example.com",
      image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=600",
      revenue: "$78K/mo",
      products: "2,100+",
      description: "Everything for pets with breed-specific recommendations"
    },
    {
      name: "Beauty Bliss",
      category: "Beauty",
      url: "beautybliss.example.com",
      image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600",
      revenue: "$234K/mo",
      products: "1,800+",
      description: "Beauty products with AI skin analysis and recommendations"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              AffiliateOS
            </Link>
            <div className="flex items-center space-x-8">
              <Link href="/features" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/examples" className="text-blue-600 font-medium">Examples</Link>
              <Link href="/resources" className="text-gray-600 hover:text-gray-900">Resources</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
              <Link href="/start-trial" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Start Free Trial
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl font-bold mb-6">
            Success Stories Built on AffiliateOS
          </h1>
          <p className="text-xl text-gray-600">
            See how businesses are using our platform to generate incredible results
          </p>
        </div>
      </section>

      {/* Examples Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {examples.map((example, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow">
                <div className="h-48 bg-gray-200 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute top-4 left-4 bg-white px-2 py-1 rounded text-sm font-bold">
                    {example.category}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{example.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{example.description}</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Revenue</p>
                      <p className="font-bold text-green-600">{example.revenue}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Products</p>
                      <p className="font-bold">{example.products}</p>
                    </div>
                  </div>
                  <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                    View Case Study →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-4xl font-bold mb-4">Ready to Build Your Success Story?</h2>
          <p className="text-xl mb-8">
            Join thousands of successful stores powered by AffiliateOS
          </p>
          <Link href="/start-trial" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 inline-block">
            Start Your Store Today
          </Link>
        </div>
      </section>
    </div>
  );
}