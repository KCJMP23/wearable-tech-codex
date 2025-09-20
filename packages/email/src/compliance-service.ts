import { createClient } from '@supabase/supabase-js';
import { Subscriber, ComplianceConfig } from './types';

export interface UnsubscribeRequest {
  email: string;
  token?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  source: 'email_link' | 'web_form' | 'api' | 'admin';
}

export interface ConsentRecord {
  subscriberId: string;
  consentType: 'opt_in' | 'opt_out' | 'data_processing' | 'marketing';
  consent: boolean;
  ipAddress?: string;
  userAgent?: string;
  source: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface DataRequest {
  id: string;
  subscriberId: string;
  requestType: 'access' | 'deletion' | 'rectification' | 'portability';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  metadata?: Record<string, any>;
}

export interface SuppressionList {
  email: string;
  reason: 'unsubscribe' | 'bounce' | 'complaint' | 'manual' | 'gdpr';
  addedAt: Date;
  source: string;
  metadata?: Record<string, any>;
}

export class ComplianceService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Handle unsubscribe requests
   */
  async processUnsubscribe(
    tenantId: string,
    request: UnsubscribeRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find subscriber by email or token
      let subscriber;
      
      if (request.token) {
        // Decrypt/decode token to get subscriber ID
        const subscriberId = this.decodeUnsubscribeToken(request.token);
        if (!subscriberId) {
          return { success: false, error: 'Invalid unsubscribe token' };
        }
        
        const { data } = await this.supabase
          .from('email_subscribers')
          .select('*')
          .eq('id', subscriberId)
          .eq('tenant_id', tenantId)
          .single();
        
        subscriber = data;
      } else {
        const { data } = await this.supabase
          .from('email_subscribers')
          .select('*')
          .eq('email', request.email)
          .eq('tenant_id', tenantId)
          .single();
        
        subscriber = data;
      }

      if (!subscriber) {
        return { success: false, error: 'Subscriber not found' };
      }

      // Update subscriber status
      const { error: updateError } = await this.supabase
        .from('email_subscribers')
        .update({
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString(),
          unsubscribe_reason: request.reason,
        })
        .eq('id', subscriber.id);

      if (updateError) {
        throw updateError;
      }

      // Add to suppression list
      await this.addToSuppressionList({
        email: subscriber.email,
        reason: 'unsubscribe',
        addedAt: new Date(),
        source: request.source,
        metadata: {
          reason: request.reason,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
        },
      });

      // Log consent record
      await this.recordConsent({
        subscriberId: subscriber.id,
        consentType: 'opt_out',
        consent: false,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        source: request.source,
        timestamp: new Date(),
        metadata: { reason: request.reason },
      });

      // Remove from all active campaigns
      await this.removeFromActiveCampaigns(subscriber.id);

      return { success: true };
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate secure unsubscribe token
   */
  generateUnsubscribeToken(subscriberId: string): string {
    // In production, use proper encryption/JWT
    return Buffer.from(`${subscriberId}:${Date.now()}`).toString('base64');
  }

  /**
   * Decode unsubscribe token
   */
  private decodeUnsubscribeToken(token: string): string | null {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [subscriberId] = decoded.split(':');
      return subscriberId;
    } catch {
      return null;
    }
  }

  /**
   * Add email to suppression list
   */
  async addToSuppressionList(suppression: SuppressionList): Promise<void> {
    await this.supabase
      .from('email_suppressions')
      .upsert({
        email: suppression.email.toLowerCase(),
        reason: suppression.reason,
        added_at: suppression.addedAt.toISOString(),
        source: suppression.source,
        metadata: suppression.metadata,
      });
  }

  /**
   * Check if email is suppressed
   */
  async isEmailSuppressed(email: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('email_suppressions')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    return !!data;
  }

  /**
   * Record consent
   */
  async recordConsent(consent: ConsentRecord): Promise<void> {
    await this.supabase
      .from('email_consent_records')
      .insert({
        subscriber_id: consent.subscriberId,
        consent_type: consent.consentType,
        consent: consent.consent,
        ip_address: consent.ipAddress,
        user_agent: consent.userAgent,
        source: consent.source,
        timestamp: consent.timestamp.toISOString(),
        metadata: consent.metadata,
      });
  }

