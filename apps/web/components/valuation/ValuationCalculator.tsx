'use client';

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  Info,
  DollarSign,
  Users,
  FileText,
  Search,
  Globe,
  Smartphone,
  Clock,
  Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { type ValuationMetrics, type ValuationResult, formatValuation } from '@affiliate-factory/sdk/client';

// Form validation schema
const ValuationFormSchema = z.object({
  // Revenue metrics
  monthlyRevenue: z.number().min(0, 'Monthly revenue must be positive'),
  revenueGrowthRate: z.number().min(-1).max(10),
  revenueConsistency: z.number().min(0).max(1),
  
  // Traffic metrics
  monthlyPageviews: z.number().min(0, 'Monthly pageviews must be positive'),
  averageSessionDuration: z.number().min(0).max(3600),
  bounceRate: z.number().min(0).max(1),
  conversionRate: z.number().min(0).max(1),
  
  // Content metrics
  totalPosts: z.number().int().min(0),
  publishingFrequency: z.number().min(0).max(1000),
  averageWordCount: z.number().min(0).max(50000),
  contentQualityScore: z.number().min(0).max(1),
  
  // SEO metrics
  domainAuthority: z.number().min(0).max(100),
  backlinks: z.number().int().min(0),
  rankingKeywords: z.number().int().min(0),
  organicTrafficPercentage: z.number().min(0).max(1),
  
  // Technical metrics
  pagespeedScore: z.number().min(0).max(100),
  uptimePercentage: z.number().min(0).max(1),
  mobileOptimization: z.number().min(0).max(1),
  
  // Business metrics
  operatingExpenses: z.number().min(0),
  timeInvestment: z.number().min(0).max(168),
  dependencyRisk: z.number().min(0).max(1),
  diversificationScore: z.number().min(0).max(1),
});

type ValuationFormData = z.infer<typeof ValuationFormSchema>;

interface ValuationCalculatorProps {
  tenantId: string;
  onCalculationComplete?: (result: ValuationResult) => void;
  initialData?: Partial<ValuationFormData>;
  className?: string;
}

