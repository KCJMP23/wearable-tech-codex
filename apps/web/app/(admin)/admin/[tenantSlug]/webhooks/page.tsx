import { loadEnv } from '@affiliate-factory/sdk';

interface WebhooksPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function WebhooksPage({ params }: WebhooksPageProps) {
  const { tenantSlug } = await params;
  const env = loadEnv();
  const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
  const endpoints = [
    { name: 'Ingest Post', url: `${base}/ingest-post`, secret: env.MAKE_BLOG_WEBHOOK_SECRET },
    { name: 'Ingest Product', url: `${base}/ingest-product`, secret: env.MAKE_PRODUCT_WEBHOOK_SECRET },
    { name: 'Ingest Images', url: `${base}/ingest-images`, secret: env.MAKE_IMAGE_WEBHOOK_SECRET }
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-white">Webhooks</h2>
        <p className="text-sm text-neutral-400">Use these signed endpoints for Make.com automations.</p>
      </header>
      <div className="space-y-4">
        {endpoints.map((endpoint) => (
          <div key={endpoint.url} className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-lg font-semibold text-white">{endpoint.name}</h3>
            <p className="text-sm text-neutral-400">URL</p>
            <p className="font-mono text-xs text-amber-400 break-all">{endpoint.url}</p>
            <p className="mt-3 text-sm text-neutral-400">Secret</p>
            <p className="font-mono text-xs text-amber-400 break-all">{endpoint.secret}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
