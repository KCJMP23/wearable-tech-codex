import { Suspense } from 'react';
import { ValuationCalculator } from '@/components/valuation/ValuationCalculator';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    tenantSlug: string;
  };
}

async function ValuationContent({ tenantSlug }: { tenantSlug: string }) {
  const supabase = await createClient();
  
  // Get tenant data
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name, domain, category')
    .eq('slug', tenantSlug)
    .single();

  if (error || !tenant) {
    redirect('/admin');
  }

  return (
    <ValuationCalculator 
      tenantId={tenant.id}
      tenantName={tenant.name}
      tenantDomain={tenant.domain}
    />
  );
}

export default async function ValuationPage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense 
        fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        }
      >
        <ValuationContent tenantSlug={params.tenantSlug} />
      </Suspense>
    </div>
  );
}

export const metadata = {
  title: 'Site Valuation Calculator | AffiliateOS',
  description: 'Calculate your site valuation with comprehensive analysis and industry benchmarks',
};