export function ValuationCalculator({
  tenantId,
  onCalculationComplete,
  initialData,
  className = '',
}: ValuationCalculatorProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [activeSection, setActiveSection] = useState('revenue');

  const form = useForm<ValuationFormData>({
    resolver: zodResolver(ValuationFormSchema),
    defaultValues: {
      monthlyRevenue: 0,
      revenueGrowthRate: 0,
      revenueConsistency: 0.8,
      monthlyPageviews: 0,
      averageSessionDuration: 120,
      bounceRate: 0.6,
      conversionRate: 0.02,
      totalPosts: 0,
      publishingFrequency: 4,
      averageWordCount: 2000,
      contentQualityScore: 0.8,
      domainAuthority: 30,
      backlinks: 0,
      rankingKeywords: 0,
      organicTrafficPercentage: 0.7,
      pagespeedScore: 85,
      uptimePercentage: 0.99,
      mobileOptimization: 0.9,
      operatingExpenses: 0,
      timeInvestment: 20,
      dependencyRisk: 0.5,
      diversificationScore: 0.6,
      ...initialData,
    },
  });

  const calculateValuation = useCallback(async (data: ValuationFormData) => {
    setIsCalculating(true);
    try {
      const metrics: ValuationMetrics = {
        ...data,
        yearlyRevenue: data.monthlyRevenue * 12,
        uniqueVisitors: data.monthlyPageviews * 0.7, // Estimate
      };

      const response = await fetch('/api/valuation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          metrics,
          saveToHistory: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to calculate valuation');
      }

      const { data: responseData } = await response.json();
      const valuationResult = responseData.valuation;
      
      setResult(valuationResult);
      onCalculationComplete?.(valuationResult);
      
      toast.success('Valuation calculated successfully!', {
        icon: '🎯',
      });
    } catch (error) {
      console.error('Valuation calculation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to calculate valuation');
    } finally {
      setIsCalculating(false);
    }
  }, [tenantId, onCalculationComplete]);

  const sections = [
    {
      id: 'revenue',
      title: 'Revenue Metrics',
      icon: DollarSign,
      fields: ['monthlyRevenue', 'revenueGrowthRate', 'revenueConsistency'],
    },
    {
      id: 'traffic',
      title: 'Traffic Metrics',
      icon: Users,
      fields: ['monthlyPageviews', 'averageSessionDuration', 'bounceRate', 'conversionRate'],
    },
    {
      id: 'content',
      title: 'Content Metrics',
      icon: FileText,
      fields: ['totalPosts', 'publishingFrequency', 'averageWordCount', 'contentQualityScore'],
    },
    {
      id: 'seo',
      title: 'SEO Metrics',
      icon: Search,
      fields: ['domainAuthority', 'backlinks', 'rankingKeywords', 'organicTrafficPercentage'],
    },
    {
      id: 'technical',
      title: 'Technical Metrics',
      icon: Zap,
      fields: ['pagespeedScore', 'uptimePercentage', 'mobileOptimization'],
    },
    {
      id: 'business',
      title: 'Business Metrics',
      icon: Globe,
      fields: ['operatingExpenses', 'timeInvestment', 'dependencyRisk', 'diversificationScore'],
    },
  ];

  const renderFormField = (fieldName: keyof ValuationFormData, label: string, type: 'number' | 'percentage' = 'number', min = 0, max?: number, step = 1) => {
    const error = form.formState.errors[fieldName];
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {type === 'percentage' && ' (%)'}
        </label>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          {...form.register(fieldName, { valueAsNumber: true })}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error.message}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calculator className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Site Valuation Calculator</h2>
            <p className="text-sm text-gray-600">
              Get a comprehensive valuation using multiple industry-standard methods
            </p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 p-4 border-r border-gray-200 bg-gray-50">
          <nav className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.title}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-6">
          <form onSubmit={form.handleSubmit(calculateValuation)} className="space-y-6">
            {sections.map((section) => (
              <div
                key={section.id}
                className={activeSection === section.id ? 'block' : 'hidden'}
              >
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.id === 'revenue' && (
                      <>
                        {renderFormField('monthlyRevenue', 'Monthly Revenue ($)', 'number', 0, undefined, 1)}
                        {renderFormField('revenueGrowthRate', 'Revenue Growth Rate', 'percentage', -100, 1000, 0.1)}
                        {renderFormField('revenueConsistency', 'Revenue Consistency', 'percentage', 0, 100, 1)}
                      </>
                    )}
                    
                    {section.id === 'traffic' && (
                      <>
                        {renderFormField('monthlyPageviews', 'Monthly Pageviews', 'number', 0, undefined, 1)}
                        {renderFormField('averageSessionDuration', 'Avg Session Duration (seconds)', 'number', 0, 3600, 1)}
                        {renderFormField('bounceRate', 'Bounce Rate', 'percentage', 0, 100, 1)}
                        {renderFormField('conversionRate', 'Conversion Rate', 'percentage', 0, 100, 0.01)}
                      </>
                    )}
                    
                    {section.id === 'content' && (
                      <>
                        {renderFormField('totalPosts', 'Total Posts', 'number', 0, undefined, 1)}
                        {renderFormField('publishingFrequency', 'Posts per Month', 'number', 0, 1000, 1)}
                        {renderFormField('averageWordCount', 'Average Word Count', 'number', 0, 50000, 1)}
                        {renderFormField('contentQualityScore', 'Content Quality Score', 'percentage', 0, 100, 1)}
                      </>
                    )}
                    
                    {section.id === 'seo' && (
                      <>
                        {renderFormField('domainAuthority', 'Domain Authority', 'number', 0, 100, 1)}
                        {renderFormField('backlinks', 'Backlinks', 'number', 0, undefined, 1)}
                        {renderFormField('rankingKeywords', 'Ranking Keywords', 'number', 0, undefined, 1)}
                        {renderFormField('organicTrafficPercentage', 'Organic Traffic', 'percentage', 0, 100, 1)}
                      </>
                    )}
                    
                    {section.id === 'technical' && (
                      <>
                        {renderFormField('pagespeedScore', 'PageSpeed Score', 'number', 0, 100, 1)}
                        {renderFormField('uptimePercentage', 'Uptime', 'percentage', 0, 100, 0.1)}
                        {renderFormField('mobileOptimization', 'Mobile Optimization', 'percentage', 0, 100, 1)}
                      </>
                    )}
                    
                    {section.id === 'business' && (
                      <>
                        {renderFormField('operatingExpenses', 'Monthly Operating Expenses ($)', 'number', 0, undefined, 1)}
                        {renderFormField('timeInvestment', 'Time Investment (hours/week)', 'number', 0, 168, 1)}
                        {renderFormField('dependencyRisk', 'Dependency Risk', 'percentage', 0, 100, 1)}
                        {renderFormField('diversificationScore', 'Diversification Score', 'percentage', 0, 100, 1)}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Action Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
              <div className="flex gap-2">
                {sections.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveSection(sections[index].id)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      activeSection === sections[index].id
                        ? 'bg-blue-600'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex > 0) {
                      setActiveSection(sections[currentIndex - 1].id);
                    }
                  }}
                  disabled={activeSection === sections[0].id}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex < sections.length - 1) {
                      setActiveSection(sections[currentIndex + 1].id);
                    }
                  }}
                  disabled={activeSection === sections[sections.length - 1].id}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                
                <button
                  type="submit"
                  disabled={isCalculating}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCalculating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Calculate Valuation
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Valuation Results</h3>
          
          {/* Main Valuation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Conservative</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatValuation(result.totalValuation.low)}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600">Most Likely</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatValuation(result.totalValuation.mid)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Optimistic</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatValuation(result.totalValuation.high)}
              </div>
            </div>
          </div>

          {/* Confidence & Factors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Confidence Level</h4>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                result.confidence === 'high' 
                  ? 'bg-green-100 text-green-800'
                  : result.confidence === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {result.confidence === 'high' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {result.confidence.toUpperCase()}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Key Factors</h4>
              <div className="space-y-2">
                {result.factors.positive.slice(0, 2).map((factor, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-green-700">
                    <TrendingUp className="w-4 h-4" />
                    {factor}
                  </div>
                ))}
                {result.factors.negative.slice(0, 2).map((factor, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-red-700">
                    <TrendingDown className="w-4 h-4" />
                    {factor}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}