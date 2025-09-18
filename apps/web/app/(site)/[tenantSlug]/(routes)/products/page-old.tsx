import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { getFeaturedProducts } from '@/lib/content';
import { MasonryGrid } from '@affiliate-factory/ui';
import { ProductCard } from '@/components/ProductCard';

interface ProductsPageProps {
  params: { tenantSlug: string };
}

export default async function ProductsPage({ params }: ProductsPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  const products = await getFeaturedProducts(tenant.id);
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-16">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">{tenant.name}</p>
        <h1 className="text-4xl font-semibold text-neutral-900">Product Library</h1>
        <p className="text-neutral-600">
          Every product syncs nightly via Amazon PA-API with affiliate tag jmpkc01-20 and compatibility metadata.
        </p>
      </header>
      <MasonryGrid>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </MasonryGrid>
    </div>
  );
}
