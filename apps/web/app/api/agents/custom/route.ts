import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

const createCustomAgentSchema = z.object({
  tenant_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.enum(['content', 'marketing', 'analytics', 'optimization', 'social', 'custom']),
  agent_type: z.enum(['scheduled', 'triggered', 'realtime']),
  configuration: z.object({
    schedule: z.object({
      type: z.enum(['cron', 'interval', 'manual']),
      value: z.string(),
    }),
    triggers: z.array(z.object({
      event: z.string(),
      condition: z.string(),
    })).optional(),
    goals: z.array(z.object({
      metric: z.string(),
      target: z.number(),
      threshold: z.number().optional(),
    })),
    automation_level: z.enum(['full', 'supervised', 'manual']),
    retry_settings: z.object({
      max_retries: z.number().min(0).max(10),
      retry_delay: z.number().min(1).max(3600),
    }),
    timeout: z.number().min(10).max(3600),
    priority: z.number().min(1).max(10),
  }),
  workflow: z.object({
    steps: z.array(z.object({
      id: z.string(),
      type: z.enum(['data_fetch', 'ai_generation', 'api_call', 'database_update', 'notification']),
      name: z.string(),
      configuration: z.record(z.any()),
      dependencies: z.array(z.string()).optional(),
      retry_on_failure: z.boolean().optional(),
    })),
    error_handling: z.object({
      strategy: z.enum(['continue', 'stop', 'retry', 'rollback']),
      max_failures: z.number().min(1).max(5),
    }),
  }),
  code: z.object({
    language: z.enum(['javascript', 'python', 'typescript']),
    source_code: z.string(),
    dependencies: z.array(z.string()).optional(),
    environment_variables: z.record(z.string()).optional(),
  }).optional(),
  enabled: z.boolean().default(true),
});

const updateCustomAgentSchema = createCustomAgentSchema.partial().omit(['tenant_id']);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: customAgents, error } = await supabase
      .from('custom_agents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching custom agents:', error);
      return NextResponse.json({ error: 'Failed to fetch custom agents' }, { status: 500 });
    }

    // Get execution statistics for each agent
    const agentStats = await Promise.all(
      (customAgents || []).map(async (agent) => {
        const { data: executions } = await supabase
          .from('agent_tasks')
          .select('status, created_at, completed_at')
          .eq('agent', agent.name)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50);

        const totalRuns = executions?.length || 0;
        const successfulRuns = executions?.filter(e => e.status === 'completed').length || 0;
        const failedRuns = executions?.filter(e => e.status === 'failed').length || 0;
        const lastRun = executions?.[0];

        return {
          ...agent,
          stats: {
            total_runs: totalRuns,
            successful_runs: successfulRuns,
            failed_runs: failedRuns,
            success_rate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0,
            last_run: lastRun,
          },
        };
      })
    );

    return NextResponse.json({
      agents: agentStats,
      total: agentStats.length,
    });

  } catch (error) {
    console.error('Custom agents API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createCustomAgentSchema.parse(body);

    const supabase = createServiceClient();

    // Check if agent name is unique for tenant
    const { data: existingAgent } = await supabase
      .from('custom_agents')
      .select('id')
      .eq('tenant_id', validatedData.tenant_id)
      .eq('name', validatedData.name)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { error: 'Agent name already exists for this tenant' },
        { status: 409 }
      );
    }

    // Create the custom agent
    const { data: newAgent, error } = await supabase
      .from('custom_agents')
      .insert({
        tenant_id: validatedData.tenant_id,
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        agent_type: validatedData.agent_type,
        configuration: validatedData.configuration,
        workflow: validatedData.workflow,
        code: validatedData.code,
        enabled: validatedData.enabled,
        version: '1.0.0',
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating custom agent:', error);
      return NextResponse.json({ error: 'Failed to create custom agent' }, { status: 500 });
    }

    // If the agent is scheduled, create the initial scheduled task
    if (validatedData.configuration.schedule.type !== 'manual') {
      await supabase
        .from('agent_schedules')
        .insert({
          tenant_id: validatedData.tenant_id,
          agent_name: validatedData.name,
          schedule_type: validatedData.configuration.schedule.type,
          schedule_value: validatedData.configuration.schedule.value,
          enabled: validatedData.enabled,
          next_run: new Date().toISOString(), // Calculate next run based on schedule
        });
    }

    return NextResponse.json({
      success: true,
      agent: newAgent,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors,
      }, { status: 400 });
    }

    console.error('Custom agent creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('id');

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateCustomAgentSchema.parse(body);

    const supabase = createServiceClient();

    const updateData: any = { ...validatedData };

    // Increment version if code or workflow changed
    if (validatedData.code || validatedData.workflow) {
      const { data: currentAgent } = await supabase
        .from('custom_agents')
        .select('version')
        .eq('id', agentId)
        .single();

      if (currentAgent) {
        const currentVersion = currentAgent.version || '1.0.0';
        const versionParts = currentVersion.split('.').map(Number);
        versionParts[2] += 1; // Increment patch version
        updateData.version = versionParts.join('.');
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedAgent, error } = await supabase
      .from('custom_agents')
      .update(updateData)
      .eq('id', agentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating custom agent:', error);
      return NextResponse.json({ error: 'Failed to update custom agent' }, { status: 500 });
    }

    // Update schedule if configuration changed
    if (validatedData.configuration?.schedule) {
      await supabase
        .from('agent_schedules')
        .upsert({
          tenant_id: updatedAgent.tenant_id,
          agent_name: updatedAgent.name,
          schedule_type: validatedData.configuration.schedule.type,
          schedule_value: validatedData.configuration.schedule.value,
          enabled: validatedData.enabled ?? updatedAgent.enabled,
        });
    }

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors,
      }, { status: 400 });
    }

    console.error('Custom agent update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('id');

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Soft delete by updating status
    const { data: deletedAgent, error } = await supabase
      .from('custom_agents')
      .update({
        status: 'deleted',
        enabled: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', agentId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting custom agent:', error);
      return NextResponse.json({ error: 'Failed to delete custom agent' }, { status: 500 });
    }

    // Disable any schedules
    await supabase
      .from('agent_schedules')
      .update({ enabled: false })
      .eq('agent_name', deletedAgent.name);

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully',
    });

  } catch (error) {
    console.error('Custom agent deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}