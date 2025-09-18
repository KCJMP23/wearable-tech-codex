import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getTenantBySlug } from '../../../../lib/tenant';
import { getKbEntry } from '../../../../lib/content';

interface TermsPageProps {
  params: { tenantSlug: string };
}

export default async function TermsPage({ params }: TermsPageProps) {
  const tenant = await getTenantBySlug(params.tenantSlug);
  if (!tenant) notFound();
  const terms = await getKbEntry(tenant.id, 'policy', 'Terms of Service');
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-16">
      <h1 className="text-4xl font-semibold text-neutral-900">Terms of Service</h1>
      <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-neutral max-w-none">
        {terms?.content ?? 'Use this site for informational purposes only. Outbound Amazon links include affiliate tracking tags.'}
      </ReactMarkdown>
    </div>
  );
}
