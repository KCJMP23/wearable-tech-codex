/**
 * Main escrow API endpoints
 * Provides RESTful API for escrow operations, dispute management, and document handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  EscrowCreateSchema,
  MilestoneUpdateSchema,
  DisputeCreateSchema,
  EscrowApiResponse,
  EscrowListResponse,
  EscrowError,
  ValidationError,
  AuthorizationError,
  NotFoundError 
} from './types';
import { stripeConnectService } from './stripe-connect';
import { paymentSplitterService } from './payment-splitter';
import { milestoneTrackerService } from './milestone-tracker';
import { disputeHandlerService } from './dispute-handler';
import { documentVaultService } from './document-vault';
import { transferAutomationService } from './transfer-automation';
import { handleStripeWebhook } from './webhooks';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Request validation schemas
const EscrowQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['pending', 'funded', 'in_progress', 'dispute', 'arbitration', 'completed', 'cancelled', 'refunded']).optional(),
  userId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
});

const DocumentUploadSchema = z.object({
  escrowId: z.string().uuid(),
  type: z.enum(['contract', 'due_diligence', 'financial_statement', 'legal_document', 'verification', 'screenshot', 'other']),
  isPublic: z.boolean().default(false),
  description: z.string().max(500).optional(),
});

/**
 * GET /api/escrow - List escrows with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = EscrowQuerySchema.parse(Object.fromEntries(searchParams));

    // Get user from headers (this would typically come from auth middleware)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new AuthorizationError('Authentication required');
    }

    // Build query
    let query = supabase
      .from('escrow_transactions')
      .select('*', { count: 'exact' })
      .or(`buyerId.eq.${userId},sellerId.eq.${userId}`)
      .order('createdAt', { ascending: false });

    // Apply filters
    if (queryParams.status) {
      query = query.eq('status', queryParams.status);
    }

    if (queryParams.siteId) {
      query = query.eq('siteId', queryParams.siteId);
    }

    // Apply pagination
    const offset = (queryParams.page - 1) * queryParams.limit;
    query = query.range(offset, offset + queryParams.limit - 1);

    const { data: escrows, error, count } = await query;

    if (error) {
      throw new EscrowError('Failed to fetch escrows', 'DB_ERROR', 500, error);
    }

    const response: EscrowListResponse = {
      escrows: escrows || [],
      total: count || 0,
      page: queryParams.page,
      limit: queryParams.limit,
      hasMore: (count || 0) > queryParams.page * queryParams.limit,
    };

    return NextResponse.json(createSuccessResponse(response));

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/escrow - Create new escrow transaction
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new AuthorizationError('Authentication required');
    }

    const body = await request.json();
    const escrowData = EscrowCreateSchema.parse(body);

    // Validate user is the buyer
    if (escrowData.buyerId !== userId) {
      throw new AuthorizationError('Only buyer can create escrow');
    }

    // Validate seller has Stripe Connect account
    const sellerAccount = await stripeConnectService.validateConnectAccount(escrowData.sellerId);

    // Calculate fee amounts
    const platformFeeAmount = escrowData.totalAmount * (escrowData.platformFeePercent / 100);
    const sellerAmount = escrowData.totalAmount - platformFeeAmount;

    // Create escrow transaction
    const escrowInsert = {
      buyerId: escrowData.buyerId,
      sellerId: escrowData.sellerId,
      siteId: escrowData.siteId,
      status: 'pending' as const,
      totalAmount: escrowData.totalAmount,
      platformFeePercent: escrowData.platformFeePercent,
      platformFeeAmount,
      sellerAmount,
      description: escrowData.description,
      terms: escrowData.terms,
      escrowPeriodDays: escrowData.escrowPeriodDays,
      expiresAt: new Date(Date.now() + escrowData.escrowPeriodDays * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data: escrow, error } = await supabase
      .from('escrow_transactions')
      .insert(escrowInsert)
      .select()
      .single();

    if (error) {
      throw new EscrowError('Failed to create escrow', 'DB_ERROR', 500, error);
    }

    // Create milestones
    await milestoneTrackerService.createMilestones(escrow.id, escrowData.milestones);

    // Create Stripe Payment Intent
    const paymentIntent = await stripeConnectService.createEscrowPaymentIntent(
      escrow,
      sellerAccount.stripeAccountId
    );

    const result = {
      escrow,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    };

    return NextResponse.json(createSuccessResponse(result), { status: 201 });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/escrow/[id] - Get specific escrow details
 */
