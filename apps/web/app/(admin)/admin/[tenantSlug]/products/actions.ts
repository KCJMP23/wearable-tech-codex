'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '../../../../../lib/supabase';

export async function enqueueProductImport(tenantSlug: string, asins: string[]) {
  const client = createServiceClient();
  const { data: tenant } = await client.from('tenants').select('id').eq('slug', tenantSlug).maybeSingle();
  if (!tenant) throw new Error('Tenant not found');

  const payload = {
    agent: 'ProductAgent',
    input: { asins }
  };

  const { error } = await client.from('agent_tasks').insert({
    tenant_id: tenant.id,
    agent: 'ProductAgent',
    input: payload,
    status: 'queued'
  });
  if (error) throw error;

  revalidatePath(`/admin/${tenantSlug}/products`);
}
