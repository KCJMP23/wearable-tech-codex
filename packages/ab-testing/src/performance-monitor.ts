import { SupabaseClient } from '@supabase/supabase-js';
import {
  PerformanceMetrics,
  PerformanceImpact,
  Variant
} from './types.js';

declare global {
  interface Window {
    __abTestingExperimentId?: string;
    __abTestingVariantId?: string;
  }
}

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

type WebVitalsMetrics = Partial<{
  lcp: number;
  fid: number;
  cls: number;
  inp: number;
  ttfb: number;
  fcp: number;
}>;

type ImpactSummary = {
  loadTime: number;
  errorRate: number;
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
    inp: number;
  };
};

export class PerformanceMonitor {
  private metricsBuffer: Map<string, PerformanceEntry[]> = new Map();
  private baselineMetrics: Map<string, PerformanceMetrics> = new Map();
  private flushInterval?: NodeJS.Timeout;
  private observer?: PerformanceObserver;

  constructor(
    private supabase: SupabaseClient,
    private options: {
      flushIntervalMs?: number;
      bufferSize?: number;
      enableWebVitals?: boolean;
      thresholds?: PerformanceThresholds;
    } = {}
  ) {
    this.initialize();
  }

  private initialize() {
    if (typeof window !== 'undefined' && this.options.enableWebVitals) {
      this.setupPerformanceObserver();
      this.collectWebVitals();
    }

    this.setupFlushing();
  }

