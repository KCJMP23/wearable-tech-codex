import { notFound } from 'next/navigation';
import { getTenantBySlug } from '../../../../lib/tenant';
import { getAgentTasks } from '../../../../lib/admin';
import { triggerAgent } from './actions';

const AGENTS = [
  { name: 'OrchestratorAgent', description: 'Plans weekly sprints, reviews insights, updates calendar.', cadence: 'Weekly' },
  { name: 'ProductAgent', description: 'Imports and enriches products with affiliate tags.', cadence: 'Nightly' },
  { name: 'ReviewAgent', description: 'Generates honest review MDX and sentiment summaries.', cadence: 'Weekly' },
  { name: 'EditorialAgent', description: 'Creates data-driven posts with CTAs.', cadence: 'Hourly' },
  { name: 'ImageAgent', description: 'Curates and compresses royalty-free images with alt text.', cadence: 'Hourly' },
  { name: 'SocialAgent', description: 'Creates captions and schedules via Make.com.', cadence: 'Hourly' },
  { name: 'SeasonalAgent', description: 'Applies holiday themes per schedule.', cadence: 'Weekly' },
  { name: 'LinkVerifierAgent', description: 'Checks affiliate links and auto-fixes tags.', cadence: 'Nightly' },
  { name: 'NewsletterAgent', description: 'Drafts weekly roundup emails by quiz segment.', cadence: 'Weekly' },
  { name: 'PersonalizationAgent', description: 'Optimizes quiz logic and recs.', cadence: 'Weekly' },
  { name: 'ChatbotAgent', description: 'Refreshes embeddings and QA coverage.', cadence: 'Hourly' },
  { name: 'TrendsAgent', description: 'Pulls Reddit/web trend data for new topics.', cadence: 'Hourly' },
  { name: 'AdManagerAgent', description: 'Manages optional ad slots keeping CLS safe.', cadence: 'Weekly' }
];

interface AgentsPageProps {
  params: { tenantSlug: string };
}

export default async function AgentsPage({ params }: AgentsPageProps) {
  const tenant = await getTenantBySlug(params.tenantSlug);
  if (!tenant) notFound();
  const tasks = await getAgentTasks(tenant.id);
  const latestByAgent = new Map(tasks.map((task) => [task.agent, task]));

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-white">Agents</h2>
        <p className="text-sm text-neutral-400">Trigger agents on demand or review their latest actions.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map((agent) => {
          const lastTask = latestByAgent.get(agent.name);
          return (
            <form
              key={agent.name}
              action={triggerAgent.bind(null, params.tenantSlug, agent.name)}
              className="flex flex-col justify-between rounded-3xl border border-neutral-800 bg-neutral-950 p-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                  <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs text-neutral-400">{agent.cadence}</span>
                </div>
                <p className="text-sm text-neutral-400">{agent.description}</p>
                {lastTask ? (
                  <p className="text-xs text-neutral-500">
                    Last run: {new Date(lastTask.createdAt).toLocaleString()} ({lastTask.status})
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500">No runs yet.</p>
                )}
              </div>
              <button type="submit" className="mt-4 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900">
                Run now
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
