import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TONE_CLASSES, type StatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, HelpCircle } from 'lucide-react';

type KPIVariant = 'red' | 'orange' | 'gray';

interface KPICardProps {
  title: string;
  count: number;
  variant: KPIVariant;
  hint?: string;
  isActive?: boolean;
  onClick?: () => void;
}

const VARIANT: Record<KPIVariant, { tone: StatusTone; icon: typeof AlertCircle; hint: string }> = {
  red: { tone: 'danger', icon: AlertCircle, hint: 'Above 90% quota' },
  orange: { tone: 'warning', icon: AlertTriangle, hint: '75–90% quota' },
  gray: { tone: 'neutral', icon: HelpCircle, hint: 'No declaration today' },
};

export function KPICard({ title, count, variant, hint, isActive, onClick }: KPICardProps) {
  const { tone, icon: Icon, hint: defaultHint } = VARIANT[variant];
  const classes = TONE_CLASSES[tone];

  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={cn(
        'h-full border-l-4 transition-all duration-200',
        classes.borderAccent,
        onClick && 'cursor-pointer hover:shadow-md',
        isActive && cn('ring-2', classes.ring)
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', classes.icon)} aria-hidden />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular">{count}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint ?? defaultHint}</p>
      </CardContent>
    </Card>
  );
}
