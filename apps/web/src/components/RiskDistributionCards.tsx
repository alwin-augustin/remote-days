import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, AlertOctagon, AlertTriangle, AlertCircle } from 'lucide-react';
import { TONE_CLASSES, type StatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';

type RiskKey = 'exceeded' | 'critical' | 'high' | 'moderate';

interface RiskDistributionCardsProps {
  exceededCount: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  onFilterChange: (filter: RiskKey | null) => void;
  activeFilter: RiskKey | null;
}

interface RiskCard {
  key: RiskKey;
  title: string;
  count: number;
  description: string;
  action: string;
  icon: typeof XCircle;
  tone: StatusTone;
}

export function RiskDistributionCards({
  exceededCount,
  criticalCount,
  highCount,
  moderateCount,
  onFilterChange,
  activeFilter,
}: RiskDistributionCardsProps) {
  const cards: RiskCard[] = [
    {
      key: 'exceeded',
      title: 'Exceeded limit',
      count: exceededCount,
      description: 'Over 100% of allowance',
      action: 'Review immediately',
      icon: XCircle,
      tone: 'danger',
    },
    {
      key: 'critical',
      title: 'Critical risk',
      count: criticalCount,
      description: '90–100% used',
      action: 'Proactive guidance',
      icon: AlertOctagon,
      tone: 'danger',
    },
    {
      key: 'high',
      title: 'High risk',
      count: highCount,
      description: '75–90% used',
      action: 'Monitor closely',
      icon: AlertTriangle,
      tone: 'warning',
    },
    {
      key: 'moderate',
      title: 'Moderate risk',
      count: moderateCount,
      description: '50–75% used',
      action: 'Plan ahead',
      icon: AlertCircle,
      tone: 'info',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Filter employees by compliance risk">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;
        const tone = TONE_CLASSES[card.tone];

        return (
          <Card
            key={card.key}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            onClick={() => onFilterChange(isActive ? null : card.key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onFilterChange(isActive ? null : card.key);
              }
            }}
            className={cn(
              'h-full cursor-pointer border-l-4 transition-all duration-200 hover:shadow-md',
              tone.borderAccent,
              isActive ? cn('ring-2', tone.ring) : 'hover:border-l-4',
              card.count === 0 && 'opacity-60'
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <Icon className={cn('h-4 w-4', tone.icon)} aria-hidden />
            </CardHeader>
            <CardContent className="flex h-full flex-col">
              <div className="text-2xl font-bold tabular">{card.count}</div>
              <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
              {card.count > 0 && (
                <p className={cn('mt-auto pt-2 text-xs font-medium', tone.text)}>{card.action}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
