'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ExternalLink, Filter, TrendingUp, TrendingDown, BarChart3, Calendar, Globe, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { type ComparableSite, formatValuation } from '@affiliate-factory/sdk/valuation';

interface ComparableSitesProps {
  monthlyRevenue?: number;
  monthlyPageviews?: number;
  niche?: string;
  onSiteSelect?: (site: ComparableSite) => void;
  className?: string;
}

interface ComparableSearchParams {
  monthlyRevenue: number;
  monthlyPageviews: number;
  niche?: string;
  limit: number;
  verified: boolean;
}

interface ComparableStats {
  averageMultiple: number;
  medianMultiple: number;
  minMultiple: number;
  maxMultiple: number;
  sampleSize: number;
}

export function ComparableSites({
  monthlyRevenue = 0,
  monthlyPageviews = 0,
  niche,
  onSiteSelect,
  className = '',
}: ComparableSitesProps) {
  const [comparables, setComparables] = useState<ComparableSite[]>([]);
  const [stats, setStats] = useState<ComparableStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<ComparableSearchParams>({
    monthlyRevenue,
    monthlyPageviews,
    niche,
    limit: 10,
    verified: true,
  });
  const [sortBy, setSortBy] = useState<'similarity' | 'multiple' | 'sale_date' | 'revenue'>('similarity');
  const [filterNiche, setFilterNiche] = useState<string>('');

  const searchComparables = async (params: ComparableSearchParams) => {
    if (params.monthlyRevenue <= 0 && params.monthlyPageviews <= 0) {
      return;
    }

    setLoading(true);
    try {
      const searchParams = new URLSearchParams({
        monthlyRevenue: params.monthlyRevenue.toString(),
        monthlyPageviews: params.monthlyPageviews.toString(),
        limit: params.limit.toString(),
        verified: params.verified.toString(),
      });

      if (params.niche) {
        searchParams.append('niche', params.niche);
      }

      const response = await fetch(`/api/valuation/comparables?${searchParams}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch comparable sites');
      }

      const { data, stats: responseStats } = await response.json();
      setComparables(data || []);
      setStats(responseStats);
    } catch (error) {
      console.error('Error fetching comparables:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch comparable sites');
      setComparables([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchComparables(searchParams);
  }, []);

  const filteredAndSortedComparables = useMemo(() => {
    let filtered = comparables;

    // Filter by niche if specified
    if (filterNiche) {
      filtered = filtered.filter(site => 
        site.niche.toLowerCase().includes(filterNiche.toLowerCase())
      );
    }

    // Sort the results
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'multiple':
          return b.multipleAchieved - a.multipleAchieved;
        case 'sale_date':
          return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
        case 'revenue':
          return b.monthlyRevenue - a.monthlyRevenue;
        case 'similarity':
        default:
          // Calculate similarity score
          const aScore = calculateSimilarityScore(a);
          const bScore = calculateSimilarityScore(b);
          return bScore - aScore;
      }
    });
  }, [comparables, filterNiche, sortBy, searchParams]);

  const calculateSimilarityScore = (site: ComparableSite): number => {
    if (searchParams.monthlyRevenue === 0 && searchParams.monthlyPageviews === 0) return 0;
    
    const revenueDiff = searchParams.monthlyRevenue > 0 
      ? Math.abs(site.monthlyRevenue - searchParams.monthlyRevenue) / Math.max(site.monthlyRevenue, searchParams.monthlyRevenue)
      : 0;
    
    const trafficDiff = searchParams.monthlyPageviews > 0
      ? Math.abs(site.monthlyPageviews - searchParams.monthlyPageviews) / Math.max(site.monthlyPageviews, searchParams.monthlyPageviews)
      : 0;
    
    return 1 - (revenueDiff * 0.6 + trafficDiff * 0.4);
  };

  const handleSearch = () => {
    searchComparables(searchParams);
  };

  const uniqueNiches = useMemo(() => {
    const niches = [...new Set(comparables.map(site => site.niche))].sort();
    return niches;
  }, [comparables]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  const getSalePlatformColor = (platform: string) => {
    const colors = {
      flippa: 'bg-blue-100 text-blue-800',
      empire_flippers: 'bg-green-100 text-green-800',
      fe_international: 'bg-purple-100 text-purple-800',
      motion_invest: 'bg-orange-100 text-orange-800',
      acquire: 'bg-indigo-100 text-indigo-800',
      direct: 'bg-gray-100 text-gray-800',
      other: 'bg-yellow-100 text-yellow-800',
    };
    return colors[platform as keyof typeof colors] || colors.other;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Comparable Sites</h2>
            <p className="text-sm text-gray-600">
              Find similar sites to benchmark your valuation
            </p>
          </div>
          {stats && (
            <div className="text-right">
              <div className="text-sm text-gray-600">Sample Size</div>
              <div className="text-2xl font-bold text-gray-900">{stats.sampleSize}</div>
            </div>
          )}
        </div>

        {/* Search Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Revenue ($)
            </label>
            <input
              type="number"
              min="0"
              value={searchParams.monthlyRevenue}
              onChange={(e) => setSearchParams(prev => ({
                ...prev,
                monthlyRevenue: Number(e.target.value)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Pageviews
            </label>
            <input
              type="number"
              min="0"
              value={searchParams.monthlyPageviews}
              onChange={(e) => setSearchParams(prev => ({
                ...prev,
                monthlyPageviews: Number(e.target.value)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Niche (optional)
            </label>
            <input
              type="text"
              value={searchParams.niche || ''}
              onChange={(e) => setSearchParams(prev => ({
                ...prev,
                niche: e.target.value || undefined
              }))}
              placeholder="e.g., technology"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </button>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterNiche}
              onChange={(e) => setFilterNiche(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="">All Niches</option>
              {uniqueNiches.map(niche => (
                <option key={niche} value={niche}>
                  {niche.charAt(0).toUpperCase() + niche.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="similarity">Similarity</option>
              <option value="multiple">Revenue Multiple</option>
              <option value="sale_date">Sale Date</option>
              <option value="revenue">Revenue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Market Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.averageMultiple.toFixed(1)}x
              </div>
              <div className="text-sm text-gray-600">Average Multiple</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.medianMultiple.toFixed(1)}x
              </div>
              <div className="text-sm text-gray-600">Median Multiple</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-700">
                {stats.minMultiple.toFixed(1)}x - {stats.maxMultiple.toFixed(1)}x
              </div>
              <div className="text-sm text-gray-600">Range</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.sampleSize}
              </div>
              <div className="text-sm text-gray-600">Sales Analyzed</div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-600">Searching comparable sites...</span>
          </div>
        ) : filteredAndSortedComparables.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Comparable Sites Found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or expanding the revenue/traffic range.
            </p>
            <button
              onClick={() => setSearchParams(prev => ({
                ...prev,
                monthlyRevenue: prev.monthlyRevenue * 0.5,
                monthlyPageviews: prev.monthlyPageviews * 0.5,
              }))}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Broaden Search Criteria
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedComparables.map((site, index) => (
              <div
                key={`${site.domain}-${site.saleDate}`}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSiteSelect?.(site)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        {site.domain}
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSalePlatformColor(site.source)}`}>
                        {site.source.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{site.niche}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Sold {formatDate(site.saleDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-4 h-4" />
                        {(calculateSimilarityScore(site) * 100).toFixed(0)}% similar
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {site.multipleAchieved.toFixed(1)}x
                    </div>
                    <div className="text-sm text-gray-600">Revenue Multiple</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-gray-100">
                  <div>
                    <div className="text-sm text-gray-600">Sale Price</div>
                    <div className="font-semibold text-green-600">
                      {formatValuation(site.salePrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Monthly Revenue</div>
                    <div className="font-semibold">
                      {formatValuation(site.monthlyRevenue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Monthly Pageviews</div>
                    <div className="font-semibold">
                      {site.monthlyPageviews.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Difference</div>
                    <div className={`font-semibold flex items-center gap-1 ${
                      site.multipleAchieved > (stats?.averageMultiple || 30) ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {site.multipleAchieved > (stats?.averageMultiple || 30) ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {stats ? 
                        `${((site.multipleAchieved - stats.averageMultiple) / stats.averageMultiple * 100).toFixed(0)}%` :
                        'N/A'
                      }
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}