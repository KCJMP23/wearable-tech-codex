import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/api/rate-limit';
import { apiAuth } from '@/lib/api/auth';

const CreateSiteSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().optional(),
  theme_id: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

const UpdateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z.string().optional(),
  theme_id: z.string().optional(),
  settings: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

// GET /api/v1/sites - List all sites for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // Authentication
    const { user, error: authError } = await apiAuth(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient();
    
    // Get pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = (page - 1) * limit;
    
    // Fetch sites
    const { data: sites, error, count } = await supabase
      .from('tenants')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch sites' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: sites,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, { headers: rateLimitResult.headers });
  } catch (error) {
    console.error('Sites API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/sites - Create a new site
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // Authentication
    const { user, error: authError } = await apiAuth(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateSiteSchema.parse(body);

    const supabase = createClient();
    
    // Create the site
    const { data: site, error } = await supabase
      .from('tenants')
      .insert({
        ...validatedData,
        user_id: user.id,
        slug: validatedData.name.toLowerCase().replace(/\s+/g, '-'),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create site' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: site },
      { status: 201, headers: rateLimitResult.headers }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Sites API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}