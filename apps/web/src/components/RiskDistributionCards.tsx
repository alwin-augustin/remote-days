import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, AlertOctagon, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskDistributionCardsProps {
  exceededCount: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  onFilterChange: (filter: 'exceeded' | 'critical' | 'high' | 'moderate' | null) => void;
  activeFilter: 'exceeded' | 'critical' | 'high' | 'moderate' | null;
}

export function RiskDistributionCards({
  exceededCount,
  criticalCount,
  highCount,
  moderateCount,
  onFilterChange,
  activeFilter,
}: RiskDistributionCardsProps) {
  const cards = [
    {
      key: 'exceeded' as const,
      title: 'Exceeded Limit',
      count: exceededCount,
      description: '100%+ of allowance used',
      action: 'Review immediately',
      icon: XCircle,
      colors: {
        bg: 'bg-red-50',
        border: 'border-l-red-500',
        text: 'text-red-700',
        iconBg: 'bg-red-100',
        iconText: 'text-red-600',
      },
    },
    {
      key: 'critical' as const,
      title: 'Critical Risk',
      count: criticalCount,
      description: '90-100% used',
      action: 'Proactive guidance needed',
      icon: AlertOctagon,
      colors: {
        bg: 'bg-red-50',
        border: 'border-l-red-400',
        text: 'text-red-600',
        iconBg: 'bg-red-100',
        iconText: 'text-red-500',
      },
    },
    {
      key: 'high' as const,
      title: 'High Risk',
      count: highCount,
      description: '75-90% used',
      action: 'Monitor closely',
      icon: AlertTriangle,
      colors: {
        bg: 'bg-orange-50',
        border: 'border-l-orange-500',
        text: 'text-orange-700',
        iconBg: 'bg-orange-100',
        iconText: 'text-orange-600',
      },
    },
    {
      key: 'moderate' as const,
      title: 'Moderate Risk',
      count: moderateCount,
      description: '50-75% used',
      action: 'Plan ahead',
      icon: AlertCircle,
      colors: {
        bg: 'bg-amber-50',
        border: 'border-l-amber-500',
        text: 'text-amber-700',
        iconBg: 'bg-amber-100',
        iconText: 'text-amber-600',
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;

        return (
          <Card
            key={card.key}
            className={cn(
              'cursor-pointer transition-all duration-200 border-l-4',
              card.colors.border,
              isActive ? 'ring-2 ring-primary shadow-lg scale-[1.02]' : 'hover:shadow-md hover:scale-[1.01]',
              card.count === 0 && 'opacity-60'
            )}
            onClick={() => onFilterChange(isActive ? null : card.key)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={cn('rounded-full p-2', card.colors.iconBg)}>
                <Icon className={cn('h-4 w-4', card.colors.iconText)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.count}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              {card.count > 0 && (
                <p className={cn('text-xs font-medium mt-2', card.colors.text)}>
                  {card.action}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
