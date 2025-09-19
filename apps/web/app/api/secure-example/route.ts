import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SupabaseServer } from '@affiliate-factory/sdk';
import {
  validateRequestBody,
  sanitizeInput,
  escapeSQLIdentifier,
  validationSchemas,
} from '@/lib/security/middleware';

/**
 * Example of a secure API route with comprehensive security measures
 * 
 * Security features demonstrated:
 * 1. Authentication check
 * 2. Tenant isolation
 * 3. Input validation with Zod
 * 4. SQL injection prevention
 * 5. XSS prevention through sanitization
 * 6. Proper error handling
 * 7. Audit logging
 */

// Define request/response schemas
const createProductSchema = z.object({
  tenantId: validationSchemas.tenantId,
  product: z.object({
    title: z.string().min(1).max(200).transform(sanitizeInput),
    description: z.string().max(5000).transform(sanitizeInput),
    price: z.number().positive().max(999999),
    asin: validationSchemas.asin,
    category: z.string().max(100).transform(sanitizeInput),
    images: z.array(validationSchemas.url).max(10).optional(),
  }),
});

const queryParamsSchema = z.object({
  tenantId: validationSchemas.tenantId,
  search: validationSchemas.searchQuery.optional(),
  ...validationSchemas.pagination.shape,
});

export async function GET(request: NextRequest) {
  try {
    // 1. Validate query parameters
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validation = validateRequestBody(params, queryParamsSchema);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          details: validation.errors.format(),
        },
        { status: 400 }
      );
    }

    const { tenantId, search, page = 1, limit = 20 } = validation.data;

    // 2. Verify tenant access (already validated in middleware, but double-check)
    const validatedTenantId = request.headers.get('x-validated-tenant-id');
    if (validatedTenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Tenant validation mismatch' },
        { status: 403 }
      );
    }

    // 3. Create authenticated Supabase client
    const supabase = await SupabaseServer.createClient();

    // 4. Check user authentication for protected data
    const { data: { user } } = await supabase.auth.getUser();
    
    // 5. Build query with proper tenant isolation
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId); // CRITICAL: Always filter by tenant_id

    // 6. Apply search filter with SQL injection prevention
    if (search) {
      // Use parameterized queries, never concatenate user input
      query = query.ilike('title', `%${search}%`);
    }

    // 7. Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // 8. Execute query with error handling
    const { data: products, count, error } = await query;

    if (error) {
      console.error('Database error:', error);
      // Don't expose database errors to client
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    // 9. Audit log for sensitive operations
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        tenant_id: tenantId,
        action: 'products.list',
        metadata: { search, page, limit },
        ip_address: request.ip || request.headers.get('x-forwarded-for'),
        user_agent: request.headers.get('user-agent'),
      });
    }

    // 10. Return sanitized response
    return NextResponse.json({
      products: products || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Unexpected error in secure API route:', error);
    // Never expose internal errors
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify CSRF token (handled in middleware)
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      return NextResponse.json(
        { error: 'CSRF token required' },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = validateRequestBody(body, createProductSchema);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.errors.format(),
        },
        { status: 400 }
      );
    }

    const { tenantId, product } = validation.data;

    // 3. Verify authenticated user
    const supabase = await SupabaseServer.createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 4. Check user permissions for tenant
    const { data: permission } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (!permission || !['admin', 'editor'].includes(permission.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 5. Verify tenant is active
    const { data: tenant } = await supabase
      .from('tenants')
      .select('status')
      .eq('id', tenantId)
      .single();

    if (!tenant || tenant.status !== 'active') {
      return NextResponse.json(
        { error: 'Tenant is not active' },
        { status: 403 }
      );
    }

    // 6. Insert product with tenant isolation
    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        ...product,
        tenant_id: tenantId, // CRITICAL: Always set tenant_id
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create product:', error);
      
      // Check for specific constraint violations
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'Product with this ASIN already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }

    // 7. Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      tenant_id: tenantId,
      action: 'products.create',
      metadata: { product_id: newProduct.id, asin: product.asin },
      ip_address: request.ip || request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    });

    // 8. Return created product
    return NextResponse.json(
      { product: newProduct },
      { status: 201 }
    );

  } catch (error) {
    console.error('Unexpected error in POST handler:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 1. Extract and validate product ID and tenant ID
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!productId || !tenantId) {
      return NextResponse.json(
        { error: 'Product ID and Tenant ID required' },
        { status: 400 }
      );
    }

    // Validate UUIDs
    try {
      z.string().uuid().parse(productId);
      z.string().uuid().parse(tenantId);
    } catch {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // 2. Verify authenticated user
    const supabase = await SupabaseServer.createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 3. Check user permissions (must be admin)
    const { data: permission } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (!permission || permission.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin permission required' },
        { status: 403 }
      );
    }

    // 4. Verify product belongs to tenant (prevent cross-tenant deletion)
    const { data: product } = await supabase
      .from('products')
      .select('id, tenant_id')
      .eq('id', productId)
      .eq('tenant_id', tenantId) // CRITICAL: Ensure tenant isolation
      .single();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // 5. Soft delete or archive (safer than hard delete)
    const { error: deleteError } = await supabase
      .from('products')
      .update({ 
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', productId)
      .eq('tenant_id', tenantId); // Double-check tenant isolation

    if (deleteError) {
      console.error('Failed to delete product:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }

    // 6. Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      tenant_id: tenantId,
      action: 'products.delete',
      metadata: { product_id: productId },
      ip_address: request.ip || request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json(
      { message: 'Product deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in DELETE handler:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}