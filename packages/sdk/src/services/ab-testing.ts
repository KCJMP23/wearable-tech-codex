import { createClient } from '../supabase/server.js';
import type { Database } from '../database.types.js';

type ABTestVariant = Database['public']['Tables']['ab_test_variants']['Row'];
type ABTestConversion = Database['public']['Tables']['ab_test_conversions']['Row'];

export interface ABTest {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  targetMetric: string;
  targetPage: string;
  sampleSize: number;
  confidenceLevel: number;
  variants: ABTestVariant[];
  winner?: string;
}

export interface TestVariant {
  id: string;
  name: string;
  description: string;
  allocation: number; // Percentage of traffic
  content?: any;
  styles?: any;
  scripts?: string;
  conversions: number;
  impressions: number;
  conversionRate: number;
}

export interface TestResult {
  variantId: string;
  variantName: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  isWinner: boolean;
  uplift?: number;
}

export interface StatisticalSignificance {
  pValue: number;
  zScore: number;
  isSignificant: boolean;
  confidenceInterval: [number, number];
}

export class ABTestingService {
  private getSupabase() {
    return createClient();
  }

  // Test Management
  async createTest(
    tenantId: string,
    config: {
      name: string;
      description: string;
      targetMetric: string;
      targetPage: string;
      variants: Array<{
        name: string;
        allocation: number;
        content?: any;
        styles?: any;
      }>;
      sampleSize?: number;
      confidenceLevel?: number;
    }
  ): Promise<ABTest> {
    // Create test
    const { data: test, error: testError } = await this.getSupabase()
      .from('ab_tests')
      .insert({
        tenant_id: tenantId,
        name: config.name,
        description: config.description,
        target_metric: config.targetMetric,
        target_page: config.targetPage,
        sample_size: config.sampleSize || 1000,
        confidence_level: config.confidenceLevel || 95,
        status: 'draft'
      })
      .select()
      .single();

    if (testError) throw new Error(`Failed to create A/B test: ${testError.message}`);

    // Create variants
    const variants = await Promise.all(
      config.variants.map(async (variant) => {
        const { data, error } = await this.getSupabase()
          .from('ab_test_variants')
          .insert({
            test_id: test.id,
            name: variant.name,
            allocation: variant.allocation,
            content: variant.content,
            styles: variant.styles
          })
          .select()
          .single();

        if (error) throw new Error(`Failed to create variant: ${error.message}`);
        return data;
      })
    );

    return {
      ...test,
      variants
    } as unknown as ABTest;
  }

