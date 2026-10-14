import { format, addDays, startOfWeek, isSameDay, isWeekend } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Building2, Plane, Stethoscope, Minus } from 'lucide-react';
import type { work_status } from '@remotedays/types';
import { TONE_CLASSES, WORK_STATUS_LABEL, WORK_STATUS_TONE, type StatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';

interface WeekCalendarProps {
  entries: { date: string; status: work_status }[];
  startDate?: Date;
  title?: string;
  className?: string;
}

const STATUS_ICON = {
  home: Home,
  office: Building2,
  travel: Plane,
  sick: Stethoscope,
  unknown: Minus,
} as const;

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
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const entry = getEntryForDate(day);
            const hasEntry = Boolean(entry);
            const status: work_status = entry?.status || 'unknown';
            const tone: StatusTone = WORK_STATUS_TONE[status];
            const Icon = STATUS_ICON[status];
            const isToday = isSameDay(day, new Date());
            const isWeekendDay = isWeekend(day);
            const classes = TONE_CLASSES[tone];

            const label = `${format(day, 'EEEE d MMMM')}: ${WORK_STATUS_LABEL[status]}`;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-lg border p-1.5 text-center',
                  hasEntry ? classes.muted : 'border-border',
                  isWeekendDay && !hasEntry && 'bg-muted/40',
                  isToday && 'border-primary bg-primary/5'
                )}
                title={label}
                aria-label={label}
                aria-current={isToday ? 'date' : undefined}
              >
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {format(day, 'EEE')}
                </div>
                <div className={cn('text-sm font-semibold tabular-nums', isToday && 'text-primary')}>
                  {format(day, 'd')}
                </div>
                {hasEntry || !isWeekendDay ? (
                  <Icon
                    className={cn('h-4 w-4', hasEntry ? classes.icon : 'text-muted-foreground/40')}
                    aria-hidden
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
