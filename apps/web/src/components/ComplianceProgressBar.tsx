import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ComplianceProgressBarProps {
  value: number;
  max: number;
  showThresholds?: boolean;
  className?: string;
  progressColor?: string;
}

export function ComplianceProgressBar({
  value,
  max,
  showThresholds = true,
  className,
  progressColor,
}: ComplianceProgressBarProps) {
  const percentUsed = max > 0 ? (value / max) * 100 : 0;
  const thresholds = [50, 75, 90];

  return (
    <div className={cn('relative', className)}>
      <Progress
        value={percentUsed}
        className={cn('h-3', progressColor)}
      />

      {showThresholds && (
        <div className="relative mt-1 h-4">
          {thresholds.map((threshold) => (
            <div
              key={threshold}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${threshold}%`, transform: 'translateX(-50%)' }}
            >
              <div className="h-2 w-px bg-muted-foreground/30" />
              <span className="text-[10px] text-muted-foreground">{threshold}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
