import { createServiceClient } from '@/lib/supabase';

export interface Experiment {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  type: 'visual' | 'content' | 'layout' | 'pricing' | 'feature';
  metric: string;
  traffic_allocation: number;
  minimum_sample_size: number;
  confidence_threshold: number;
  start_date?: Date;
  end_date?: Date;
  created_by?: string;
}

export interface ExperimentVariant {
  id: string;
  experiment_id: string;
  name: string;
  description?: string;
  is_control: boolean;
  traffic_percentage: number;
  config: Record<string, any>;
}

export interface ExperimentResult {
  id: string;
  experiment_id: string;
  variant_id: string;
  date: Date;
  visitors: number;
  conversions: number;
  revenue: number;
  bounce_rate?: number;
  avg_time_on_page?: number;
}

export interface ExperimentAssignment {
  id: string;
  experiment_id: string;
  variant_id: string;
  visitor_id: string;
  assigned_at: Date;
  converted: boolean;
  conversion_value?: number;
}

export interface ExperimentStats {
  variant_id: string;
  conversion_rate: number;
  confidence: number;
  is_significant: boolean;
  improvement?: number;
  total_visitors: number;
  total_conversions: number;
  total_revenue: number;
}

class ExperimentService {
  async getExperiments(tenantId: string): Promise<Experiment[]> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('experiments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createExperiment(
    tenantId: string,
    experiment: Omit<Experiment, 'id' | 'tenant_id'>,
    variants: Omit<ExperimentVariant, 'id' | 'experiment_id'>[]
  ): Promise<Experiment> {
    const supabase = createServiceClient();
    
    // Validate traffic allocation
    const totalTraffic = variants.reduce((sum, v) => sum + v.traffic_percentage, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error('Variant traffic percentages must sum to 100%');
    }

    // Create experiment
    const { data: experimentData, error: experimentError } = await supabase
      .from('experiments')
      .insert({
        ...experiment,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (experimentError) throw experimentError;

    // Create variants
    const { error: variantsError } = await supabase
      .from('experiment_variants')
      .insert(
        variants.map(variant => ({
          ...variant,
          experiment_id: experimentData.id,
        }))
      );

    if (variantsError) throw variantsError;

    return experimentData;
  }

  async updateExperiment(
    tenantId: string,
    experimentId: string,
    updates: Partial<Experiment>
  ): Promise<void> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('experiments')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', experimentId);

    if (error) throw error;
  }

  async startExperiment(tenantId: string, experimentId: string): Promise<void> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('experiments')
      .update({
        status: 'running',
        start_date: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', experimentId);

    if (error) throw error;
  }

  async pauseExperiment(tenantId: string, experimentId: string): Promise<void> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('experiments')
      .update({ status: 'paused' })
      .eq('tenant_id', tenantId)
      .eq('id', experimentId);

    if (error) throw error;
  }

  async completeExperiment(tenantId: string, experimentId: string): Promise<void> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('experiments')
      .update({
        status: 'completed',
        end_date: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', experimentId);

    if (error) throw error;
  }

  async getExperimentVariants(
    tenantId: string,
    experimentId: string
  ): Promise<ExperimentVariant[]> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('experiment_variants')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('is_control', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async assignVisitorToVariant(
    tenantId: string,
    experimentId: string,
    visitorId: string
  ): Promise<ExperimentVariant> {
    const supabase = createServiceClient();
    
    // Check if visitor already assigned
    const { data: existing } = await supabase
      .from('experiment_assignments')
      .select('variant_id')
      .eq('experiment_id', experimentId)
      .eq('visitor_id', visitorId)
      .single();

    if (existing) {
      // Return existing variant
      const { data: variant } = await supabase
        .from('experiment_variants')
        .select('*')
        .eq('id', existing.variant_id)
        .single();
      
      return variant;
    }

    // Get experiment variants
    const variants = await this.getExperimentVariants(tenantId, experimentId);
    
    // Choose variant based on traffic allocation
    const random = Math.random() * 100;
    let cumulative = 0;
    
    let selectedVariant = variants[0]; // Fallback to first variant
    
    for (const variant of variants) {
      cumulative += variant.traffic_percentage;
      if (random <= cumulative) {
        selectedVariant = variant;
        break;
      }
    }

    // Create assignment
    await supabase
      .from('experiment_assignments')
      .insert({
        experiment_id: experimentId,
        variant_id: selectedVariant.id,
        visitor_id: visitorId,
      });

    return selectedVariant;
  }

  async recordConversion(
    tenantId: string,
    experimentId: string,
    visitorId: string,
    value?: number
  ): Promise<void> {
    const supabase = createServiceClient();
    
    // Update assignment
    await supabase
      .from('experiment_assignments')
      .update({
        converted: true,
        conversion_value: value,
      })
      .eq('experiment_id', experimentId)
      .eq('visitor_id', visitorId);
  }

  async recordExperimentResults(
    tenantId: string,
    experimentId: string,
    variantId: string,
    results: Omit<ExperimentResult, 'id' | 'experiment_id' | 'variant_id'>
  ): Promise<void> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('experiment_results')
      .upsert({
        experiment_id: experimentId,
        variant_id: variantId,
        ...results,
      });

    if (error) throw error;
  }

  async getExperimentStats(
    tenantId: string,
    experimentId: string
  ): Promise<ExperimentStats[]> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .rpc('calculate_experiment_stats', { experiment_uuid: experimentId });

    if (error) throw error;
    
    // Enrich with additional data
    const variants = await this.getExperimentVariants(tenantId, experimentId);
    const results = await this.getExperimentResults(tenantId, experimentId);
    
    return data.map((stat: any) => {
      const variant = variants.find(v => v.id === stat.variant_id);
      const variantResults = results.filter(r => r.variant_id === stat.variant_id);
      
      const totalVisitors = variantResults.reduce((sum, r) => sum + r.visitors, 0);
      const totalConversions = variantResults.reduce((sum, r) => sum + r.conversions, 0);
      const totalRevenue = variantResults.reduce((sum, r) => sum + r.revenue, 0);
      
      // Calculate improvement vs control
      let improvement;
      if (!variant?.is_control) {
        const controlStats = data.find((s: any) => {
          const controlVariant = variants.find(v => v.id === s.variant_id && v.is_control);
          return controlVariant;
        });
        
        if (controlStats && controlStats.conversion_rate > 0) {
          improvement = ((stat.conversion_rate - controlStats.conversion_rate) / controlStats.conversion_rate) * 100;
        }
      }
      
      return {
        variant_id: stat.variant_id,
        conversion_rate: stat.conversion_rate,
        confidence: stat.confidence,
        is_significant: stat.is_significant,
        improvement,
        total_visitors: totalVisitors,
        total_conversions: totalConversions,
        total_revenue: totalRevenue,
      };
    });
  }

  async getExperimentResults(
    tenantId: string,
    experimentId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<ExperimentResult[]> {
    const supabase = createServiceClient();
    
    let query = supabase
      .from('experiment_results')
      .select('*')
      .eq('experiment_id', experimentId);

    if (dateRange) {
      query = query
        .gte('date', dateRange.start.toISOString())
        .lte('date', dateRange.end.toISOString());
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getExperimentAssignments(
    tenantId: string,
    experimentId: string
  ): Promise<ExperimentAssignment[]> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('experiment_assignments')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getVisitorExperiments(
    tenantId: string,
    visitorId: string
  ): Promise<{ experiment: Experiment; variant: ExperimentVariant }[]> {
    const supabase = createServiceClient();
    
    const { data: assignments, error } = await supabase
      .from('experiment_assignments')
      .select(`
        *,
        experiment:experiments(*),
        variant:experiment_variants(*)
      `)
      .eq('visitor_id', visitorId);

    if (error) throw error;
    
    return assignments?.map(assignment => ({
      experiment: assignment.experiment,
      variant: assignment.variant,
    })) || [];
  }

  async analyzeExperimentPerformance(
    tenantId: string,
    experimentId: string
  ): Promise<{
    winner?: string;
    confidence: number;
    sample_size_met: boolean;
    recommended_action: 'continue' | 'stop_winner' | 'stop_inconclusive' | 'extend';
    insights: string[];
  }> {
    const stats = await this.getExperimentStats(tenantId, experimentId);
    const experiment = await this.getExperiments(tenantId);
    const currentExperiment = experiment.find(e => e.id === experimentId);
    
    if (!currentExperiment) throw new Error('Experiment not found');
    
    const winner = stats.find(s => s.is_significant && s.improvement && s.improvement > 0);
    const maxConfidence = Math.max(...stats.map(s => s.confidence));
    const totalSampleSize = stats.reduce((sum, s) => sum + s.total_visitors, 0);
    const sampleSizeMet = totalSampleSize >= currentExperiment.minimum_sample_size;
    
    let recommendedAction: 'continue' | 'stop_winner' | 'stop_inconclusive' | 'extend' = 'continue';
    const insights: string[] = [];
    
    if (winner && winner.confidence >= currentExperiment.confidence_threshold) {
      recommendedAction = 'stop_winner';
      insights.push(`Variant "${winner.variant_id}" is showing significant improvement`);
    } else if (sampleSizeMet && maxConfidence < 90) {
      recommendedAction = 'stop_inconclusive';
      insights.push('No significant difference found with adequate sample size');
    } else if (!sampleSizeMet) {
      recommendedAction = 'continue';
      insights.push(`Need ${currentExperiment.minimum_sample_size - totalSampleSize} more visitors`);
    }
    
    // Add performance insights
    stats.forEach(stat => {
      if (stat.improvement && Math.abs(stat.improvement) > 10) {
        insights.push(`Variant "${stat.variant_id}" showing ${stat.improvement > 0 ? 'positive' : 'negative'} trend`);
      }
    });
    
    return {
      winner: winner?.variant_id,
      confidence: maxConfidence,
      sample_size_met: sampleSizeMet,
      recommended_action: recommendedAction,
      insights,
    };
  }
}

export const experimentService = new ExperimentService();