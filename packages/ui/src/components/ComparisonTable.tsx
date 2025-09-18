import type { Product } from '@affiliate-factory/sdk';

interface ComparisonTableProps {
  products: Product[];
  metrics: Array<{ key: keyof Product; label: string; transform?: (value: any) => string }>;
}

export function ComparisonTable({ products, metrics }: ComparisonTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 shadow-sm">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Product
            </th>
            {metrics.map((metric) => (
              <th key={metric.key as string} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                {metric.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 bg-white">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-amber-50/30">
              <td className="px-4 py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-neutral-900">{product.title}</span>
                  <span className="text-xs text-neutral-500">{product.brand}</span>
                </div>
              </td>
              {metrics.map((metric) => (
                <td key={`${product.id}-${metric.key as string}`} className="px-4 py-4 text-sm text-neutral-700">
                  {formatValue(product[metric.key], metric.transform)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(value: unknown, transform?: (value: unknown) => string): string {
  if (transform) return transform(value);
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
