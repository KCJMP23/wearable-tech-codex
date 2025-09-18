import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { getFeaturedProducts } from '@/lib/content';
import { ProductCard } from '@/components/ProductCard';
import { WoodstockNavigation } from '@/components/WoodstockNavigation';
import { ProductCollectionLayout } from '@/components/ProductCollectionLayout';
import { WoodstockFooter } from '@/components/WoodstockFooter';

interface ProductsPageProps {
  params: { tenantSlug: string };
  searchParams: { category?: string; sort?: string; filter?: string };
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { tenantSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  
  const products = await getFeaturedProducts(tenant.id);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <WoodstockNavigation tenantSlug={tenantSlug} tenantName={tenant.name} />
      
      {/* Collection Page Content */}
      <ProductCollectionLayout 
        products={products}
        tenantName={tenant.name}
        category={resolvedSearchParams.category}
        sortBy={resolvedSearchParams.sort}
        filters={resolvedSearchParams.filter}
      />

      {/* Footer */}
      <WoodstockFooter tenantSlug={tenantSlug} tenantName={tenant.name} />
    </div>
  );
}