  async startTest(tenantId: string, testId: string): Promise<void> {
    const { error } = await this.getSupabase()
      .from('ab_tests')
      .update({
        status: 'running',
        start_date: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('id', testId);

    if (error) throw new Error(`Failed to start test: ${error.message}`);
  }

  async pauseTest(tenantId: string, testId: string): Promise<void> {
    const { error } = await this.getSupabase()
      .from('ab_tests')
      .update({ status: 'paused' })
      .eq('tenant_id', tenantId)
      .eq('id', testId);

    if (error) throw new Error(`Failed to pause test: ${error.message}`);
  }

  async endTest(tenantId: string, testId: string, winnerId?: string): Promise<void> {
    const { error } = await this.getSupabase()
      .from('ab_tests')
      .update({
        status: 'completed',
        end_date: new Date().toISOString(),
        winner_variant_id: winnerId
      })
      .eq('tenant_id', tenantId)
      .eq('id', testId);

    if (error) throw new Error(`Failed to end test: ${error.message}`);
  }

  // Traffic Allocation
  async assignUserToVariant(
    testId: string,
    userId: string,
    sessionId?: string
  ): Promise<string> {
    // Check if user already assigned
    const { data: existing } = await this.getSupabase()
      .from('ab_test_assignments')
      .select('variant_id')
      .eq('test_id', testId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return existing.variant_id;
    }

    // Get test variants with allocations
    const { data: variants } = await this.getSupabase()
      .from('ab_test_variants')
      .select('id, allocation')
      .eq('test_id', testId)
      .order('allocation', { ascending: false });

    if (!variants || variants.length === 0) {
      throw new Error('No variants found for test');
    }

    // Random assignment based on allocation percentages
    const random = Math.random() * 100;
    let cumulative = 0;
    let selectedVariantId = variants[0].id;

    for (const variant of variants) {
      cumulative += variant.allocation;
      if (random <= cumulative) {
        selectedVariantId = variant.id;
        break;
      }
    }

    // Record assignment
    await this.getSupabase()
      .from('ab_test_assignments')
      .insert({
        test_id: testId,
        variant_id: selectedVariantId,
        user_id: userId,
        session_id: sessionId
      });

    return selectedVariantId;
  }

  // Tracking
  async trackImpression(
    testId: string,
    variantId: string,
    userId: string,
    pageUrl: string,
    metadata?: any
  ): Promise<void> {
    await this.getSupabase()
      .from('ab_test_impressions')
      .insert({
        test_id: testId,
        variant_id: variantId,
        user_id: userId,
        page_url: pageUrl,
        metadata
      });

    // Update variant stats
    await this.getSupabase().rpc('increment_variant_impressions', {
      p_variant_id: variantId
    });
  }

  async trackConversion(
    testId: string,
    variantId: string,
    userId: string,
    conversionType: string,
    value?: number,
    metadata?: any
  ): Promise<void> {
    await this.getSupabase()
      .from('ab_test_conversions')
      .insert({
        test_id: testId,
        variant_id: variantId,
        user_id: userId,
        conversion_type: conversionType,
        conversion_value: value,
        metadata
      });

    // Update variant stats
    await this.getSupabase().rpc('increment_variant_conversions', {
      p_variant_id: variantId,
      p_value: value || 1
    });
  }

  // Analytics & Results
  async getTestResults(tenantId: string, testId: string): Promise<TestResult[]> {
    // Get test details
    const { data: test } = await this.getSupabase()
      .from('ab_tests')
      .select('*, variants:ab_test_variants(*)')
      .eq('tenant_id', tenantId)
      .eq('id', testId)
      .single();

    if (!test) throw new Error('Test not found');

    // Get conversion data for each variant
    const results: TestResult[] = [];
    
    for (const variant of test.variants) {
      const { data: stats } = await this.getSupabase()
        .from('ab_test_variant_stats')
        .select('*')
        .eq('variant_id', variant.id)
        .single();

      const impressions = stats?.impressions || 0;
      const conversions = stats?.conversions || 0;
      const conversionRate = impressions > 0 ? (conversions / impressions) * 100 : 0;

      results.push({
        variantId: variant.id,
        variantName: variant.name,
        impressions,
        conversions,
        conversionRate,
        confidence: 0,
        isWinner: false
      });
    }

    // Calculate statistical significance if we have a control and treatment
    if (results.length >= 2) {
      const control = results[0];
      const treatments = results.slice(1);

      for (const treatment of treatments) {
        const significance = this.calculateStatisticalSignificance(
          control.impressions,
          control.conversions,
          treatment.impressions,
          treatment.conversions,
          test.confidence_level
        );

        treatment.confidence = (1 - significance.pValue) * 100;
        treatment.uplift = ((treatment.conversionRate - control.conversionRate) / control.conversionRate) * 100;
        treatment.isWinner = significance.isSignificant && treatment.conversionRate > control.conversionRate;
      }
    }

    return results;
  }

  private calculateStatisticalSignificance(
    controlImpressions: number,
    controlConversions: number,
    treatmentImpressions: number,
    treatmentConversions: number,
    confidenceLevel: number
  ): StatisticalSignificance {
    // Calculate conversion rates
    const p1 = controlConversions / controlImpressions;
    const p2 = treatmentConversions / treatmentImpressions;
    
    // Pooled probability
    const pooledP = (controlConversions + treatmentConversions) / 
                    (controlImpressions + treatmentImpressions);
    
    // Standard error
    const se = Math.sqrt(
      pooledP * (1 - pooledP) * 
      (1 / controlImpressions + 1 / treatmentImpressions)
    );
    
    // Z-score
    const zScore = (p2 - p1) / se;
    
    // P-value (two-tailed test)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    
    // Confidence interval
    const zCritical = this.getZCritical(confidenceLevel);
    const margin = zCritical * se;
    const diff = p2 - p1;
    
    return {
      pValue,
      zScore,
      isSignificant: pValue < (1 - confidenceLevel / 100),
      confidenceInterval: [diff - margin, diff + margin]
    };
  }

  private normalCDF(x: number): number {
    // Approximation of cumulative distribution function for standard normal
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  private getZCritical(confidenceLevel: number): number {
    // Z-critical values for common confidence levels
    const zTable: { [key: number]: number } = {
      90: 1.645,
      95: 1.96,
      99: 2.576
    };
    return zTable[confidenceLevel] || 1.96;
  }

  // Test Recommendations
  async getSampleSizeRecommendation(
    baselineConversionRate: number,
    minimumDetectableEffect: number,
    confidenceLevel = 95,
    power = 80
  ): Promise<number> {
    const alpha = 1 - confidenceLevel / 100;
    const beta = 1 - power / 100;
    
    const zAlpha = this.getZCritical(confidenceLevel);
    const zBeta = this.getZCritical(power);
    
    const p1 = baselineConversionRate / 100;
    const p2 = p1 + (minimumDetectableEffect / 100);
    const pooledP = (p1 + p2) / 2;
    
    const sampleSize = Math.ceil(
      2 * pooledP * (1 - pooledP) * 
      Math.pow(zAlpha + zBeta, 2) / 
      Math.pow(p2 - p1, 2)
    );
    
    return sampleSize;
  }

  async getTestDurationEstimate(
    sampleSize: number,
    dailyTraffic: number
  ): Promise<number> {
    return Math.ceil(sampleSize / dailyTraffic);
  }

  // Dashboard Data
  async getActiveTests(tenantId: string): Promise<ABTest[]> {
    const { data, error } = await this.getSupabase()
      .from('ab_tests')
      .select(`
        *,
        variants:ab_test_variants(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'running')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get active tests: ${error.message}`);
    return data as unknown as ABTest[];
  }

  async getTestHistory(tenantId: string, limit = 10): Promise<ABTest[]> {
    const { data, error } = await this.getSupabase()
      .from('ab_tests')
      .select(`
        *,
        variants:ab_test_variants(*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get test history: ${error.message}`);
    return data as unknown as ABTest[];
  }
}

export const abTestingService = new ABTestingService();
