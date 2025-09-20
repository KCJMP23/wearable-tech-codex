import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHmac } from 'crypto';

interface ApiAuthResult {
  user: any | null;
  error: string | null;
  tier: 'public' | 'authenticated' | 'premium';
}

export async function apiAuth(request: NextRequest): Promise<ApiAuthResult> {
  // Check for API key authentication
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return await validateApiKey(apiKey);
  }
  
  // Check for Bearer token authentication
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice(7);
    return await validateBearerToken(token);
  }
  
  // Check for session authentication (web)
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { user: null, error: 'No valid authentication provided', tier: 'public' };
  }
  
  // Check user tier
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', user.id)
    .single();
  
  const tier = subscription?.tier === 'premium' ? 'premium' : 'authenticated';
  
  return { user, error: null, tier };
}

async function validateApiKey(apiKey: string): Promise<ApiAuthResult> {
  const supabase = createClient();
  
  // Hash the API key for storage
  const hashedKey = createHmac('sha256', process.env.API_KEY_SECRET || 'default')
    .update(apiKey)
    .digest('hex');
  
  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('*, users(*)')
    .eq('key_hash', hashedKey)
    .eq('is_active', true)
    .single();
  
  if (error || !keyData) {
    return { user: null, error: 'Invalid API key', tier: 'public' };
  }
  
  // Check if key is expired
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { user: null, error: 'API key expired', tier: 'public' };
  }
  
  // Update last used timestamp
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id);
  
  return { 
    user: keyData.users, 
    error: null, 
    tier: keyData.tier || 'authenticated' 
  };
}

async function validateBearerToken(token: string): Promise<ApiAuthResult> {
  const supabase = createClient();
  
  // Set the auth token for this request
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { user: null, error: 'Invalid bearer token', tier: 'public' };
  }
  
  // Check user tier
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', user.id)
    .single();
  
  const tier = subscription?.tier === 'premium' ? 'premium' : 'authenticated';
  
  return { user, error: null, tier };
}

export async function generateApiKey(userId: string, name: string): Promise<string> {
  const supabase = createClient();
  
  // Generate a random API key
  const apiKey = `sk_${generateRandomString(32)}`;
  
  // Hash the key for storage
  const hashedKey = createHmac('sha256', process.env.API_KEY_SECRET || 'default')
    .update(apiKey)
    .digest('hex');
  
  // Store the hashed key
  const { error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: hashedKey,
      key_prefix: apiKey.substring(0, 7),
      is_active: true,
    });
  
  if (error) {
    throw error;
  }
  
  return apiKey;
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}