  private setupPerformanceObserver() {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      // Observe different entry types
      this.observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'layout-shift', 'largest-contentful-paint', 'first-input'] });
    } catch (error) {
      console.warn('PerformanceObserver not supported:', error);
    }
  }

  private collectWebVitals() {
    if (typeof window === 'undefined') return;

    // Collect Core Web Vitals
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeINP();
    this.observeTTFB();
    this.observeFCP();
  }

  private observeLCP() {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.recordMetric('lcp', lastEntry.startTime);
        }
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP observation not supported:', error);
    }
  }

  private observeFID() {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ('processingStart' in entry) {
            const firstInput = entry as PerformanceEventTiming;
            const fid = firstInput.processingStart - firstInput.startTime;
            this.recordMetric('fid', fid);
            observer.disconnect();
            break;
          }
        }
      });
      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('FID observation not supported:', error);
    }
  }

  private observeCLS() {
    if (typeof PerformanceObserver === 'undefined') return;

    let cls = 0;
    let sessionValue = 0;
    let sessionEntries: LayoutShiftEntry[] = [];

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as LayoutShiftEntry;
          if (!layoutShift.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            // If the entry is 1 second after the last entry or 5 seconds after the first entry
            if (sessionValue &&
                lastSessionEntry &&
                firstSessionEntry &&
                layoutShift.startTime - lastSessionEntry.startTime < 1000 &&
                layoutShift.startTime - firstSessionEntry.startTime < 5000) {
              sessionValue += layoutShift.value;
              sessionEntries.push(layoutShift);
            } else {
              sessionValue = layoutShift.value;
              sessionEntries = [layoutShift];
            }

            if (sessionValue > cls) {
              cls = sessionValue;
              this.recordMetric('cls', cls);
            }
          }
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS observation not supported:', error);
    }
  }

  private observeINP() {
    if (typeof PerformanceObserver === 'undefined') return;

    let worstINP = 0;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const timing = entry as InteractionEventTiming;
          if (typeof timing.interactionId === 'number' && timing.interactionId > 0) {
            const inp = timing.duration;
            if (inp > worstINP) {
              worstINP = inp;
              this.recordMetric('inp', inp);
            }
          }
        }
      });
      observer.observe({ entryTypes: ['event'] });
    } catch (error) {
      console.warn('INP observation not supported:', error);
    }
  }

  private observeTTFB() {
    if (typeof window === 'undefined' || !window.performance) return;

    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (navigation && navigation.responseStart) {
        const ttfb = navigation.responseStart - navigation.requestStart;
        this.recordMetric('ttfb', ttfb);
      }
    } catch (error) {
      console.warn('TTFB measurement not supported:', error);
    }
  }

  private observeFCP() {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('fcp', entry.startTime);
            observer.disconnect();
            break;
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('FCP observation not supported:', error);
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry) {
    const experimentId = this.getCurrentExperimentId();
    const variantId = this.getCurrentVariantId();
    
    if (!experimentId || !variantId) return;

    const key = `${experimentId}-${variantId}`;
    
    if (!this.metricsBuffer.has(key)) {
      this.metricsBuffer.set(key, []);
    }

    this.metricsBuffer.get(key)!.push(entry);

    // Flush if buffer is full
    const bufferSize = this.options.bufferSize || 100;
    if (this.metricsBuffer.get(key)!.length >= bufferSize) {
      this.flushMetrics();
    }
  }

  private recordMetric(name: string, value: number) {
    const experimentId = this.getCurrentExperimentId();
    const variantId = this.getCurrentVariantId();
    
    if (!experimentId || !variantId) return;

    const key = `${experimentId}-${variantId}`;
    
    // Store as custom performance entry
    const entry = {
      name,
      entryType: 'measure',
      startTime: value,
      duration: 0
    } as PerformanceEntry;

    if (!this.metricsBuffer.has(key)) {
      this.metricsBuffer.set(key, []);
    }

    this.metricsBuffer.get(key)!.push(entry);
  }

  private getCurrentExperimentId(): string | null {
    // This would be set by the experiment engine
    return typeof window !== 'undefined' ? window.__abTestingExperimentId ?? null : null;
  }

  private getCurrentVariantId(): string | null {
    // This would be set by the experiment engine
    return typeof window !== 'undefined' ? window.__abTestingVariantId ?? null : null;
  }

  private setupFlushing() {
    const interval = this.options.flushIntervalMs || 30000; // 30 seconds default
    
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, interval);

    // Also flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushMetrics();
      });
    }
  }

  private async flushMetrics() {
    for (const [key, entries] of this.metricsBuffer) {
      if (entries.length === 0) continue;

      const [experimentId, variantId] = key.split('-');
      const metrics = this.calculateMetrics(entries);

      try {
        await this.supabase
          .from('ab_performance_metrics')
          .insert({
            experiment_id: experimentId,
            variant_id: variantId,
            metrics,
            timestamp: new Date().toISOString()
          });
      } catch (error) {
        console.error('Failed to flush performance metrics:', error);
      }
    }

    this.metricsBuffer.clear();
  }

  private calculateMetrics(entries: PerformanceEntry[]): PerformanceMetrics {
    const loadTimes: number[] = [];
    const webVitals: WebVitalsMetrics = {};

    for (const entry of entries) {
      if (entry.entryType === 'navigation') {
        const nav = entry as PerformanceNavigationTiming;
        if (nav.loadEventEnd && nav.fetchStart) {
          loadTimes.push(nav.loadEventEnd - nav.fetchStart);
        }
      } else if (entry.name === 'lcp') {
        webVitals.lcp = entry.startTime;
      } else if (entry.name === 'fid') {
        webVitals.fid = entry.startTime;
      } else if (entry.name === 'cls') {
        webVitals.cls = entry.startTime;
      } else if (entry.name === 'inp') {
        webVitals.inp = entry.startTime;
      } else if (entry.name === 'ttfb') {
        webVitals.ttfb = entry.startTime;
      } else if (entry.name === 'fcp') {
        webVitals.fcp = entry.startTime;
      }
    }

    // Calculate percentiles for load times
    loadTimes.sort((a, b) => a - b);
    
    return {
      avgLoadTime: loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0,
      p50LoadTime: this.percentile(loadTimes, 0.5),
      p75LoadTime: this.percentile(loadTimes, 0.75),
      p95LoadTime: this.percentile(loadTimes, 0.95),
      p99LoadTime: this.percentile(loadTimes, 0.99),
      errorRate: 0, // Would be calculated from error tracking
      bounceRate: 0, // Would be calculated from analytics
      timeToFirstByte: webVitals.ttfb || 0,
      firstContentfulPaint: webVitals.fcp || 0,
      largestContentfulPaint: webVitals.lcp || 0,
      cumulativeLayoutShift: webVitals.cls || 0,
      firstInputDelay: webVitals.fid || 0,
      interactionToNextPaint: webVitals.inp || 0
    };
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil(values.length * p) - 1;
    return values[Math.max(0, index)];
  }

  // Set baseline metrics for comparison
  public async setBaseline(experimentId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('ab_performance_metrics')
      .select('metrics')
      .eq('experiment_id', experimentId)
      .eq('variant_id', 'control')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;

    if (data && data.length > 0) {
      const baseline = this.aggregateMetrics(data.map(d => d.metrics));
      this.baselineMetrics.set(experimentId, baseline);
    }
  }

  private aggregateMetrics(metricsList: PerformanceMetrics[]): PerformanceMetrics {
    if (metricsList.length === 0) {
      return this.getEmptyMetrics();
    }

    const aggregated: Partial<PerformanceMetrics> = {};
    const keys = Object.keys(metricsList[0]) as Array<keyof PerformanceMetrics>;

    for (const key of keys) {
      const values = metricsList
        .map(metric => metric[key])
        .filter((value): value is number => typeof value === 'number');

      aggregated[key] = values.length > 0
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;
    }

    return aggregated as PerformanceMetrics;
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      avgLoadTime: 0,
      p50LoadTime: 0,
      p75LoadTime: 0,
      p95LoadTime: 0,
      p99LoadTime: 0,
      errorRate: 0,
      bounceRate: 0,
      timeToFirstByte: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0,
      interactionToNextPaint: 0
    };
  }

  // Calculate performance impact
  public async calculateImpact(
    experimentId: string,
    variantId: string
  ): Promise<PerformanceImpact> {
    const baseline = this.baselineMetrics.get(experimentId);
    
    if (!baseline) {
      await this.setBaseline(experimentId);
    }

    const { data, error } = await this.supabase
      .from('ab_performance_metrics')
      .select('metrics')
      .eq('experiment_id', experimentId)
      .eq('variant_id', variantId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;

    const current = data && data.length > 0
      ? this.aggregateMetrics(data.map(d => d.metrics))
      : this.getEmptyMetrics();

    const baselineMetrics = this.baselineMetrics.get(experimentId) || this.getEmptyMetrics();

    const impact = {
      loadTime: this.calculatePercentageChange(
        baselineMetrics.avgLoadTime,
        current.avgLoadTime
      ),
      errorRate: this.calculatePercentageChange(
        baselineMetrics.errorRate,
        current.errorRate
      ),
      coreWebVitals: {
        lcp: this.calculatePercentageChange(
          baselineMetrics.largestContentfulPaint || 0,
          current.largestContentfulPaint || 0
        ),
        fid: this.calculatePercentageChange(
          baselineMetrics.firstInputDelay || 0,
          current.firstInputDelay || 0
        ),
        cls: this.calculatePercentageChange(
          baselineMetrics.cumulativeLayoutShift || 0,
          current.cumulativeLayoutShift || 0
        ),
        inp: this.calculatePercentageChange(
          baselineMetrics.interactionToNextPaint || 0,
          current.interactionToNextPaint || 0
        )
      }
    };

    const isAcceptable = this.checkThresholds(impact);

    return {
      variant: variantId,
      baseline: baselineMetrics,
      current,
      impact,
      isAcceptable
    };
  }

  private calculatePercentageChange(baseline: number, current: number): number {
    if (baseline === 0) return current === 0 ? 0 : 100;
    return ((current - baseline) / baseline) * 100;
  }

  private checkThresholds(impact: ImpactSummary): boolean {
    const thresholds = this.options.thresholds || this.getDefaultThresholds();

    // Check if performance degradation is within acceptable limits
    if (impact.loadTime > thresholds.maxLoadTimeIncrease) return false;
    if (impact.errorRate > thresholds.maxErrorRateIncrease) return false;
    
    if (impact.coreWebVitals) {
      if (impact.coreWebVitals.lcp > thresholds.maxLCPIncrease) return false;
      if (impact.coreWebVitals.fid > thresholds.maxFIDIncrease) return false;
      if (impact.coreWebVitals.cls > thresholds.maxCLSIncrease) return false;
      if (impact.coreWebVitals.inp > thresholds.maxINPIncrease) return false;
    }

    return true;
  }

  private getDefaultThresholds(): PerformanceThresholds {
    return {
      maxLoadTimeIncrease: 20, // 20% increase
      maxErrorRateIncrease: 50, // 50% increase
      maxLCPIncrease: 10, // 10% increase
      maxFIDIncrease: 20, // 20% increase
      maxCLSIncrease: 10, // 10% increase
      maxINPIncrease: 20, // 20% increase
    };
  }

  // Generate performance report
  public async generateReport(
    experimentId: string
  ): Promise<PerformanceReport> {
    const { data, error } = await this.supabase
      .from('ab_experiments')
      .select('variants')
      .eq('id', experimentId)
      .single();

    if (error) throw error;

    const variants: Variant[] = (data?.variants ?? []) as Variant[];
    const impacts: PerformanceImpact[] = [];

    for (const variant of variants) {
      const impact = await this.calculateImpact(experimentId, variant.id);
      impacts.push(impact);
    }

    // Find best and worst performers
    const bestPerformer = impacts.reduce((best, current) => 
      current.impact.loadTime < best.impact.loadTime ? current : best
    );

    const worstPerformer = impacts.reduce((worst, current) => 
      current.impact.loadTime > worst.impact.loadTime ? current : worst
    );

    return {
      experimentId,
      timestamp: new Date(),
      variants: impacts,
      bestPerformer: bestPerformer.variant,
      worstPerformer: worstPerformer.variant,
      recommendations: this.generateRecommendations(impacts)
    };
  }

  private generateRecommendations(impacts: PerformanceImpact[]): string[] {
    const recommendations: string[] = [];

    for (const impact of impacts) {
      if (!impact.isAcceptable) {
        recommendations.push(
          `Variant ${impact.variant} shows performance degradation beyond acceptable thresholds`
        );

        if (impact.impact.loadTime > 20) {
          recommendations.push(
            `Consider optimizing variant ${impact.variant} - load time increased by ${impact.impact.loadTime.toFixed(1)}%`
          );
        }

        if (impact.impact.coreWebVitals?.lcp && impact.impact.coreWebVitals.lcp > 10) {
          recommendations.push(
            `LCP degradation detected in variant ${impact.variant} - investigate largest content elements`
          );
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('All variants are within acceptable performance thresholds');
    }

    return recommendations;
  }

  // Real User Monitoring (RUM) integration
  public trackRealUserMetrics(
    experimentId: string,
    variantId: string,
  ) {
    if (typeof window === 'undefined') return;

    // Set experiment context for performance tracking
    window.__abTestingExperimentId = experimentId;
    window.__abTestingVariantId = variantId;

    // Track page view with performance timing
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const pageLoadTime = timing.loadEventEnd - timing.navigationStart;

      this.recordMetric('page_load', pageLoadTime);
    }

    // Track user interactions
    this.trackInteractions();
  }

  private trackInteractions() {
    if (typeof window === 'undefined') return;

    // Track click interactions
    document.addEventListener('click', () => {
      // Mark interaction for INP calculation
      performance.mark(`interaction-${Date.now()}`);
    }, { passive: true });
  }

  // Cleanup
  public destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    if (this.observer) {
      this.observer.disconnect();
    }
    this.flushMetrics();
  }
}

interface InteractionEventTiming extends PerformanceEventTiming {
  interactionId?: number;
}

interface PerformanceThresholds {
  maxLoadTimeIncrease: number;
  maxErrorRateIncrease: number;
  maxLCPIncrease: number;
  maxFIDIncrease: number;
  maxCLSIncrease: number;
  maxINPIncrease: number;
}

interface PerformanceReport {
  experimentId: string;
  timestamp: Date;
  variants: PerformanceImpact[];
  bestPerformer: string;
  worstPerformer: string;
  recommendations: string[];
}
