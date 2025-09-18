import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantBySlug } from '@/lib/tenant';
import { getPostsByTaxonomy } from '@/lib/content';

interface CategoryPageProps {
  params: Promise<{ tenantSlug: string; slug: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { tenantSlug, slug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  const posts = await getPostsByTaxonomy(tenant.id, slug);
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-16">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">{slug.replace(/-/g, ' ')}</p>
        <h1 className="text-4xl font-semibold text-neutral-900">Curated guides</h1>
        <p className="text-neutral-600">Posts and roundups tied to this taxonomy node.</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((post) => (
          <article key={post.id} className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-600">{post.type}</p>
            <h2 className="mt-3 text-xl font-semibold text-neutral-900">
              <Link href={`/${tenantSlug}/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="mt-2 text-sm text-neutral-600">{post.excerpt}</p>
          </article>
        ))}
        {!posts.length ? <p className="text-neutral-500">No posts yet. Agents will fill this soon.</p> : null}
      </div>
    </div>
  );
}
