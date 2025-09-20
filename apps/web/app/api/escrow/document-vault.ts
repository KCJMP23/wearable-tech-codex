/**
 * Secure document vault for escrow system
 * Handles encrypted document storage, access control, and due diligence materials
 */

import { 
  SecureDocument, 
  DocumentType,
  EscrowError,
  ValidationError 
} from './types';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DocumentUploadRequest {
  escrowId: string;
  uploadedBy: string;
  file: {
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
    size: number;
  };
  type: DocumentType;
  isPublic?: boolean;
  expiresAt?: Date;
  description?: string;
}

export interface DocumentAccessRequest {
  documentId: string;
  requestedBy: string;
  reason?: string;
}

export interface DocumentSharingSettings {
  documentId: string;
  allowedUsers: string[];
  expiresAt?: Date;
  downloadLimit?: number;
  watermark?: boolean;
  requiresApproval?: boolean;
}

export interface EncryptedFileData {
  encryptedData: Buffer;
  encryptionKey: string;
  iv: string;
  checksum: string;
}

export interface DocumentAuditEntry {
  documentId: string;
  userId: string;
  action: 'uploaded' | 'accessed' | 'downloaded' | 'shared' | 'deleted' | 'encrypted' | 'decrypted';
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class DocumentVaultService {
  private encryptionAlgorithm: string = 'aes-256-gcm';
  private maxFileSize: number;
  private allowedMimeTypes: string[];
  private storageBasePath: string;

  constructor() {
    this.maxFileSize = parseInt(process.env.MAX_DOCUMENT_SIZE || '50000000'); // 50MB
    this.allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];
    this.storageBasePath = process.env.DOCUMENT_STORAGE_BASE_PATH || 'escrow-documents';
  }

