import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { getAgentTasks, getAgentConfigs } from '@/lib/admin';
import { triggerAgent } from './actions';
import { AgentsClientView } from './AgentsClientView';

const DEFAULT_AGENTS = [
  { 
    name: 'OrchestratorAgent', 
    description: 'Plans weekly sprints, reviews insights, updates calendar.', 
    cadence: 'Weekly',
    enabled: true,
    automationLevel: 'full' as const,
    schedule: { type: 'cron' as const, value: '0 0 * * 0' },
    priority: 10,
    maxRetries: 3,
    timeout: 300,
    settings: {}
  },
  { 
    name: 'ProductAgent', 
    description: 'Imports and enriches products with affiliate tags.', 
    cadence: 'Nightly',
    enabled: true,
    automationLevel: 'full' as const,
    schedule: { type: 'cron' as const, value: '0 0 * * *' },
    priority: 8,
    maxRetries: 3,
    timeout: 600,
    settings: {}
  },
  { 
    name: 'ReviewAgent', 
    description: 'Generates honest review MDX and sentiment summaries.', 
    cadence: 'Weekly',
    enabled: true,
    automationLevel: 'supervised' as const,
    schedule: { type: 'cron' as const, value: '0 0 * * 1' },
    priority: 7,
    maxRetries: 2,
    timeout: 400,
    settings: {}
  },
  { 
    name: 'EditorialAgent', 
    description: 'Creates data-driven posts with CTAs.', 
    cadence: 'Hourly',
    enabled: true,
    automationLevel: 'full' as const,
    schedule: { type: 'cron' as const, value: '0 * * * *' },
    priority: 9,
    maxRetries: 3,
    timeout: 300,
    settings: {}
  },
  { 
    name: 'ImageAgent', 
    description: 'Curates and compresses royalty-free images with alt text.', 
    cadence: 'Hourly',
    enabled: true,
    automationLevel: 'full' as const,
    schedule: { type: 'interval' as const, value: '1h' },
    priority: 6,
    maxRetries: 2,
    timeout: 180,
    settings: {}
  },
  { 
    name: 'SocialAgent', 
    description: 'Creates captions and schedules via Make.com.', 
    cadence: 'Hourly',
    enabled: true,
    automationLevel: 'full' as const,
    schedule: { type: 'interval' as const, value: '1h' },
    priority: 7,
    maxRetries: 2,
    timeout: 120,
    settings: {}
  },
  { 
    name: 'SeasonalAgent', 
    description: 'Applies holiday themes per schedule.', 
    cadence: 'Weekly',
    enabled: true,
    automationLevel: 'supervised' as const,
    schedule: { type: 'cron' as const, value: '0 0 * * 2' },
    priority: 5,
    maxRetries: 1,
    timeout: 240,
    settings: {}
  },
  { 
    name: 'LinkVerifierAgent', 
    description: 'Checks affiliate links and auto-fixes tags.', 
    cadence: 'Nightly',
    enabled: true,
    automationLevel: 'full' as const,
    schedule: { type: 'cron' as const, value: '0 2 * * *' },
    priority: 9,
    maxRetries: 3,
    timeout: 600,
    settings: {}
  },
  { 
    name: 'NewsletterAgent', 
    description: 'Drafts weekly roundup emails by quiz segment.', 
    cadence: 'Weekly',
    enabled: true,
    automationLevel: 'supervised' as const,
    schedule: { type: 'cron' as const, value: '0 9 * * 5' },
    priority: 8,
    maxRetries: 2,
    timeout: 300,
    settings: {}
  },
  { 
    name: 'PersonalizationAgent', 
    description: 'Optimizes quiz logic and recs.', 
    cadence: 'Weekly',
    enabled: true,
    automationLevel: 'full' as const,
    schedule: { type: 'cron' as const, value: '0 0 * * 3' },
    priority: 6,
    maxRetries: 2,
    timeout: 400,
    settings: {}
  },
  { 
    name: 'ChatbotAgent', 
    description: 'Refreshes embeddings and QA coverage.', 
    cadence: 'Hourly',
    enabled: true,
    automationLevel: 'full' as const,
    schedule: { type: 'interval' as const, value: '1h' },
    priority: 5,
    maxRetries: 2,
    timeout: 240,
    settings: {}
  },
  { 
    name: 'TrendsAgent', 
    description: 'Pulls Reddit/web trend data for new topics.', 
    cadence: 'Hourly',
    enabled: true,
    automationLevel: 'full' as const,
    schedule: { type: 'interval' as const, value: '1h' },
    priority: 9,
    maxRetries: 3,
    timeout: 180,
    settings: {}
  },
  { 
    name: 'AdManagerAgent', 
    description: 'Manages optional ad slots keeping CLS safe.', 
    cadence: 'Weekly',
    enabled: false,
    automationLevel: 'manual' as const,
    schedule: { type: 'cron' as const, value: '0 0 * * 4' },
    priority: 3,
    maxRetries: 1,
    timeout: 120,
    settings: {}
  }
];

interface AgentsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AgentsPage({ params }: AgentsPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  
  const tasks = await getAgentTasks(tenant.id);
  const latestByAgent = new Map(tasks.map((task) => [task.agent, task]));
  
  // Get saved agent configs from database or use defaults
  const savedConfigs = await getAgentConfigs?.(tenant.id) || {};
  const agents = DEFAULT_AGENTS.map(agent => ({
    ...agent,
    ...savedConfigs[agent.name],
    lastTask: latestByAgent.get(agent.name)
  }));

  return <AgentsClientView 
    tenantSlug={tenantSlug} 
    agents={agents} 
    tenantId={tenant.id}
  />;
}
