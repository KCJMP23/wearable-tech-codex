import { notFound } from 'next/navigation';
import { getTenantBySlug } from '../../../../lib/tenant';
import AdminLayoutClient from './components/AdminLayoutClient';

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  return (
    <AdminLayoutClient 
      tenantName={tenant.name} 
      tenantSlug={tenantSlug}
    >
      {children}
    </AdminLayoutClient>
  );
}