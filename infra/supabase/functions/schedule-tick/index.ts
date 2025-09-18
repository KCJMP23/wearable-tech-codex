import { 
  validateRequest, 
  getTenant, 
  successResponse,
  errorResponse,
  logOperation,
  getSupabaseClient,
  createAgentTask,
  ScheduleTickPayload,
  ScheduledEvent 
} from '../_shared/mod.ts';

Deno.serve(async (request) => {
  try {
    const validation = await validateRequest(
      request, 
      ['POST'], 
      false // No HMAC validation for internal scheduling
    );
    
    if (validation instanceof Response) return validation;
    
    const { payload, env } = validation;
    const schedulePayload = payload as ScheduleTickPayload;

    const supabase = getSupabaseClient(env);
    
    // Process scheduled events
    const processedEvents = await processScheduledEvents(supabase, schedulePayload);
    
    // Process pending agent tasks
    const processedTasks = await processPendingTasks(supabase);
    
    logOperation('Schedule Tick Completed', {
      eventsProcessed: processedEvents.length,
      tasksProcessed: processedTasks.length,
      timestamp: new Date().toISOString()
    });

    return successResponse(
      {
        eventsProcessed: processedEvents.length,
        tasksProcessed: processedTasks.length,
        events: processedEvents,
        tasks: processedTasks
      },
      'Schedule tick completed successfully'
    );

  } catch (error) {
    console.error('Unexpected error in schedule-tick:', error);
    return errorResponse(`Internal server error: ${error.message}`);
  }
});

