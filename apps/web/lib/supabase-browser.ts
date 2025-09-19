/**
 * Supabase browser client for React Query hooks
 */

import { createBrowserClient as createClient } from '@supabase/ssr';
import type { Database } from '@affiliate-factory/sdk';

let client: ReturnType<typeof createClient<Database>> | null = null;

export function createBrowserClient() {
  if (client) return client;

  client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-client-info': 'affiliate-web',
        },
      },
    }
  );

  return client;
}

// Helper for authenticated requests
export function createAuthenticatedClient(accessToken?: string) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          'x-client-info': 'affiliate-web-authenticated',
        },
      },
    }
  );
}