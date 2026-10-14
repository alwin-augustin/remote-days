import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { TONE_CLASSES, type StatusTone } from '@/lib/status';
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

const TREND_CONFIG: Record<TrendType, { icon: typeof TrendingUp; tone: StatusTone; label: string; symbols: string }> = {
  'increasing-fast': {
    icon: TrendingUp,
    tone: 'danger',
    label: 'Using much faster than average',
    symbols: '▲▲',
  },
  increasing: {
    icon: TrendingUp,
    tone: 'warning',
    label: 'Using faster than average',
    symbols: '▲',
  },
  steady: {
    icon: Minus,
    tone: 'info',
    label: 'On pace',
    symbols: '→',
  },
  decreasing: {
    icon: TrendingDown,
    tone: 'success',
    label: 'Using slower than average',
    symbols: '▼',
  },
};

export function TrendIndicator({ trend, tooltipText, className }: TrendIndicatorProps) {
  const config = TREND_CONFIG[trend];
  const { icon: Icon, label, symbols } = config;
  const color = TONE_CLASSES[config.tone].text;

  const content = (
    <div className={cn('flex items-center gap-1', className)}>
      <Icon className={cn('h-3 w-3', color)} aria-hidden />
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
// eslint-disable-next-line react-refresh/only-export-components
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
