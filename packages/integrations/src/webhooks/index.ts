import crypto from 'crypto';
import { AffiliateNetworkAdapterFactory } from '../factory';
import {
  AffiliateNetworkType,
  AffiliateNetworkConfig,
  WebhookPayload,
  WebhookEventType,
  AffiliateNetworkError,
} from '../types';

export interface WebhookRequest {
  headers: Record<string, string>;
  body: string;
  rawBody: Buffer;
  query?: Record<string, string>;
}

export interface WebhookHandlerResult {
  success: boolean;
  eventType?: WebhookEventType;
  data?: any;
  error?: string;
  shouldRetry?: boolean;
}

/**
 * Unified webhook handler for all affiliate networks
 * Routes webhooks to appropriate network adapters and handles common functionality
 */
export class AffiliateWebhookHandler {
  private configs: Map<string, AffiliateNetworkConfig> = new Map();

  constructor(configs: AffiliateNetworkConfig[]) {
    // Index configs by network type for quick lookup
    configs.forEach(config => {
      this.configs.set(config.networkType, config);
    });
  }

  /**
   * Handle incoming webhook from any affiliate network
   */
  async handleWebhook(
    networkType: AffiliateNetworkType,
    request: WebhookRequest
  ): Promise<WebhookHandlerResult> {
    try {
      const config = this.configs.get(networkType);
      if (!config) {
        return {
          success: false,
          error: `No configuration found for network: ${networkType}`,
          shouldRetry: false,
        };
      }

      if (!config.settings.enableWebhooks) {
        return {
          success: false,
          error: `Webhooks not enabled for network: ${networkType}`,
          shouldRetry: false,
        };
      }

      // Create adapter and validate webhook
      const adapter = AffiliateNetworkAdapterFactory.create(config);
      
      // Validate webhook signature if required
      if (this.requiresSignatureValidation(networkType)) {
        const isValid = await this.validateWebhookSignature(
          networkType,
          request,
          adapter
        );

        if (!isValid) {
          return {
            success: false,
            error: 'Invalid webhook signature',
            shouldRetry: false,
          };
        }
      }

      // Parse webhook payload
      const payload = await this.parseWebhookPayload(networkType, request);
      
      // Handle the webhook
      await adapter.handleWebhook(payload);

      return {
        success: true,
        eventType: payload.eventType,
        data: payload.data,
      };
    } catch (error) {
      const isNetworkError = error instanceof AffiliateNetworkError;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldRetry: isNetworkError ? error.retryable : true,
      };
    }
  }

  /**
   * Validate webhook signature for networks that support it
   */
  private async validateWebhookSignature(
    networkType: AffiliateNetworkType,
    request: WebhookRequest,
    adapter: any
  ): Promise<boolean> {
    const signature = this.extractSignature(networkType, request);
    if (!signature) {
      return false;
    }

    return adapter.validateWebhookSignature(request.body, signature);
  }

  /**
   * Extract signature from request headers based on network type
   */
  private extractSignature(
    networkType: AffiliateNetworkType,
    request: WebhookRequest
  ): string | null {
    const headers = request.headers;

    switch (networkType) {
      case 'shareasale':
        return headers['x-shareasale-signature'] || null;
      case 'cj':
        return headers['x-cj-signature'] || null;
      case 'impact':
        return headers['x-impact-signature'] || null;
      case 'rakuten':
        return headers['x-rakuten-signature'] || null;
      default:
        return null;
    }
  }

  /**
   * Check if network requires signature validation
   */
  private requiresSignatureValidation(networkType: AffiliateNetworkType): boolean {
    // ShareASale and Impact support signature validation
    return ['shareasale', 'impact'].includes(networkType);
  }

  /**
   * Parse webhook payload based on network type
   */
  private async parseWebhookPayload(
    networkType: AffiliateNetworkType,
    request: WebhookRequest
  ): Promise<WebhookPayload> {
    const timestamp = new Date().toISOString();

    switch (networkType) {
      case 'shareasale':
        return this.parseShareASaleWebhook(request, timestamp);
      case 'cj':
        return this.parseCJWebhook(request, timestamp);
      case 'impact':
        return this.parseImpactWebhook(request, timestamp);
      case 'rakuten':
        return this.parseRakutenWebhook(request, timestamp);
      default:
        throw new AffiliateNetworkError(
          `Unsupported webhook network: ${networkType}`,
          networkType,
          'UNSUPPORTED_WEBHOOK'
        );
    }
  }

  /**
   * Parse ShareASale webhook payload
   */
  private parseShareASaleWebhook(
    request: WebhookRequest,
    timestamp: string
  ): WebhookPayload {
    // ShareASale typically sends form-encoded data
    const params = new URLSearchParams(request.body);
    const transactionData = Object.fromEntries(params.entries());

    let eventType: WebhookEventType = 'conversion.created';
    
    // Determine event type based on data
    if (transactionData.reversal === '1') {
      eventType = 'conversion.cancelled';
    } else if (transactionData.status === 'confirmed') {
      eventType = 'conversion.updated';
    }

    return {
      eventType,
      networkType: 'shareasale',
      timestamp,
      data: transactionData,
    };
  }

  /**
   * Parse CJ Affiliate webhook payload
   */
  private parseCJWebhook(
    request: WebhookRequest,
    timestamp: string
  ): WebhookPayload {
    // CJ typically sends JSON data
    let data: any;
    try {
      data = JSON.parse(request.body);
    } catch {
      throw new AffiliateNetworkError(
        'Invalid JSON in CJ webhook payload',
        'cj',
        'INVALID_PAYLOAD'
      );
    }

    // Determine event type based on CJ webhook type
    let eventType: WebhookEventType = 'conversion.created';
    
    if (data.type === 'commission_update') {
      eventType = 'conversion.updated';
    } else if (data.type === 'commission_delete') {
      eventType = 'conversion.cancelled';
    }

    return {
      eventType,
      networkType: 'cj',
      timestamp,
      data,
    };
  }

  /**
   * Parse Impact Radius webhook payload
   */
  private parseImpactWebhook(
    request: WebhookRequest,
    timestamp: string
  ): WebhookPayload {
    // Impact typically sends JSON data
    let data: any;
    try {
      data = JSON.parse(request.body);
    } catch {
      throw new AffiliateNetworkError(
        'Invalid JSON in Impact webhook payload',
        'impact',
        'INVALID_PAYLOAD'
      );
    }

    // Determine event type based on Impact event type
    let eventType: WebhookEventType = 'conversion.created';
    
    if (data.EventType === 'ACTION_UPDATE') {
      eventType = 'conversion.updated';
    } else if (data.EventType === 'ACTION_DELETE') {
      eventType = 'conversion.cancelled';
    }

    return {
      eventType,
      networkType: 'impact',
      timestamp,
      data,
    };
  }

  /**
   * Parse Rakuten webhook payload
   */
  private parseRakutenWebhook(
    request: WebhookRequest,
    timestamp: string
  ): WebhookPayload {
    // Rakuten typically sends XML data
    // For simplicity, we'll treat it as a generic conversion event
    return {
      eventType: 'conversion.created',
      networkType: 'rakuten',
      timestamp,
      data: { rawPayload: request.body },
    };
  }

  /**
   * Update webhook configurations
   */
  updateConfigs(configs: AffiliateNetworkConfig[]): void {
    this.configs.clear();
    configs.forEach(config => {
      this.configs.set(config.networkType, config);
    });
  }

  /**
   * Get webhook URL for a network type
   */
  getWebhookUrl(networkType: AffiliateNetworkType, baseUrl: string): string {
    return `${baseUrl}/api/webhooks/affiliates/${networkType}`;
  }

  /**
   * Generate webhook secret for a network
   */
  generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Express.js middleware for handling affiliate webhooks
 */
