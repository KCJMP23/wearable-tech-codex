'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';

import { type SiteValuation, formatValuation } from '@affiliate-factory/sdk/valuation';

interface ValuationChartProps {
  valuations: SiteValuation[];
  className?: string;
  showRevenue?: boolean;
  showMethodBreakdown?: boolean;
}

interface ChartDataPoint {
  date: string;
  valuation: number;
  revenue: number;
  pageviews: number;
  confidence: string;
  timestamp: number;
}

const CONFIDENCE_COLORS = {
  high: '#22c55e',
  medium: '#f59e0b',
  low: '#ef4444',
};

const METHOD_COLORS = {
  revenue_multiple: '#3b82f6',
  asset_based: '#10b981',
  traffic_based: '#f59e0b',
  comparable: '#8b5cf6',
};

export function ValuationChart({
  valuations,
  className = '',
  showRevenue = true,
  showMethodBreakdown = false,
}: ValuationChartProps) {
  const chartData = useMemo(() => {
    return valuations
      .map((valuation): ChartDataPoint => ({
        date: format(new Date(valuation.createdAt), 'MMM dd'),
        valuation: valuation.result.totalValuation.mid,
        revenue: valuation.metrics.monthlyRevenue,
        pageviews: valuation.metrics.monthlyPageviews,
        confidence: valuation.result.confidence,
        timestamp: new Date(valuation.createdAt).getTime(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [valuations]);

  const methodBreakdownData = useMemo(() => {
    if (!valuations.length) return [];
    
    const latest = valuations[0];
    return Object.entries(latest.result.methodBreakdown).map(([method, range]) => ({
      method: method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: range.mid,
      confidence: range.confidence,
    }));
  }, [valuations]);

  const trendAnalysis = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const latest = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    const change = latest.valuation - previous.valuation;
    const changePercent = (change / previous.valuation) * 100;
    
    return {
      change,
      changePercent,
      isPositive: change >= 0,
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.dataKey === 'valuation' && `Valuation: ${formatValuation(entry.value)}`}
              {entry.dataKey === 'revenue' && `Revenue: ${formatValuation(entry.value)}`}
              {entry.dataKey === 'pageviews' && `Pageviews: ${entry.value.toLocaleString()}`}
            </p>
          ))}
          {payload[0]?.payload?.confidence && (
            <p className="text-xs text-gray-600 mt-1">
              Confidence: {payload[0].payload.confidence}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (!valuations.length) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Valuation History</h3>
        <p className="text-gray-600">
          Calculate your first valuation to see trends and historical data here.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Trend Overview */}
      {trendAnalysis && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Valuation Trend</h3>
            <div className={`flex items-center gap-2 text-sm ${
              trendAnalysis.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trendAnalysis.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {trendAnalysis.isPositive ? '+' : ''}{trendAnalysis.changePercent.toFixed(1)}%
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatValuation(chartData[chartData.length - 1]?.valuation || 0)}
              </div>
              <div className="text-sm text-gray-600">Current Valuation</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                trendAnalysis.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trendAnalysis.isPositive ? '+' : ''}{formatValuation(Math.abs(trendAnalysis.change))}
              </div>
              <div className="text-sm text-gray-600">Change from Last</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {valuations.length}
              </div>
              <div className="text-sm text-gray-600">Total Calculations</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Valuation Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Valuation History
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="valuation"
                stroke="#3b82f6"
                fill="#dbeafe"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Correlation */}
      {showRevenue && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Valuation vs Revenue
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="valuation"
                  stroke="#3b82f6"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  yAxisId="revenue"
                  orientation="right"
                  stroke="#10b981"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  yAxisId="valuation"
                  type="monotone"
                  dataKey="valuation"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Valuation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Monthly Revenue</span>
            </div>
          </div>
        </div>
      )}

      {/* Method Breakdown */}
      {showMethodBreakdown && methodBreakdownData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Valuation Method Breakdown
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="method"
                    stroke="#6b7280"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatValuation(value), 'Valuation']}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Method Details */}
            <div className="space-y-3">
              {methodBreakdownData.map((method, index) => (
                <div key={method.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: Object.values(METHOD_COLORS)[index] }}
                    />
                    <span className="font-medium text-gray-900">{method.method}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatValuation(method.value)}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      method.confidence === 'high' 
                        ? 'bg-green-100 text-green-800'
                        : method.confidence === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {method.confidence}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confidence Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Confidence Distribution
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(CONFIDENCE_COLORS).map(([level, color]) => {
            const count = chartData.filter(d => d.confidence === level).length;
            const percentage = chartData.length > 0 ? (count / chartData.length) * 100 : 0;
            
            return (
              <div key={level} className="text-center">
                <div 
                  className="w-full h-2 rounded-full mb-2"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      backgroundColor: color,
                      width: `${percentage}%`
                    }}
                  />
                </div>
                <div className="text-sm font-medium capitalize" style={{ color }}>
                  {level}
                </div>
                <div className="text-xs text-gray-600">
                  {count} ({percentage.toFixed(0)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}