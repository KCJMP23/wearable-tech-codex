'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase';

export async function triggerAgent(tenantSlug: string, agent: string) {
  const client = createServiceClient();
  const { data: tenant } = await client.from('tenants').select('id').eq('slug', tenantSlug).maybeSingle();
  if (!tenant) throw new Error('Tenant not found');
  const { error } = await client.from('agent_tasks').insert({
    tenant_id: tenant.id,
    agent,
    input: {},
    status: 'queued'
  });
  if (error) throw error;
  revalidatePath(`/admin/${tenantSlug}/agents`);
}

export async function saveAgentConfig(tenantId: string, config: any) {
  const client = createServiceClient();
  
  // Save to agent_configs table (we'll create this table if it doesn't exist)
  const { error } = await client
    .from('agent_configs')
    .upsert({
      tenant_id: tenantId,
      agent_name: config.name,
      enabled: config.enabled,
      automation_level: config.automationLevel,
      schedule_type: config.schedule.type,
      schedule_value: config.schedule.value,
      priority: config.priority,
      max_retries: config.maxRetries,
      timeout: config.timeout,
      settings: config.settings,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'tenant_id,agent_name'
    });
  
  if (error) {
    console.error('Failed to save agent config:', error);
    throw error;
  }
  
  // Revalidate the page to show updated config
  const { data: tenant } = await client
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .single();
    
  if (tenant) {
    revalidatePath(`/admin/${tenant.slug}/agents`);
  }
}
