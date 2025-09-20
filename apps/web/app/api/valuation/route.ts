import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/api/rate-limit';
import { apiAuth } from '@/lib/api/auth';
import { SiteValuator, type ValuationMetrics } from '@affiliate-factory/sdk';

// Validation schemas
const ValuationMetricsSchema = z.object({
  monthlyRevenue: z.number().min(0),
  yearlyRevenue: z.number().min(0).optional(),
  revenueGrowthRate: z.number().min(-1).max(10), // -100% to 1000%
  revenueConsistency: z.number().min(0).max(1),
  monthlyPageviews: z.number().min(0),
  uniqueVisitors: z.number().min(0).optional(),
  averageSessionDuration: z.number().min(0).max(3600), // Max 1 hour
  bounceRate: z.number().min(0).max(1),
  conversionRate: z.number().min(0).max(1),
  totalPosts: z.number().int().min(0),
  publishingFrequency: z.number().min(0).max(1000), // Posts per month
  averageWordCount: z.number().min(0).max(50000),
  contentQualityScore: z.number().min(0).max(1),
  domainAuthority: z.number().min(0).max(100),
  backlinks: z.number().int().min(0),
  rankingKeywords: z.number().int().min(0),
  organicTrafficPercentage: z.number().min(0).max(1),
  pagespeedScore: z.number().min(0).max(100),
  uptimePercentage: z.number().min(0).max(1),
  mobileOptimization: z.number().min(0).max(1),
  operatingExpenses: z.number().min(0),
  timeInvestment: z.number().min(0).max(168), // Max hours per week
  dependencyRisk: z.number().min(0).max(1),
  diversificationScore: z.number().min(0).max(1),
});

const CalculateValuationSchema = z.object({
  tenantId: z.string().uuid(),
  metrics: ValuationMetricsSchema,
  saveToHistory: z.boolean().default(true),
  notes: z.string().optional(),
});

const GetHistorySchema = z.object({
  tenantId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(12),
});

// GET /api/valuation - Get valuation history or latest valuation
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
    const tenantId = searchParams.get('tenantId');
    const latest = searchParams.get('latest') === 'true';
    const limit = parseInt(searchParams.get('limit') || '12');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Validate tenant access
    const supabase = createClient();
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found or access denied' },
        { status: 404 }
      );
    }

    const valuator = new SiteValuator();

    if (latest) {
      // Get latest valuation
      const latestValuation = await valuator.getLatestValuation(tenantId);
      return NextResponse.json(
        { data: latestValuation },
        { headers: rateLimitResult.headers }
      );
    } else {
      // Get valuation history
      const history = await valuator.getValuationHistory(tenantId, limit);
      return NextResponse.json(
        { data: history },
        { headers: rateLimitResult.headers }
      );
    }
  } catch (error) {
    console.error('Valuation GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/valuation - Calculate new site valuation
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - More restrictive for calculations
    const rateLimitResult = await rateLimit(request, 5, 60); // 5 requests per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Valuation calculations are limited to 5 per minute.' },
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
    const { tenantId, metrics, saveToHistory, notes } = CalculateValuationSchema.parse(body);

    // Validate tenant access
    const supabase = createClient();
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, domain')
      .eq('id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found or access denied' },
        { status: 404 }
      );
    }

    // Calculate valuation
    const valuator = new SiteValuator();
    const result = await valuator.calculateValuation(tenantId, metrics);

    // Save to history if requested
    let valuationId: string | null = null;
    if (saveToHistory) {
      try {
        valuationId = await valuator.saveValuation(tenantId, metrics, result);
      } catch (saveError) {
        console.error('Failed to save valuation to history:', saveError);
        // Continue with response even if save fails
      }
    }

    // Prepare response data
    const responseData = {
      valuation: result,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
      },
      valuationId,
      calculatedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { 
        success: true,
        data: responseData,
        meta: {
          requestId: `val_${Date.now()}`,
          processingTime: `${Date.now() - Date.now()}ms`,
        }
      },
      { 
        status: 200, 
        headers: {
          ...rateLimitResult.headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
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

    console.error('Valuation POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/valuation - Update valuation notes or metadata
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

    const body = await request.json();
    const { valuationId, notes } = z.object({
      valuationId: z.string().uuid(),
      notes: z.string().optional(),
    }).parse(body);

    const supabase = createClient();

    // Verify valuation belongs to user's tenant
    const { data: valuation, error: valuationError } = await supabase
      .from('site_valuations')
      .select('id, tenant_id, tenants!inner(user_id)')
      .eq('id', valuationId)
      .single();

    if (valuationError || !valuation || valuation.tenants?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Valuation not found or access denied' },
        { status: 404 }
      );
    }

    // Update valuation
    const { error: updateError } = await supabase
      .from('site_valuations')
      .update({ 
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', valuationId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update valuation' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Valuation updated successfully' },
      { headers: rateLimitResult.headers }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Valuation PUT API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/valuation - Delete a valuation record
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

    const { searchParams } = new URL(request.url);
    const valuationId = searchParams.get('valuationId');

    if (!valuationId) {
      return NextResponse.json(
        { error: 'valuationId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verify valuation belongs to user's tenant
    const { data: valuation, error: valuationError } = await supabase
      .from('site_valuations')
      .select('id, tenant_id, tenants!inner(user_id)')
      .eq('id', valuationId)
      .single();

    if (valuationError || !valuation || valuation.tenants?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Valuation not found or access denied' },
        { status: 404 }
      );
    }

    // Delete valuation
    const { error: deleteError } = await supabase
      .from('site_valuations')
      .delete()
      .eq('id', valuationId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete valuation' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Valuation deleted successfully' },
      { headers: rateLimitResult.headers }
    );
  } catch (error) {
    console.error('Valuation DELETE API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}