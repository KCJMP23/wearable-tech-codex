import { cookies, headers } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from '@affiliate-factory/sdk';

const env = loadEnv();

type Client = SupabaseClient<any, 'public', any>;

export function createAnonClient(): Client {
  const cookieStore = cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      }
    },
    global: {
      headers: {
        'x-tenant-domain': headers().get('host') ?? env.NEXT_PUBLIC_DEFAULT_DOMAIN
      }
    }
  });
}

export function createServiceClient(): Client {
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      get() {
        return undefined;
      },
      set() {
        /* noop */
      },
      remove() {
        /* noop */
      }
    }
  });
}
