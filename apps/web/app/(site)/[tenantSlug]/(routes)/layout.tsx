import type { ReactNode } from 'react';
import Link from 'next/link';
import { NavMegaMenu } from '@affiliate-factory/ui';
import { getTenantBySlug } from '../../../../lib/tenant';
import { getTenantTaxonomy } from '../../../../lib/content';

interface RoutesLayoutProps {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export default async function RoutesLayout({ children, params }: RoutesLayoutProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  const taxonomy = tenant ? await getTenantTaxonomy(tenant.id) : { vertical: [], horizontal: [] };
  const sections = [
    {
      title: 'Verticals',
      items: taxonomy.vertical.slice(0, 6).map((node: any) => ({
        label: node.name,
        href: `/${tenantSlug}/categories/${node.slug}`,
        description: node.meta?.description ?? 'Explore curated product picks.'
      }))
    },
    {
      title: 'Guides',
      items: [
        { label: 'Blog', href: `/${tenantSlug}/blog`, description: 'Latest posts and data-backed guides.' },
        { label: 'Quiz', href: `/${tenantSlug}/quiz`, description: 'Personalize recommendations.' },
        { label: 'Newsletter', href: `/${tenantSlug}#newsletter`, description: 'Get weekly intel in your inbox.' }
      ]
    }
  ];

  return (
    <div className="space-y-12">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-10">
        <Link href={`/${tenantSlug}`} className="text-lg font-semibold text-neutral-900">
          {tenant?.name ?? 'Affiliate Factory'}
        </Link>
        <nav className="hidden lg:block">
          <NavMegaMenu sections={sections} />
        </nav>
        <Link href={`/admin/${tenantSlug}`} className="text-sm font-semibold text-neutral-600">
          Admin →
        </Link>
      </header>
      {children}
      <footer className="bg-neutral-900 py-10 text-neutral-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 text-sm md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {tenant?.name ?? 'Affiliate Factory'}. Amazon Associates tag jmpkc01-20.
          </p>
          <div className="flex gap-4">
            <Link href={`/${tenantSlug}/affiliate-disclosure`} className="hover:text-white">
              Affiliate Disclosure
            </Link>
            <Link href={`/${tenantSlug}/privacy`} className="hover:text-white">
              Privacy
            </Link>
            <Link href={`/${tenantSlug}/terms`} className="hover:text-white">
              Terms
            </Link>
            <Link href={`/${tenantSlug}/contact`} className="hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
