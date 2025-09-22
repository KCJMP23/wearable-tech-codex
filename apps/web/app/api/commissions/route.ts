import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { ensureInternalApiAccess } from '@/lib/security/internal-auth';
import { z } from 'zod';

const processPayoutSchema = z.object({
  commission_ids: z.array(z.string().uuid()),
  payout_method: z.enum(['bank_transfer', 'paypal', 'crypto', 'check']),
  notes: z.string().optional(),
});

const updateCommissionSchema = z.object({
  status: z.enum(['pending', 'validated', 'paid', 'cancelled']).optional(),
  validation_notes: z.string().optional(),
  payout_date: z.string().optional(),
  payout_method: z.enum(['bank_transfer', 'paypal', 'crypto', 'check']).optional(),
  payout_reference: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const unauthorized = ensureInternalApiAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const affiliateId = searchParams.get('affiliate_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    let query = supabase
      .from('commissions_summary')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (affiliateId) {
      query = query.eq('affiliate_id', affiliateId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: commissions, error } = await query;

    if (error) {
      console.error('Error fetching commissions:', error);
      return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('commissions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    if (affiliateId) {
      countQuery = countQuery.eq('affiliate_id', affiliateId);
    }

    if (startDate) {
      countQuery = countQuery.gte('created_at', startDate);
    }

    if (endDate) {
      countQuery = countQuery.lte('created_at', endDate);
    }

    const { count } = await countQuery;

    // Calculate summary stats
    const { data: stats } = await supabase
      .from('commissions')
      .select('status, commission_amount')
      .eq('tenant_id', tenantId);

    const summaryStats = {
      totalCommissions: stats?.length || 0,
      totalAmount: stats?.reduce((sum, comm) => sum + comm.commission_amount, 0) || 0,
      pendingAmount: stats?.filter(c => c.status === 'pending').reduce((sum, comm) => sum + comm.commission_amount, 0) || 0,
      paidAmount: stats?.filter(c => c.status === 'paid').reduce((sum, comm) => sum + comm.commission_amount, 0) || 0,
    };

    return NextResponse.json({
      commissions: commissions || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0),
      },
      stats: summaryStats,
    });

  } catch (error) {
    console.error('Commissions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = ensureInternalApiAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const commissionId = searchParams.get('id');

    if (!commissionId) {
      return NextResponse.json({ error: 'Commission ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateCommissionSchema.parse(body);

    const supabase = createServiceClient();

    const updateData: any = {};

    if (validatedData.status) {
      updateData.status = validatedData.status;
      
      if (validatedData.status === 'validated') {
        updateData.validated_at = new Date().toISOString();
      } else if (validatedData.status === 'paid') {
        updateData.paid_at = new Date().toISOString();
        updateData.payout_date = validatedData.payout_date || new Date().toISOString();
      }
    }

    if (validatedData.validation_notes) {
      updateData.validation_notes = validatedData.validation_notes;
    }

    if (validatedData.payout_date) {
      updateData.payout_date = validatedData.payout_date;
    }

    if (validatedData.payout_method) {
      updateData.payout_method = validatedData.payout_method;
    }

    if (validatedData.payout_reference) {
      updateData.payout_reference = validatedData.payout_reference;
    }

    const { data: updatedCommission, error } = await supabase
      .from('commissions')
      .update(updateData)
      .eq('id', commissionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating commission:', error);
      return NextResponse.json({ error: 'Failed to update commission' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      commission: updatedCommission,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors,
      }, { status: 400 });
    }

    console.error('Commission update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = ensureInternalApiAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'process_payout') {
      const validatedData = processPayoutSchema.parse(body);
      const supabase = createServiceClient();

      // Update all selected commissions to paid status
      const { data: updatedCommissions, error } = await supabase
        .from('commissions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payout_date: new Date().toISOString(),
          payout_method: validatedData.payout_method,
          validation_notes: validatedData.notes,
        })
        .in('id', validatedData.commission_ids)
        .select();

      if (error) {
        console.error('Error processing payout:', error);
        return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 });
      }

      // Create transaction records for the payouts
      const transactionRecords = updatedCommissions?.map(commission => ({
        order_id: commission.order_id,
        transaction_type: 'commission_payout',
        amount: commission.commission_amount,
        currency: 'USD',
        description: `Commission payout for order`,
        metadata: {
          commission_id: commission.id,
          payout_method: validatedData.payout_method,
          affiliate_id: commission.affiliate_id,
        },
      })) || [];

      if (transactionRecords.length > 0) {
        await supabase
          .from('transactions')
          .insert(transactionRecords);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully processed payout for ${updatedCommissions?.length} commissions`,
        updatedCommissions,
      });
    }

    if (action === 'validate_commissions') {
      const { commission_ids, notes } = body;
      const supabase = createServiceClient();

      const { data: validatedCommissions, error } = await supabase
        .from('commissions')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
          validation_notes: notes,
        })
        .in('id', commission_ids)
        .select();

      if (error) {
        console.error('Error validating commissions:', error);
        return NextResponse.json({ error: 'Failed to validate commissions' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully validated ${validatedCommissions?.length} commissions`,
        validatedCommissions,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors,
      }, { status: 400 });
    }

    console.error('Commission action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
