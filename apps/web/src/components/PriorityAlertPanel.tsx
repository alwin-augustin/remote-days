import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { XCircle, AlertOctagon, HelpCircle } from 'lucide-react';
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

export function PriorityAlertPanel({ alerts, onDismissAll }: PriorityAlertPanelProps) {
  if (alerts.length === 0) {
    return null;
  }

  const getAlertConfig = (type: Alert['type']) => {
    switch (type) {
      case 'exceeded':
        return {
          icon: XCircle,
          badge: 'EXCEEDED',
          badgeClass: 'bg-red-500 hover:bg-red-600',
          iconClass: 'text-red-600',
        };
      case 'critical':
        return {
          icon: AlertOctagon,
          badge: 'CRITICAL',
          badgeClass: 'bg-orange-500 hover:bg-orange-600',
          iconClass: 'text-orange-600',
        };
      case 'missing':
        return {
          icon: HelpCircle,
          badge: 'MISSING',
          badgeClass: 'bg-gray-500 hover:bg-gray-600',
          iconClass: 'text-gray-600',
        };
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">🚨 Priority Alerts</CardTitle>
            <Badge variant="secondary">{alerts.length}</Badge>
          </div>
          {onDismissAll && alerts.length > 1 && (
            <Button variant="ghost" size="sm" onClick={onDismissAll}>
              Dismiss All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const config = getAlertConfig(alert.type);
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-3 bg-background rounded-lg border"
            >
              <Icon className={cn('h-5 w-5 mt-0.5', config.iconClass)} />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={config.badgeClass}>{config.badge}</Badge>
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
