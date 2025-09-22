import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // For development: Create a mock response when Supabase is not available
    const mockTenant = {
      id: `tenant-${Date.now()}`,
      name: data.brandName || `${data.primaryNiche} Hub`,
      slug: data.domain || data.primaryNiche?.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      domain: `${data.domain || data.primaryNiche?.toLowerCase().replace(/[^a-z0-9]/g, '-')}.wearabletech.ai`,
      theme: {
        name: data.theme || 'modern',
        primaryColor: data.primaryColor || '#7c3aed',
        mode: data.theme === 'dark' ? 'dark' : 'light'
      },
      settings: {
        tagline: data.tagline || `Your trusted source for ${data.primaryNiche} recommendations`,
        niche: data.primaryNiche,
        targetAudience: data.targetAudience || 'General consumers',
        priceRange: data.priceRange || 'all',
        contentTypes: data.contentTypes || ['reviews', 'comparisons', 'guides'],
        publishingFrequency: data.publishingFrequency || 'weekly'
      }
    };

    // Try to use real Supabase if available, otherwise use mock
    let tenant = mockTenant;
    let useRealSupabase = false;
    
    try {
      const client = createServiceClient();
      
      // Test if Supabase is available
      const testResult = await Promise.race([
        client.from('tenants').select('count').single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
      ]).catch(() => null);
      
      if (testResult !== null) {
        useRealSupabase = true;
        
        // Create real tenant
        const { data: realTenant, error: tenantError } = await client
          .from('tenants')
          .insert({
            name: mockTenant.name,
            slug: mockTenant.slug,
            domain: mockTenant.domain,
            theme: mockTenant.theme,
            settings: mockTenant.settings
          })
          .select()
          .single();

        if (!tenantError && realTenant) {
          tenant = realTenant;
        }
      }
    } catch (supabaseError) {
      console.log('Using mock data - Supabase not available:', supabaseError);
    }

    // Queue initial tasks for agents (only if using real Supabase)
    if (useRealSupabase) {
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
            contentTypes: data.contentTypes || ['reviews', 'comparisons', 'guides'],
            frequency: data.publishingFrequency || 'weekly'
          }
        },
        status: 'queued'
      });

      if (agentTasks.length > 0) {
        try {
          const client = createServiceClient();
          const { error: tasksError } = await client
            .from('agent_tasks')
            .insert(agentTasks);
          
          if (tasksError) console.error('Failed to queue agent tasks:', tasksError);
        } catch (error) {
          console.error('Failed to queue agent tasks:', error);
        }
      }
    } else {
      console.log('Mock mode: Agent tasks not queued (no Supabase connection)');
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