import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/api/rate-limit';
import { apiAuth } from '@/lib/api/auth';

// Validation schemas
const SearchComparablesSchema = z.object({
  monthlyRevenue: z.number().min(0),
  monthlyPageviews: z.number().min(0),
  niche: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
  verified: z.boolean().default(true),
});

const CreateComparableSchema = z.object({
  domain: z.string().min(1).max(255),
  niche: z.string().min(1).max(100),
  description: z.string().optional(),
  monthlyRevenue: z.number().min(0),
  yearlyRevenue: z.number().min(0).optional(),
  monthlyPageviews: z.number().min(0),
  uniqueVisitors: z.number().min(0).optional(),
  conversionRate: z.number().min(0).max(1).optional(),
  salePrice: z.number().min(0),
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  salePlatform: z.enum(['flippa', 'empire_flippers', 'fe_international', 'motion_invest', 'acquire', 'direct', 'other']),
  domainAuthority: z.number().min(0).max(100).optional(),
  backlinks: z.number().int().min(0).optional(),
  contentPages: z.number().int().min(0).optional(),
  siteAgeMonths: z.number().int().min(0).optional(),
  trafficSources: z.object({
    organic: z.number().min(0).max(1).default(0),
    direct: z.number().min(0).max(1).default(0),
    referral: z.number().min(0).max(1).default(0),
    social: z.number().min(0).max(1).default(0),
    paid: z.number().min(0).max(1).default(0),
  }).optional(),
  revenueSources: z.object({
    affiliate: z.number().min(0).max(1).default(0),
    ads: z.number().min(0).max(1).default(0),
    products: z.number().min(0).max(1).default(0),
    services: z.number().min(0).max(1).default(0),
    other: z.number().min(0).max(1).default(0),
  }).optional(),
  sourceUrl: z.string().url().optional(),
  sourceNotes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

// GET /api/valuation/comparables - Search for comparable sites
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

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const monthlyRevenue = parseFloat(searchParams.get('monthlyRevenue') || '0');
    const monthlyPageviews = parseFloat(searchParams.get('monthlyPageviews') || '0');
    const niche = searchParams.get('niche');
    const limit = parseInt(searchParams.get('limit') || '10');
    const verified = searchParams.get('verified') !== 'false';

    if (monthlyRevenue <= 0 && monthlyPageviews <= 0) {
      return NextResponse.json(
        { error: 'Either monthlyRevenue or monthlyPageviews must be greater than 0' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Use the database function for finding comparable sites
    const { data: comparables, error } = await supabase
      .rpc('find_comparable_sites', {
        p_monthly_revenue: monthlyRevenue,
        p_monthly_pageviews: monthlyPageviews,
        p_niche: niche,
        p_limit: limit,
      });

    if (error) {
      console.error('Error fetching comparable sites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comparable sites' },
        { status: 500 }
      );
    }

    // Calculate additional statistics
    const stats = comparables.length > 0 ? {
      averageMultiple: comparables.reduce((sum: number, comp: any) => sum + comp.revenue_multiple, 0) / comparables.length,
      medianMultiple: comparables.length > 0 ? comparables[Math.floor(comparables.length / 2)]?.revenue_multiple || 0 : 0,
      minMultiple: Math.min(...comparables.map((comp: any) => comp.revenue_multiple)),
      maxMultiple: Math.max(...comparables.map((comp: any) => comp.revenue_multiple)),
      sampleSize: comparables.length,
    } : null;

    return NextResponse.json(
      { 
        data: comparables,
        stats,
        meta: {
          searchCriteria: {
            monthlyRevenue,
            monthlyPageviews,
            niche,
            verified,
          },
          resultCount: comparables.length,
        }
      },
      { headers: rateLimitResult.headers }
    );
  } catch (error) {
    console.error('Comparables GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/valuation/comparables - Add a new comparable site (admin only)
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

    // Check if user is admin
    const supabase = createClient();
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || userProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateComparableSchema.parse(body);

    // Validate traffic sources sum to approximately 1
    if (validatedData.trafficSources) {
      const total = Object.values(validatedData.trafficSources).reduce((sum, val) => sum + val, 0);
      if (total > 1.01) {
        return NextResponse.json(
          { error: 'Traffic sources percentages cannot exceed 100%' },
          { status: 400 }
        );
      }
    }

    // Validate revenue sources sum to approximately 1
    if (validatedData.revenueSources) {
      const total = Object.values(validatedData.revenueSources).reduce((sum, val) => sum + val, 0);
      if (total > 1.01) {
        return NextResponse.json(
          { error: 'Revenue sources percentages cannot exceed 100%' },
          { status: 400 }
        );
      }
    }

    // Insert the comparable site
    const { data: comparable, error: insertError } = await supabase
      .from('comparable_sites')
      .insert({
        ...validatedData,
        traffic_sources: validatedData.trafficSources,
        revenue_sources: validatedData.revenueSources,
        verified: true, // Admin-added sites are automatically verified
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'A comparable site with this domain and sale date already exists' },
          { status: 409 }
        );
      }
      console.error('Error creating comparable site:', insertError);
      return NextResponse.json(
        { error: 'Failed to create comparable site' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        data: comparable,
        message: 'Comparable site created successfully'
      },
      { 
        status: 201, 
        headers: rateLimitResult.headers 
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          }))
        },
        { status: 400 }
      );
    }

    console.error('Comparables POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/valuation/comparables - Update a comparable site (admin only)
export async function PUT(request: NextRequest) {
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

    // Check if user is admin
    const supabase = createClient();
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || userProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = z.object({
      id: z.string().uuid(),
      ...CreateComparableSchema.partial().shape,
    }).parse(body);

    // Update the comparable site
    const { data: comparable, error: updateError } = await supabase
      .from('comparable_sites')
      .update({
        ...updateData,
        traffic_sources: updateData.trafficSources,
        revenue_sources: updateData.revenueSources,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Comparable site not found' },
          { status: 404 }
        );
      }
      console.error('Error updating comparable site:', updateError);
      return NextResponse.json(
        { error: 'Failed to update comparable site' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        data: comparable,
        message: 'Comparable site updated successfully'
      },
      { headers: rateLimitResult.headers }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Comparables PUT API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/valuation/comparables - Delete a comparable site (admin only)
export async function DELETE(request: NextRequest) {
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

    // Check if user is admin
    const supabase = createClient();
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || userProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Delete the comparable site
    const { error: deleteError } = await supabase
      .from('comparable_sites')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting comparable site:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete comparable site' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Comparable site deleted successfully'
      },
      { headers: rateLimitResult.headers }
    );
  } catch (error) {
    console.error('Comparables DELETE API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}