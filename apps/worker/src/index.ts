import { createClient } from '@supabase/supabase-js';
import PQueue from 'p-queue';
import { agents } from './agentRegistry';
import type { AgentTask } from '@affiliate-factory/sdk';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const queue = new PQueue({ concurrency: 2 });

async function main() {
  console.log('Worker booted. Listening for agent tasks...');
  while (true) {
    const { data: tasks, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(5);
    if (error) {
      console.error('Failed to fetch tasks', error);
      await sleep(5000);
      continue;
    }
    if (!tasks?.length) {
      await sleep(3000);
      continue;
    }
    for (const raw of tasks) {
      await queue.add(() => processTask(raw));
    }
  }
}

async function processTask(raw: any) {
  const task: AgentTask = {
    id: raw.id,
    tenantId: raw.tenant_id,
    agent: raw.agent,
    input: raw.input,
    status: raw.status,
    result: raw.result,
    createdAt: raw.created_at,
    completedAt: raw.completed_at
  };

  const agent = agents[task.agent];
  if (!agent) {
    console.warn('Unknown agent', task.agent);
    await supabase.from('agent_tasks').update({ status: 'error', result: { message: 'Unknown agent' } }).eq('id', task.id);
    return;
  }

  await supabase.from('agent_tasks').update({ status: 'running' }).eq('id', task.id);
  try {
    const result = await agent.execute(task, { supabase });
    await supabase
      .from('agent_tasks')
      .update({ status: 'done', result, completed_at: new Date().toISOString() })
      .eq('id', task.id);
    console.log(`Agent ${task.agent} completed`, result);
  } catch (error) {
    console.error(`Agent ${task.agent} failed`, error);
    await supabase
      .from('agent_tasks')
      .update({ status: 'error', result: { message: String(error) }, completed_at: new Date().toISOString() })
      .eq('id', task.id);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
