import React from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Bot, 
  Code, 
  BarChart, 
  Users, 
  Zap,
  Shield,
  Globe,
  Palette,
  Rocket
} from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      icon: <ShoppingCart className="h-8 w-8" />,
      title: "Complete E-commerce Platform",
      description: "Full sales management with order tracking, inventory, and payment processing. Everything you need to run an online store.",
      highlights: ["Order Management", "Inventory Tracking", "Payment Processing", "Customer Portal"]
    },
    {
      icon: <Bot className="h-8 w-8" />,
      title: "AI Agent Automation",
      description: "Revolutionary AI agents that work 24/7 to find products, create content, and optimize your store automatically.",
      highlights: ["Product Discovery", "Content Generation", "SEO Optimization", "Customer Support"]
    },
    {
      icon: <Code className="h-8 w-8" />,
      title: "Full Code Access",
      description: "Unlike competitors, get complete access to your site's code. Customize everything to match your vision.",
      highlights: ["Theme Editor", "Component Library", "API Access", "Custom Integrations"]
    },
    {
      icon: <BarChart className="h-8 w-8" />,
      title: "Advanced Analytics",
      description: "Real-time insights into sales, traffic, and customer behavior. Make data-driven decisions with confidence.",
      highlights: ["Sales Analytics", "Traffic Reports", "Conversion Tracking", "A/B Testing"]
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Multi-Tenant Architecture",
      description: "Run multiple stores from a single dashboard. Perfect for agencies and businesses with multiple brands.",
      highlights: ["Unlimited Stores", "Centralized Management", "Team Collaboration", "Role-Based Access"]
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Lightning Fast Performance",
      description: "Built on Next.js 15 with edge optimization. Your store loads instantly, anywhere in the world.",
      highlights: ["Edge Deployment", "CDN Integration", "Image Optimization", "Lazy Loading"]
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Enterprise Security",
      description: "Bank-level security with HIPAA compliance options. Your data and your customers' data are always protected.",
      highlights: ["SSL Certificates", "PCI Compliance", "Data Encryption", "Regular Backups"]
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Global Marketplace",
      description: "Sell worldwide with multi-currency support, international shipping, and localized experiences.",
      highlights: ["Multi-Currency", "Language Support", "Tax Management", "Shipping Zones"]
    },
    {
      icon: <Palette className="h-8 w-8" />,
      title: "Visual Builders",
      description: "Design your store with drag-and-drop builders. No coding required for beautiful, professional designs.",
      highlights: ["Page Builder", "Theme Customizer", "Mobile Editor", "Preview Mode"]
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
              <Link href="/features" className="text-blue-600 font-medium">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/examples" className="text-gray-600 hover:text-gray-900">Examples</Link>
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
            Everything You Need to Build & Scale Your Online Business
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Powerful features that set us apart from the competition. Built for modern e-commerce with AI at its core.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="text-blue-600 mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-700">
                      <span className="text-green-500 mr-2">✓</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-4 bg-blue-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-center mb-12">How We Compare</h2>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left">Feature</th>
                  <th className="px-6 py-4 text-center">AffiliateOS</th>
                  <th className="px-6 py-4 text-center">Shopify</th>
                  <th className="px-6 py-4 text-center">WooCommerce</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-6 py-4">AI Agent Automation</td>
                  <td className="px-6 py-4 text-center text-green-500 text-xl">✓</td>
                  <td className="px-6 py-4 text-center text-red-500 text-xl">✗</td>
                  <td className="px-6 py-4 text-center text-red-500 text-xl">✗</td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-4">Full Code Access</td>
                  <td className="px-6 py-4 text-center text-green-500 text-xl">✓</td>
                  <td className="px-6 py-4 text-center text-yellow-500">Limited</td>
                  <td className="px-6 py-4 text-center text-green-500 text-xl">✓</td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-4">Multi-Tenant Native</td>
                  <td className="px-6 py-4 text-center text-green-500 text-xl">✓</td>
                  <td className="px-6 py-4 text-center text-yellow-500">Add-on</td>
                  <td className="px-6 py-4 text-center text-red-500 text-xl">✗</td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-4">Visual Builders</td>
                  <td className="px-6 py-4 text-center text-green-500 text-xl">✓</td>
                  <td className="px-6 py-4 text-center text-green-500 text-xl">✓</td>
                  <td className="px-6 py-4 text-center text-yellow-500">Plugin</td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-4">Starting Price</td>
                  <td className="px-6 py-4 text-center font-bold">$29/mo</td>
                  <td className="px-6 py-4 text-center">$39/mo</td>
                  <td className="px-6 py-4 text-center">$20/mo + hosting</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <Rocket className="h-16 w-16 mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-4">Ready to Experience the Future?</h2>
            <p className="text-xl mb-8">
              Join thousands of businesses already using AI to automate and scale their e-commerce.
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/start-trial" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold hover:bg-gray-100">
                Start 14-Day Free Trial
              </Link>
              <Link href="/demo" className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-blue-600">
                Book a Demo
              </Link>
            </div>
            <p className="mt-4 text-sm">No credit card required • Setup in 60 seconds</p>
          </div>
        </div>
      </section>
    </div>
  );
}