import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { requireTenantContext } from '@/lib/api/tenant-context';

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500
});

export async function GET(request: NextRequest) {
  const { context, error: contextError } = await requireTenantContext(request);
  if (!context) {
    return contextError!;
  }

  const { supabase, tenantId, applyCookies } = context;
  const json = (body: unknown, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

  try {
    await limiter.check(request);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const includePublic = searchParams.get('include_public') === 'true';

    let query = supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (includePublic) {
      query = query.or(`tenant_id.eq.${tenantId},is_public.eq.true`);
    } else {
      query = query.eq('tenant_id', tenantId);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: templates, error: templatesError } = await query;

    if (templatesError) {
      console.error('Templates query failed:', templatesError);
      return json({ error: 'Database error' }, { status: 500 });
    }

    return json({ templates: templates || [] });
  } catch (err) {
    if (err instanceof Error && err.message === 'Rate limit exceeded') {
      return json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Templates API error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { context, error: contextError } = await requireTenantContext(request);
  if (!context) {
    return contextError!;
  }

  const { supabase, tenantId, applyCookies } = context;
  const json = (body: unknown, init?: ResponseInit) => applyCookies(NextResponse.json(body, init));

  try {
    await limiter.check(request);

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
      tags = []
    } = body;

    if (!name || !type || !subject || !htmlContent) {
      return json(
        { error: 'Name, type, subject, and HTML content are required' },
        { status: 400 }
      );
    }

    const { data: template, error: insertError } = await supabase
      .from('email_templates')
      .insert({
        tenant_id: tenantId,
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
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create template error:', insertError);
      return json({ error: 'Failed to create template' }, { status: 500 });
    }

    return json({ template }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Rate limit exceeded') {
      return json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    console.error('Create template error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
