import { notFound } from 'next/navigation';
import { getCalendarItems } from '@/lib/admin';
import { getTenantBySlug } from '@/lib/tenant';
import { rescheduleCalendarItem } from './actions';
import { CalendarBoard } from '@affiliate-factory/ui';

interface CalendarAdminPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CalendarAdminPage({ params }: CalendarAdminPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  const calendar = await getCalendarItems(tenant.id);
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-white">Content calendar</h2>
        <p className="text-sm text-neutral-400">Drag-and-drop scheduling is exposed via board plus quick reschedule form.</p>
      </header>
      <CalendarBoard items={calendar} />
      <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
        <form action={reschedule.bind(null, tenantSlug)} className="flex flex-wrap items-end gap-3 text-sm">
          <div className="flex flex-col">
            <label htmlFor="item" className="text-neutral-400">
              Calendar item ID
            </label>
            <input
              id="item"
              name="item"
              required
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-neutral-100 focus-visible:outline focus-visible:outline-amber-400"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="runAt" className="text-neutral-400">
              New run date
            </label>
            <input
              id="runAt"
              name="runAt"
              type="datetime-local"
              required
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-neutral-100 focus-visible:outline focus-visible:outline-amber-400"
            />
          </div>
          <button type="submit" className="rounded-full bg-amber-500 px-4 py-2 font-semibold text-neutral-900">
            Reschedule
          </button>
        </form>
      </div>
    </div>
  );
}

async function reschedule(tenantSlug: string, formData: FormData) {
  'use server';
  const itemId = formData.get('item');
  const runAt = formData.get('runAt');
  if (typeof itemId !== 'string' || typeof runAt !== 'string') return;
  await rescheduleCalendarItem(tenantSlug, itemId, new Date(runAt).toISOString());
}