  /**
   * Upload and encrypt document
   */
  async uploadDocument(request: DocumentUploadRequest): Promise<SecureDocument> {
    try {
      // Validate file
      this.validateFile(request.file);

      // Validate escrow access
      await this.validateEscrowAccess(request.escrowId, request.uploadedBy);

      // Generate encryption key and encrypt file
      const encryptedFile = await this.encryptFile(request.file.buffer);

      // Generate unique filename
      const fileExtension = this.getFileExtension(request.file.originalFilename);
      const filename = `${crypto.randomUUID()}${fileExtension}`;
      const storagePath = `${this.storageBasePath}/${request.escrowId}/${filename}`;

      // Upload encrypted file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, encryptedFile.encryptedData, {
          contentType: 'application/octet-stream', // Always use binary for encrypted files
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new EscrowError('Failed to upload document', 'STORAGE_ERROR', 500, uploadError);
      }

      // Store document metadata
      const documentInsert = {
        escrowId: request.escrowId,
        uploadedBy: request.uploadedBy,
        filename,
        originalFilename: request.file.originalFilename,
        type: request.type,
        size: request.file.size,
        mimeType: request.file.mimeType,
        encryptionKey: encryptedFile.encryptionKey,
        storageUrl: uploadData.path,
        checksum: encryptedFile.checksum,
        isPublic: request.isPublic || false,
        expiresAt: request.expiresAt?.toISOString(),
        createdAt: new Date().toISOString(),
      };

      const { data: document, error } = await supabase
        .from('escrow_documents')
        .insert(documentInsert)
        .select()
        .single();

      if (error) {
        // Cleanup uploaded file if database insert fails
        await supabase.storage.from('documents').remove([storagePath]);
        throw new EscrowError('Failed to store document metadata', 'DB_ERROR', 500, error);
      }

      // Log upload
      await this.logDocumentAccess({
        documentId: document.id,
        userId: request.uploadedBy,
        action: 'uploaded',
        details: {
          originalFilename: request.file.originalFilename,
          type: request.type,
          size: request.file.size,
        },
        timestamp: new Date(),
      });

      return document;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to upload document', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Download and decrypt document
   */
  async downloadDocument(
    documentId: string,
    requestedBy: string,
    auditInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ data: Buffer; document: SecureDocument }> {
    try {
      // Get document metadata
      const { data: document, error: docError } = await supabase
        .from('escrow_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        throw new EscrowError('Document not found', 'NOT_FOUND', 404);
      }

      // Validate access permissions
      await this.validateDocumentAccess(document, requestedBy);

      // Check if document has expired
      if (document.expiresAt && new Date(document.expiresAt) < new Date()) {
        throw new EscrowError('Document has expired', 'EXPIRED', 410);
      }

      // Download encrypted file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.storageUrl);

      if (downloadError || !fileData) {
        throw new EscrowError('Failed to download document', 'STORAGE_ERROR', 500, downloadError);
      }

      // Decrypt file
      const encryptedBuffer = await fileData.arrayBuffer();
      const decryptedData = await this.decryptFile(
        Buffer.from(encryptedBuffer),
        document.encryptionKey
      );

      // Verify checksum
      const calculatedChecksum = crypto
        .createHash('sha256')
        .update(decryptedData)
        .digest('hex');

      if (calculatedChecksum !== document.checksum) {
        throw new EscrowError('Document integrity check failed', 'INTEGRITY_ERROR', 500);
      }

      // Log access
      await this.logDocumentAccess({
        documentId: document.id,
        userId: requestedBy,
        action: 'downloaded',
        details: {
          filename: document.originalFilename,
          size: document.size,
        },
        timestamp: new Date(),
        ipAddress: auditInfo?.ipAddress,
        userAgent: auditInfo?.userAgent,
      });

      return { data: decryptedData, document };
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to download document', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Get documents for an escrow
   */
  async getEscrowDocuments(
    escrowId: string,
    requestedBy: string,
    includePrivate: boolean = false
  ): Promise<SecureDocument[]> {
    try {
      // Validate escrow access
      await this.validateEscrowAccess(escrowId, requestedBy);

      let query = supabase
        .from('escrow_documents')
        .select('*')
        .eq('escrowId', escrowId)
        .order('createdAt', { ascending: false });

      // Filter by visibility if not including private documents
      if (!includePrivate) {
        query = query.eq('isPublic', true);
      }

      const { data: documents, error } = await query;

      if (error) {
        throw new EscrowError('Failed to fetch documents', 'DB_ERROR', 500, error);
      }

      // Filter out expired documents
      const validDocuments = (documents || []).filter(doc => 
        !doc.expiresAt || new Date(doc.expiresAt) > new Date()
      );

      return validDocuments;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to get escrow documents', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Share document with specific users
   */
  async shareDocument(
    documentId: string,
    sharedBy: string,
    sharingSettings: Omit<DocumentSharingSettings, 'documentId'>
  ): Promise<DocumentSharingSettings> {
    try {
      // Get document
      const { data: document, error: docError } = await supabase
        .from('escrow_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        throw new EscrowError('Document not found', 'NOT_FOUND', 404);
      }

      // Validate sharing permissions
      await this.validateDocumentAccess(document, sharedBy);

      const sharing: DocumentSharingSettings = {
        documentId,
        ...sharingSettings,
      };

      // Store sharing settings (this would typically go in a separate table)
      // For now, we'll log the sharing event
      await this.logDocumentAccess({
        documentId,
        userId: sharedBy,
        action: 'shared',
        details: {
          allowedUsers: sharingSettings.allowedUsers,
          expiresAt: sharingSettings.expiresAt?.toISOString(),
          downloadLimit: sharingSettings.downloadLimit,
          watermark: sharingSettings.watermark,
        },
        timestamp: new Date(),
      });

      return sharing;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to share document', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(
    documentId: string,
    deletedBy: string,
    reason?: string
  ): Promise<void> {
    try {
      // Get document
      const { data: document, error: docError } = await supabase
        .from('escrow_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        throw new EscrowError('Document not found', 'NOT_FOUND', 404);
      }

      // Validate deletion permissions (only uploader or admin can delete)
      if (document.uploadedBy !== deletedBy) {
        throw new ValidationError('Only the document uploader can delete this document');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.storageUrl]);

      if (storageError) {
        console.error('Failed to delete file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('escrow_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw new EscrowError('Failed to delete document metadata', 'DB_ERROR', 500, dbError);
      }

      // Log deletion
      await this.logDocumentAccess({
        documentId,
        userId: deletedBy,
        action: 'deleted',
        details: {
          filename: document.originalFilename,
          reason: reason || 'No reason provided',
        },
        timestamp: new Date(),
      });
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to delete document', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Get document audit trail
   */
  async getDocumentAuditTrail(
    documentId: string,
    requestedBy: string
  ): Promise<DocumentAuditEntry[]> {
    try {
      // Get document to validate access
      const { data: document, error: docError } = await supabase
        .from('escrow_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        throw new EscrowError('Document not found', 'NOT_FOUND', 404);
      }

      // Validate access permissions
      await this.validateDocumentAccess(document, requestedBy);

      // Get audit logs
      const { data: auditLogs, error } = await supabase
        .from('escrow_audit_logs')
        .select('*')
        .eq('escrowId', document.escrowId)
        .ilike('details', `%${documentId}%`)
        .order('createdAt', { ascending: false });

      if (error) {
        throw new EscrowError('Failed to fetch audit trail', 'DB_ERROR', 500, error);
      }

      // Filter and format audit entries
      const documentAuditEntries: DocumentAuditEntry[] = (auditLogs || [])
        .filter(log => log.details && log.details.documentId === documentId)
        .map(log => ({
          documentId,
          userId: log.userId,
          action: log.action as DocumentAuditEntry['action'],
          details: log.details,
          timestamp: new Date(log.createdAt),
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
        }));

      return documentAuditEntries;
    } catch (error) {
      if (error instanceof EscrowError) throw error;
      throw new EscrowError('Failed to get document audit trail', 'SYSTEM_ERROR', 500, error);
    }
  }

  /**
   * Encrypt file data
   */
  private async encryptFile(data: Buffer): Promise<EncryptedFileData> {
    try {
      // Generate random encryption key and IV
      const encryptionKey = crypto.randomBytes(32).toString('hex');
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipher(this.encryptionAlgorithm, encryptionKey);
      cipher.setAutoPadding(true);

      // Encrypt data
      const encryptedChunks: Buffer[] = [];
      encryptedChunks.push(cipher.update(data));
      encryptedChunks.push(cipher.final());

      const encryptedData = Buffer.concat(encryptedChunks);

      // Calculate checksum of original data
      const checksum = crypto.createHash('sha256').update(data).digest('hex');

      return {
        encryptedData,
        encryptionKey,
        iv: iv.toString('hex'),
        checksum,
      };
    } catch (error) {
      throw new EscrowError('Failed to encrypt file', 'ENCRYPTION_ERROR', 500, error);
    }
  }

  /**
   * Decrypt file data
   */
  private async decryptFile(encryptedData: Buffer, encryptionKey: string): Promise<Buffer> {
    try {
      // Create decipher
      const decipher = crypto.createDecipher(this.encryptionAlgorithm, encryptionKey);
      decipher.setAutoPadding(true);

      // Decrypt data
      const decryptedChunks: Buffer[] = [];
      decryptedChunks.push(decipher.update(encryptedData));
      decryptedChunks.push(decipher.final());

      return Buffer.concat(decryptedChunks);
    } catch (error) {
      throw new EscrowError('Failed to decrypt file', 'DECRYPTION_ERROR', 500, error);
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: { buffer: Buffer; originalFilename: string; mimeType: string; size: number }): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new ValidationError(`File size exceeds maximum allowed: ${this.maxFileSize} bytes`);
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimeType)) {
      throw new ValidationError(`File type not allowed: ${file.mimeType}`);
    }

    // Check filename
    if (!file.originalFilename || file.originalFilename.length > 255) {
      throw new ValidationError('Invalid filename');
    }

    // Basic security checks
    if (file.originalFilename.includes('..') || file.originalFilename.includes('/')) {
      throw new ValidationError('Invalid characters in filename');
    }
  }

  /**
   * Validate escrow access
   */
  private async validateEscrowAccess(escrowId: string, userId: string): Promise<void> {
    const { data: escrow, error } = await supabase
      .from('escrow_transactions')
      .select('buyerId, sellerId')
      .eq('id', escrowId)
      .single();

    if (error || !escrow) {
      throw new EscrowError('Escrow transaction not found', 'NOT_FOUND', 404);
    }

    if (![escrow.buyerId, escrow.sellerId].includes(userId)) {
      throw new ValidationError('Access denied: not a party to this escrow');
    }
  }

  /**
   * Validate document access
   */
  private async validateDocumentAccess(document: SecureDocument, userId: string): Promise<void> {
    // Check if user is part of the escrow
    await this.validateEscrowAccess(document.escrowId, userId);

    // Additional checks for private documents
    if (!document.isPublic && document.uploadedBy !== userId) {
      throw new ValidationError('Access denied: private document');
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '';
  }

  /**
   * Log document access event
   */
  private async logDocumentAccess(entry: DocumentAuditEntry): Promise<void> {
    try {
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId: entry.details.escrowId || 'unknown',
          userId: entry.userId,
          action: `DOCUMENT_${entry.action.toUpperCase()}`,
          details: {
            documentId: entry.documentId,
            ...entry.details,
          },
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          createdAt: entry.timestamp.toISOString(),
        });
    } catch (error) {
      console.error('Failed to log document access:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }
}

// Export singleton instance
export const documentVaultService = new DocumentVaultService();
export default DocumentVaultService;