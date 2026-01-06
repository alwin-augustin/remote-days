import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { work_status } from '@remotedays/types';

interface DailyDeclarationSummaryProps {
  date: string;
  totalEmployees: number;
  declared: number;
  statusCounts: Partial<Record<work_status, number>>;
}

const STATUS_CONFIG: Record<work_status, { icon: string; label: string }> = {
  home: { icon: '🏠', label: 'Home' },
  office: { icon: '🏢', label: 'Office' },
  travel: { icon: '✈️', label: 'Travel' },
  sick: { icon: '🏥', label: 'Sick' },
  unknown: { icon: '❓', label: 'Not Declared' },
};

export function DailyDeclarationSummary({
  date,
  totalEmployees,
  declared,
  statusCounts,
}: DailyDeclarationSummaryProps) {
  const percentDeclared = totalEmployees > 0 ? (declared / totalEmployees) * 100 : 0;
  const missing = totalEmployees - declared;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Declarations</CardTitle>
        <p className="text-sm text-muted-foreground">{new Date(date).toLocaleDateString()}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {declared} / {totalEmployees} declared
            </span>
            <span className="text-sm font-semibold">{percentDeclared.toFixed(0)}%</span>
          </div>
          <Progress value={percentDeclared} className="h-2" />
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const count = statusCounts[status as work_status] || 0;
            if (status === 'unknown') {
              return (
                <div key={status} className="flex items-center gap-1">
                  <span>{config.icon}</span>
                  <span className="font-semibold">{missing}</span>
                  <span className="text-muted-foreground">{config.label}</span>
                </div>
              );
            }
            if (count === 0) return null;
            return (
              <div key={status} className="flex items-center gap-1">
                <span>{config.icon}</span>
                <span className="font-semibold">{count}</span>
                <span className="text-muted-foreground">{config.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
