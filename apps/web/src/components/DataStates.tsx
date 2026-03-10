import { AlertCircle, Inbox } from 'lucide-react';

import { EmptyState } from '@/components/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TableSkeleton } from '@/components/LoadingState';

export function TableLoadingState({ rows = 5 }: { rows?: number }) {
  return <TableSkeleton rows={rows} />;
}

interface TableEmptyStateProps {
  title: string;
  description: string;
}

export function TableEmptyState({ title, description }: TableEmptyStateProps) {
  return <EmptyState icon={Inbox} title={title} description={description} />;
}

interface InlineErrorStateProps {
  title?: string;
  description: string;
}

export function InlineErrorState({
  title = 'Unable to load this section',
  description,
}: InlineErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
