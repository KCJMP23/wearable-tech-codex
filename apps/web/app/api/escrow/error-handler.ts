/**
 * Comprehensive error handling and audit logging for escrow system
 * Centralized error management, logging, and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  EscrowError, 
  PaymentError, 
  ValidationError, 
  AuthorizationError, 
  NotFoundError,
  EscrowApiResponse 
} from './types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ErrorContext {
  userId?: string;
  escrowId?: string;
  action?: string;
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
  timestamp: Date;
  traceId?: string;
}

export interface AuditLogEntry {
  escrowId: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  level: 'info' | 'warn' | 'error' | 'security';
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: Date;
}

export interface SecurityEvent {
  type: 'unauthorized_access' | 'suspicious_activity' | 'data_breach' | 'fraud_attempt' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  escrowId?: string;
  details: Record<string, any>;
  timestamp: Date;
  requiresInvestigation: boolean;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  errorRate: number;
  averageResponseTime: number;
  criticalErrors: number;
  securityEvents: number;
}

export class ErrorHandlerService {
  private enableDetailedLogging: boolean;
  private enableSecurityMonitoring: boolean;
  private enablePerformanceMonitoring: boolean;
  private alertThresholds: {
    errorRate: number;
    responseTime: number;
    securityEvents: number;
  };

  constructor() {
    this.enableDetailedLogging = process.env.ENABLE_DETAILED_LOGGING === 'true';
    this.enableSecurityMonitoring = process.env.ENABLE_SECURITY_MONITORING === 'true';
    this.enablePerformanceMonitoring = process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
    this.alertThresholds = {
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.05'), // 5%
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '5000'), // 5 seconds
      securityEvents: parseInt(process.env.SECURITY_EVENTS_THRESHOLD || '10'), // 10 per hour
    };
  }

  /**
   * Handle API errors with comprehensive logging and response formatting
   */
  async handleApiError(
    error: unknown,
    context: ErrorContext,
    request?: NextRequest
  ): Promise<NextResponse> {
    const startTime = Date.now();
    
    try {
      // Extract request context
      const requestContext = this.extractRequestContext(request);
      const enrichedContext = { ...context, ...requestContext };

      // Classify and process the error
      const processedError = this.processError(error, enrichedContext);

      // Log the error
      await this.logError(processedError, enrichedContext);

      // Check for security implications
      if (this.enableSecurityMonitoring) {
        await this.checkSecurityImplications(processedError, enrichedContext);
      }

      // Create API response
      const response = this.createErrorResponse(processedError);

      // Log performance metrics
      if (this.enablePerformanceMonitoring) {
        await this.logPerformanceMetrics(enrichedContext, Date.now() - startTime, false);
      }

      return NextResponse.json(response, { 
        status: processedError.statusCode || 500,
        headers: {
          'X-Error-ID': enrichedContext.traceId || '',
          'X-Timestamp': enrichedContext.timestamp.toISOString(),
        }
      });

    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
      
      // Fallback error response
      const fallbackResponse: EscrowApiResponse = {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'An unexpected error occurred',
        },
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(fallbackResponse, { status: 500 });
    }
  }

  /**
   * Process and classify errors
   */
  private processError(error: unknown, context: ErrorContext): EscrowError {
    if (error instanceof EscrowError) {
      return error;
    }

    if (error instanceof Error) {
      // Map common error types
      if (error.name === 'ValidationError' || error.message.includes('validation')) {
        return new ValidationError(error.message);
      }

      if (error.message.includes('unauthorized') || error.message.includes('access denied')) {
        return new AuthorizationError(error.message);
      }

      if (error.message.includes('not found')) {
        return new NotFoundError('Resource');
      }

      if (error.message.includes('stripe') || error.message.includes('payment')) {
        return new PaymentError(error.message, { originalError: error.message });
      }

      // Generic error mapping
      return new EscrowError(
        error.message || 'An unexpected error occurred',
        'SYSTEM_ERROR',
        500,
        { originalError: error.message, stack: error.stack }
      );
    }

    // Unknown error type
    return new EscrowError(
      'An unknown error occurred',
      'UNKNOWN_ERROR',
      500,
      { error: String(error) }
    );
  }

  /**
   * Extract request context for logging
   */
  private extractRequestContext(request?: NextRequest): Partial<ErrorContext> {
    if (!request) return {};

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Don't log sensitive headers
      if (!this.isSensitiveHeader(key)) {
        headers[key] = value;
      }
    });

    return {
      request: {
        method: request.method,
        url: request.url,
        headers,
      },
      traceId: request.headers.get('x-trace-id') || this.generateTraceId(),
    };
  }

  /**
   * Check if header contains sensitive information
   */
  private isSensitiveHeader(headerName: string): boolean {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'stripe-signature',
      'x-forwarded-for'
    ];
    return sensitiveHeaders.includes(headerName.toLowerCase());
  }

  /**
   * Generate unique trace ID for error tracking
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log error with comprehensive details
   */
  private async logError(error: EscrowError, context: ErrorContext): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        escrowId: context.escrowId || 'system',
        userId: context.userId || 'anonymous',
        action: 'ERROR_OCCURRED',
        details: {
          errorCode: error.code,
          errorMessage: error.message,
          statusCode: error.statusCode,
          errorDetails: error.details,
          context: {
            action: context.action,
            traceId: context.traceId,
            method: context.request?.method,
            url: context.request?.url,
            userAgent: context.request?.headers['user-agent'],
          },
          stack: this.enableDetailedLogging ? error.stack : undefined,
        },
        level: this.getErrorLevel(error),
        ipAddress: this.extractClientIP(context.request?.headers),
        userAgent: context.request?.headers['user-agent'],
        timestamp: context.timestamp,
      };

      await this.writeAuditLog(logEntry);

      // Also log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.error('Escrow Error:', {
          code: error.code,
          message: error.message,
          context: context.action,
          traceId: context.traceId,
        });
      }

    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  /**
   * Determine error severity level
   */
  private getErrorLevel(error: EscrowError): AuditLogEntry['level'] {
    if (error instanceof AuthorizationError) return 'security';
    if (error instanceof PaymentError) return 'error';
    if (error instanceof ValidationError) return 'warn';
    if (error.statusCode >= 500) return 'error';
    return 'info';
  }

  /**
   * Extract client IP address
   */
  private extractClientIP(headers?: Record<string, string>): string | undefined {
    if (!headers) return undefined;
    
    return headers['x-forwarded-for']?.split(',')[0].trim() ||
           headers['x-real-ip'] ||
           headers['cf-connecting-ip'] ||
           undefined;
  }

  /**
   * Check for security implications and log security events
   */
  private async checkSecurityImplications(
    error: EscrowError,
    context: ErrorContext
  ): Promise<void> {
    try {
      let securityEvent: SecurityEvent | null = null;

      // Detect potential security issues
      if (error instanceof AuthorizationError) {
        securityEvent = {
          type: 'unauthorized_access',
          severity: 'medium',
          userId: context.userId,
          escrowId: context.escrowId,
          details: {
            errorCode: error.code,
            errorMessage: error.message,
            endpoint: context.request?.url,
            method: context.request?.method,
            ipAddress: this.extractClientIP(context.request?.headers),
          },
          timestamp: context.timestamp,
          requiresInvestigation: false,
        };
      }

      // Check for suspicious patterns
      if (this.detectSuspiciousActivity(error, context)) {
        securityEvent = {
          type: 'suspicious_activity',
          severity: 'high',
          userId: context.userId,
          escrowId: context.escrowId,
          details: {
            pattern: 'repeated_failures',
            errorCode: error.code,
            ipAddress: this.extractClientIP(context.request?.headers),
            context: context.action,
          },
          timestamp: context.timestamp,
          requiresInvestigation: true,
        };
      }

      // Check for fraud indicators
      if (error instanceof PaymentError && this.detectFraudIndicators(error, context)) {
        securityEvent = {
          type: 'fraud_attempt',
          severity: 'critical',
          userId: context.userId,
          escrowId: context.escrowId,
          details: {
            errorDetails: error.details,
            suspiciousIndicators: 'payment_failure_pattern',
          },
          timestamp: context.timestamp,
          requiresInvestigation: true,
        };
      }

      if (securityEvent) {
        await this.logSecurityEvent(securityEvent);
      }

    } catch (securityError) {
      console.error('Failed to check security implications:', securityError);
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  private detectSuspiciousActivity(error: EscrowError, context: ErrorContext): boolean {
    // This would typically implement more sophisticated detection logic
    // For now, we'll check for repeated authorization failures
    return error instanceof AuthorizationError && 
           context.userId !== undefined &&
           error.message.includes('repeated');
  }

  /**
   * Detect fraud indicators in payment errors
   */
  private detectFraudIndicators(error: PaymentError, context: ErrorContext): boolean {
    // This would implement fraud detection logic
    // For now, we'll check for specific payment error patterns
    const fraudPatterns = [
      'card_declined',
      'insufficient_funds',
      'stolen_card',
      'lost_card'
    ];

    return fraudPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern) ||
      error.details?.originalError?.toLowerCase().includes(pattern)
    );
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        escrowId: event.escrowId || 'system',
        userId: event.userId || 'system',
        action: 'SECURITY_EVENT',
        details: {
          securityEventType: event.type,
          severity: event.severity,
          requiresInvestigation: event.requiresInvestigation,
          eventDetails: event.details,
        },
        level: 'security',
        timestamp: event.timestamp,
      };

      await this.writeAuditLog(auditEntry);

      // Alert security team for critical events
      if (event.severity === 'critical' || event.requiresInvestigation) {
        await this.alertSecurityTeam(event);
      }

    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Alert security team for critical events
   */
  private async alertSecurityTeam(event: SecurityEvent): Promise<void> {
    try {
      // This would typically integrate with alerting systems like PagerDuty, Slack, etc.
      console.warn('SECURITY ALERT:', {
        type: event.type,
        severity: event.severity,
        details: event.details,
        timestamp: event.timestamp,
      });

      // Store alert in database for tracking
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId: 'security_system',
          userId: 'security_team',
          action: 'SECURITY_ALERT_SENT',
          details: {
            alertType: event.type,
            severity: event.severity,
            originalEvent: event,
          },
          createdAt: new Date().toISOString(),
        });

    } catch (error) {
      console.error('Failed to alert security team:', error);
    }
  }

  /**
   * Log performance metrics
   */
  private async logPerformanceMetrics(
    context: ErrorContext,
    responseTime: number,
    success: boolean
  ): Promise<void> {
    try {
      const performanceEntry: AuditLogEntry = {
        escrowId: context.escrowId || 'system',
        userId: context.userId || 'anonymous',
        action: 'PERFORMANCE_METRIC',
        details: {
          responseTime,
          success,
          endpoint: context.request?.url,
          method: context.request?.method,
          timestamp: context.timestamp,
        },
        level: 'info',
        timestamp: context.timestamp,
      };

      await this.writeAuditLog(performanceEntry);

      // Check for performance alerts
      if (responseTime > this.alertThresholds.responseTime) {
        await this.alertPerformanceIssue(context, responseTime);
      }

    } catch (error) {
      console.error('Failed to log performance metrics:', error);
    }
  }

  /**
   * Alert on performance issues
   */
  private async alertPerformanceIssue(context: ErrorContext, responseTime: number): Promise<void> {
    console.warn('PERFORMANCE ALERT:', {
      endpoint: context.request?.url,
      responseTime,
      threshold: this.alertThresholds.responseTime,
    });
  }

  /**
   * Write audit log entry to database
   */
  private async writeAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      await supabase
        .from('escrow_audit_logs')
        .insert({
          escrowId: entry.escrowId,
          userId: entry.userId,
          action: entry.action,
          details: entry.details,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          createdAt: entry.timestamp.toISOString(),
        });
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Store in memory or alternative storage as fallback
    }
  }

  /**
   * Create formatted error response
   */
  private createErrorResponse(error: EscrowError): EscrowApiResponse {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: this.enableDetailedLogging ? error.details : undefined,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get error metrics for monitoring dashboard
   */
  async getErrorMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ErrorMetrics> {
    try {
      const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const end = endDate || new Date();

      const { data: errorLogs, error } = await supabase
        .from('escrow_audit_logs')
        .select('*')
        .eq('action', 'ERROR_OCCURRED')
        .gte('createdAt', start.toISOString())
        .lte('createdAt', end.toISOString());

      if (error) {
        throw new EscrowError('Failed to fetch error metrics', 'DB_ERROR', 500, error);
      }

      const totalErrors = errorLogs?.length || 0;
      
      const errorsByType: Record<string, number> = {};
      const errorsByEndpoint: Record<string, number> = {};
      let criticalErrors = 0;

      errorLogs?.forEach(log => {
        const errorCode = log.details?.errorCode;
        const endpoint = log.details?.context?.url;
        const level = log.details?.level;

        if (errorCode) {
          errorsByType[errorCode] = (errorsByType[errorCode] || 0) + 1;
        }

        if (endpoint) {
          errorsByEndpoint[endpoint] = (errorsByEndpoint[endpoint] || 0) + 1;
        }

        if (level === 'error' || level === 'security') {
          criticalErrors++;
        }
      });

      // Get total requests for error rate calculation
      const { data: allLogs } = await supabase
        .from('escrow_audit_logs')
        .select('id')
        .gte('createdAt', start.toISOString())
        .lte('createdAt', end.toISOString());

      const totalRequests = allLogs?.length || 1;
      const errorRate = totalErrors / totalRequests;

      // Get security events
      const { data: securityEvents } = await supabase
        .from('escrow_audit_logs')
        .select('id')
        .eq('action', 'SECURITY_EVENT')
        .gte('createdAt', start.toISOString())
        .lte('createdAt', end.toISOString());

      return {
        totalErrors,
        errorsByType,
        errorsByEndpoint,
        errorRate,
        averageResponseTime: 0, // Would calculate from performance metrics
        criticalErrors,
        securityEvents: securityEvents?.length || 0,
      };

    } catch (error) {
      console.error('Failed to get error metrics:', error);
      throw error;
    }
  }

  /**
   * Create audit log for successful operations
   */
  async logSuccess(
    escrowId: string,
    userId: string,
    action: string,
    details: Record<string, any>,
    request?: NextRequest
  ): Promise<void> {
    try {
      const context = this.extractRequestContext(request);
      
      const auditEntry: AuditLogEntry = {
        escrowId,
        userId,
        action,
        details,
        level: 'info',
        ipAddress: this.extractClientIP(context.request?.headers),
        userAgent: context.request?.headers['user-agent'],
        timestamp: new Date(),
      };

      await this.writeAuditLog(auditEntry);
    } catch (error) {
      console.error('Failed to log success:', error);
    }
  }
}

// Export singleton instance
export const errorHandlerService = new ErrorHandlerService();

// Middleware wrapper for API routes
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      const result = await handler(request, context);
      
      // Log successful operation
      if (errorHandlerService['enablePerformanceMonitoring']) {
        await errorHandlerService['logPerformanceMetrics'](
          {
            timestamp: new Date(),
            request: {
              method: request.method,
              url: request.url,
              headers: {},
            },
          },
          Date.now() - startTime,
          true
        );
      }
      
      return result;
    } catch (error) {
      return errorHandlerService.handleApiError(error, {
        timestamp: new Date(),
        action: `${request.method} ${request.url}`,
      }, request);
    }
  };
}

export default ErrorHandlerService;