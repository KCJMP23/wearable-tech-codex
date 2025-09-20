import { SupabaseClient } from '@supabase/supabase-js';
import { format, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import {
  Experiment,
  ExperimentResults,
  VariantResult,
  Report,
  Insight,
  Recommendation,
  SegmentResults,
  MetricType
} from './types.js';

export class ReportingEngine {
  constructor(
    private supabase: SupabaseClient,
    private options: {
      defaultDateRange?: number; // days
      insightThresholds?: InsightThresholds;
    } = {}
  ) {}

  // Generate comprehensive experiment report
  public async generateReport(
    experimentId: string,
    type: 'summary' | 'detailed' | 'segment' | 'funnel' | 'timeseries' = 'summary'
  ): Promise<Report> {
    const experiment = await this.getExperiment(experimentId);
    const results = await this.getExperimentResults(experiment);

    let reportData: ExperimentResults;

    switch (type) {
      case 'detailed':
        reportData = await this.generateDetailedReport(experiment, results);
        break;
      case 'segment':
        reportData = await this.generateSegmentReport(experiment, results);
        break;
      case 'funnel':
        reportData = await this.generateFunnelReport(experiment, results);
        break;
      case 'timeseries':
        reportData = await this.generateTimeSeriesReport(experiment, results);
        break;
      case 'summary':
      default:
        reportData = await this.generateSummaryReport(experiment, results);
        break;
    }

    const insights = this.generateInsights(experiment, reportData);
    const recommendations = this.generateRecommendations(experiment, reportData, insights);

    const report: Report = {
      id: this.generateReportId(),
      experimentId,
      type,
      generatedAt: new Date(),
      data: reportData,
      insights,
      recommendations
    };

    // Save report to database
    await this.saveReport(report);

    return report;
  }

  private async getExperiment(experimentId: string): Promise<Experiment> {
    const { data, error } = await this.supabase
      .from('ab_experiments')
      .select('*')
      .eq('id', experimentId)
      .single();

    if (error) throw error;
    return data;
  }

  private async getExperimentResults(experiment: Experiment): Promise<VariantResult[]> {
    // Get exposures and conversions
    const { data: exposures } = await this.supabase
      .from('ab_exposures')
      .select('*')
      .eq('experiment_id', experiment.id);

    const { data: conversions } = await this.supabase
      .from('ab_conversions')
      .select('*')
      .eq('experiment_id', experiment.id);

    // Aggregate by variant
    const variantMap = new Map<string, VariantResult>();

    experiment.variants.forEach(variant => {
      variantMap.set(variant.id, {
        variantId: variant.id,
        variantName: variant.name,
        exposures: 0,
        conversions: {},
        metrics: {}
      });
    });

    exposures?.forEach(exposure => {
      const result = variantMap.get(exposure.variant_id);
      if (result) {
        result.exposures++;
      }
    });

    conversions?.forEach(conversion => {
      const result = variantMap.get(conversion.variant_id);
      if (result) {
        if (!result.conversions[conversion.metric_id]) {
          result.conversions[conversion.metric_id] = 0;
        }
        result.conversions[conversion.metric_id]++;

        if (conversion.revenue) {
          result.revenue = (result.revenue || 0) + conversion.revenue;
        }
      }
    });

    // Calculate metrics for each variant
    variantMap.forEach(result => {
      experiment.metrics.forEach(metric => {
        const conversions = result.conversions[metric.id] || 0;
        result.metrics[metric.id] = {
          value: conversions,
          conversions,
          conversionRate: result.exposures > 0 ? conversions / result.exposures : 0
        };
      });
    });

    return Array.from(variantMap.values());
  }

  private async generateSummaryReport(
    experiment: Experiment,
    results: VariantResult[]
  ): Promise<ExperimentResults> {
    const duration = this.calculateDuration(experiment);
    const totalExposures = results.reduce((sum, r) => sum + r.exposures, 0);

    // Find winner if any
    const winner = this.findWinner(results, experiment);

    // Get performance metrics
    const performance = await this.getPerformanceMetrics(experiment.id);

    return {
      experimentId: experiment.id,
      experimentName: experiment.name,
      status: experiment.status,
      startDate: experiment.startDate || new Date(),
      endDate: experiment.endDate,
      duration,
      totalExposures,
      variants: results,
      winner,
      performance
    };
  }

  private async generateDetailedReport(
    experiment: Experiment,
    results: VariantResult[]
  ): Promise<ExperimentResults> {
    const baseReport = await this.generateSummaryReport(experiment, results);

    // Add detailed metrics
    for (const result of baseReport.variants) {
      // Add confidence intervals and statistical details
      const control = results.find(r => {
        const variant = experiment.variants.find(v => v.id === r.variantId);
        return variant?.isControl;
      });

      if (control && result.variantId !== control.variantId) {
        for (const metric of experiment.metrics) {
          const metricResult = result.metrics[metric.id];
          if (metricResult) {
            // Calculate statistical details
            const se = this.calculateStandardError(
              metricResult.conversionRate,
              result.exposures
            );
            
            metricResult.standardError = se;
            metricResult.confidenceInterval = this.calculateConfidenceInterval(
              metricResult.conversionRate,
              se
            );

            // Calculate uplift
            const controlRate = control.metrics[metric.id]?.conversionRate || 0;
            if (controlRate > 0) {
              metricResult.uplift = ((metricResult.conversionRate - controlRate) / controlRate) * 100;
              metricResult.upliftConfidenceInterval = this.calculateUpliftCI(
                controlRate,
                metricResult.conversionRate,
                control.exposures,
                result.exposures
              );
            }
          }
        }
      }
    }

    // Add segment breakdown
    baseReport.segments = await this.getSegmentResults(experiment.id);

    return baseReport;
  }

  private async generateSegmentReport(
    experiment: Experiment,
    results: VariantResult[]
  ): Promise<ExperimentResults> {
    const baseReport = await this.generateSummaryReport(experiment, results);
    
    // Get detailed segment results
    const segments = await this.getDetailedSegmentResults(experiment.id);
    baseReport.segments = segments;

    return baseReport;
  }

  private async generateFunnelReport(
    experiment: Experiment,
    results: VariantResult[]
  ): Promise<ExperimentResults> {
    const baseReport = await this.generateSummaryReport(experiment, results);

    // Add funnel analysis
    const funnelData = await this.analyzeFunnel(experiment.id);
    (baseReport as any).funnel = funnelData;

    return baseReport;
  }

  private async generateTimeSeriesReport(
    experiment: Experiment,
    results: VariantResult[]
  ): Promise<ExperimentResults> {
    const baseReport = await this.generateSummaryReport(experiment, results);

    // Add time series data
    const timeSeriesData = await this.getTimeSeriesData(experiment);
    (baseReport as any).timeSeries = timeSeriesData;

    return baseReport;
  }

  private async getTimeSeriesData(experiment: Experiment): Promise<TimeSeriesData[]> {
    const startDate = experiment.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = experiment.endDate || new Date();

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const timeSeriesData: TimeSeriesData[] = [];

    for (const day of days) {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      // Get exposures for this day
      const { data: exposures } = await this.supabase
        .from('ab_exposures')
        .select('variant_id')
        .eq('experiment_id', experiment.id)
        .gte('timestamp', dayStart.toISOString())
        .lte('timestamp', dayEnd.toISOString());

      // Get conversions for this day
      const { data: conversions } = await this.supabase
        .from('ab_conversions')
        .select('variant_id, metric_id')
        .eq('experiment_id', experiment.id)
        .gte('timestamp', dayStart.toISOString())
        .lte('timestamp', dayEnd.toISOString());

      const variantData: Record<string, any> = {};

      experiment.variants.forEach(variant => {
        const variantExposures = exposures?.filter(e => e.variant_id === variant.id).length || 0;
        const variantConversions = conversions?.filter(c => c.variant_id === variant.id).length || 0;

        variantData[variant.id] = {
          exposures: variantExposures,
          conversions: variantConversions,
          conversionRate: variantExposures > 0 ? variantConversions / variantExposures : 0
        };
      });

      timeSeriesData.push({
        date: day,
        variants: variantData
      });
    }

    return timeSeriesData;
  }

  private async analyzeFunnel(experimentId: string): Promise<FunnelAnalysis> {
    // Analyze conversion funnel
    const { data: events } = await this.supabase
      .from('ab_events')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('timestamp');

    // Define funnel steps (this would be configurable)
    const funnelSteps = ['view', 'click', 'add_to_cart', 'checkout', 'purchase'];
    const funnelData: FunnelAnalysis = {
      steps: funnelSteps,
      variants: {}
    };

    // Calculate funnel metrics for each variant
    // This is simplified - actual implementation would be more complex
    return funnelData;
  }

  private async getSegmentResults(experimentId: string): Promise<SegmentResults[]> {
    const { data: segments } = await this.supabase
      .from('ab_segment_results')
      .select('*')
      .eq('experiment_id', experimentId);

    return segments || [];
  }

  private async getDetailedSegmentResults(experimentId: string): Promise<SegmentResults[]> {
    // Get all segments used in the experiment
    const { data: exposures } = await this.supabase
      .from('ab_exposures')
      .select('variant_id, context')
      .eq('experiment_id', experimentId);

    // Extract unique segments from context
    const segmentMap = new Map<string, SegmentResults>();

    exposures?.forEach(exposure => {
      const segments = exposure.context?.segments || [];
      segments.forEach((segmentId: string) => {
        if (!segmentMap.has(segmentId)) {
          segmentMap.set(segmentId, {
            segmentId,
            segmentName: segmentId, // Would fetch actual name
            exposures: 0,
            variants: []
          });
        }
        segmentMap.get(segmentId)!.exposures++;
      });
    });

    return Array.from(segmentMap.values());
  }

  private async getPerformanceMetrics(experimentId: string): Promise<any> {
    const { data } = await this.supabase
      .from('ab_performance_metrics')
      .select('*')
      .eq('experiment_id', experimentId);

    return this.aggregatePerformanceMetrics(data || []);
  }

  private aggregatePerformanceMetrics(metrics: any[]): any {
    if (metrics.length === 0) {
      return {
        avgLoadTime: 0,
        p50LoadTime: 0,
        p75LoadTime: 0,
        p95LoadTime: 0,
        p99LoadTime: 0,
        errorRate: 0
      };
    }

    // Aggregate metrics (simplified)
    const aggregated = {
      avgLoadTime: metrics.reduce((sum, m) => sum + m.metrics.avgLoadTime, 0) / metrics.length,
      p50LoadTime: metrics.reduce((sum, m) => sum + m.metrics.p50LoadTime, 0) / metrics.length,
      p75LoadTime: metrics.reduce((sum, m) => sum + m.metrics.p75LoadTime, 0) / metrics.length,
      p95LoadTime: metrics.reduce((sum, m) => sum + m.metrics.p95LoadTime, 0) / metrics.length,
      p99LoadTime: metrics.reduce((sum, m) => sum + m.metrics.p99LoadTime, 0) / metrics.length,
      errorRate: metrics.reduce((sum, m) => sum + m.metrics.errorRate, 0) / metrics.length
    };

    return aggregated;
  }

  private generateInsights(
    experiment: Experiment,
    results: ExperimentResults
  ): Insight[] {
    const insights: Insight[] = [];
    const thresholds = this.options.insightThresholds || this.getDefaultThresholds();

    // Find control variant
    const control = results.variants.find(v => {
      const variant = experiment.variants.find(ev => ev.id === v.variantId);
      return variant?.isControl;
    });

    if (!control) return insights;

    // Analyze each variant
    for (const variant of results.variants) {
      if (variant.variantId === control.variantId) continue;

      // Check for significant improvements
      for (const metric of experiment.metrics) {
        const variantMetric = variant.metrics[metric.id];
        const controlMetric = control.metrics[metric.id];

        if (!variantMetric || !controlMetric) continue;

        const uplift = ((variantMetric.conversionRate - controlMetric.conversionRate) / 
                       controlMetric.conversionRate) * 100;

        if (Math.abs(uplift) >= thresholds.significantUplift) {
          insights.push({
            type: uplift > 0 ? 'positive' : 'negative',
            title: `${uplift > 0 ? 'Improvement' : 'Degradation'} in ${metric.name}`,
            description: `Variant ${variant.variantName} shows ${Math.abs(uplift).toFixed(1)}% ${uplift > 0 ? 'increase' : 'decrease'} in ${metric.name}`,
            metric: metric.id,
            variant: variant.variantId,
            impact: uplift
          });
        }
      }

      // Check sample size
      if (variant.exposures < thresholds.minimumSampleSize) {
        insights.push({
          type: 'warning',
          title: 'Low sample size',
          description: `Variant ${variant.variantName} has only ${variant.exposures} exposures`,
          variant: variant.variantId
        });
      }
    }

    // Check for performance issues
    if (results.performance) {
      if (results.performance.avgLoadTime > thresholds.maxAcceptableLoadTime) {
        insights.push({
          type: 'warning',
          title: 'Performance concern',
          description: `Average load time (${results.performance.avgLoadTime}ms) exceeds threshold`,
          impact: results.performance.avgLoadTime
        });
      }
    }

    // Check experiment duration
    if (results.duration < thresholds.minimumDuration) {
      insights.push({
        type: 'neutral',
        title: 'Early results',
        description: `Experiment has only run for ${results.duration} hours`,
        impact: results.duration
      });
    }

    return insights;
  }

  private generateRecommendations(
    experiment: Experiment,
    results: ExperimentResults,
    insights: Insight[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check if there's a clear winner
    const positiveInsights = insights.filter(i => i.type === 'positive');
    const negativeInsights = insights.filter(i => i.type === 'negative');
    const warningInsights = insights.filter(i => i.type === 'warning');

    if (results.winner) {
      recommendations.push({
        action: 'Implement winning variant',
        reason: `Variant ${results.winner.variantName} shows statistically significant improvement`,
        priority: 'high',
        expectedImpact: `${results.winner.uplift?.toFixed(1)}% improvement in primary metric`
      });
    } else if (positiveInsights.length > 0) {
      recommendations.push({
        action: 'Continue experiment',
        reason: 'Promising results detected but not yet statistically significant',
        priority: 'medium',
        expectedImpact: 'Clearer results with more data'
      });
    } else if (negativeInsights.length > positiveInsights.length) {
      recommendations.push({
        action: 'Consider stopping experiment',
        reason: 'Variants showing negative impact on key metrics',
        priority: 'high'
      });
    }

    // Sample size recommendations
    const lowSampleVariants = results.variants.filter(v => v.exposures < 100);
    if (lowSampleVariants.length > 0) {
      recommendations.push({
        action: 'Increase traffic allocation',
        reason: 'Some variants have insufficient sample size',
        priority: 'medium',
        expectedImpact: 'Faster statistical significance'
      });
    }

    // Performance recommendations
    if (warningInsights.some(i => i.title.includes('Performance'))) {
      recommendations.push({
        action: 'Investigate performance impact',
        reason: 'Performance degradation detected',
        priority: 'high'
      });
    }

    // Duration recommendations
    if (results.duration < 168) { // Less than 1 week
      recommendations.push({
        action: 'Run for at least one week',
        reason: 'Account for weekly patterns and variations',
        priority: 'low',
        expectedImpact: 'More reliable results'
      });
    }

    return recommendations;
  }

  private findWinner(
    results: VariantResult[],
    experiment: Experiment
  ): VariantResult | undefined {
    const control = results.find(r => {
      const variant = experiment.variants.find(v => v.id === r.variantId);
      return variant?.isControl;
    });

    if (!control) return undefined;

    const primaryMetric = experiment.metrics.find(m => m.isPrimary);
    if (!primaryMetric) return undefined;

    let bestVariant: VariantResult | undefined;
    let bestUplift = 0;

    for (const variant of results) {
      if (variant.variantId === control.variantId) continue;

      const variantRate = variant.metrics[primaryMetric.id]?.conversionRate || 0;
      const controlRate = control.metrics[primaryMetric.id]?.conversionRate || 0;
      
      if (controlRate > 0) {
        const uplift = ((variantRate - controlRate) / controlRate) * 100;
        
        if (uplift > bestUplift && variant.isSignificant) {
          bestUplift = uplift;
          bestVariant = variant;
        }
      }
    }

    return bestVariant;
  }

  private calculateDuration(experiment: Experiment): number {
    if (!experiment.startDate) return 0;
    
    const end = experiment.endDate || new Date();
    const start = new Date(experiment.startDate);
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
  }

  private calculateStandardError(rate: number, n: number): number {
    return Math.sqrt((rate * (1 - rate)) / n);
  }

  private calculateConfidenceInterval(
    rate: number,
    se: number
  ): [number, number] {
    const z = 1.96; // 95% confidence
    return [
      Math.max(0, rate - z * se),
      Math.min(1, rate + z * se)
    ];
  }

  private calculateUpliftCI(
    controlRate: number,
    variantRate: number,
    controlN: number,
    variantN: number
  ): [number, number] {
    const uplift = (variantRate - controlRate) / controlRate;
    const varControl = (controlRate * (1 - controlRate)) / controlN;
    const varVariant = (variantRate * (1 - variantRate)) / variantN;
    
    const varUplift = (1 / (controlRate * controlRate)) * varVariant +
                      ((variantRate * variantRate) / Math.pow(controlRate, 4)) * varControl;
    
    const seUplift = Math.sqrt(varUplift);
    const z = 1.96; // 95% confidence
    
    return [
      (uplift - z * seUplift) * 100,
      (uplift + z * seUplift) * 100
    ];
  }

  private getDefaultThresholds(): InsightThresholds {
    return {
      significantUplift: 5, // 5% change
      minimumSampleSize: 100,
      maxAcceptableLoadTime: 3000, // 3 seconds
      minimumDuration: 168 // 1 week in hours
    };
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveReport(report: Report): Promise<void> {
    try {
      await this.supabase
        .from('ab_reports')
        .insert({
          id: report.id,
          experiment_id: report.experimentId,
          type: report.type,
          data: report.data,
          insights: report.insights,
          recommendations: report.recommendations,
          generated_at: report.generatedAt.toISOString()
        });
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  }

  // Export report in various formats
  public async exportReport(
    reportId: string,
    format: 'json' | 'csv' | 'pdf' | 'html'
  ): Promise<string | Buffer> {
    const { data: report } = await this.supabase
      .from('ab_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (!report) throw new Error('Report not found');

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'csv':
        return this.convertToCSV(report);
      case 'html':
        return this.generateHTML(report);
      case 'pdf':
        // Would use a PDF generation library
        return Buffer.from('PDF generation not implemented');
      default:
        return JSON.stringify(report);
    }
  }

  private convertToCSV(report: any): string {
    // Convert report data to CSV format
    const rows: string[] = [];
    
    // Headers
    rows.push('Variant,Exposures,Conversions,Conversion Rate,Uplift');
    
    // Data rows
    report.data.variants.forEach((variant: any) => {
      const primaryMetric = Object.values(variant.metrics)[0] as any;
      rows.push([
        variant.variantName,
        variant.exposures,
        primaryMetric?.conversions || 0,
        (primaryMetric?.conversionRate || 0).toFixed(4),
        (variant.uplift || 0).toFixed(2)
      ].join(','));
    });

    return rows.join('\n');
  }

  private generateHTML(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>A/B Test Report - ${report.experiment_id}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .positive { color: green; }
    .negative { color: red; }
    .warning { color: orange; }
  </style>
</head>
<body>
  <h1>Experiment Report: ${report.data.experimentName}</h1>
  <p>Generated: ${new Date(report.generated_at).toLocaleString()}</p>
  
  <h2>Results</h2>
  <table>
    <tr>
      <th>Variant</th>
      <th>Exposures</th>
      <th>Conversion Rate</th>
      <th>Uplift</th>
      <th>Status</th>
    </tr>
    ${report.data.variants.map((v: any) => `
    <tr>
      <td>${v.variantName}</td>
      <td>${v.exposures}</td>
      <td>${(Object.values(v.metrics)[0] as any)?.conversionRate?.toFixed(4) || 'N/A'}</td>
      <td class="${v.uplift > 0 ? 'positive' : 'negative'}">${v.uplift?.toFixed(2) || 'N/A'}%</td>
      <td>${v.isWinner ? '🏆 Winner' : ''}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2>Insights</h2>
  <ul>
    ${report.insights.map((i: any) => `
    <li class="${i.type}">
      <strong>${i.title}:</strong> ${i.description}
    </li>
    `).join('')}
  </ul>
  
  <h2>Recommendations</h2>
  <ul>
    ${report.recommendations.map((r: any) => `
    <li>
      <strong>${r.action}:</strong> ${r.reason}
      ${r.expectedImpact ? `<br>Expected Impact: ${r.expectedImpact}` : ''}
    </li>
    `).join('')}
  </ul>
</body>
</html>
    `;
  }
}

interface InsightThresholds {
  significantUplift: number;
  minimumSampleSize: number;
  maxAcceptableLoadTime: number;
  minimumDuration: number;
}

interface TimeSeriesData {
  date: Date;
  variants: Record<string, any>;
}

interface FunnelAnalysis {
  steps: string[];
  variants: Record<string, any>;
}