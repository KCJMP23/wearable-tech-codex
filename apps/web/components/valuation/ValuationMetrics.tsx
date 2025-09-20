'use client';

import React from 'react';
import {
  DollarSign,
  Users,
  FileText,
  Search,
  Zap,
  Globe,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Target,
  BarChart3,
  Clock,
} from 'lucide-react';

import { type ValuationResult, type ValuationMetrics, formatValuation } from '@affiliate-factory/sdk/valuation';

interface ValuationMetricsProps {
  result: ValuationResult;
  metrics: ValuationMetrics;
  className?: string;
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
}

function MetricCard({ 
  icon: Icon, 
  title, 
  value, 
  change, 
  trend, 
  subtitle, 
  color = 'blue' 
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' && <TrendingUp className="w-4 h-4" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4" />}
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function ValuationMetrics({ result, metrics, className = '' }: ValuationMetricsProps) {
  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const calculateRevenueMultiple = () => {
    if (metrics.monthlyRevenue === 0) return 0;
    return result.totalValuation.mid / metrics.monthlyRevenue;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Main Valuation */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Site Valuation</h2>
            <p className="text-blue-100">Comprehensive multi-method analysis</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            result.confidence === 'high' 
              ? 'bg-green-500 bg-opacity-20 text-green-100'
              : result.confidence === 'medium'
              ? 'bg-yellow-500 bg-opacity-20 text-yellow-100'
              : 'bg-red-500 bg-opacity-20 text-red-100'
          }`}>
            {result.confidence.toUpperCase()} CONFIDENCE
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg text-blue-100">Conservative</div>
            <div className="text-2xl font-bold">
              {formatValuation(result.totalValuation.low)}
            </div>
          </div>
          <div className="text-center bg-white bg-opacity-10 rounded-lg p-4">
            <div className="text-lg text-blue-100">Most Likely</div>
            <div className="text-3xl font-bold">
              {formatValuation(result.totalValuation.mid)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg text-blue-100">Optimistic</div>
            <div className="text-2xl font-bold">
              {formatValuation(result.totalValuation.high)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-blue-400">
          <div className="text-center">
            <div className="text-blue-100 text-sm">Revenue Multiple</div>
            <div className="text-xl font-semibold">
              {calculateRevenueMultiple().toFixed(1)}x
            </div>
          </div>
          <div className="text-center">
            <div className="text-blue-100 text-sm">Monthly Revenue</div>
            <div className="text-xl font-semibold">
              {formatValuation(metrics.monthlyRevenue)}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          Revenue Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={DollarSign}
            title="Monthly Revenue"
            value={formatValuation(metrics.monthlyRevenue)}
            color="green"
          />
          <MetricCard
            icon={TrendingUp}
            title="Growth Rate"
            value={formatPercentage(metrics.revenueGrowthRate)}
            trend={metrics.revenueGrowthRate > 0 ? 'up' : metrics.revenueGrowthRate < 0 ? 'down' : 'neutral'}
            color="blue"
          />
          <MetricCard
            icon={BarChart3}
            title="Consistency"
            value={formatPercentage(metrics.revenueConsistency)}
            color="purple"
          />
          <MetricCard
            icon={Target}
            title="Operating Expenses"
            value={formatValuation(metrics.operatingExpenses)}
            subtitle={`${((metrics.operatingExpenses / metrics.monthlyRevenue) * 100).toFixed(0)}% of revenue`}
            color="yellow"
          />
        </div>
      </div>

      {/* Traffic Metrics */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          Traffic Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Users}
            title="Monthly Pageviews"
            value={formatNumber(metrics.monthlyPageviews)}
            color="green"
          />
          <MetricCard
            icon={Clock}
            title="Session Duration"
            value={`${Math.floor(metrics.averageSessionDuration / 60)}:${(metrics.averageSessionDuration % 60).toFixed(0).padStart(2, '0')}`}
            subtitle="Average time on site"
            color="blue"
          />
          <MetricCard
            icon={TrendingDown}
            title="Bounce Rate"
            value={formatPercentage(metrics.bounceRate)}
            color="yellow"
          />
          <MetricCard
            icon={Target}
            title="Conversion Rate"
            value={formatPercentage(metrics.conversionRate)}
            color="purple"
          />
        </div>
      </div>

      {/* Content Metrics */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          Content Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={FileText}
            title="Total Posts"
            value={metrics.totalPosts.toLocaleString()}
            color="purple"
          />
          <MetricCard
            icon={Clock}
            title="Publishing Frequency"
            value={`${metrics.publishingFrequency}/month`}
            subtitle="Posts per month"
            color="blue"
          />
          <MetricCard
            icon={BarChart3}
            title="Average Word Count"
            value={formatNumber(metrics.averageWordCount)}
            color="green"
          />
          <MetricCard
            icon={CheckCircle}
            title="Content Quality"
            value={formatPercentage(metrics.contentQualityScore)}
            color="green"
          />
        </div>
      </div>

      {/* SEO Metrics */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-yellow-600" />
          SEO Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Search}
            title="Domain Authority"
            value={metrics.domainAuthority}
            subtitle="/100"
            color="yellow"
          />
          <MetricCard
            icon={Globe}
            title="Backlinks"
            value={formatNumber(metrics.backlinks)}
            color="blue"
          />
          <MetricCard
            icon={Target}
            title="Ranking Keywords"
            value={formatNumber(metrics.rankingKeywords)}
            color="green"
          />
          <MetricCard
            icon={Search}
            title="Organic Traffic"
            value={formatPercentage(metrics.organicTrafficPercentage)}
            color="green"
          />
        </div>
      </div>

      {/* Technical Metrics */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-red-600" />
          Technical Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            icon={Zap}
            title="PageSpeed Score"
            value={`${metrics.pagespeedScore}/100`}
            color={metrics.pagespeedScore >= 90 ? 'green' : metrics.pagespeedScore >= 70 ? 'yellow' : 'red'}
          />
          <MetricCard
            icon={CheckCircle}
            title="Uptime"
            value={formatPercentage(metrics.uptimePercentage)}
            color="green"
          />
          <MetricCard
            icon={Globe}
            title="Mobile Optimization"
            value={formatPercentage(metrics.mobileOptimization)}
            color={metrics.mobileOptimization >= 0.9 ? 'green' : metrics.mobileOptimization >= 0.7 ? 'yellow' : 'red'}
          />
        </div>
      </div>

      {/* Business Risk Metrics */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Business Risk Assessment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            icon={AlertTriangle}
            title="Dependency Risk"
            value={formatPercentage(metrics.dependencyRisk)}
            color={metrics.dependencyRisk <= 0.3 ? 'green' : metrics.dependencyRisk <= 0.6 ? 'yellow' : 'red'}
          />
          <MetricCard
            icon={BarChart3}
            title="Diversification Score"
            value={formatPercentage(metrics.diversificationScore)}
            color={metrics.diversificationScore >= 0.7 ? 'green' : metrics.diversificationScore >= 0.5 ? 'yellow' : 'red'}
          />
          <MetricCard
            icon={Clock}
            title="Time Investment"
            value={`${metrics.timeInvestment}h/week`}
            color="blue"
          />
        </div>
      </div>

      {/* Valuation Method Breakdown */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Valuation Method Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(result.methodBreakdown).map(([method, range]) => {
            const methodName = method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const colors = {
              'Revenue Multiple': 'blue',
              'Asset Based': 'green',
              'Traffic Based': 'yellow',
              'Comparable': 'purple',
            } as const;
            
            return (
              <MetricCard
                key={method}
                icon={BarChart3}
                title={methodName}
                value={formatValuation(range.mid)}
                subtitle={`${range.confidence} confidence`}
                color={colors[methodName as keyof typeof colors] || 'gray'}
              />
            );
          })}
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          Key Insights
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Positive Factors */}
          <div>
            <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Strengths
            </h4>
            <ul className="space-y-2">
              {result.factors.positive.map((factor, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          {/* Negative Factors */}
          <div>
            <h4 className="font-medium text-red-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Areas for Improvement
            </h4>
            <ul className="space-y-2">
              {result.factors.negative.map((factor, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommendations */}
        {result.factors.recommendations.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-blue-700 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Recommendations
            </h4>
            <ul className="space-y-2">
              {result.factors.recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}