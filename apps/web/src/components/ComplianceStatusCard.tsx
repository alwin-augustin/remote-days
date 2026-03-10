import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComplianceProgressBar } from './ComplianceProgressBar';
import { getComplianceLevel, calculateProjection, getNextMilestone, formatDaysRemaining } from '@/utils/complianceHelpers';
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
  const currentYear = new Date().getFullYear();

  return (
    <Card className={cn('border-l-4', threshold.color.border)}>
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
                      Your current allowance is based on <span className="font-medium">{countryMeta.name}</span>:
                      {' '}
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
        <div className={cn('flex items-center gap-2 p-3 rounded-lg', threshold.color.bg)}>
          <Icon className={cn('h-5 w-5', threshold.color.text)} />
          <div>
            <div className={cn('font-semibold', threshold.color.text)}>{threshold.label}</div>
            <div className="text-sm text-muted-foreground">
              {daysUsed} / {maxDays} remote days ({percentUsed.toFixed(1)}%)
              {countryMeta ? ` for ${countryMeta.name}` : ''}
            </div>
          </div>
        </div>

        <ComplianceProgressBar
          value={daysUsed}
          max={maxDays}
          showThresholds={true}
          progressColor={threshold.color.progress}
        />

        <div className="space-y-2">
          <p className={cn('text-sm font-medium', threshold.color.text)}>
            {formatDaysRemaining(daysRemaining)} until Dec 31, {currentYear}
          </p>
          <p className="text-sm text-muted-foreground">{threshold.message}</p>
        </div>

        {projected > 0 && percentUsed < 100 && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Projection:</span> At current pace, you'll use approximately{' '}
              <span className="font-semibold">{projected} days</span> by year-end.
            </p>
          </div>
        )}

        {nextMilestone && (
          <div className="bg-muted/30 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Next milestone:</span> {nextMilestone.label} at {nextMilestone.days} days
              ({nextMilestone.days - daysUsed} days away)
            </p>
          </div>
        )}

        {threshold.actionRequired && (
          <div className={cn('p-3 rounded-lg border-l-4', threshold.color.border, 'bg-background')}>
            <p className="text-sm font-medium">⚠️ Action Required</p>
            <p className="text-xs text-muted-foreground mt-1">
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
