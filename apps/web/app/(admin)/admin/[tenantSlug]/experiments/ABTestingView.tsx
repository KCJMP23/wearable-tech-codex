'use client';

import { useState } from 'react';
import { 
  TestTube, Plus, Play, Pause, CheckCircle, TrendingUp, 
  Users, DollarSign, Target, BarChart3, AlertTriangle,
  Clock, Zap, Award, ChevronRight, Edit, Trash2,
  ArrowUp, ArrowDown, Minus, RefreshCw, Copy
} from 'lucide-react';

export interface Variant {
  id: string;
  name: string;
  description: string;
  traffic: number;
  visitors: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  avgOrderValue?: number;
  confidence: number;
  isControl?: boolean;
  winner?: boolean;
  improvement?: number;
  config: Record<string, any>;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  type: 'visual' | 'content' | 'layout' | 'pricing';
  metric: string;
  startDate: Date | null;
  endDate: Date | null;
  traffic: number;
  variants: Variant[];
  significance: number;
  minimumSampleSize: number;
  currentSampleSize: number;
  estimatedDaysRemaining: number | null;
}

interface ABTestingViewProps {
  tenantSlug: string;
  tenantId: string;
  experiments: Experiment[];
}

export function ABTestingView({ tenantSlug, tenantId, experiments: initialExperiments }: ABTestingViewProps) {
  const [experiments, setExperiments] = useState(initialExperiments);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewExperimentModal, setShowNewExperimentModal] = useState(false);

  const runningCount = experiments.filter(e => e.status === 'running').length;
  const completedCount = experiments.filter(e => e.status === 'completed').length;
  const totalVisitors = experiments.reduce((sum, e) => 
    sum + e.variants.reduce((vSum, v) => vSum + v.visitors, 0), 0
  );
  const totalRevenue = experiments.reduce((sum, e) => 
    sum + e.variants.reduce((vSum, v) => vSum + v.revenue, 0), 0
  );

  const filteredExperiments = statusFilter === 'all' 
    ? experiments 
    : experiments.filter(e => e.status === statusFilter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-amber-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-neutral-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'border-green-500/20 bg-green-500/5';
      case 'paused':
        return 'border-amber-500/20 bg-amber-500/5';
      case 'completed':
        return 'border-blue-500/20 bg-blue-500/5';
      default:
        return 'border-neutral-800 bg-neutral-950';
    }
  };

  const getImprovementIcon = (improvement?: number) => {
    if (!improvement) return <Minus className="h-4 w-4 text-neutral-500" />;
    if (improvement > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    return <ArrowDown className="h-4 w-4 text-red-500" />;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-green-500';
    if (confidence >= 90) return 'text-amber-500';
    return 'text-neutral-500';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">A/B Testing</h2>
          <p className="text-sm text-neutral-400">
            Optimize conversions with data-driven experiments
          </p>
        </div>
        <button
          onClick={() => setShowNewExperimentModal(true)}
          className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-medium text-neutral-900 hover:bg-amber-400"
        >
          <Plus className="inline-block mr-2 h-4 w-4" />
          New Experiment
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TestTube className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-neutral-400">Active</span>
          </div>
          <div className="text-2xl font-semibold text-white">{runningCount}</div>
        </div>
        
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-xs text-neutral-400">Completed</span>
          </div>
          <div className="text-2xl font-semibold text-white">{completedCount}</div>
        </div>
        
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-neutral-400">Visitors</span>
          </div>
          <div className="text-2xl font-semibold text-white">{totalVisitors.toLocaleString()}</div>
        </div>
        
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-neutral-400">Avg Lift</span>
          </div>
          <div className="text-2xl font-semibold text-white">+14.3%</div>
        </div>
        
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-xs text-neutral-400">Revenue Impact</span>
          </div>
          <div className="text-2xl font-semibold text-white">${(totalRevenue * 0.143).toFixed(0)}</div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {['all', 'running', 'paused', 'completed', 'draft'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
              statusFilter === status
                ? 'bg-amber-500 text-neutral-900'
                : 'border border-neutral-800 text-neutral-400 hover:border-amber-500 hover:text-amber-500'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Experiments List */}
      <div className="space-y-4">
        {filteredExperiments.map((experiment) => (
          <div
            key={experiment.id}
            className={`rounded-3xl border p-6 transition-all hover:border-amber-500/50 cursor-pointer ${
              getStatusColor(experiment.status)
            }`}
            onClick={() => setSelectedExperiment(experiment)}
          >
            <div className="flex items-start justify-between">
              {/* Left Side */}
              <div className="flex-1 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(experiment.status)}
                    <span className="text-xs text-neutral-500 capitalize">{experiment.status}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{experiment.name}</h3>
                    <p className="text-sm text-neutral-400 mt-1">{experiment.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </div>

                {/* Variants */}
                <div className="grid gap-3">
                  {experiment.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className={`rounded-xl border p-4 ${
                        variant.winner 
                          ? 'border-green-500/30 bg-green-500/5' 
                          : 'border-neutral-800 bg-neutral-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-white">
                            {variant.name}
                          </span>
                          {variant.isControl && (
                            <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                              Control
                            </span>
                          )}
                          {variant.winner && (
                            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-500">
                              <Award className="inline-block mr-1 h-3 w-3" />
                              Winner
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          {variant.improvement !== undefined && (
                            <div className="flex items-center gap-1">
                              {getImprovementIcon(variant.improvement)}
                              <span className={`text-sm font-medium ${
                                variant.improvement > 0 ? 'text-green-500' : 
                                variant.improvement < 0 ? 'text-red-500' : 'text-neutral-500'
                              }`}>
                                {variant.improvement > 0 && '+'}{variant.improvement}%
                              </span>
                            </div>
                          )}
                          <span className={`text-sm font-medium ${getConfidenceColor(variant.confidence)}`}>
                            {variant.confidence}% confidence
                          </span>
                        </div>
                      </div>
                      
                      {/* Metrics */}
                      <div className="grid grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-neutral-500">Visitors</span>
                          <div className="font-medium text-white">{variant.visitors.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-neutral-500">Conversions</span>
                          <div className="font-medium text-white">{variant.conversions.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-neutral-500">Conv. Rate</span>
                          <div className="font-medium text-white">{variant.conversionRate}%</div>
                        </div>
                        <div>
                          <span className="text-neutral-500">Revenue</span>
                          <div className="font-medium text-white">${variant.revenue.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 h-1 rounded-full bg-neutral-800 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            variant.winner ? 'bg-green-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${variant.traffic}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Stats */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 text-neutral-500">
                    <span>Started {experiment.startDate ? new Date(experiment.startDate).toLocaleDateString() : 'Not started'}</span>
                    <span>•</span>
                    <span>{experiment.currentSampleSize.toLocaleString()} / {experiment.minimumSampleSize.toLocaleString()} samples</span>
                    {experiment.estimatedDaysRemaining !== null && (
                      <>
                        <span>•</span>
                        <span>{experiment.estimatedDaysRemaining} days remaining</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {experiment.status === 'running' ? (
                      <button className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500 hover:bg-amber-500/20">
                        <Pause className="inline-block mr-1 h-3 w-3" />
                        Pause
                      </button>
                    ) : experiment.status === 'paused' ? (
                      <button className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-500 hover:bg-green-500/20">
                        <Play className="inline-block mr-1 h-3 w-3" />
                        Resume
                      </button>
                    ) : experiment.status === 'draft' ? (
                      <button className="rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-neutral-900 hover:bg-amber-400">
                        <Play className="inline-block mr-1 h-3 w-3" />
                        Start
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Best Practices */}
      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
        <h3 className="text-lg font-semibold text-amber-500 mb-4">🚀 A/B Testing Best Practices</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl bg-neutral-950 p-4">
            <Target className="h-5 w-5 text-blue-500 mb-2" />
            <div className="font-medium text-white mb-1">Single Variable</div>
            <p className="text-xs text-neutral-400">
              Test one element at a time for clear results
            </p>
          </div>
          <div className="rounded-xl bg-neutral-950 p-4">
            <BarChart3 className="h-5 w-5 text-green-500 mb-2" />
            <div className="font-medium text-white mb-1">Statistical Significance</div>
            <p className="text-xs text-neutral-400">
              Wait for 95%+ confidence before decisions
            </p>
          </div>
          <div className="rounded-xl bg-neutral-950 p-4">
            <Users className="h-5 w-5 text-purple-500 mb-2" />
            <div className="font-medium text-white mb-1">Sample Size</div>
            <p className="text-xs text-neutral-400">
              Ensure adequate traffic for reliable data
            </p>
          </div>
          <div className="rounded-xl bg-neutral-950 p-4">
            <RefreshCw className="h-5 w-5 text-amber-500 mb-2" />
            <div className="font-medium text-white mb-1">Iterate</div>
            <p className="text-xs text-neutral-400">
              Build on winners with follow-up tests
            </p>
          </div>
        </div>
      </div>

      {/* Experiment Detail Modal */}
      {selectedExperiment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSelectedExperiment(null)}>
          <div className="relative w-full max-w-5xl rounded-3xl border border-neutral-800 bg-neutral-950 p-8" onClick={(e) => e.stopPropagation()}>
            {/* Modal content would go here - keeping it simple for now */}
            <h2 className="text-2xl font-semibold text-white mb-4">{selectedExperiment.name}</h2>
            <p className="text-neutral-400 mb-6">{selectedExperiment.description}</p>
            
            <button
              onClick={() => setSelectedExperiment(null)}
              className="absolute right-6 top-6 rounded-full p-2 hover:bg-neutral-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
