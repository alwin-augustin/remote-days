import { Progress } from '@/components/ui/progress';
import { TONE_CLASSES, type StatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';

interface ComplianceProgressBarProps {
  value: number;
  max: number;
  showThresholds?: boolean;
  className?: string;
  /** Semantic tone for the filled portion. Defaults to neutral primary. */
  tone?: StatusTone;
}

const THRESHOLDS = [50, 75, 90];

export function ComplianceProgressBar({
  value,
  max,
  showThresholds = true,
  className,
  tone,
}: ComplianceProgressBarProps) {
  const percentUsed = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fillClass = tone ? TONE_CLASSES[tone].solid : 'bg-primary';

  return (
    <div className={cn('relative', className)}>
      <Progress
        value={percentUsed}
        className="h-2.5 bg-muted"
        indicatorClassName={fillClass}
        aria-label={`Remote work allowance used: ${Math.round(percentUsed)} percent`}
      />

      {showThresholds && (
        <div className="relative mt-1 h-4" aria-hidden>
          {THRESHOLDS.map((threshold) => (
            <div
              key={threshold}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${threshold}%`, transform: 'translateX(-50%)' }}
            >
              <div className="h-2 w-px bg-muted-foreground/30" />
              <span className="text-[10px] tabular text-muted-foreground">{threshold}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
