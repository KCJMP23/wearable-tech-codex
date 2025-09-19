'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  HeartIcon, 
  BoltIcon, 
  ChartBarIcon, 
  ShieldCheckIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface ProductInsightsProps {
  tenantSlug: string;
  tenantNiche?: string;
}

interface Metric {
  name: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

export function ProductInsights({ tenantSlug, tenantNiche = 'Products' }: ProductInsightsProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('quality-score');

  const metrics: Metric[] = [
    {
      name: 'Quality Score',
      value: '9.2/10',
      change: '+15% higher',
      icon: <HeartIcon className="h-6 w-6" />,
      color: 'red',
      description: 'Our AI analyzes thousands of reviews to rate product quality and reliability'
    },
    {
      name: 'Value Rating',
      value: '8.7/10',
      change: 'Excellent',
      icon: <ClockIcon className="h-6 w-6" />,
      color: 'indigo',
      description: 'Compare price vs. features to find products that offer the best value for money'
    },
    {
      name: 'Popularity Index',
      value: '89/100',
      change: '+12 points',
      icon: <BoltIcon className="h-6 w-6" />,
      color: 'yellow',
      description: 'Track trending products and see what others in your niche are buying'
    },
    {
      name: 'Customer Satisfaction',
      value: '96%',
      change: '+5% increase',
      icon: <ShieldCheckIcon className="h-6 w-6" />,
      color: 'green',
      description: 'Real customer feedback and satisfaction scores from verified purchases'
    },
    {
      name: 'Deal Score',
      value: '94%',
      change: 'Hot Deal',
      icon: <SparklesIcon className="h-6 w-6" />,
      color: 'purple',
      description: 'Smart price tracking alerts you to the best deals and discounts available'
    },
    {
      name: 'Expert Rating',
      value: '4.8/5',
      change: 'Top Rated',
      icon: <ChartBarIcon className="h-6 w-6" />,
      color: 'blue',
      description: 'Professional reviews and expert analysis of features, performance, and value'
    }
  ];

  const colorClasses: { [key: string]: string } = {
    red: 'from-red-500 to-pink-500 text-red-600 bg-red-50 border-red-200',
    indigo: 'from-indigo-500 to-blue-500 text-indigo-600 bg-indigo-50 border-indigo-200',
    yellow: 'from-yellow-500 to-amber-500 text-yellow-600 bg-yellow-50 border-yellow-200',
    green: 'from-green-500 to-emerald-500 text-green-600 bg-green-50 border-green-200',
    purple: 'from-purple-500 to-violet-500 text-purple-600 bg-purple-50 border-purple-200',
    blue: 'from-blue-500 to-cyan-500 text-blue-600 bg-blue-50 border-blue-200'
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Make Smarter Purchase Decisions
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Our AI-powered platform analyzes thousands of products to bring you data-driven insights. 
            Compare, evaluate, and find the perfect {tenantNiche.toLowerCase()} for your needs.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {metrics.map((metric) => {
              const baseColors = colorClasses[metric.color].split(' ');
              const gradientColors = baseColors[0];
              const textColor = baseColors[1];
              const bgColor = baseColors[2];
              const borderColor = baseColors[3];
              
              return (
                <button
                  key={metric.name}
                  onClick={() => setSelectedMetric(metric.name.toLowerCase().replace(' ', '-'))}
                  className={`relative group p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                    selectedMetric === metric.name.toLowerCase().replace(' ', '-')
                      ? `${borderColor} shadow-md`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Icon */}
                  <div className={`inline-flex p-3 rounded-lg ${bgColor} ${textColor} mb-3`}>
                    {metric.icon}
                  </div>
                  
                  {/* Metric Name */}
                  <h3 className="text-sm font-medium text-gray-600 mb-1">
                    {metric.name}
                  </h3>
                  
                  {/* Value */}
                  <p className="text-xl font-bold text-gray-900">
                    {metric.value}
                  </p>
                  
                  {/* Change */}
                  <p className={`text-xs font-medium mt-1 ${textColor}`}>
                    {metric.change}
                  </p>
                  
                  {/* Active Indicator */}
                  {selectedMetric === metric.name.toLowerCase().replace(' ', '-') && (
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradientColors} opacity-5`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Insight Panel */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Why Smart Shopping Matters
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {metrics.find(m => m.name.toLowerCase().replace(' ', '-') === selectedMetric)?.description ||
                  `Select a metric to learn more about how our platform helps you find the best ${tenantNiche.toLowerCase()} for your needs.`}
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  24/7 price monitoring and real-time deal alerts
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  Personalized recommendations based on your preferences and budget
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  Early access to new products and trending items in your niche
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/${tenantSlug}/quiz`}
                className="flex-1 text-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Find Your Perfect {tenantNiche.endsWith('s') ? tenantNiche.slice(0, -1) : tenantNiche}
              </Link>
              <Link
                href={`/${tenantSlug}/guides`}
                className="flex-1 text-center border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">
            Ready to Discover Amazing {tenantNiche}?
          </h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Join thousands who are already discovering the best {tenantNiche.toLowerCase()} with our platform. 
            Get personalized recommendations based on your interests and budget.
          </p>
          <Link
            href={`/${tenantSlug}/quiz`}
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Take the Quiz
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}