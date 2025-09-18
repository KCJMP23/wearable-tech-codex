import { 
  validateRequest, 
  getTenant, 
  successResponse,
  errorResponse,
  logOperation,
  getSupabaseClient,
  createAgentTask,
  updateAgentTask,
  RunAgentPayload,
  AgentTask 
} from '../_shared/mod.ts';

const VALID_AGENT_TYPES = [
  'product', 
  'editorial', 
  'newsletter', 
  'personalization', 
  'seasonal', 
  'social', 
  'trends', 
  'chatbot', 
  'orchestrator'
] as const;

type ValidAgentType = typeof VALID_AGENT_TYPES[number];

Deno.serve(async (request) => {
  try {
    const validation = await validateRequest(
      request, 
      ['POST'], 
      false // No HMAC validation for internal agent execution
    );
    
    if (validation instanceof Response) return validation;
    
    const { payload, env } = validation;
    const agentPayload = payload as RunAgentPayload;

    // Validate required fields
    if (!agentPayload.agentType) {
      return errorResponse('Missing required field: agentType', 400);
    }

    // Validate agent type
    if (!VALID_AGENT_TYPES.includes(agentPayload.agentType as ValidAgentType)) {
      return errorResponse(`Invalid agent type. Must be one of: ${VALID_AGENT_TYPES.join(', ')}`, 400);
    }

    const supabase = getSupabaseClient(env);
    let tenant = null;

    // Get tenant if specified
    if (agentPayload.tenantSlug) {
      tenant = await getTenant(supabase, agentPayload.tenantSlug);
    }

    // Check if this is a direct execution or task creation
    const isDirectExecution = request.headers.get('x-execution-mode') === 'direct';

    if (isDirectExecution) {
      // Execute agent directly
      const result = await executeAgent(
        supabase, 
        agentPayload.agentType,
        tenant?.id,
        agentPayload.parameters || {},
        env
      );

      logOperation('Agent Executed Directly', {
        agentType: agentPayload.agentType,
        tenantSlug: agentPayload.tenantSlug,
        success: result.success
      });

      return successResponse(result, `Agent ${agentPayload.agentType} executed successfully`);
    } else {
      // Create agent task for background processing
      const task = await createAgentTask(
        supabase,
        tenant?.id || 'system',
        agentPayload.agentType,
        agentPayload.parameters || {},
        agentPayload.priority || 'medium'
      );

      logOperation('Agent Task Created', {
        taskId: task.id,
        agentType: agentPayload.agentType,
        tenantSlug: agentPayload.tenantSlug,
        priority: agentPayload.priority
      });

      return successResponse(
        { taskId: task.id },
        `Agent task created for ${agentPayload.agentType}`
      );
    }

  } catch (error) {
    console.error('Unexpected error in run-agent:', error);
    return errorResponse(`Internal server error: ${error.message}`);
  }
});

