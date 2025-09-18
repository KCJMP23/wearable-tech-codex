import { cache } from 'react';
import type { Tenant } from '@affiliate-factory/sdk';
import { createServiceClient } from './supabase';

export const getTenantBySlug = cache(async (slug: string): Promise<Tenant | null> => {
  const client = createServiceClient();
  const { data, error } = await client
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Tenant | null;
});

export const listTenantRoutes = cache(async () => {
  const client = createServiceClient();
  const { data, error } = await client.from('tenants').select('slug, domain').eq('status', 'active');
  if (error) {
    throw error;
  }
  return data ?? [];
});

export const getAllTenants = cache(async (): Promise<Tenant[]> => {
  const client = createServiceClient();
  const { data, error } = await client
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching tenants:', error);
    return [];
  }
  
  return (data ?? []) as Tenant[];
});
