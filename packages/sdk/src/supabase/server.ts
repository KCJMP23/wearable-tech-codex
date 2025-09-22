import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../database.types.js';

export async function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Setting cookies may throw in static rendering contexts; ignore.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options });
          } catch {
            // Ignore errors in non-mutable cookie contexts.
          }
        }
      }
    }
  );
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getTenant(tenantSlug: string) {
  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', tenantSlug)
    .single()
  return tenant
}

export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}
