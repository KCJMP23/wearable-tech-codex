'use client';

import { useState } from 'react';
import { Menu, X, Home, BarChart3, Network, TestTube, Server, Bell } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RealTimeNotifications } from './RealTimeNotifications';

interface MobileLayoutProps {
  children: React.ReactNode;
  tenantSlug: string;
  tenantId: string;
}

export function MobileLayout({ children, tenantSlug, tenantId }: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: `/admin/${tenantSlug}`, icon: Home },
    { name: 'Analytics', href: `/admin/${tenantSlug}/analytics`, icon: BarChart3 },
    { name: 'Networks', href: `/admin/${tenantSlug}/networks`, icon: Network },
    { name: 'A/B Testing', href: `/admin/${tenantSlug}/experiments`, icon: TestTube },
    { name: 'MCP Servers', href: `/admin/${tenantSlug}/mcp-servers`, icon: Server },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 transform transition-transform duration-300 ease-in-out lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="mt-4 px-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                  isActive(item.href)
                    ? 'bg-amber-500 text-neutral-900'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-neutral-900 border-r border-neutral-800">
          <div className="flex items-center h-16 px-4 border-b border-neutral-800">
            <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
          </div>
          
          <nav className="flex-1 px-4 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                    isActive(item.href)
                      ? 'bg-amber-500 text-neutral-900'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between bg-neutral-900 px-4 border-b border-neutral-800 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-neutral-400 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <RealTimeNotifications tenantId={tenantId} />
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex h-16 items-center justify-end bg-neutral-900 px-6 border-b border-neutral-800">
          <RealTimeNotifications tenantId={tenantId} />
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Mobile-first responsive grid component
export function ResponsiveGrid({ 
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 }
}: {
  children: React.ReactNode;
  columns?: { sm: number; md: number; lg: number; xl: number };
}) {
  const gridClasses = `grid gap-4 
    grid-cols-${columns.sm} 
    md:grid-cols-${columns.md} 
    lg:grid-cols-${columns.lg} 
    xl:grid-cols-${columns.xl}`;

  return <div className={gridClasses}>{children}</div>;
}

// Responsive card component
export function ResponsiveCard({ 
  children, 
  className = "",
  padding = "p-4 lg:p-6"
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${padding} ${className}`}>
      {children}
    </div>
  );
}

// Mobile-optimized table wrapper
export function ResponsiveTable({ 
  children,
  headers,
  mobileCard
}: {
  children: React.ReactNode;
  headers: string[];
  mobileCard?: (row: any, index: number) => React.ReactNode;
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {children}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      {mobileCard && (
        <div className="md:hidden space-y-4">
          {/* This would need to be implemented by the parent component */}
        </div>
      )}
    </>
  );
}

// Responsive stats grid
export function StatsGrid({ stats }: { stats: Array<{
  name: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
  icon?: React.ComponentType<any>;
}> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.name} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
                {stat.change && (
                  <p className={`text-sm ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </p>
                )}
              </div>
              {Icon && (
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Icon className="h-5 w-5 lg:h-6 lg:w-6 text-gray-600" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}