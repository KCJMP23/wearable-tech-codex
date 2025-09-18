import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const client = createServiceClient();

    // Create tenant
    const { data: tenant, error: tenantError } = await client
      .from('tenants')
      .insert({
        name: data.brandName,
        slug: data.domain,
        domain: `${data.domain}.wearabletech.ai`,
        theme: {
          name: data.theme,
          primaryColor: data.primaryColor,
          mode: data.theme === 'dark' ? 'dark' : 'light'
        },
        settings: {
          tagline: data.tagline,
          niche: data.primaryNiche,
          targetAudience: data.targetAudience,
          priceRange: data.priceRange,
          contentTypes: data.contentTypes,
          publishingFrequency: data.publishingFrequency
        }
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Queue initial tasks for agents
    const agentTasks = [];

    // Queue product import if requested
    if (data.productImportMethod !== 'skip') {
      agentTasks.push({
        tenant_id: tenant.id,
        agent: 'ProductAgent',
        input: {
          method: data.productImportMethod,
          count: parseInt(data.initialProductCount || '25'),
          niche: data.primaryNiche
        },
        status: 'queued'
      });
    }

    // Queue content generation
    agentTasks.push({
      tenant_id: tenant.id,
      agent: 'EditorialAgent',
      input: {
        type: 'welcome',
        generateInitialContent: true
      },
      status: 'queued'
    });

    // Queue orchestrator to set up recurring tasks
    agentTasks.push({
      tenant_id: tenant.id,
      agent: 'OrchestratorAgent',
      input: {
        action: 'initialize',
        settings: {
          contentTypes: data.contentTypes,
          frequency: data.publishingFrequency
        }
      },
      status: 'queued'
    });

    if (agentTasks.length > 0) {
      const { error: tasksError } = await client
        .from('agent_tasks')
        .insert(agentTasks);
      
      if (tasksError) console.error('Failed to queue agent tasks:', tasksError);
    }

    return NextResponse.json({ 
      success: true, 
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name
      }
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}