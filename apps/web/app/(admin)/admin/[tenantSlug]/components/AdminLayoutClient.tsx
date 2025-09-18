'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  HomeIcon,
  CubeIcon,
  DocumentTextIcon,
  CalendarIcon,
  CogIcon,
  BeakerIcon,
  LinkIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  tenantName: string;
  tenantSlug: string;
}

const NAV_ITEMS = [
  { href: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: 'homepage', label: 'Homepage', icon: PaintBrushIcon },
  { href: 'products', label: 'Products', icon: CubeIcon },
  { href: 'posts', label: 'Posts', icon: DocumentTextIcon },
  { href: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { href: 'agents', label: 'Agents', icon: BeakerIcon },
  { href: 'webhooks', label: 'Webhooks', icon: LinkIcon },
  { href: 'analytics', label: 'Analytics', icon: ChartBarIcon },
  { href: 'settings', label: 'Settings', icon: CogIcon },
];

export default function AdminLayoutClient({ children, tenantName, tenantSlug }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname?.includes(`/admin/${tenantSlug}/${href}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          {/* Mobile sidebar header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
            <Link href={`/${tenantSlug}`} className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{tenantName.charAt(0)}</span>
              </div>
              <span className="font-semibold text-gray-900 truncate">{tenantName}</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile navigation */}
          <nav className="mt-6 px-3 flex-1">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={`/admin/${tenantSlug}/${item.href}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      active
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${active ? 'text-green-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Mobile bottom section */}
          <div className="p-4 border-t border-gray-200">
            <Link
              href={`/${tenantSlug}`}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              View storefront →
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64 lg:flex lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200">
          {/* Desktop sidebar header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
            <Link href={`/${tenantSlug}`} className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{tenantName.charAt(0)}</span>
              </div>
              <span className="font-semibold text-gray-900 truncate">{tenantName}</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="flex flex-1 flex-col px-3">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={`/admin/${tenantSlug}/${item.href}`}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      active
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${active ? 'text-green-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Desktop bottom section */}
            <div className="mt-auto p-4 border-t border-gray-200">
              <Link
                href={`/${tenantSlug}`}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                View storefront →
              </Link>
            </div>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <div className="ml-4 lg:ml-0">
                <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">{tenantName}</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Affiliate management dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 hidden sm:block">
                Signed in as <span className="font-medium">Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}