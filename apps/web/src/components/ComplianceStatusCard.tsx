import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComplianceProgressBar } from './ComplianceProgressBar';
import { calculateProjection, getComplianceLevel, getNextMilestone, formatDaysRemaining } from '@/utils/complianceHelpers';
import { TONE_CLASSES } from '@/lib/status';
import { CheckCircle, AlertCircle, AlertTriangle, AlertOctagon, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ComplianceStatusCardProps {
  daysUsed: number;
  maxDays: number;
  countryCode?: string;
}

const iconMap = {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  XCircle,
};

const COUNTRY_LABELS: Record<string, { name: string; limit: number }> = {
  FR: { name: 'France', limit: 34 },
  BE: { name: 'Belgium', limit: 34 },
  DE: { name: 'Germany', limit: 183 },
};

export function ComplianceStatusCard({ daysUsed, maxDays, countryCode }: ComplianceStatusCardProps) {
  const percentUsed = maxDays > 0 ? (daysUsed / maxDays) * 100 : 0;
  const daysRemaining = maxDays - daysUsed;
  const threshold = getComplianceLevel(percentUsed);
  const projected = calculateProjection(daysUsed, maxDays);
  const nextMilestone = getNextMilestone(daysUsed, maxDays);
  const countryMeta = countryCode ? COUNTRY_LABELS[countryCode] : undefined;

  const Icon = iconMap[threshold.icon];
  const tone = TONE_CLASSES[threshold.tone];
  const currentYear = new Date().getFullYear();

  return (
    <Card className={cn('border-l-4', tone.borderAccent)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Remote Work Compliance</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="View remote work compliance guidance"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Remote Work Limits</p>
                  {countryMeta ? (
                    <p>
                      Your current allowance is based on <span className="font-medium">{countryMeta.name}</span>:{' '}
                      {countryMeta.limit} remote days per calendar year.
                    </p>
                  ) : (
                    <>
                      <p>Your annual remote work limit is based on your country of residence:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>France: 34 days/year</li>
                        <li>Belgium: 34 days/year</li>
                        <li>Germany: 183 days/year</li>
                      </ul>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground pt-2">
                    These limits ensure tax compliance and avoid permanent establishment risks.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn('flex items-center gap-3 rounded-lg border p-3', tone.muted)}>
          <Icon className={cn('h-5 w-5 shrink-0', tone.icon)} aria-hidden />
          <div>
            <div className="font-semibold">{threshold.label}</div>
            <div className="text-sm tabular">
              {daysUsed} / {maxDays} remote days ({percentUsed.toFixed(1)}%)
              {countryMeta ? ` for ${countryMeta.name}` : ''}
            </div>
          </div>
        </div>

        <ComplianceProgressBar
          value={daysUsed}
          max={maxDays}
          showThresholds={true}
          tone={threshold.tone}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium tabular">{formatDaysRemaining(daysRemaining)} until Dec 31, {currentYear}</p>
          <p className="text-sm text-muted-foreground">{threshold.message}</p>
        </div>

        {projected > 0 && percentUsed < 100 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm">
              <span className="font-medium">Projection:</span> At current pace, you&apos;ll use approximately{' '}
              <span className="font-semibold tabular">{projected} days</span> by year-end.
            </p>
          </div>
        )}

        {nextMilestone && (
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Next milestone:</span> {nextMilestone.label} at {nextMilestone.days} days (
              {nextMilestone.days - daysUsed} days away)
            </p>
          </div>
        )}

        {threshold.actionRequired && (
          <div className={cn('rounded-lg border border-l-4 p-3', tone.borderAccent, tone.muted)}>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Action required
            </p>
            <p className="mt-1 text-xs opacity-90">
              {threshold.level === 'exceeded'
                ? 'Contact HR immediately to discuss your situation.'
                : threshold.level === 'critical'
                  ? 'Coordinate all remaining remote work with your manager.'
                  : 'Plan your remaining remote days with care to stay within your allowance.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
