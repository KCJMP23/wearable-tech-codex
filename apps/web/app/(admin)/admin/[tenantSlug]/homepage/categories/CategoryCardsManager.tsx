'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CategoryCard {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  color_gradient: string;
  display_order: number;
  is_active: boolean;
}

interface CategoryCardsManagerProps {
  tenantId: string;
  tenantSlug: string;
}

function SortableCard({ card, onEdit, onToggleActive, onDelete }: { 
  card: CategoryCard; 
  onEdit: (card: CategoryCard) => void;
  onToggleActive: (card: CategoryCard) => void;
  onDelete: (card: CategoryCard) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-sm border ${card.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'} overflow-hidden`}
    >
      <div className="flex items-center p-4 gap-4">
        {/* Drag Handle */}
        <div {...attributes} {...listeners} className="cursor-move">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {/* Card Preview */}
        <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={card.image_url}
            alt={card.name}
            fill
            className="object-cover"
          />
        </div>

        {/* Card Info */}
        <div className="flex-grow">
          <h4 className="text-lg font-semibold text-gray-900">{card.name}</h4>
          <p className="text-sm text-gray-600">{card.description}</p>
          <p className="text-xs text-gray-500 mt-1">Slug: {card.slug}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleActive(card)}
            className={`p-2 rounded-lg ${card.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
            title={card.is_active ? 'Active' : 'Inactive'}
          >
            {card.is_active ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => onEdit(card)}
            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(card)}
            className="p-2 rounded-lg text-red-600 hover:bg-red-50"
            title="Delete"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CategoryCardsManager({ tenantId, tenantSlug }: CategoryCardsManagerProps) {
  const [cards, setCards] = useState<CategoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<CategoryCard | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<CategoryCard>>({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    color_gradient: 'from-blue-100 to-blue-200',
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('category_cards')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setCards(data);
    }
    setLoading(false);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setCards((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Update display_order for all cards
        newOrder.forEach(async (card, index) => {
          await supabase
            .from('category_cards')
            .update({ display_order: index + 1 })
            .eq('id', card.id);
        });

        return newOrder;
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.image_url) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingCard) {
      // Update existing card
      const { error } = await supabase
        .from('category_cards')
        .update({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          image_url: formData.image_url,
          color_gradient: formData.color_gradient,
        })
        .eq('id', editingCard.id);

      if (!error) {
        fetchCards();
        setEditingCard(null);
        setFormData({
          name: '',
          slug: '',
          description: '',
          image_url: '',
          color_gradient: 'from-blue-100 to-blue-200',
        });
      }
    } else {
      // Add new card
      const { error } = await supabase
        .from('category_cards')
        .insert({
          tenant_id: tenantId,
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          image_url: formData.image_url,
          color_gradient: formData.color_gradient,
          display_order: cards.length + 1,
        });

      if (!error) {
        fetchCards();
        setIsAddingNew(false);
        setFormData({
          name: '',
          slug: '',
          description: '',
          image_url: '',
          color_gradient: 'from-blue-100 to-blue-200',
        });
      }
    }
  };

  const handleToggleActive = async (card: CategoryCard) => {
    const { error } = await supabase
      .from('category_cards')
      .update({ is_active: !card.is_active })
      .eq('id', card.id);

    if (!error) {
      fetchCards();
    }
  };

  const handleDelete = async (card: CategoryCard) => {
    if (confirm(`Are you sure you want to delete "${card.name}"?`)) {
      const { error } = await supabase
        .from('category_cards')
        .delete()
        .eq('id', card.id);

      if (!error) {
        fetchCards();
      }
    }
  };

  const handleEdit = (card: CategoryCard) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      slug: card.slug,
      description: card.description,
      image_url: card.image_url,
      color_gradient: card.color_gradient,
    });
    setIsAddingNew(false);
  };

  const handleCancel = () => {
    setEditingCard(null);
    setIsAddingNew(false);
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      color_gradient: 'from-blue-100 to-blue-200',
    });
  };

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      {(isAddingNew || editingCard) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold mb-4">
            {editingCard ? 'Edit Category Card' : 'Add New Category Card'}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Smartwatches"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="smartwatches"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Advanced health tracking on your wrist"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL *
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://images.unsplash.com/..."
              />
              {formData.image_url && (
                <div className="mt-2 relative w-32 h-32 rounded-lg overflow-hidden">
                  <Image
                    src={formData.image_url}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Gradient (optional)
              </label>
              <select
                value={formData.color_gradient}
                onChange={(e) => setFormData({ ...formData, color_gradient: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="from-blue-100 to-blue-200">Blue</option>
                <option value="from-green-100 to-green-200">Green</option>
                <option value="from-purple-100 to-purple-200">Purple</option>
                <option value="from-red-100 to-red-200">Red</option>
                <option value="from-yellow-100 to-yellow-200">Yellow</option>
                <option value="from-orange-100 to-orange-200">Orange</option>
                <option value="from-pink-100 to-pink-200">Pink</option>
                <option value="from-indigo-100 to-indigo-200">Indigo</option>
                <option value="from-rose-100 to-rose-200">Rose</option>
              </select>
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
              {editingCard ? 'Update' : 'Add'} Category
            </button>
          </div>
        </div>
      )}

      {/* Category Cards List */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-lg font-semibold">Active Category Cards</h4>
          {!isAddingNew && !editingCard && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Add Category
            </button>
          )}
        </div>

        <div className="space-y-3">
          {cards.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={cards}
                strategy={verticalListSortingStrategy}
              >
                {cards.map((card) => (
                  <SortableCard
                    key={card.id}
                    card={card}
                    onEdit={handleEdit}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No category cards yet. Add your first one!
            </div>
          )}
        </div>
      </div>

      {/* Preview Link */}
      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Visit your{' '}
          <a href={`/${tenantSlug}`} target="_blank" className="underline font-semibold">
            homepage
          </a>{' '}
          to see the category cards in action with the sticky scrolling effect.
        </p>
      </div>
    </div>
  );
}