import React from 'react';
import Link from 'next/link';
import { Book, Video, FileText, Users, HelpCircle, Code } from 'lucide-react';

export default function ResourcesPage() {
  const resources = [
    {
      icon: <Book className="h-6 w-6" />,
      title: "Documentation",
      description: "Complete guides and API references",
      links: [
        "Getting Started Guide",
        "API Documentation",
        "Theme Development",
        "AI Agent Programming"
      ]
    },
    {
      icon: <Video className="h-6 w-6" />,
      title: "Video Tutorials",
      description: "Step-by-step video guides",
      links: [
        "Platform Overview",
        "Building Your First Store",
        "AI Agent Setup",
        "Advanced Customization"
      ]
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Blog & Articles",
      description: "Tips, tricks, and industry insights",
      links: [
        "E-commerce Trends 2024",
        "SEO Best Practices",
        "Conversion Optimization",
        "AI in E-commerce"
      ]
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Community",
      description: "Connect with other store owners",
      links: [
        "Discord Community",
        "Facebook Group",
        "Reddit Community",
        "Success Stories"
      ]
    },
    {
      icon: <HelpCircle className="h-6 w-6" />,
      title: "Support Center",
      description: "Get help when you need it",
      links: [
        "Help Articles",
        "Contact Support",
        "System Status",
        "Feature Requests"
      ]
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: "Developer Resources",
      description: "Tools for developers",
      links: [
        "GitHub Repository",
        "NPM Packages",
        "Webhook Guide",
        "Custom Integrations"
      ]
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
              <Link href="/examples" className="text-gray-600 hover:text-gray-900">Examples</Link>
              <Link href="/resources" className="text-blue-600 font-medium">Resources</Link>
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
            Everything You Need to Succeed
          </h1>
          <p className="text-xl text-gray-600">
            Documentation, tutorials, and support to help you build your business
          </p>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {resources.map((resource, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="text-blue-600 mb-4">{resource.icon}</div>
                <h3 className="text-xl font-bold mb-2">{resource.title}</h3>
                <p className="text-gray-600 mb-4">{resource.description}</p>
                <ul className="space-y-2">
                  {resource.links.map((link, idx) => (
                    <li key={idx}>
                      <Link href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                        → {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 px-4 bg-blue-50">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-gray-600 mb-8">
            Get the latest tips, updates, and resources delivered to your inbox
          </p>
          <form className="flex max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-l-lg border border-gray-300 focus:outline-none focus:border-blue-600"
            />
            <button className="bg-blue-600 text-white px-6 py-3 rounded-r-lg hover:bg-blue-700 font-medium">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}