import { format, addDays, startOfWeek, isSameDay, isWeekend } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { work_status } from '@remotedays/types';

interface WeekCalendarProps {
  entries: { date: string; status: work_status }[];
  startDate?: Date;
  title?: string;
  className?: string;
}

const STATUS_CONFIG: Record<work_status, { icon: string; label: string; color: string }> = {
  home: { icon: '🏠', label: 'Home', color: 'bg-green-100 text-green-800' },
  office: { icon: '🏢', label: 'Office', color: 'bg-blue-100 text-blue-800' },
  travel: { icon: '✈️', label: 'Travel', color: 'bg-yellow-100 text-yellow-800' },
  sick: { icon: '🏥', label: 'Sick', color: 'bg-red-100 text-red-800' },
  unknown: { icon: '❓', label: 'Not set', color: 'bg-gray-100 text-gray-600' },
};

export function WeekCalendar({ entries, startDate = new Date(), title = 'This Week', className }: WeekCalendarProps) {
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 }); // Monday
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEntryForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.find((e) => {
      const entryDate = typeof e.date === 'string' ? e.date.substring(0, 10) : '';
      return entryDate === dateStr;
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const entry = getEntryForDate(day);
            const status = entry?.status || 'unknown';
            const config = STATUS_CONFIG[status];
            const isToday = isSameDay(day, new Date());
            const isWeekendDay = isWeekend(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex flex-col items-center p-2 rounded-lg border',
                  isToday && 'ring-2 ring-primary',
                  isWeekendDay && 'bg-muted/30'
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {format(day, 'EEE')}
                </div>
                <div className={cn('text-sm font-semibold', isToday && 'text-primary')}>
                  {format(day, 'd')}
                </div>
                {!isWeekendDay && (
                  <div className={cn('mt-2 text-lg', !entry && 'opacity-30')}>
                    {config.icon}
                  </div>
                )}
                {!isWeekendDay && entry && (
                  <div className="mt-1 text-[10px] text-center text-muted-foreground">
                    {config.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