  /**
   * Get consent history for subscriber
   */
  async getConsentHistory(subscriberId: string): Promise<ConsentRecord[]> {
    const { data } = await this.supabase
      .from('email_consent_records')
      .select('*')
      .eq('subscriber_id', subscriberId)
      .order('timestamp', { ascending: false });

    return (data || []).map(record => ({
      subscriberId: record.subscriber_id,
      consentType: record.consent_type,
      consent: record.consent,
      ipAddress: record.ip_address,
      userAgent: record.user_agent,
      source: record.source,
      timestamp: new Date(record.timestamp),
      metadata: record.metadata,
    }));
  }

  /**
   * Handle GDPR data requests
   */
  async processDataRequest(
    tenantId: string,
    requestType: 'access' | 'deletion' | 'rectification' | 'portability',
    email: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Find subscriber
      const { data: subscriber } = await this.supabase
        .from('email_subscribers')
        .select('*')
        .eq('email', email)
        .eq('tenant_id', tenantId)
        .single();

      if (!subscriber) {
        return { success: false, error: 'Subscriber not found' };
      }

      // Create data request
      const { data: request, error } = await this.supabase
        .from('email_data_requests')
        .insert({
          tenant_id: tenantId,
          subscriber_id: subscriber.id,
          request_type: requestType,
          status: 'pending',
          requested_at: new Date().toISOString(),
          metadata,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Process request based on type
      switch (requestType) {
        case 'deletion':
          await this.processDataDeletion(request.id, subscriber.id);
          break;
        case 'access':
          await this.processDataAccess(request.id, subscriber.id);
          break;
        case 'portability':
          await this.processDataPortability(request.id, subscriber.id);
          break;
        case 'rectification':
          // Requires manual review
          break;
      }

      return { success: true, requestId: request.id };
    } catch (error) {
      console.error('Data request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process data deletion request (Right to be forgotten)
   */
  private async processDataDeletion(requestId: string, subscriberId: string): Promise<void> {
    try {
      // Update request status
      await this.supabase
        .from('email_data_requests')
        .update({ status: 'processing' })
        .eq('id', requestId);

      // Anonymize subscriber data (keep for analytics but remove PII)
      await this.supabase
        .from('email_subscribers')
        .update({
          email: `deleted_${subscriberId}@deleted.local`,
          first_name: null,
          last_name: null,
          custom_fields: null,
          status: 'deleted',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', subscriberId);

      // Add to suppression list to prevent re-subscription
      const { data: originalSubscriber } = await this.supabase
        .from('email_subscribers')
        .select('email')
        .eq('id', subscriberId)
        .single();

      if (originalSubscriber) {
        await this.addToSuppressionList({
          email: originalSubscriber.email,
          reason: 'gdpr',
          addedAt: new Date(),
          source: 'data_deletion_request',
          metadata: { requestId },
        });
      }

      // Mark request as completed
      await this.supabase
        .from('email_data_requests')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
    } catch (error) {
      console.error('Data deletion error:', error);
      
      // Mark request as failed
      await this.supabase
        .from('email_data_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        })
        .eq('id', requestId);
    }
  }

  /**
   * Process data access request
   */
  private async processDataAccess(requestId: string, subscriberId: string): Promise<void> {
    try {
      // Collect all data related to subscriber
      const [subscriber, analytics, consents, campaigns] = await Promise.all([
        this.supabase
          .from('email_subscribers')
          .select('*')
          .eq('id', subscriberId)
          .single(),
        this.supabase
          .from('email_analytics')
          .select('*')
          .eq('subscriber_id', subscriberId),
        this.supabase
          .from('email_consent_records')
          .select('*')
          .eq('subscriber_id', subscriberId),
        this.supabase
          .from('email_analytics')
          .select('campaign_id, event, timestamp')
          .eq('subscriber_id', subscriberId)
          .eq('event', 'sent'),
      ]);

      const dataExport = {
        personal_data: subscriber.data,
        email_analytics: analytics.data,
        consent_history: consents.data,
        campaign_history: campaigns.data,
        export_date: new Date().toISOString(),
      };

      // Store export data
      await this.supabase
        .from('email_data_requests')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          metadata: { data_export: dataExport },
        })
        .eq('id', requestId);
    } catch (error) {
      console.error('Data access error:', error);
      
      await this.supabase
        .from('email_data_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        })
        .eq('id', requestId);
    }
  }

  /**
   * Process data portability request
   */
  private async processDataPortability(requestId: string, subscriberId: string): Promise<void> {
    // Similar to data access but in a portable format (JSON/CSV)
    await this.processDataAccess(requestId, subscriberId);
  }

  /**
   * Validate email content for compliance
   */
  async validateEmailCompliance(
    htmlContent: string,
    config: ComplianceConfig
  ): Promise<{
    isCompliant: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for unsubscribe link
    if (!htmlContent.toLowerCase().includes('unsubscribe')) {
      issues.push('Missing unsubscribe link');
    }

    // Check for physical address (CAN-SPAM requirement)
    if (config.canSpamCompliant && !htmlContent.includes(config.companyAddress)) {
      issues.push('Missing company physical address (CAN-SPAM requirement)');
    }

    // Check for sender identification
    if (!htmlContent.includes(config.companyName)) {
      suggestions.push('Consider including company name for better identification');
    }

    // Check for privacy policy link (GDPR)
    if (config.gdprCompliant && !htmlContent.includes('privacy')) {
      suggestions.push('Consider adding privacy policy link for GDPR compliance');
    }

    // Check for clear sender identification in subject
    // This would need additional subject line parameter

    return {
      isCompliant: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Remove subscriber from active campaigns
   */
  private async removeFromActiveCampaigns(subscriberId: string): Promise<void> {
    // Remove from automation executions
    await this.supabase
      .from('email_automation_executions')
      .update({ status: 'cancelled' })
      .eq('subscriber_id', subscriberId)
      .eq('status', 'active');

    // Remove from scheduled campaigns (if any)
    // This would depend on your campaign scheduling implementation
  }

  /**
   * Get compliance dashboard metrics
   */
  async getComplianceMetrics(tenantId: string): Promise<{
    totalUnsubscribes: number;
    unsubscribeRate: number;
    suppressedEmails: number;
    pendingDataRequests: number;
    consentRecords: number;
    recentComplaints: number;
  }> {
    const [
      unsubscribes,
      suppressions,
      dataRequests,
      consents,
      complaints,
      totalSubscribers,
    ] = await Promise.all([
      this.supabase
        .from('email_subscribers')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('status', 'unsubscribed'),
      this.supabase
        .from('email_suppressions')
        .select('id', { count: 'exact' }),
      this.supabase
        .from('email_data_requests')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending'),
      this.supabase
        .from('email_consent_records')
        .select('id', { count: 'exact' }),
      this.supabase
        .from('email_analytics')
        .select('id', { count: 'exact' })
        .eq('event', 'complained')
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      this.supabase
        .from('email_subscribers')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId),
    ]);

    const totalUnsubscribes = unsubscribes.count || 0;
    const total = totalSubscribers.count || 0;
    const unsubscribeRate = total > 0 ? (totalUnsubscribes / total) * 100 : 0;

    return {
      totalUnsubscribes,
      unsubscribeRate,
      suppressedEmails: suppressions.count || 0,
      pendingDataRequests: dataRequests.count || 0,
      consentRecords: consents.count || 0,
      recentComplaints: complaints.count || 0,
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    tenantId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    reportId: string;
    generatedAt: Date;
    metrics: any;
    recommendations: string[];
  }> {
    const metrics = await this.getComplianceMetrics(tenantId);
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (metrics.unsubscribeRate > 2) {
      recommendations.push('Unsubscribe rate is high - review email frequency and content relevance');
    }

    if (metrics.recentComplaints > 5) {
      recommendations.push('Multiple spam complaints detected - review sender reputation');
    }

    if (metrics.pendingDataRequests > 0) {
      recommendations.push(`${metrics.pendingDataRequests} pending data requests require attention`);
    }

    return {
      reportId: `compliance_${Date.now()}`,
      generatedAt: new Date(),
      metrics,
      recommendations,
    };
  }
}