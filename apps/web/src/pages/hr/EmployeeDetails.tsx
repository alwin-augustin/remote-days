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

interface EmployeeData {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  country_of_residence: string;
  work_country: string;
  days_used_current_year: number;
  max_remote_days: number;
  percent_used: number;
}

export default function EmployeeDetails() {
  const { id } = useParams<{ id: string }>();

  // Fetch employee summary data
  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const res = await api.get<EmployeeData>(`/admin/users/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Fetch employee entries
  const { data: entries } = useQuery({
    queryKey: ['employee-entries', id],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const res = await api.get<{ date: string; status: work_status }[]>(
        `/entries?year=${year}&month=${month}&userId=${id}`
      );
      return res.data;
    },
    enabled: !!id,
  });

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/hr">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {employee.first_name} {employee.last_name}
          </h1>
          <p className="text-muted-foreground">{employee.role}</p>
        </div>
      </div>

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
              Country of Residence: {employee.country_of_residence} | Work Country: {employee.work_country}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <ComplianceStatusCard
        daysUsed={employee.days_used_current_year}
        maxDays={employee.max_remote_days}
        countryCode={employee.work_country}
      />

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <WeekCalendar entries={entries || []} title="This Week" />
        <WeekCalendar
          entries={entries || []}
          startDate={new Date(new Date().setDate(new Date().getDate() + 7))}
          title="Next Week"
        />
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(`mailto:${employee.email}`)}>
            Send Email
          </Button>
          <Button variant="outline" disabled>
            View Full History
          </Button>
          <Button variant="outline" disabled>
            Add Note
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