export async function getEscrowDetails(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new AuthorizationError('Authentication required');
    }

    const escrowId = params.id;

    // Get escrow with access validation
    const { data: escrow, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', escrowId)
      .or(`buyerId.eq.${userId},sellerId.eq.${userId}`)
      .single();

    if (error || !escrow) {
      throw new NotFoundError('Escrow transaction');
    }

    // Get milestones
    const milestones = await milestoneTrackerService.getEscrowMilestones(escrowId);

    // Get documents
    const documents = await documentVaultService.getEscrowDocuments(escrowId, userId, true);

    // Get disputes
    const { data: disputes } = await supabase
      .from('escrow_disputes')
      .select('*')
      .eq('escrowId', escrowId)
      .order('createdAt', { ascending: false });

    // Get audit log
    const { data: auditLog } = await supabase
      .from('escrow_audit_logs')
      .select('*')
      .eq('escrowId', escrowId)
      .order('createdAt', { ascending: false })
      .limit(50);

    const result = {
      escrow,
      milestones,
      documents,
      disputes: disputes || [],
      auditLog: auditLog || [],
    };

    return NextResponse.json(createSuccessResponse(result));

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/escrow/[id] - Update escrow status or details
 */
export async function updateEscrow(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new AuthorizationError('Authentication required');
    }

    const escrowId = params.id;
    const body = await request.json();

    // Validate access
    const { data: escrow, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', escrowId)
      .or(`buyerId.eq.${userId},sellerId.eq.${userId}`)
      .single();

    if (error || !escrow) {
      throw new NotFoundError('Escrow transaction');
    }

    // Validate update permissions and data
    const allowedUpdates = ['status'];
    const updates: any = {};

    for (const [key, value] of Object.entries(body)) {
      if (allowedUpdates.includes(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No valid updates provided');
    }

    updates.updatedAt = new Date().toISOString();

    // Update escrow
    const { data: updatedEscrow, error: updateError } = await supabase
      .from('escrow_transactions')
      .update(updates)
      .eq('id', escrowId)
      .select()
      .single();

    if (updateError) {
      throw new EscrowError('Failed to update escrow', 'DB_ERROR', 500, updateError);
    }

    return NextResponse.json(createSuccessResponse(updatedEscrow));

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/escrow/[id]/milestones - Update milestone progress
 */
export async function updateMilestone(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new AuthorizationError('Authentication required');
    }

    const body = await request.json();
    const updateData = MilestoneUpdateSchema.parse(body);

    // Validate access
    const { data: escrow, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', updateData.escrowId)
      .or(`buyerId.eq.${userId},sellerId.eq.${userId}`)
      .single();

    if (error || !escrow) {
      throw new NotFoundError('Escrow transaction');
    }

    let result;

    if (updateData.status === 'completed') {
      result = await milestoneTrackerService.updateMilestoneProgress(
        updateData.milestoneId,
        100, // 100% progress for completion
        updateData.notes,
        updateData.attachments,
        userId
      );
    } else if (updateData.status === 'disputed') {
      // Create dispute for this milestone
      result = await disputeHandlerService.createDispute(userId, {
        escrowId: updateData.escrowId,
        milestoneId: updateData.milestoneId,
        reason: updateData.notes || 'Milestone disputed',
        evidence: updateData.attachments || [],
        requestedAction: 'arbitration',
      });
    }

    return NextResponse.json(createSuccessResponse(result));

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/escrow/[id]/approve - Approve milestone or escrow action
 */
export async function approveMilestone(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new AuthorizationError('Authentication required');
    }

    const body = await request.json();
    const { milestoneId, notes, autoRelease = true } = body;

    if (!milestoneId) {
      throw new ValidationError('Milestone ID required');
    }

    // Validate access (buyer should approve milestones)
    const { data: milestone, error } = await supabase
      .from('escrow_milestones')
      .select('*, escrow_transactions!inner(buyerId, sellerId)')
      .eq('id', milestoneId)
      .single();

    if (error || !milestone) {
      throw new NotFoundError('Milestone');
    }

    const escrow = (milestone as any).escrow_transactions;
    if (escrow.buyerId !== userId) {
      throw new AuthorizationError('Only buyer can approve milestones');
    }

    const approval = await milestoneTrackerService.approveMilestone(
      milestoneId,
      userId,
      notes,
      autoRelease
    );

    return NextResponse.json(createSuccessResponse(approval));

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/escrow/[id]/release - Release milestone funds
 */
export async function releaseFunds(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new AuthorizationError('Authentication required');
    }

    const body = await request.json();
    const { milestoneId, force = false } = body;

    if (!milestoneId) {
      throw new ValidationError('Milestone ID required');
    }

    // Only admin or system can force release
    if (force && !request.headers.get('x-admin-user')) {
      throw new AuthorizationError('Admin access required for forced release');
    }

    const result = await milestoneTrackerService.releaseMilestoneFunds(
      milestoneId,
      userId,
      force
    );

    return NextResponse.json(createSuccessResponse(result));

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/escrow/[id]/disputes - Create dispute
 */
export async function createDispute(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new AuthorizationError('Authentication required');
    }

    const body = await request.json();
    const disputeData = DisputeCreateSchema.parse(body);

    const dispute = await disputeHandlerService.createDispute(userId, disputeData);

    return NextResponse.json(createSuccessResponse(dispute), { status: 201 });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/escrow/[id]/documents - Upload document
 */
export async function uploadDocument(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new AuthorizationError('Authentication required');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string);

    if (!file) {
      throw new ValidationError('File is required');
    }

    const uploadData = DocumentUploadSchema.parse(metadata);

    // Validate escrow access
    const { data: escrow, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', uploadData.escrowId)
      .or(`buyerId.eq.${userId},sellerId.eq.${userId}`)
      .single();

    if (error || !escrow) {
      throw new NotFoundError('Escrow transaction');
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    const document = await documentVaultService.uploadDocument({
      escrowId: uploadData.escrowId,
      uploadedBy: userId,
      file: {
        buffer,
        originalFilename: file.name,
        mimeType: file.type,
        size: file.size,
      },
      type: uploadData.type,
      isPublic: uploadData.isPublic,
      description: uploadData.description,
    });

    return NextResponse.json(createSuccessResponse(document), { status: 201 });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/escrow/webhooks - Handle Stripe webhooks
 */
export async function handleWebhook(request: NextRequest) {
  return handleStripeWebhook(request);
}

// Utility functions

function createSuccessResponse<T>(data: T): EscrowApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

function createErrorResponse(error: EscrowError): EscrowApiResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    timestamp: new Date().toISOString(),
  };
}

function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof EscrowError) {
    return NextResponse.json(createErrorResponse(error), { status: error.statusCode });
  }

  if (error instanceof z.ZodError) {
    const validationError = new ValidationError('Validation failed');
    validationError.details = error.errors;
    return NextResponse.json(createErrorResponse(validationError), { status: 400 });
  }

  const systemError = new EscrowError('Internal server error', 'SYSTEM_ERROR', 500);
  return NextResponse.json(createErrorResponse(systemError), { status: 500 });
}

// Export route handlers for specific paths
export { 
  GET, 
  POST, 
  getEscrowDetails as getById,
  updateEscrow as updateById,
  updateMilestone,
  approveMilestone,
  releaseFunds,
  createDispute,
  uploadDocument,
  handleWebhook 
};