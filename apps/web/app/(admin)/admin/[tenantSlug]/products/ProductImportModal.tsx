'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import { enqueueProductImport } from './actions';

export function ProductImportModal({ tenantSlug }: { tenantSlug: string }) {
  async function importAsins(formData: FormData) {
    const raw = formData.get('asins');
    const values = typeof raw === 'string' ? raw.split(/\s|,|;/).map((value) => value.trim()).filter(Boolean) : [];
    if (!values.length) return;
    await enqueueProductImport(tenantSlug, values);
  }

  return (
    <div className="relative">
      {/* This would typically be a proper modal, but for simplicity using an inline form */}
      <details className="relative">
        <summary className="cursor-pointer inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
          <PlusIcon className="h-4 w-4 mr-2" />
          Import Products
        </summary>
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-6 z-10">
          <form action={importAsins} className="space-y-4">
            <div>
              <label htmlFor="asins" className="block text-sm font-medium text-gray-700">
                Amazon ASINs
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Enter Amazon product ASINs separated by commas, spaces, or new lines
              </p>
              <textarea
                id="asins"
                name="asins"
                rows={4}
                placeholder="B0CXXXXXX1, B0CXXXXXX2, B0CXXXXXX3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Import Products
              </button>
            </div>
          </form>
        </div>
      </details>
    </div>
  );
}