import { addDays, format, startOfWeek } from 'date-fns';
import type { CalendarItem } from '@affiliate-factory/sdk';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

interface CalendarBoardProps {
  items: CalendarItem[];
  startDate?: Date;
  onSelect?: (item: CalendarItem) => void;
}

const ITEM_COLORS: Record<CalendarItem['itemType'], string> = {
  post: 'bg-amber-100 text-amber-700',
  newsletter: 'bg-blue-100 text-blue-700',
  social: 'bg-emerald-100 text-emerald-700',
  agent: 'bg-neutral-200 text-neutral-800'
};

export function CalendarBoard({ items, startDate = new Date(), onSelect }: CalendarBoardProps) {
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <Card>
      <CardHeader>
        <CardTitle>This week</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {days.map((day) => {
          const dayItems = items.filter((item) => isSameDay(new Date(item.runAt), day));
          return (
            <div key={day.toISOString()} className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-3">
              <p className="text-xs font-semibold uppercase text-neutral-500">{format(day, 'EEE')}</p>
              <p className="text-lg font-semibold text-neutral-900">{format(day, 'd')}</p>
              <div className="space-y-2">
                {dayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect?.(item)}
                    className={`w-full rounded-xl px-2 py-2 text-left text-xs font-semibold transition hover:opacity-80 ${
                      ITEM_COLORS[item.itemType]
                    }`}
                  >
                    <p>{item.title}</p>
                    <p className="text-[10px] uppercase tracking-wide opacity-80">{item.status}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function isSameDay(dateA: Date, dateB: Date): boolean {
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate();
}
