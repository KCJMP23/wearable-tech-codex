// Export main services
export { EmailService } from './email-service';
export { CampaignService } from './campaign-service';
export { EmailAnalyticsService } from './analytics-service';
export { ComplianceService } from './compliance-service';

// Export providers
export {
  BaseEmailProvider,
  SendGridProvider,
  MailgunProvider,
  SESProvider,
  EmailProviderFactory,
} from './providers';

// Export segmentation
export { SegmentService } from './segmentation/segment-service';
export { SegmentationQueryBuilder } from './segmentation/query-builder';

// Export automation
export { AutomationEngine } from './automation/engine';
export { ActionFactory, BaseAction } from './automation/actions';

// Export templates
export * from './templates';

// Export types
export * from './types';