async function executeAgent(
  supabase: any,
  agentType: string,
  tenantId: string | null,
  parameters: Record<string, any>,
  env: any
): Promise<{ success: boolean; result?: any; error?: string }> {
  
  const startTime = new Date().toISOString();
  
  try {
    let result;

    switch (agentType) {
      case 'product':
        result = await executeProductAgent(supabase, tenantId, parameters, env);
        break;
      case 'editorial':
        result = await executeEditorialAgent(supabase, tenantId, parameters, env);
        break;
      case 'newsletter':
        result = await executeNewsletterAgent(supabase, tenantId, parameters, env);
        break;
      case 'personalization':
        result = await executePersonalizationAgent(supabase, tenantId, parameters, env);
        break;
      case 'seasonal':
        result = await executeSeasonalAgent(supabase, tenantId, parameters, env);
        break;
      case 'social':
        result = await executeSocialAgent(supabase, tenantId, parameters, env);
        break;
      case 'trends':
        result = await executeTrendsAgent(supabase, tenantId, parameters, env);
        break;
      case 'chatbot':
        result = await executeChatbotAgent(supabase, tenantId, parameters, env);
        break;
      case 'orchestrator':
        result = await executeOrchestratorAgent(supabase, tenantId, parameters, env);
        break;
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }

    return { success: true, result };

  } catch (error) {
    console.error(`Agent ${agentType} execution failed:`, error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Individual agent execution functions
async function executeProductAgent(supabase: any, tenantId: string | null, parameters: any, env: any) {
  // Implement product agent logic
  // This could include: product data enrichment, price monitoring, inventory updates
  console.log('Executing Product Agent', { tenantId, parameters });
  
  return {
    agentType: 'product',
    executedAt: new Date().toISOString(),
    parameters,
    actions: ['product_data_updated', 'prices_checked']
  };
}

async function executeEditorialAgent(supabase: any, tenantId: string | null, parameters: any, env: any) {
  // Implement editorial agent logic
  // This could include: content generation, SEO optimization, internal linking
  console.log('Executing Editorial Agent', { tenantId, parameters });
  
  return {
    agentType: 'editorial',
    executedAt: new Date().toISOString(),
    parameters,
    actions: ['content_generated', 'seo_optimized']
  };
}

async function executeNewsletterAgent(supabase: any, tenantId: string | null, parameters: any, env: any) {
  // Implement newsletter agent logic
  // This could include: newsletter compilation, subscriber management, campaign creation
  console.log('Executing Newsletter Agent', { tenantId, parameters });
  
  return {
    agentType: 'newsletter',
    executedAt: new Date().toISOString(),
    parameters,
    actions: ['newsletter_compiled', 'subscribers_updated']
  };
}

async function executePersonalizationAgent(supabase: any, tenantId: string | null, parameters: any, env: any) {
  // Implement personalization agent logic
  // This could include: user preference analysis, recommendation updates, personalized content
  console.log('Executing Personalization Agent', { tenantId, parameters });
  
  return {
    agentType: 'personalization',
    executedAt: new Date().toISOString(),
    parameters,
    actions: ['recommendations_updated', 'user_profiles_analyzed']
  };
}

async function executeSeasonalAgent(supabase: any, tenantId: string | null, parameters: any, env: any) {
  // Implement seasonal agent logic
  // This could include: seasonal content updates, holiday promotions, trending products
  console.log('Executing Seasonal Agent', { tenantId, parameters });
  
  return {
    agentType: 'seasonal',
    executedAt: new Date().toISOString(),
    parameters,
    actions: ['seasonal_content_updated', 'promotions_activated']
  };
}

async function executeSocialAgent(supabase: any, tenantId: string | null, parameters: any, env: any) {
  // Implement social agent logic
  // This could include: social media content generation, engagement tracking, viral content identification
  console.log('Executing Social Agent', { tenantId, parameters });
  
  return {
    agentType: 'social',
    executedAt: new Date().toISOString(),
    parameters,
    actions: ['social_content_generated', 'engagement_analyzed']
  };
}

async function executeTrendsAgent(supabase: any, tenantId: string | null, parameters: any, env: any) {
  // Implement trends agent logic
  // This could include: trend analysis, competitor monitoring, market research
  console.log('Executing Trends Agent', { tenantId, parameters });
  
  return {
    agentType: 'trends',
    executedAt: new Date().toISOString(),
    parameters,
    actions: ['trends_analyzed', 'market_data_updated']
  };
}

async function executeChatbotAgent(supabase: any, tenantId: string | null, parameters: any, env: any) {
  // Implement chatbot agent logic
  // This could include: conversation handling, knowledge base updates, user intent analysis
  console.log('Executing Chatbot Agent', { tenantId, parameters });
  
  return {
    agentType: 'chatbot',
    executedAt: new Date().toISOString(),
    parameters,
    actions: ['conversations_processed', 'knowledge_base_updated']
  };
}

async function executeOrchestratorAgent(supabase: any, tenantId: string | null, parameters: any, env: any) {
  // Implement orchestrator agent logic
  // This coordinates other agents and manages workflow
  console.log('Executing Orchestrator Agent', { tenantId, parameters });
  
  const orchestrationPlan = parameters.plan || 'default';
  const actions = [];
  
  // Example orchestration logic
  if (orchestrationPlan === 'content_refresh') {
    actions.push('scheduled_editorial_agent');
    actions.push('scheduled_seo_agent');
    actions.push('scheduled_social_agent');
  }
  
  return {
    agentType: 'orchestrator',
    executedAt: new Date().toISOString(),
    parameters,
    orchestrationPlan,
    actions
  };
}