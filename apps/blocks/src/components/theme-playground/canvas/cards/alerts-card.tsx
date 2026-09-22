import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';

import { SinkCard } from './sink-card';

const ALERTS: {
  variant: 'destructive' | 'info' | 'success' | 'warning';
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    variant: 'info',
    title: 'Scheduled upgrade',
    body: 'Postgres 17 rolls out to this project on Friday.',
    icon: Info,
  },
  {
    variant: 'success',
    title: 'Backup verified',
    body: 'Nightly snapshot completed in 41 seconds.',
    icon: CheckCircle2,
  },
  {
    variant: 'warning',
    title: 'Approaching limit',
    body: 'Bandwidth is at 82% of the monthly quota.',
    icon: TriangleAlert,
  },
  {
    variant: 'destructive',
    title: 'Deploy failed',
    body: 'Migration 0042 conflicts with constraint users_email_key.',
    icon: AlertCircle,
  },
];

export function AlertsCard() {
  return (
    <SinkCard title="Alerts" contentClassName="flex flex-col gap-4">
      {ALERTS.map((alert) => (
        <Alert key={alert.title} variant={alert.variant}>
          <alert.icon aria-hidden />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.body}</AlertDescription>
        </Alert>
      ))}
    </SinkCard>
  );
}