async function processScheduledEvents(supabase: any, payload: ScheduleTickPayload) {
  const now = new Date().toISOString();
  const processedEvents = [];

  try {
    // Query for pending scheduled events that are due
    let query = supabase
      .from('scheduled_events')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(50); // Process up to 50 events at a time

    // Filter by tenant if specified
    if (payload.tenantSlug) {
      const tenant = await getTenant(supabase, payload.tenantSlug);
      query = query.eq('tenant_id', tenant.id);
    }

    // Filter by event type if specified
    if (payload.eventType) {
      query = query.eq('event_type', payload.eventType);
    }

    const { data: events, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch scheduled events: ${error.message}`);
    }

    if (!events || events.length === 0) {
      return processedEvents;
    }

    // Process each event
    for (const event of events) {
      try {
        const result = await processScheduledEvent(supabase, event);
        processedEvents.push(result);
      } catch (error) {
        console.error(`Failed to process event ${event.id}:`, error);
        
        // Mark event as failed
        await supabase
          .from('scheduled_events')
          .update({
            status: 'failed',
            error_message: error.message,
            processed_at: new Date().toISOString()
          })
          .eq('id', event.id);

        processedEvents.push({
          eventId: event.id,
          eventType: event.event_type,
          status: 'failed',
          error: error.message
        });
      }
    }

  } catch (error) {
    console.error('Error processing scheduled events:', error);
  }

  return processedEvents;
}

async function processScheduledEvent(supabase: any, event: ScheduledEvent) {
  const startTime = new Date().toISOString();

  // Mark event as processing
  await supabase
    .from('scheduled_events')
    .update({ status: 'processing' })
    .eq('id', event.id);

  let result;
  
  try {
    // Process based on event type
    switch (event.event_type) {
      case 'content_refresh':
        result = await processContentRefresh(supabase, event);
        break;
      case 'product_sync':
        result = await processProductSync(supabase, event);
        break;
      case 'newsletter_send':
        result = await processNewsletterSend(supabase, event);
        break;
      case 'seo_audit':
        result = await processSeoAudit(supabase, event);
        break;
      case 'link_verification':
        result = await processLinkVerification(supabase, event);
        break;
      case 'analytics_report':
        result = await processAnalyticsReport(supabase, event);
        break;
      case 'backup_data':
        result = await processDataBackup(supabase, event);
        break;
      default:
        // For unknown event types, create a generic agent task
        result = await createAgentTask(
          supabase,
          event.tenant_id,
          'orchestrator',
          {
            eventType: event.event_type,
            originalParameters: event.parameters
          },
          'medium'
        );
    }

    // Mark event as completed
    await supabase
      .from('scheduled_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        result: result
      })
      .eq('id', event.id);

    return {
      eventId: event.id,
      eventType: event.event_type,
      status: 'completed',
      result: result
    };

  } catch (error) {
    // Mark event as failed
    await supabase
      .from('scheduled_events')
      .update({
        status: 'failed',
        error_message: error.message,
        processed_at: new Date().toISOString()
      })
      .eq('id', event.id);

    throw error;
  }
}

async function processPendingTasks(supabase: any) {
  const processedTasks = [];

  try {
    // Get pending agent tasks that are ready to run
    const { data: tasks, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('status', 'pending')
      .or('scheduled_for.is.null,scheduled_for.lte.' + new Date().toISOString())
      .order('priority', { ascending: false }) // High priority first
      .order('created_at', { ascending: true }) // Oldest first
      .limit(10); // Process up to 10 tasks at a time

    if (error) {
      throw new Error(`Failed to fetch pending tasks: ${error.message}`);
    }

    if (!tasks || tasks.length === 0) {
      return processedTasks;
    }

    // Process each task by calling the run-agent function
    for (const task of tasks) {
      try {
        // Mark task as running
        await supabase
          .from('agent_tasks')
          .update({
            status: 'running',
            started_at: new Date().toISOString()
          })
          .eq('id', task.id);

        // Call run-agent function with direct execution
        const runAgentResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/run-agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'x-execution-mode': 'direct'
          },
          body: JSON.stringify({
            agentType: task.agent_type,
            parameters: task.parameters
          })
        });

        const agentResult = await runAgentResponse.json();

        if (runAgentResponse.ok && agentResult.success) {
          // Mark task as completed
          await supabase
            .from('agent_tasks')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              result: agentResult.data
            })
            .eq('id', task.id);

          processedTasks.push({
            taskId: task.id,
            agentType: task.agent_type,
            status: 'completed'
          });
        } else {
          throw new Error(agentResult.error || 'Agent execution failed');
        }

      } catch (error) {
        console.error(`Failed to process task ${task.id}:`, error);
        
        // Mark task as failed
        await supabase
          .from('agent_tasks')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', task.id);

        processedTasks.push({
          taskId: task.id,
          agentType: task.agent_type,
          status: 'failed',
          error: error.message
        });
      }
    }

  } catch (error) {
    console.error('Error processing pending tasks:', error);
  }

  return processedTasks;
}

// Individual event processors
async function processContentRefresh(supabase: any, event: ScheduledEvent) {
  return await createAgentTask(supabase, event.tenant_id, 'editorial', event.parameters);
}

async function processProductSync(supabase: any, event: ScheduledEvent) {
  return await createAgentTask(supabase, event.tenant_id, 'product', event.parameters);
}

async function processNewsletterSend(supabase: any, event: ScheduledEvent) {
  return await createAgentTask(supabase, event.tenant_id, 'newsletter', event.parameters);
}

async function processSeoAudit(supabase: any, event: ScheduledEvent) {
  return await createAgentTask(supabase, event.tenant_id, 'editorial', { 
    ...event.parameters, 
    task: 'seo_audit' 
  });
}

async function processLinkVerification(supabase: any, event: ScheduledEvent) {
  // Call link-verify function
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/link-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
    },
    body: JSON.stringify(event.parameters)
  });

  return await response.json();
}

async function processAnalyticsReport(supabase: any, event: ScheduledEvent) {
  return await createAgentTask(supabase, event.tenant_id, 'trends', {
    ...event.parameters,
    task: 'analytics_report'
  });
}

async function processDataBackup(supabase: any, event: ScheduledEvent) {
  return await createAgentTask(supabase, event.tenant_id, 'orchestrator', {
    ...event.parameters,
    task: 'data_backup'
  });
}