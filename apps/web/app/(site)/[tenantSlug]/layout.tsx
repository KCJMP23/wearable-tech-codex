import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { getTenantBySlug } from '../../../lib/tenant';
import { ThemeBridge } from '../../components/ThemeBridge';

interface TenantLayoutProps {
  children: ReactNode;
  params: { tenantSlug: string };
}

export async function generateMetadata({ params }: TenantLayoutProps): Promise<Metadata> {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return {
      title: 'Affiliate Factory — Tenant missing'
    };
  }
  return {
    title: `${tenant.name} — Affiliate Factory`,
    description: tenant.theme?.tagline ?? 'Wearable tech insights and affiliate picks.'
  };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  return <ThemeBridge tenant={tenant}>{children}</ThemeBridge>;
}
