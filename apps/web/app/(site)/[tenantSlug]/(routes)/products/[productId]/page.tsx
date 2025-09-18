import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { getFeaturedProducts } from '@/lib/content';
import { WoodstockNavigation } from '@/components/WoodstockNavigation';
import { ProductDetailLayout } from '@/components/ProductDetailLayout';
import { WoodstockFooter } from '@/components/WoodstockFooter';

interface ProductDetailPageProps {
  params: Promise<{ tenantSlug: string; productId: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { tenantSlug, productId } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  
  // Get all products and find the specific one
  // In a real app, this would be a more specific query
  const products = await getFeaturedProducts(tenant.id);
  const product = products.find(p => p.id === productId);
  
  if (!product) notFound();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <WoodstockNavigation tenantSlug={tenantSlug} tenantName={tenant.name} />
      
      {/* Product Detail Content */}
      <ProductDetailLayout 
        product={product}
        tenantSlug={tenantSlug}
        relatedProducts={products.filter(p => p.id !== productId).slice(0, 4)}
      />

      {/* Footer */}
      <WoodstockFooter tenantSlug={tenantSlug} tenantName={tenant.name} />
    </div>
  );
}