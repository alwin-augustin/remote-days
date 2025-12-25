import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type TrendType = 'increasing-fast' | 'increasing' | 'steady' | 'decreasing';

interface TrendIndicatorProps {
  trend: TrendType;
  tooltipText?: string;
  className?: string;
}

export function TrendIndicator({ trend, tooltipText, className }: TrendIndicatorProps) {
  const config = {
    'increasing-fast': {
      icon: TrendingUp,
      color: 'text-red-600',
      label: 'Using much faster than average',
      symbols: '▲▲',
    },
    'increasing': {
      icon: TrendingUp,
      color: 'text-orange-600',
      label: 'Using faster than average',
      symbols: '▲',
    },
    'steady': {
      icon: Minus,
      color: 'text-blue-600',
      label: 'On pace',
      symbols: '→',
    },
    'decreasing': {
      icon: TrendingDown,
      color: 'text-green-600',
      label: 'Using slower than average',
      symbols: '▼',
    },
  };

  const { icon: Icon, color, label, symbols } = config[trend];

  const content = (
    <div className={cn('flex items-center gap-1', className)}>
      <Icon className={cn('h-3 w-3', color)} />
      <span className={cn('text-xs font-medium', color)}>{symbols}</span>
    </div>
  );

  if (tooltipText || label) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{content}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{tooltipText || label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

/**
 * Calculate trend based on current monthly usage vs average
 */
export function calculateTrend(
  currentMonthUsage: number,
  averageMonthUsage: number
): TrendType {
  if (averageMonthUsage === 0) return 'steady';

  const ratio = currentMonthUsage / averageMonthUsage;

  if (ratio >= 1.5) return 'increasing-fast';
  if (ratio >= 1.2) return 'increasing';
  if (ratio <= 0.8) return 'decreasing';
  return 'steady';
}
