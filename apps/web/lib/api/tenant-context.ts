import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { loadEnv, type Database } from '@affiliate-factory/sdk';

export interface TenantContext {
  supabase: SupabaseClient<Database>;
  session: Session;
  user: User;
  tenantId: string;
  tenantSlug: string;
  applyCookies: (response: NextResponse) => NextResponse;
}

interface TenantContextResult {
  context?: TenantContext;
  error?: NextResponse;
}

const env = loadEnv();

type MutableResponse = NextResponse | null;

function createTenantScopedClient(request: NextRequest, mutableResponse: { current: MutableResponse }) {
  const authorization = request.headers.get('authorization');

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          mutableResponse.current = mutableResponse.current ?? NextResponse.next();
          mutableResponse.current.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          mutableResponse.current = mutableResponse.current ?? NextResponse.next();
          mutableResponse.current.cookies.set({ name, value: '', ...options });
        }
      },
      global: {
        headers: authorization ? { Authorization: authorization } : undefined
      }
    }
  );
}

export async function requireTenantContext(request: NextRequest): Promise<TenantContextResult> {
  const mutableResponse: { current: MutableResponse } = { current: null };
  const supabase = createTenantScopedClient(request, mutableResponse);

  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError || !session || !session.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  const tenantSlug =
    request.headers.get('x-tenant-slug') ||
    request.nextUrl.searchParams.get('tenant_slug') ||
    request.nextUrl.searchParams.get('tenantId') ||
    request.nextUrl.searchParams.get('tenant_id');

  if (!tenantSlug) {
    return {
      error: NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })
    };
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq('slug', tenantSlug)
    .maybeSingle();

  if (tenantError) {
    console.error('Tenant lookup error:', tenantError);
    return {
      error: NextResponse.json({ error: 'Failed to resolve tenant' }, { status: 500 })
    };
  }

  if (!tenant) {
    return {
      error: NextResponse.json({ error: 'Tenant not found or access denied' }, { status: 404 })
    };
  }

  return {
    context: {
      supabase,
      session,
      user: session.user,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      applyCookies: (response: NextResponse) => {
        if (mutableResponse.current) {
          mutableResponse.current.cookies.getAll().forEach((cookie) => {
            response.cookies.set(cookie);
          });
        }

        return response;
      }
    }
  };
}
