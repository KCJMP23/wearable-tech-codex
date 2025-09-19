import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import {
  CogIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  KeyIcon,
  BellIcon,
  UserIcon,
  ShieldCheckIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

interface SettingsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const settingSections = [
    {
      id: 'general',
      name: 'General',
      description: 'Basic site settings and configuration',
      icon: CogIcon,
      active: true,
    },
    {
      id: 'domain',
      name: 'Domain',
      description: 'Manage your domain and URL settings',
      icon: GlobeAltIcon,
      active: false,
    },
    {
      id: 'branding',
      name: 'Branding',
      description: 'Customize your site appearance and theme',
      icon: PaintBrushIcon,
      active: false,
    },
    {
      id: 'api',
      name: 'API Keys',
      description: 'Manage API integrations and keys',
      icon: KeyIcon,
      active: false,
    },
    {
      id: 'notifications',
      name: 'Notifications',
      description: 'Configure email and alert preferences',
      icon: BellIcon,
      active: false,
    },
    {
      id: 'team',
      name: 'Team',
      description: 'Manage team members and permissions',
      icon: UserIcon,
      active: false,
    },
    {
      id: 'security',
      name: 'Security',
      description: 'Security settings and authentication',
      icon: ShieldCheckIcon,
      active: false,
    },
    {
      id: 'billing',
      name: 'Billing',
      description: 'Plan and billing information',
      icon: CreditCardIcon,
      active: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">Manage your site configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {settingSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                    section.active
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${section.active ? 'text-green-500' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium">{section.name}</div>
                    <div className="text-xs text-gray-500">{section.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200">
            {/* General Settings */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
              <p className="text-sm text-gray-600">Basic configuration for your affiliate site</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Site Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="site-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    id="site-name"
                    defaultValue={tenant.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label htmlFor="site-slug" className="block text-sm font-medium text-gray-700 mb-2">
                    Site Slug
                  </label>
                  <input
                    type="text"
                    id="site-slug"
                    defaultValue={tenant.slug}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="site-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Site Description
                </label>
                <textarea
                  id="site-description"
                  rows={3}
                  defaultValue={tenant.description || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Describe your affiliate site..."
                />
              </div>

              {/* Domain Settings */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Domain Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="primary-domain" className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Domain
                    </label>
                    <input
                      type="text"
                      id="primary-domain"
                      defaultValue={tenant.domain || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="yourdomain.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-2">
                      Subdomain
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        id="subdomain"
                        defaultValue={tenant.slug}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <span className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-r-lg">
                        .affiliates.com
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEO Settings */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">SEO Settings</h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="meta-title" className="block text-sm font-medium text-gray-700 mb-2">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      id="meta-title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Default meta title for your site"
                    />
                  </div>
                  <div>
                    <label htmlFor="meta-description" className="block text-sm font-medium text-gray-700 mb-2">
                      Meta Description
                    </label>
                    <textarea
                      id="meta-description"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Default meta description for your site"
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Social Media</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 mb-2">
                      Twitter
                    </label>
                    <input
                      type="url"
                      id="twitter"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="https://twitter.com/username"
                    />
                  </div>
                  <div>
                    <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-2">
                      Facebook
                    </label>
                    <input
                      type="url"
                      id="facebook"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="https://facebook.com/page"
                    />
                  </div>
                  <div>
                    <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-2">
                      Instagram
                    </label>
                    <input
                      type="url"
                      id="instagram"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="https://instagram.com/username"
                    />
                  </div>
                  <div>
                    <label htmlFor="youtube" className="block text-sm font-medium text-gray-700 mb-2">
                      YouTube
                    </label>
                    <input
                      type="url"
                      id="youtube"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="https://youtube.com/channel"
                    />
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Analytics & Tracking</h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="google-analytics" className="block text-sm font-medium text-gray-700 mb-2">
                      Google Analytics ID
                    </label>
                    <input
                      type="text"
                      id="google-analytics"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="GA4-XXXXXXXXX-X"
                    />
                  </div>
                  <div>
                    <label htmlFor="google-tag-manager" className="block text-sm font-medium text-gray-700 mb-2">
                      Google Tag Manager ID
                    </label>
                    <input
                      type="text"
                      id="google-tag-manager"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="GTM-XXXXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 pt-6 flex justify-end space-x-3">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}