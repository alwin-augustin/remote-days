import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, MapPin } from 'lucide-react';
import { ComplianceStatusCard } from '@/components/ComplianceStatusCard';
import { WeekCalendar } from '@/components/WeekCalendar';
import type { work_status } from '@remotedays/types';
import { PageHeader } from '@/components/PageHeader';

type EmployeeSummary = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  countryOfResidence: string;
  workCountry: string;
  daysUsedCurrentYear: number;
  maxRemoteDays: number;
  percentUsed: number;
  trafficLight: string;
};

type EmployeeEntry = {
  userId: string;
  date: string;
  status: work_status;
};

export default function EmployeeDetails() {
  const { id } = useParams<{ id: string }>();
  const year = String(new Date().getFullYear());
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  const { data: summaries, isLoading } = useQuery({
    queryKey: ['employees', 'summary'],
    queryFn: async () => {
      const res = await api.get<EmployeeSummary[]>('/employees/summary');
      return res.data;
    },
    enabled: !!id,
  });

  const employee = summaries?.find((e) => e.userId === id);

  const { data: allEntries } = useQuery({
    queryKey: ['employees', 'entries', year, month],
    queryFn: async () => {
      const res = await api.get<EmployeeEntry[]>(
        `/employees/entries?year=${year}&month=${month}`
      );
      return res.data;
    },
    enabled: !!id,
  });

  const entries = allEntries?.filter((e) => e.userId === id) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Employee not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.email}
        actions={
          <>
            <Link to="/hr/employees">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back to Employees
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.open(`mailto:${employee.email}`)}>
              Send Email
            </Button>
          </>
        }
      />

      {/* Employee Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${employee.email}`} className="text-blue-600 hover:underline">
              {employee.email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              Country of Residence: {employee.countryOfResidence} | Work Country: {employee.workCountry}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <ComplianceStatusCard
        daysUsed={employee.daysUsedCurrentYear}
        maxDays={employee.maxRemoteDays}
        countryCode={employee.workCountry}
      />

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <WeekCalendar entries={entries} title="This Week" />
        <WeekCalendar
          entries={entries}
          startDate={new Date(new Date().setDate(new Date().getDate() + 7))}
          title="Next Week"
        />
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Next Step</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the calendar above to review recent declarations. Additional history and note-taking are not exposed in the current API, so this page focuses on verified compliance and recent activity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
