import { Env, ApiResponse } from './types.ts';

const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.1');

export function getSupabaseClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });
}

export async function verifyHmac(body: string, header: string | null, secret: string | undefined) {
  if (!secret) throw new Error('Missing webhook secret');
  if (!header) throw new Error('Missing signature header');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const key = await crypto.subtle.importKey(
    'raw', 
    encoder.encode(secret), 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const digestArray = Array.from(new Uint8Array(signature));
  const digest = digestArray.map((value) => value.toString(16).padStart(2, '0')).join('');
  
  if (header !== digest) {
    throw new Error('Invalid signature');
  }
}

export function jsonResponse<T = any>(body: ApiResponse<T> | unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-signature',
      ...init.headers 
    },
    ...init
  });
}

export function corsHandler(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-signature',
        'Access-Control-Max-Age': '86400',
      }
    });
  }
  return null;
}

export function errorResponse(error: string, status: number = 500): Response {
  return jsonResponse({ 
    success: false, 
    error 
  }, { status });
}

export function successResponse<T = any>(data?: T, message?: string): Response {
  return jsonResponse({ 
    success: true, 
    data, 
    message 
  });
}

export async function validateRequest(
  request: Request, 
  allowedMethods: string[] = ['POST'],
  requireSignature: boolean = true,
  secretEnvKey?: string
): Promise<{ body: string; payload: any; env: Env } | Response> {
  // Handle CORS preflight
  const corsResponse = corsHandler(request);
  if (corsResponse) return corsResponse;

  // Check method
  if (!allowedMethods.includes(request.method)) {
    return errorResponse('Method not allowed', 405);
  }

  // Get environment variables
  const env: Env = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL')!,
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    MAKE_BLOG_WEBHOOK_SECRET: Deno.env.get('MAKE_BLOG_WEBHOOK_SECRET'),
    MAKE_PRODUCT_WEBHOOK_SECRET: Deno.env.get('MAKE_PRODUCT_WEBHOOK_SECRET'),
    MAKE_IMAGE_WEBHOOK_SECRET: Deno.env.get('MAKE_IMAGE_WEBHOOK_SECRET'),
    OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
    AMAZON_ACCESS_KEY_ID: Deno.env.get('AMAZON_ACCESS_KEY_ID'),
    AMAZON_SECRET_ACCESS_KEY: Deno.env.get('AMAZON_SECRET_ACCESS_KEY'),
    AMAZON_ASSOCIATE_TAG: Deno.env.get('AMAZON_ASSOCIATE_TAG'),
  };

  let body: string;
  let payload: any;

  try {
    body = await request.text();
    
    // Verify HMAC signature if required
    if (requireSignature && secretEnvKey) {
      const secret = (env as any)[secretEnvKey];
      await verifyHmac(body, request.headers.get('x-signature'), secret);
    }
    
    // Parse JSON payload
    payload = body ? JSON.parse(body) : {};
  } catch (error) {
    console.error('Request validation failed:', error);
    return errorResponse(error.message, 401);
  }

  return { body, payload, env };
}

export async function getTenant(supabase: any, tenantSlug: string) {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, slug, name, domain, settings')
    .eq('slug', tenantSlug)
    .maybeSingle();
    
  if (error) {
    throw new Error(`Failed to fetch tenant: ${error.message}`);
  }
  
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  
  return tenant;
}

export function processAmazonLinks(content: string, affiliateTag: string = 'jmpkc01-20'): string {
  return content.replace(
    /(https?:\/\/(?:www\.)?amazon\.com\/[^?\s]*)/g,
    (match) => {
      try {
        const url = new URL(match);
        if (!url.searchParams.has('tag')) {
          url.searchParams.set('tag', affiliateTag);
        }
        return url.toString();
      } catch {
        return match; // Return original if URL parsing fails
      }
    }
  );
}

export async function createAgentTask(
  supabase: any,
  tenantId: string,
  agentType: string,
  parameters: Record<string, any> = {},
  priority: 'low' | 'medium' | 'high' = 'medium',
  scheduledFor?: string
) {
  const { data, error } = await supabase
    .from('agent_tasks')
    .insert({
      tenant_id: tenantId,
      agent_type: agentType,
      parameters,
      priority,
      scheduled_for: scheduledFor,
      status: 'pending'
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create agent task: ${error.message}`);
  }

  return data;
}

export async function updateAgentTask(
  supabase: any,
  taskId: string,
  updates: {
    status?: 'running' | 'completed' | 'failed';
    result?: Record<string, any>;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
  }
) {
  const { error } = await supabase
    .from('agent_tasks')
    .update(updates)
    .eq('id', taskId);

  if (error) {
    throw new Error(`Failed to update agent task: ${error.message}`);
  }
}

export function generateEmbedding(text: string): Promise<number[]> {
  // This would typically use OpenAI's embedding API
  // For now, return a placeholder implementation
  return Promise.resolve(new Array(1536).fill(0).map(() => Math.random()));
}

export async function verifyUrl(url: string): Promise<{
  status: 'valid' | 'invalid' | 'error';
  statusCode?: number;
  redirectUrl?: string;
  errorMessage?: string;
}> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow'
    });
    
    return {
      status: response.ok ? 'valid' : 'invalid',
      statusCode: response.status,
      redirectUrl: response.url !== url ? response.url : undefined
    };
  } catch (error) {
    return {
      status: 'error',
      errorMessage: error.message
    };
  }
}

export function logOperation(operation: string, details: Record<string, any>) {
  console.log(`[${new Date().toISOString()}] ${operation}:`, JSON.stringify(details, null, 2));
}