export function createAffiliateWebhookMiddleware(
  handler: AffiliateWebhookHandler
) {
  return async (req: any, res: any, next: any) => {
    try {
      const networkType = req.params.networkType as AffiliateNetworkType;
      
      if (!networkType) {
        return res.status(400).json({
          success: false,
          error: 'Network type parameter is required',
        });
      }

      const webhookRequest: WebhookRequest = {
        headers: req.headers,
        body: req.body,
        rawBody: req.rawBody || Buffer.from(req.body),
        query: req.query,
      };

      const result = await handler.handleWebhook(networkType, webhookRequest);

      if (result.success) {
        res.status(200).json({
          success: true,
          eventType: result.eventType,
        });
      } else {
        const statusCode = result.shouldRetry ? 500 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
          shouldRetry: result.shouldRetry,
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldRetry: true,
      });
    }
  };
}

/**
 * Webhook URL generator utility
 */
export class WebhookUrlGenerator {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Generate webhook URLs for all networks
   */
  generateUrls(): Record<AffiliateNetworkType, string> {
    return {
      shareasale: `${this.baseUrl}/api/webhooks/affiliates/shareasale`,
      cj: `${this.baseUrl}/api/webhooks/affiliates/cj`,
      impact: `${this.baseUrl}/api/webhooks/affiliates/impact`,
      rakuten: `${this.baseUrl}/api/webhooks/affiliates/rakuten`,
    };
  }

  /**
   * Generate webhook URL for specific network
   */
  generateUrl(networkType: AffiliateNetworkType): string {
    return `${this.baseUrl}/api/webhooks/affiliates/${networkType}`;
  }
}