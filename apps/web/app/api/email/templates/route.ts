import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

async function getTenantId(request: NextRequest): Promise<string | null> {
  const headersList = headers();
  const tenantSlug = headersList.get('x-tenant-slug');
  
  if (!tenantSlug) return null;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single();

  return tenant?.id || null;
}

async function checkAuth(request: NextRequest): Promise<{ userId: string; tenantId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const { data: { user } } = await supabase.auth.getUser(token);
  
  if (!user) return null;

  const tenantId = await getTenantId(request);
  if (!tenantId) return null;

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single();

  if (!membership) return null;

  return { userId: user.id, tenantId };
}

export async function GET(request: NextRequest) {
  try {
    await limiter.check(request);

    const auth = await checkAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const includePublic = searchParams.get('include_public') === 'true';

    let query = supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (includePublic) {
      query = query.or(`tenant_id.eq.${auth.tenantId},is_public.eq.true`);
    } else {
      query = query.eq('tenant_id', auth.tenantId);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Templates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await limiter.check(request);

    const auth = await checkAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      type,
      subject,
      preheader,
      htmlContent,
      textContent,
      thumbnail,
      isPublic = false,
      tags = [],
    } = body;

    if (!name || !type || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Name, type, subject, and HTML content are required' },
        { status: 400 }
      );
    }

    const { data: template, error } = await supabase
      .from('email_templates')
      .insert({
        tenant_id: auth.tenantId,
        name,
        description,
        category,
        type,
        subject,
        preheader,
        html_content: htmlContent,
        text_content: textContent,
        thumbnail,
        is_public: isPublic,
        tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Create template error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}