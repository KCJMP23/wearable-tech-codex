import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { CategoryCardsManager } from './CategoryCardsManager';

interface CategoryCardsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CategoryCardsPage({ params }: CategoryCardsPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h3 className="text-2xl font-semibold leading-6 text-gray-900">Category Cards</h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          Manage the category cards that appear with the sticky scrolling effect on your homepage. 
          Drag to reorder, click to edit, or add new categories.
        </p>
      </div>

      {/* Category Cards Manager */}
      <CategoryCardsManager tenantId={tenant.id} tenantSlug={tenantSlug} />
    </div>
  );
}