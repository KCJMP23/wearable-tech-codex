'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, X, Zap, Star } from 'lucide-react';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "Starter",
      description: "Perfect for new businesses",
      monthlyPrice: 29,
      annualPrice: 24,
      features: [
        { name: "1 Store", included: true },
        { name: "Up to 100 products", included: true },
        { name: "Basic AI agents", included: true },
        { name: "2% transaction fee", included: true },
        { name: "Email support", included: true },
        { name: "Basic analytics", included: true },
        { name: "Custom domain", included: true },
        { name: "SSL certificate", included: true },
        { name: "Multi-currency", included: false },
        { name: "Advanced AI agents", included: false },
        { name: "Priority support", included: false },
        { name: "Custom integrations", included: false },
      ]
    },
    {
      name: "Professional",
      description: "For growing businesses",
      monthlyPrice: 79,
      annualPrice: 66,
      popular: true,
      features: [
        { name: "3 Stores", included: true },
        { name: "Up to 1,000 products", included: true },
        { name: "Advanced AI agents", included: true },
        { name: "1% transaction fee", included: true },
        { name: "Priority support", included: true },
        { name: "Advanced analytics", included: true },
        { name: "Custom domain", included: true },
        { name: "SSL certificate", included: true },
        { name: "Multi-currency", included: true },
        { name: "A/B testing", included: true },
        { name: "API access", included: true },
        { name: "Custom integrations", included: false },
      ]
    },
    {
      name: "Enterprise",
      description: "For large organizations",
      monthlyPrice: 299,
      annualPrice: 249,
      features: [
        { name: "Unlimited Stores", included: true },
        { name: "Unlimited products", included: true },
        { name: "All AI agents + custom", included: true },
        { name: "0% transaction fee", included: true },
        { name: "24/7 phone support", included: true },
        { name: "Custom analytics", included: true },
        { name: "Custom domain", included: true },
        { name: "SSL certificate", included: true },
        { name: "Multi-currency", included: true },
        { name: "A/B testing", included: true },
        { name: "Full API access", included: true },
        { name: "Custom integrations", included: true },
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
              <Link href="/pricing" className="text-blue-600 font-medium">Pricing</Link>
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
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Choose the perfect plan for your business. Upgrade or downgrade anytime.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex justify-center items-center space-x-4 mb-12">
            <span className={`text-lg ${!isAnnual ? 'font-bold' : ''}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-20 h-10 bg-blue-600 rounded-full p-1 transition-colors"
            >
              <div className={`absolute w-8 h-8 bg-white rounded-full shadow-md transform transition-transform ${isAnnual ? 'translate-x-10' : 'translate-x-0'}`} />
            </button>
            <span className={`text-lg ${isAnnual ? 'font-bold' : ''}`}>
              Annual
              <span className="ml-2 text-green-600 text-sm font-bold">Save 20%</span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div key={index} className={`relative bg-white rounded-2xl shadow-xl p-8 ${plan.popular ? 'ring-2 ring-blue-600 transform scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center">
                      <Star className="h-4 w-4 mr-1" /> Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="flex justify-center items-baseline">
                    <span className="text-5xl font-bold">
                      ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-gray-600 ml-2">/month</span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-gray-500 mt-2">
                      Billed ${plan.annualPrice * 12} annually
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0" />
                      )}
                      <span className={feature.included ? '' : 'text-gray-400'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link 
                  href="/start-trial"
                  className={`block text-center py-3 px-6 rounded-lg font-bold transition-colors ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-bold text-lg mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600">Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-bold text-lg mb-2">Is there a setup fee?</h3>
              <p className="text-gray-600">No setup fees ever. Just choose your plan and start building your store immediately.</p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-bold text-lg mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">We accept all major credit cards, PayPal, and wire transfers for annual plans.</p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-bold text-lg mb-2">Do you offer refunds?</h3>
              <p className="text-gray-600">Yes, we offer a 30-day money-back guarantee on all plans. No questions asked.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <Zap className="h-16 w-16 mx-auto mb-6 text-blue-600" />
          <h2 className="text-4xl font-bold mb-4">Start Your 14-Day Free Trial</h2>
          <p className="text-xl text-gray-600 mb-8">
            No credit card required. Full access to all features. Cancel anytime.
          </p>
          <Link href="/start-trial" className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 inline-block">
            Get Started Now
          </Link>
        </div>
      </section>
    </div>
  );
}