'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface SeasonalShowcase {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  cta_text: string;
  cta_link: string;
  badge_text: string;
  badge_emoji: string;
  gradient_from: string;
  gradient_to: string;
  highlight_products?: string[];
  season_type: 'winter' | 'spring' | 'summer' | 'fall' | 'holiday' | 'special';
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

interface SeasonalShowcaseManagerProps {
  tenantId: string;
  tenantSlug: string;
}

export function SeasonalShowcaseManager({ tenantId, tenantSlug }: SeasonalShowcaseManagerProps) {
  const [showcases, setShowcases] = useState<SeasonalShowcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingShowcase, setEditingShowcase] = useState<SeasonalShowcase | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<SeasonalShowcase>>({
    title: '',
    subtitle: '',
    description: '',
    cta_text: '',
    cta_link: '',
    badge_text: '',
    badge_emoji: '',
    gradient_from: 'from-blue-500',
    gradient_to: 'to-indigo-600',
    season_type: 'fall',
    valid_from: '',
    valid_until: '',
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchShowcases();
  }, []);

  const fetchShowcases = async () => {
    const { data, error } = await supabase
      .from('seasonal_showcases')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setShowcases(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.subtitle || !formData.cta_text) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingShowcase) {
      // Update existing showcase
      const { error } = await supabase
        .from('seasonal_showcases')
        .update({
          title: formData.title,
          subtitle: formData.subtitle,
          description: formData.description,
          cta_text: formData.cta_text,
          cta_link: formData.cta_link,
          badge_text: formData.badge_text,
          badge_emoji: formData.badge_emoji,
          gradient_from: formData.gradient_from,
          gradient_to: formData.gradient_to,
          season_type: formData.season_type,
          valid_from: formData.valid_from || null,
          valid_until: formData.valid_until || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingShowcase.id);

      if (!error) {
        fetchShowcases();
        setEditingShowcase(null);
        resetForm();
      }
    } else {
      // Add new showcase
      const { error } = await supabase
        .from('seasonal_showcases')
        .insert({
          tenant_id: tenantId,
          title: formData.title,
          subtitle: formData.subtitle,
          description: formData.description,
          cta_text: formData.cta_text,
          cta_link: formData.cta_link || `/${tenantSlug}/collections/${formData.season_type}`,
          badge_text: formData.badge_text,
          badge_emoji: formData.badge_emoji,
          gradient_from: formData.gradient_from,
          gradient_to: formData.gradient_to,
          season_type: formData.season_type,
          is_active: true,
          valid_from: formData.valid_from || null,
          valid_until: formData.valid_until || null,
        });

      if (!error) {
        fetchShowcases();
        setIsAddingNew(false);
        resetForm();
      }
    }
  };

  const handleToggleActive = async (showcase: SeasonalShowcase) => {
    const { error } = await supabase
      .from('seasonal_showcases')
      .update({ is_active: !showcase.is_active })
      .eq('id', showcase.id);

    if (!error) {
      fetchShowcases();
    }
  };

  const handleDelete = async (showcase: SeasonalShowcase) => {
    if (confirm(`Are you sure you want to delete "${showcase.title}"?`)) {
      const { error } = await supabase
        .from('seasonal_showcases')
        .delete()
        .eq('id', showcase.id);

      if (!error) {
        fetchShowcases();
      }
    }
  };

  const handleEdit = (showcase: SeasonalShowcase) => {
    setEditingShowcase(showcase);
    setFormData({
      title: showcase.title,
      subtitle: showcase.subtitle,
      description: showcase.description,
      cta_text: showcase.cta_text,
      cta_link: showcase.cta_link,
      badge_text: showcase.badge_text,
      badge_emoji: showcase.badge_emoji,
      gradient_from: showcase.gradient_from,
      gradient_to: showcase.gradient_to,
      season_type: showcase.season_type,
      valid_from: showcase.valid_from?.split('T')[0] || '',
      valid_until: showcase.valid_until?.split('T')[0] || '',
    });
    setIsAddingNew(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      cta_text: '',
      cta_link: '',
      badge_text: '',
      badge_emoji: '',
      gradient_from: 'from-blue-500',
      gradient_to: 'to-indigo-600',
      season_type: 'fall',
      valid_from: '',
      valid_until: '',
    });
  };

  const handleCancel = () => {
    setEditingShowcase(null);
    setIsAddingNew(false);
    resetForm();
  };

  // Gradient options for seasonal themes
  const gradientOptions = [
    { label: 'Fall (Orange)', from: 'from-orange-500', to: 'to-amber-600' },
    { label: 'Winter (Blue)', from: 'from-blue-500', to: 'to-indigo-600' },
    { label: 'Spring (Green)', from: 'from-green-500', to: 'to-emerald-600' },
    { label: 'Summer (Red)', from: 'from-red-500', to: 'to-pink-600' },
    { label: 'Holiday (Purple)', from: 'from-purple-500', to: 'to-pink-600' },
    { label: 'Special (Gradient)', from: 'from-blue-600', to: 'to-purple-600' },
  ];

  // Season emoji suggestions
  const emojiSuggestions = {
    fall: ['🍂', '🍁', '🎃', '🌾'],
    winter: ['❄️', '⛄', '🎿', '🧣'],
    spring: ['🌸', '🌺', '🌷', '🦋'],
    summer: ['☀️', '🏖️', '🌊', '🏄'],
    holiday: ['🎄', '🎁', '✨', '🎉'],
    special: ['🎯', '💎', '🚀', '🌟'],
  };

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      {(isAddingNew || editingShowcase) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold mb-4">
            {editingShowcase ? 'Edit Seasonal Showcase' : 'Add New Seasonal Showcase'}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Fall Fitness Revolution"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtitle *
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Perfect Weather for Outdoor Training"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="AI-discovered products perfect for the season..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CTA Button Text *
              </label>
              <input
                type="text"
                value={formData.cta_text}
                onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Shop Fall Collection"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CTA Link
              </label>
              <input
                type="text"
                value={formData.cta_link}
                onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder={`/${tenantSlug}/collections/fall`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Badge Text *
              </label>
              <input
                type="text"
                value={formData.badge_text}
                onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="FALL 2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Badge Emoji
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={formData.badge_emoji}
                  onChange={(e) => setFormData({ ...formData, badge_emoji: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="🍂"
                />
                <div className="flex gap-1">
                  {emojiSuggestions[formData.season_type || 'fall'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, badge_emoji: emoji })}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Season Type *
              </label>
              <select
                value={formData.season_type}
                onChange={(e) => setFormData({ ...formData, season_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="holiday">Holiday</option>
                <option value="special">Special</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gradient Theme
              </label>
              <select
                value={`${formData.gradient_from}|${formData.gradient_to}`}
                onChange={(e) => {
                  const [from, to] = e.target.value.split('|');
                  setFormData({ ...formData, gradient_from: from, gradient_to: to });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                {gradientOptions.map((opt) => (
                  <option key={opt.label} value={`${opt.from}|${opt.to}`}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid From
              </label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingShowcase ? 'Update' : 'Add'} Showcase
            </button>
          </div>
        </div>
      )}

      {/* Showcases List */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h4 className="text-lg font-semibold">Seasonal Showcases</h4>
            <p className="text-sm text-gray-600 mt-1">
              AI agents update these automatically based on season and trends
            </p>
          </div>
          {!isAddingNew && !editingShowcase && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Add Showcase
            </button>
          )}
        </div>

        <div className="space-y-3">
          {showcases.length > 0 ? (
            showcases.map((showcase) => (
              <div
                key={showcase.id}
                className={`bg-gray-50 rounded-lg p-4 ${!showcase.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{showcase.badge_emoji}</span>
                      <span className="text-sm font-medium text-gray-500 uppercase">
                        {showcase.badge_text}
                      </span>
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                        {showcase.season_type}
                      </span>
                      {showcase.is_active ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <h5 className="font-semibold text-gray-900">{showcase.title}</h5>
                    <p className="text-sm text-gray-700">{showcase.subtitle}</p>
                    <p className="text-sm text-gray-600 mt-1">{showcase.description}</p>
                    {showcase.valid_from || showcase.valid_until ? (
                      <p className="text-xs text-gray-500 mt-2">
                        Valid: {showcase.valid_from ? new Date(showcase.valid_from).toLocaleDateString() : 'Always'} - {' '}
                        {showcase.valid_until ? new Date(showcase.valid_until).toLocaleDateString() : 'Always'}
                      </p>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(showcase)}
                      className={`p-2 rounded-lg ${showcase.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                      title={showcase.is_active ? 'Active' : 'Inactive'}
                    >
                      {showcase.is_active ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleEdit(showcase)}
                      className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                      title="Edit"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(showcase)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              No seasonal showcases yet. The AI agents will populate these automatically, or you can add them manually.
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> The Seasonal Agent automatically updates these showcases based on:
        </p>
        <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
          <li>Current season and weather patterns</li>
          <li>Shopping trends and popular products</li>
          <li>Upcoming holidays and events</li>
          <li>Historical performance data</li>
        </ul>
      </div>
    </div>
  );
}