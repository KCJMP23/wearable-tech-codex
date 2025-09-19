import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { SeasonalShowcaseManager } from './SeasonalShowcaseManager';

interface SeasonalShowcasePageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function SeasonalShowcasePage({ params }: SeasonalShowcasePageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h3 className="text-2xl font-semibold leading-6 text-gray-900">Seasonal Showcases</h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          Manage seasonal promotional content that appears on your homepage. 
          These are automatically updated by the Seasonal Agent based on current trends and seasons.
        </p>
      </div>

      {/* Seasonal Showcase Manager */}
      <SeasonalShowcaseManager tenantId={tenant.id} tenantSlug={tenantSlug} />
    </div>
  );
}