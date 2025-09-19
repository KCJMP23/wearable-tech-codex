'use client';

import { useState } from 'react';
import { 
  TrendingUp, Users, DollarSign, ShoppingCart, Target,
  MousePointer, Eye, Clock, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, Activity, Zap, Brain, AlertTriangle,
  ChevronRight, Filter, Download, RefreshCw, Layers
} from 'lucide-react';

interface ConversionIntelligenceViewProps {
  tenantSlug: string;
  tenantId: string;
  analytics: any;
}

export function ConversionIntelligenceView({ tenantSlug, tenantId, analytics }: ConversionIntelligenceViewProps) {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeView, setActiveView] = useState<'overview' | 'funnel' | 'products' | 'behavior' | 'predictions'>('overview');

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-8">
      {/* Header with Time Range Selector */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Conversion Intelligence</h2>
          <p className="text-sm text-neutral-400">
            AI-powered insights to optimize your conversion funnel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-white focus:border-amber-500"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="rounded-full border border-neutral-800 p-2 hover:border-amber-500">
            <RefreshCw className="h-4 w-4 text-neutral-400" />
          </button>
          <button className="rounded-full border border-neutral-800 p-2 hover:border-amber-500">
            <Download className="h-4 w-4 text-neutral-400" />
          </button>
        </div>
      </header>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-neutral-800">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'funnel', label: 'Funnel', icon: Filter },
          { id: 'products', label: 'Products', icon: ShoppingCart },
          { id: 'behavior', label: 'Behavior', icon: MousePointer },
          { id: 'predictions', label: 'AI Predictions', icon: Brain }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeView === tab.id
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-5 gap-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-green-500">+12.3%</span>
              </div>
              <div className="text-2xl font-semibold text-white">{formatNumber(analytics.overview.visitors)}</div>
              <div className="text-xs text-neutral-400">Visitors</div>
            </div>
            
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <Eye className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-green-500">+8.7%</span>
              </div>
              <div className="text-2xl font-semibold text-white">{formatNumber(analytics.overview.pageViews)}</div>
              <div className="text-xs text-neutral-400">Page Views</div>
            </div>
            
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-green-500">+2.1%</span>
              </div>
              <div className="text-2xl font-semibold text-white">{analytics.overview.conversionRate}%</div>
              <div className="text-xs text-neutral-400">Conversion Rate</div>
            </div>
            
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-500">+18.9%</span>
              </div>
              <div className="text-2xl font-semibold text-white">${formatNumber(analytics.overview.revenue)}</div>
              <div className="text-xs text-neutral-400">Revenue</div>
            </div>
            
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="h-4 w-4 text-red-500" />
                <span className="text-xs text-red-500">-3.2%</span>
              </div>
              <div className="text-2xl font-semibold text-white">{analytics.overview.cartAbandonment}%</div>
              <div className="text-xs text-neutral-400">Cart Abandonment</div>
            </div>
          </div>

          {/* Performance Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Top Converting Products</h3>
              <div className="space-y-3">
                {analytics.topProducts.slice(0, 5).map((product: any, index: number) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-neutral-500">#{index + 1}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{product.name}</div>
                        <div className="text-xs text-neutral-500">{product.views.toLocaleString()} views</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">${formatNumber(product.revenue)}</div>
                      <div className="text-xs text-green-500">{product.conversionRate}% CR</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Traffic Sources</h3>
              <div className="space-y-3">
                {analytics.trafficSources.map((source: any) => (
                  <div key={source.source} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-400">{source.source}</span>
                      <span className="text-sm font-medium text-white">{formatNumber(source.sessions)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                        style={{ width: `${(source.sessions / analytics.trafficSources[0].sessions) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Device Performance</h3>
            <div className="grid grid-cols-3 gap-6">
              {analytics.devices.map((device: any) => (
                <div key={device.type} className="rounded-xl bg-neutral-900/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">{device.type}</span>
                    <span className={`text-xs font-medium ${
                      device.conversionRate > 3 ? 'text-green-500' : 'text-amber-500'
                    }`}>
                      {device.conversionRate}% CR
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Sessions</span>
                      <span className="text-neutral-400">{formatNumber(device.sessions)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Revenue</span>
                      <span className="text-neutral-400">${formatNumber(device.revenue)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeView === 'funnel' && (
        <div className="space-y-6">
          {/* Funnel Visualization */}
          <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Conversion Funnel</h3>
            <div className="space-y-4">
              {analytics.funnel.map((stage: any, index: number) => (
                <div key={stage.stage} className="relative">
                  <div className="flex items-center gap-4">
                    <div className="w-32 text-right">
                      <div className="text-sm font-medium text-white">{stage.stage}</div>
                      {stage.dropoff > 0 && (
                        <div className="text-xs text-red-500 mt-1">-{stage.dropoff}%</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="relative h-16 rounded-xl bg-neutral-900 overflow-hidden">
                        <div 
                          className={`absolute left-0 top-0 h-full rounded-xl ${
                            index === 0 ? 'bg-blue-500' :
                            index === analytics.funnel.length - 1 ? 'bg-green-500' :
                            'bg-amber-500'
                          }`}
                          style={{ width: `${(stage.visitors / analytics.funnel[0].visitors) * 100}%` }}
                        >
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-white">
                            {formatNumber(stage.visitors)} visitors
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < analytics.funnel.length - 1 && (
                    <div className="ml-32 pl-4 py-2">
                      <ArrowDownRight className="h-4 w-4 text-neutral-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Funnel Insights */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <AlertTriangle className="h-5 w-5 text-red-500 mb-2" />
              <div className="text-sm font-medium text-white mb-1">Biggest Drop-off</div>
              <p className="text-xs text-neutral-400">
                71.5% of users abandon at "Add to Cart" stage
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <Zap className="h-5 w-5 text-amber-500 mb-2" />
              <div className="text-sm font-medium text-white mb-1">Optimization Opportunity</div>
              <p className="text-xs text-neutral-400">
                Simplifying checkout could increase conversions by 23%
              </p>
            </div>
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <TrendingUp className="h-5 w-5 text-green-500 mb-2" />
              <div className="text-sm font-medium text-white mb-1">Best Performer</div>
              <p className="text-xs text-neutral-400">
                Homepage to Product Page has 63.3% progression rate
              </p>
            </div>
          </div>
        </div>
      )}

      {activeView === 'behavior' && (
        <div className="space-y-6">
          {/* Heatmap Visualization */}
          <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Click Heatmap</h3>
            <div className="relative h-96 bg-neutral-900 rounded-xl overflow-hidden">
              {/* Simulated heatmap */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-amber-500/20 to-transparent" />
              {analytics.heatmaps.clicks.map((click: any, index: number) => (
                <div
                  key={index}
                  className="absolute w-8 h-8 rounded-full bg-red-500/50 blur-xl"
                  style={{
                    left: `${(click.x / 1280) * 100}%`,
                    top: `${(click.y / 800) * 100}%`,
                    opacity: click.count / analytics.heatmaps.clicks[0].count
                  }}
                />
              ))}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
                <div className="text-xs text-white mb-1">Most Clicked Areas</div>
                <div className="text-xs text-neutral-400">Header CTA: 4,532 clicks</div>
                <div className="text-xs text-neutral-400">Product Grid: 3,421 clicks</div>
              </div>
            </div>
          </div>

          {/* Scroll Depth */}
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Scroll Depth</h3>
              <div className="space-y-3">
                {analytics.heatmaps.scrollDepth.map((depth: any) => (
                  <div key={depth.depth} className="flex items-center gap-4">
                    <div className="w-16 text-right text-sm text-neutral-400">{depth.depth}%</div>
                    <div className="flex-1 h-8 rounded-lg bg-neutral-900 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                        style={{ width: `${depth.percentage}%` }}
                      />
                    </div>
                    <div className="w-16 text-sm text-white">{depth.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">User Behavior Insights</h3>
              <div className="space-y-3">
                <div className="rounded-xl bg-neutral-900/50 p-3">
                  <div className="text-sm font-medium text-white mb-1">Avg Session Duration</div>
                  <div className="text-2xl font-semibold text-amber-500">
                    {formatDuration(analytics.overview.avgSessionDuration)}
                  </div>
                </div>
                <div className="rounded-xl bg-neutral-900/50 p-3">
                  <div className="text-sm font-medium text-white mb-1">Bounce Rate</div>
                  <div className="text-2xl font-semibold text-red-500">{analytics.overview.bounceRate}%</div>
                </div>
                <div className="rounded-xl bg-neutral-900/50 p-3">
                  <div className="text-sm font-medium text-white mb-1">Pages per Session</div>
                  <div className="text-2xl font-semibold text-green-500">5.4</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'predictions' && (
        <div className="space-y-6">
          {/* AI Predictions */}
          <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Brain className="h-6 w-6 text-purple-500" />
              <h3 className="text-lg font-semibold text-white">AI-Powered Predictions</h3>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4">
                <div className="text-xs text-neutral-400 mb-2">Next Week Revenue</div>
                <div className="text-2xl font-semibold text-white">${formatNumber(analytics.predictions.nextWeekRevenue)}</div>
                <div className="text-xs text-green-500 mt-1">↑ {analytics.predictions.growthRate}% growth</div>
              </div>
              
              <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4">
                <div className="text-xs text-neutral-400 mb-2">Expected Orders</div>
                <div className="text-2xl font-semibold text-white">{formatNumber(analytics.predictions.nextWeekOrders)}</div>
                <div className="text-xs text-neutral-500 mt-1">Based on current trend</div>
              </div>
              
              <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4">
                <div className="text-xs text-neutral-400 mb-2">Churn Risk</div>
                <div className="text-2xl font-semibold text-amber-500">{analytics.predictions.churnRisk}%</div>
                <div className="text-xs text-neutral-500 mt-1">Of active users</div>
              </div>
              
              <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4">
                <div className="text-xs text-neutral-400 mb-2">Seasonal Trend</div>
                <div className="text-2xl font-semibold text-green-500 capitalize">{analytics.predictions.seasonalTrend}</div>
                <div className="text-xs text-neutral-500 mt-1">Next 30 days</div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">AI Recommendations</h3>
            <div className="space-y-3">
              {[
                { 
                  priority: 'high',
                  title: 'Optimize Mobile Checkout',
                  description: 'Mobile users have 45% lower conversion. Simplifying mobile checkout could increase revenue by $12,345/month.',
                  impact: '+$12,345/mo'
                },
                {
                  priority: 'high',
                  title: 'Add Product Comparison Tool',
                  description: 'Users viewing multiple products convert 3x better. A comparison feature could boost conversions by 23%.',
                  impact: '+23% CR'
                },
                {
                  priority: 'medium',
                  title: 'Implement Exit Intent Popups',
                  description: 'Capture 15% of abandoning visitors with targeted offers based on cart value.',
                  impact: '+15% saves'
                },
                {
                  priority: 'low',
                  title: 'A/B Test Hero Images',
                  description: 'Current hero has 2.1% CTR. Testing lifestyle vs product shots could improve by 30%.',
                  impact: '+30% CTR'
                }
              ].map((rec, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-neutral-900/50">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    rec.priority === 'high' ? 'bg-red-500' :
                    rec.priority === 'medium' ? 'bg-amber-500' :
                    'bg-green-500'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-white">{rec.title}</h4>
                      <span className="text-xs font-medium text-amber-500">{rec.impact}</span>
                    </div>
                    <p className="text-sm text-neutral-400">{rec.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}