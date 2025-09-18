'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '../../../../lib/supabase';
import type { PostType } from '@affiliate-factory/sdk';

export async function queueEditorialAgent(tenantSlug: string, type: PostType, topic: string) {
  const client = createServiceClient();
  const { data: tenant } = await client.from('tenants').select('id').eq('slug', tenantSlug).maybeSingle();
  if (!tenant) throw new Error('Tenant not found');

  const { error } = await client.from('agent_tasks').insert({
    tenant_id: tenant.id,
    agent: 'EditorialAgent',
    input: { type, topic },
    status: 'queued'
  });
  if (error) throw error;
  revalidatePath(`/admin/${tenantSlug}/posts`);
}
