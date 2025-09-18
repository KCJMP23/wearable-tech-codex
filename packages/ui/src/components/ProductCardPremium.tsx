import type { Product } from '@affiliate-factory/sdk';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from './Button';

interface ProductCardPremiumProps {
  product: Product;
}

export function ProductCardPremium({ product }: ProductCardPremiumProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {product.images?.[0]?.url ? (
          <Image
            src={product.images[0].url}
            alt={product.images[0].alt ?? product.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-amber-600">{product.brand}</p>
          <h3 className="text-lg font-semibold text-neutral-900">{product.title}</h3>
          <p className="mt-1 text-sm text-neutral-600">{product.features?.[0]?.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          {product.batteryLifeHours ? <span>Battery: {product.batteryLifeHours} hrs</span> : null}
          {product.waterResistance ? <span>Water: {product.waterResistance}</span> : null}
          {product.healthMetrics?.length ? <span>Sensors: {product.healthMetrics.join(', ')}</span> : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          <Link href={product.affiliateUrl} className="flex-1" prefetch={false} target="_blank" rel="nofollow noopener">
            <Button className="w-full" variant="primary">
              Buy on Amazon
            </Button>
          </Link>
          {product.rating ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
              {product.rating.toFixed(1)}★
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
