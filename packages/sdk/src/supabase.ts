import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from './env';

export type SupabaseRole = 'anon' | 'service';

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

export function getSupabaseClient(role: SupabaseRole = 'anon'): SupabaseClient {
  const env = loadEnv();
  if (role === 'anon') {
    if (!anonClient) {
      anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false
        }
      });
    }
    return anonClient;
  }

  if (!serviceClient) {
    serviceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: {
          'x-tenant-domain': env.DEFAULT_TENANT_DOMAIN
        }
      }
    });
  }
  return serviceClient;
}

export async function withServiceClient<T>(callback: (client: SupabaseClient) => Promise<T>): Promise<T> {
  const client = getSupabaseClient('service');
  return callback(client);
}

export function resetSupabaseClients(): void {
  anonClient = null;
  serviceClient = null;
}
