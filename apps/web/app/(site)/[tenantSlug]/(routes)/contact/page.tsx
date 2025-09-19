import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getTenantBySlug } from '@/lib/tenant';
import { getKbEntry } from '@/lib/content';

interface ContactPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  const contact = await getKbEntry(tenant.id, 'faq', 'Contact');
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-16">
      <h1 className="text-4xl font-semibold text-neutral-900">Contact</h1>
      <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-neutral max-w-none">
        {contact?.content ?? 'Reach the Orchestrator team at hello@' + tenant.domain + ' and we will respond within 24 hours.'}
      </ReactMarkdown>
    </div>
  );
}
