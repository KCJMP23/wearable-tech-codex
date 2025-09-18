import { WoodstockProductCard } from './WoodstockProductCard';
import type { Product } from '@affiliate-factory/sdk';

export function ProductCard({ product }: { product: Product }) {
  return <WoodstockProductCard product={product} />;
}