'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, Check, Star, Zap, TrendingUp, DollarSign, 
  Bot, Globe, Shield, Clock, Users, BarChart3,
  ChevronRight, Play, Menu, X, Sparkles
} from 'lucide-react';

export default function PlatformHomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Entrepreneur',
      content: 'Launched 3 profitable sites in different niches. The AI agents handle everything while I focus on strategy.',
      revenue: '$12,400/mo',
      sites: 3
    },
    {
      name: 'Marcus Johnson',
      role: 'Digital Marketer',
      content: 'From zero to $8K monthly revenue in 60 days. The platform truly runs itself.',
      revenue: '$8,200/mo',
      sites: 1
    },
    {
      name: 'Emily Rodriguez',
      role: 'Content Creator',
      content: 'Finally, passive income that\'s actually passive. My fitness site generates content 24/7.',
      revenue: '$15,800/mo',
      sites: 5
    }
  ];

  const features = [
    {
      icon: <Bot className="w-6 h-6" />,
      title: '15 AI Agents Working 24/7',
      description: 'Autonomous agents monitor trends, create content, and optimize revenue around the clock'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: '5-Minute Setup',
      description: 'Answer 6 questions and launch a fully-functional affiliate site instantly'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Real-Time Trend Response',
      description: 'Capitalize on viral content within minutes, not days'
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Revenue Optimization',
      description: 'AI continuously tests and optimizes for maximum conversions'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Self-Healing System',
      description: 'Automatic error recovery and maintenance-free operation'
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Any Niche, Any Market',
      description: 'From tech to outdoor gear, our AI adapts to any product category'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/platform" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">AffiliateOS</span>
              </Link>
              
              <div className="hidden md:flex items-center gap-6">
                <Link href="#features" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Features
                </Link>
                <Link href="#pricing" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Pricing
                </Link>
                <Link href="#examples" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Examples
                </Link>
                <Link href="#resources" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Resources
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login" className="hidden md:inline-block text-neutral-600 hover:text-neutral-900 transition-colors">
                Log in
              </Link>
              <Link
                href="/onboarding"
                className="hidden md:inline-block px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Start free trial
              </Link>
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 pt-16">
          <div className="p-6 space-y-4">
            <Link href="#features" className="block py-3 text-lg">Features</Link>
            <Link href="#pricing" className="block py-3 text-lg">Pricing</Link>
            <Link href="#examples" className="block py-3 text-lg">Examples</Link>
            <Link href="#resources" className="block py-3 text-lg">Resources</Link>
            <Link href="/login" className="block py-3 text-lg">Log in</Link>
            <Link
              href="/onboarding"
              className="block w-full py-3 bg-neutral-900 text-white text-center rounded-lg"
            >
              Start free trial
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <motion.div 
          style={{ opacity, scale }}
          className="max-w-6xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full mb-6"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">The Shopify for Affiliate Websites</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-neutral-900 mb-6"
          >
            Build Profitable<br />
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Affiliate Sites
            </span><br />
            in 5 Minutes
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto"
          >
            Launch a fully autonomous affiliate business powered by 15 AI agents.
            No coding. No maintenance. Just passive income.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/onboarding"
              className="px-8 py-4 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2 text-lg font-medium"
            >
              Start free trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="px-8 py-4 bg-white border-2 border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors flex items-center gap-2 text-lg font-medium">
              <Play className="w-5 h-5" />
              Watch demo
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 text-sm text-neutral-500"
          >
            No credit card required • 14-day free trial • Cancel anytime
          </motion.p>
        </motion.div>

        {/* Hero Image/Video */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="max-w-6xl mx-auto mt-16"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-purple-100 to-pink-100 p-1">
            <div className="bg-white rounded-xl p-8">
              <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                  <p className="text-neutral-600">Platform Demo Video</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-neutral-900 mb-2">10,000+</div>
              <div className="text-neutral-600">Active Sites</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-neutral-900 mb-2">$2.4M</div>
              <div className="text-neutral-600">Monthly GMV</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-neutral-900 mb-2">98.7%</div>
              <div className="text-neutral-600">Automation Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-neutral-900 mb-2">24/7</div>
              <div className="text-neutral-600">AI Operation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Everything you need to build a<br />
              profitable affiliate business
            </h2>
            <p className="text-xl text-neutral-600">
              Our platform handles the technical complexity so you can focus on growth
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 bg-white rounded-2xl border border-neutral-200 hover:border-purple-200 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mb-4 text-purple-600">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Launch your site in 3 simple steps
            </h2>
            <p className="text-xl text-neutral-600">
              No technical knowledge required
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">Choose Your Niche</h3>
              <p className="text-neutral-600">
                Select from pre-configured niches or create a custom one. Our AI adapts instantly.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">Answer 6 Questions</h3>
              <p className="text-neutral-600">
                Tell us about your target audience and preferences. Takes less than 2 minutes.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">Launch & Earn</h3>
              <p className="text-neutral-600">
                Your site goes live instantly. AI agents start working immediately to generate revenue.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-lg font-medium"
            >
              Get started now
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Join thousands of successful<br />affiliate marketers
            </h2>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-neutral-600">4.9/5 from 2,847 reviews</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 border border-neutral-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" />
                  <div>
                    <div className="font-semibold text-neutral-900">{testimonial.name}</div>
                    <div className="text-sm text-neutral-600">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-neutral-700 mb-4">"{testimonial.content}"</p>
                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                  <div>
                    <div className="text-sm text-neutral-500">Revenue</div>
                    <div className="font-semibold text-green-600">{testimonial.revenue}</div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500">Sites</div>
                    <div className="font-semibold text-neutral-900">{testimonial.sites}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-neutral-600">
              Choose the plan that fits your ambition
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-white rounded-2xl p-8 border border-neutral-200">
              <h3 className="text-2xl font-bold text-neutral-900 mb-2">Starter</h3>
              <p className="text-neutral-600 mb-6">Perfect for getting started</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-neutral-900">$29</span>
                <span className="text-neutral-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>1 niche website</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Basic AI agents</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Community support</span>
                </li>
              </ul>
              <Link
                href="/onboarding"
                className="block w-full py-3 bg-neutral-100 text-neutral-700 rounded-lg text-center hover:bg-neutral-200 transition-colors font-medium"
              >
                Start free trial
              </Link>
            </div>

            {/* Growth - Popular */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 text-white relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-yellow-400 text-neutral-900 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Growth</h3>
              <p className="text-white/90 mb-6">For serious entrepreneurs</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-white/90">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  <span>3 niche websites</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  <span>All 15 AI agents</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  <span>Advanced analytics</span>
                </li>
              </ul>
              <Link
                href="/onboarding"
                className="block w-full py-3 bg-white text-purple-600 rounded-lg text-center hover:bg-neutral-100 transition-colors font-medium"
              >
                Start free trial
              </Link>
            </div>

            {/* Scale */}
            <div className="bg-white rounded-2xl p-8 border border-neutral-200">
              <h3 className="text-2xl font-bold text-neutral-900 mb-2">Scale</h3>
              <p className="text-neutral-600 mb-6">For agencies and teams</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-neutral-900">$299</span>
                <span className="text-neutral-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>10 niche websites</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>White-label option</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Dedicated support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>API access</span>
                </li>
              </ul>
              <Link
                href="/onboarding"
                className="block w-full py-3 bg-neutral-900 text-white rounded-lg text-center hover:bg-neutral-800 transition-colors font-medium"
              >
                Contact sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-neutral-900 mb-6">
            Ready to build your<br />
            passive income empire?
          </h2>
          <p className="text-xl text-neutral-600 mb-8">
            Join 10,000+ entrepreneurs already using AffiliateOS to generate passive income
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="px-8 py-4 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2 text-lg font-medium"
            >
              Start your free trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#examples"
              className="px-8 py-4 bg-white border-2 border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors text-lg font-medium"
            >
              View live examples
            </Link>
          </div>
          <p className="mt-6 text-sm text-neutral-500">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">AffiliateOS</span>
              </div>
              <p className="text-neutral-400 text-sm">
                The platform that builds profitable affiliate sites on autopilot.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-neutral-400 text-sm">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#examples" className="hover:text-white transition-colors">Examples</Link></li>
                <li><Link href="/roadmap" className="hover:text-white transition-colors">Roadmap</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-neutral-400 text-sm">
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API Reference</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-neutral-400 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-800 flex flex-col md:flex-row items-center justify-between text-sm text-neutral-400">
            <p>© 2024 AffiliateOS. All rights reserved.</p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
              <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
              <Link href="#" className="hover:text-white transition-colors">Discord</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}