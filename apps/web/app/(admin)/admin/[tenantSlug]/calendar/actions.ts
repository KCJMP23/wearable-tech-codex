'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase';

export async function rescheduleCalendarItem(tenantSlug: string, itemId: string, runAt: string) {
  const client = createServiceClient();
  const { data: tenant } = await client.from('tenants').select('id').eq('slug', tenantSlug).maybeSingle();
  if (!tenant) throw new Error('Tenant not found');
  const { error } = await client
    .from('calendar')
    .update({ run_at: runAt })
    .eq('tenant_id', tenant.id)
    .eq('id', itemId);
  if (error) throw error;
  revalidatePath(`/admin/${tenantSlug}/calendar`);
}
