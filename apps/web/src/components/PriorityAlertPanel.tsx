import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { TONE_CLASSES, type StatusTone } from '@/lib/status';
import { XCircle, AlertOctagon, HelpCircle, BellRing, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  type: 'exceeded' | 'critical' | 'missing';
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

interface PriorityAlertPanelProps {
  alerts: Alert[];
  onDismissAll?: () => void;
}

const ALERT_CONFIG: Record<Alert['type'], { icon: LucideIcon; badge: string; tone: StatusTone }> = {
  exceeded: { icon: XCircle, badge: 'Exceeded', tone: 'danger' },
  critical: { icon: AlertOctagon, badge: 'Critical', tone: 'warning' },
  missing: { icon: HelpCircle, badge: 'Missing', tone: 'neutral' },
};

export function PriorityAlertPanel({ alerts, onDismissAll }: PriorityAlertPanelProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-warning-border bg-warning-muted/40">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-warning-muted-foreground" aria-hidden />
            <CardTitle className="text-lg">Priority alerts</CardTitle>
            <Badge variant="secondary" className="tabular">{alerts.length}</Badge>
          </div>
          {onDismissAll && alerts.length > 1 && (
            <Button variant="ghost" size="sm" onClick={onDismissAll}>
              Dismiss all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const config = ALERT_CONFIG[alert.type];
          const Icon = config.icon;
          const tone = TONE_CLASSES[config.tone];

          return (
            <div key={alert.id} className="flex items-start gap-3 rounded-lg border bg-background p-3">
              <Icon className={cn('mt-0.5 h-5 w-5', tone.icon)} aria-hidden />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={config.tone} size="sm">{config.badge}</StatusBadge>
                  <span className="font-semibold">{alert.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
              </div>
              <Button size="sm" variant="outline" onClick={alert.onAction}>
                {alert.actionLabel}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
