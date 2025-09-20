/**
 * TypeScript interfaces for the escrow system
 * Comprehensive type definitions for secure multi-party payments
 */

import { z } from 'zod';

// Core escrow status types
export type EscrowStatus = 
  | 'pending'
  | 'funded'
  | 'in_progress'
  | 'dispute'
  | 'arbitration'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type MilestoneStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'approved'
  | 'rejected';

export type DisputeStatus = 
  | 'open'
  | 'investigating'
  | 'arbitration'
  | 'resolved'
  | 'closed';

export type DocumentType = 
  | 'contract'
  | 'due_diligence'
  | 'financial_statement'
  | 'legal_document'
  | 'verification'
  | 'screenshot'
  | 'other';

// Zod schemas for validation
export const EscrowCreateSchema = z.object({
  buyerId: z.string().uuid(),
  sellerId: z.string().uuid(),
  siteId: z.string().uuid(),
  totalAmount: z.number().positive(),
  platformFeePercent: z.number().min(0).max(100).default(5),
  description: z.string().min(1).max(1000),
  milestones: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000),
    amount: z.number().positive(),
    dueDate: z.string().datetime().optional(),
    requiresApproval: z.boolean().default(true)
  })).min(1),
  terms: z.string().min(1),
  escrowPeriodDays: z.number().min(1).max(365).default(30)
});

export const MilestoneUpdateSchema = z.object({
  escrowId: z.string().uuid(),
  milestoneId: z.string().uuid(),
  status: z.enum(['completed', 'disputed']),
  notes: z.string().max(1000).optional(),
  attachments: z.array(z.string()).optional()
});

export const DisputeCreateSchema = z.object({
  escrowId: z.string().uuid(),
  milestoneId: z.string().uuid().optional(),
  reason: z.string().min(1).max(1000),
  evidence: z.array(z.string()).optional(),
  requestedAction: z.enum(['refund', 'release', 'partial_refund', 'arbitration'])
});

// Core interfaces
export interface EscrowTransaction {
  id: string;
  buyerId: string;
  sellerId: string;
  siteId: string;
  status: EscrowStatus;
  totalAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  sellerAmount: number;
  description: string;
  terms: string;
  escrowPeriodDays: number;
  stripePaymentIntentId?: string;
  stripeConnectAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export interface EscrowMilestone {
  id: string;
  escrowId: string;
  title: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  orderIndex: number;
  dueDate?: Date;
  requiresApproval: boolean;
  completedAt?: Date;
  approvedAt?: Date;
  notes?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EscrowDispute {
  id: string;
  escrowId: string;
  milestoneId?: string;
  initiatorId: string;
  respondentId: string;
  status: DisputeStatus;
  reason: string;
  evidence: string[];
  requestedAction: 'refund' | 'release' | 'partial_refund' | 'arbitration';
  arbitratorId?: string;
  resolution?: string;
  resolutionAmount?: number;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface SecureDocument {
  id: string;
  escrowId: string;
  uploadedBy: string;
  filename: string;
  originalFilename: string;
  type: DocumentType;
  size: number;
  mimeType: string;
  encryptionKey: string;
  storageUrl: string;
  checksum: string;
  isPublic: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export interface EscrowAuditLog {
  id: string;
  escrowId: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Stripe Connect interfaces
export interface StripeConnectAccount {
  id: string;
  userId: string;
  stripeAccountId: string;
  isActive: boolean;
  hasCompletedOnboarding: boolean;
  hasPayoutsEnabled: boolean;
  hasChargesEnabled: boolean;
  capabilities: string[];
  country: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentSplit {
  escrowId: string;
  sellerId: string;
  platformId: string;
  sellerAmount: number;
  platformAmount: number;
  stripeTransferId?: string;
  processedAt?: Date;
}

// API Response types
export interface EscrowApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface EscrowListResponse {
  escrows: EscrowTransaction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Webhook event types
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
}

// Configuration types
export interface EscrowConfig {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripeConnectClientId: string;
  platformAccountId: string;
  maxEscrowAmount: number;
  minEscrowAmount: number;
  defaultPlatformFeePercent: number;
  maxEscrowPeriodDays: number;
  encryptionKey: string;
  documentStorageBucket: string;
}

// Error types
export class EscrowError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'EscrowError';
  }
}

export class PaymentError extends EscrowError {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_ERROR', 402, details);
  }
}

export class ValidationError extends EscrowError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthorizationError extends EscrowError {
  constructor(message: string) {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends EscrowError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

// Utility types
export type CreateEscrowInput = z.infer<typeof EscrowCreateSchema>;
export type UpdateMilestoneInput = z.infer<typeof MilestoneUpdateSchema>;
export type CreateDisputeInput = z.infer<typeof DisputeCreateSchema>;

// Database table types for Supabase
export interface Database {
  public: {
    Tables: {
      escrow_transactions: {
        Row: EscrowTransaction;
        Insert: Omit<EscrowTransaction, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<EscrowTransaction, 'id' | 'createdAt'>>;
      };
      escrow_milestones: {
        Row: EscrowMilestone;
        Insert: Omit<EscrowMilestone, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<EscrowMilestone, 'id' | 'createdAt'>>;
      };
      escrow_disputes: {
        Row: EscrowDispute;
        Insert: Omit<EscrowDispute, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<EscrowDispute, 'id' | 'createdAt'>>;
      };
      escrow_documents: {
        Row: SecureDocument;
        Insert: Omit<SecureDocument, 'id' | 'createdAt'>;
        Update: Partial<Omit<SecureDocument, 'id' | 'createdAt'>>;
      };
      escrow_audit_logs: {
        Row: EscrowAuditLog;
        Insert: Omit<EscrowAuditLog, 'id' | 'createdAt'>;
        Update: never;
      };
      stripe_connect_accounts: {
        Row: StripeConnectAccount;
        Insert: Omit<StripeConnectAccount, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<StripeConnectAccount, 'id' | 'createdAt'>>;
      };
    };
  };
}