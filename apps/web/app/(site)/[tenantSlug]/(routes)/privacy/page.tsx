import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getTenantBySlug } from '@/lib/tenant';
import { getKbEntry } from '@/lib/content';

interface PrivacyPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  const policy = await getKbEntry(tenant.id, 'policy', 'Privacy Policy');
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-16">
      <h1 className="text-4xl font-semibold text-neutral-900">Privacy Policy</h1>
      <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-neutral max-w-none">
        {policy?.content ?? 'We only collect newsletter emails and anonymized analytics. Amazon affiliate links track conversions.'}
      </ReactMarkdown>
    </div>
  );
}
