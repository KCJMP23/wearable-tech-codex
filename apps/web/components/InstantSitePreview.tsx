'use client';

import { useState, useEffect } from 'react';
// Using standard HTML elements instead of missing UI components
import { Loader2, TrendingUp, DollarSign, Users, Search } from 'lucide-react';

interface NicheAnalysis {
  categories: string[];
  target_audience: {
    demographics: string;
    interests: string[];
    pain_points: string[];
    buying_behavior: string;
  };
  affiliate_networks: string[];
  profit_score: number;
  competition_level: string;
  content_ideas: string[];
  keywords: string[];
  estimated_monthly_revenue: string;
  product_types: string[];
  brand_suggestions: string[];
}

interface InstantSitePreviewProps {
  niche: string;
  onAnalysisComplete?: (analysis: NicheAnalysis) => void;
}

export function InstantSitePreview({ niche, onAnalysisComplete }: InstantSitePreviewProps) {
  const [analysis, setAnalysis] = useState<NicheAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      if (niche && niche.length > 2) {
        analyzeNiche();
      }
    }, 500);

    return () => clearTimeout(delayTimer);
  }, [niche]);

  const analyzeNiche = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-niche', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze niche');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      onAnalysisComplete?.(data.analysis);
    } catch (err) {
      setError('Unable to analyze this niche. Please try again.');
      console.error('Niche analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!niche || niche.length < 3) {
    return (
      <div className="p-8 bg-gray-50 border-dashed">
        <div className="text-center text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Enter Your Niche</p>
          <p className="text-sm mt-2">Start typing to see an instant preview of your site</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-lg">Analyzing "{niche}" niche...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border-red-200">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <h2 className="text-2xl font-bold mb-2">Your {niche} Affiliate Site</h2>
        <p className="opacity-90">See how your site could look and perform</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Profit Potential</p>
              <p className="text-2xl font-bold">{analysis.profit_score}/10</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Est. Revenue</p>
              <p className="text-xl font-bold">{analysis.estimated_monthly_revenue}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Competition</p>
              <p className="text-xl font-bold capitalize">{analysis.competition_level}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Site Preview */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Site Structure Preview</h3>
        
        <div className="border rounded-lg p-4 bg-gray-50">
          {/* Mock Navigation */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <span className="text-xl font-bold text-purple-600">
              {niche.charAt(0).toUpperCase() + niche.slice(1)} Hub
            </span>
            <div className="flex gap-4 text-sm">
              {analysis.categories.slice(0, 4).map((cat, idx) => (
                <span key={idx} className="hover:text-purple-600 cursor-pointer">
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Mock Hero Section */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 mb-4">
            <h1 className="text-2xl font-bold mb-2">
              Find the Best {niche} Products
            </h1>
            <p className="text-gray-600">
              Expert reviews and recommendations for {analysis.target_audience.interests[0]} enthusiasts
            </p>
          </div>

          {/* Mock Product Grid */}
          <div className="grid grid-cols-3 gap-4">
            {analysis.product_types.slice(0, 3).map((product, idx) => (
              <div key={idx} className="border rounded p-3 bg-white">
                <div className="bg-gray-200 h-24 rounded mb-2"></div>
                <p className="text-sm font-medium">{product}</p>
                <p className="text-xs text-gray-500">From {analysis.brand_suggestions[idx] || 'Top Brands'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Ideas */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Content Strategy</h3>
        <div className="space-y-2">
          {analysis.content_ideas.slice(0, 3).map((idea, idx) => (
            <div key={idx} className="flex items-start">
              <span className="text-purple-500 mr-2">•</span>
              <span className="text-sm">{idea}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Affiliate Networks */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recommended Affiliate Networks</h3>
        <div className="flex flex-wrap gap-2">
          {analysis.affiliate_networks.map((network, idx) => (
            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {network}
            </span>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">High-Value Keywords</h3>
        <div className="flex flex-wrap gap-2">
          {analysis.keywords.slice(0, 6).map((keyword, idx) => (
            <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}