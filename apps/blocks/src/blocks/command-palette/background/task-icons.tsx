'use client';

import { useState, useEffect, useRef } from 'react';
import type { BackgroundTaskStatus } from '@constructive-io/command-palette';
import {
  BanIcon,
  CircleCheckIcon,
  CircleXIcon,
  LoaderCircleIcon,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusPresentation: Record<
  BackgroundTaskStatus,
  { icon: LucideIcon; className: string }
> = {
  running: { icon: LoaderCircleIcon, className: 'animate-spin text-info' },
  success: { icon: CircleCheckIcon, className: 'text-success' },
  error: { icon: CircleXIcon, className: 'text-destructive' },
  cancelled: { icon: BanIcon, className: 'text-muted-foreground' }
};

export function StatusIcon({
  status,
  className
}: {
  status: BackgroundTaskStatus;
  className?: string;
}) {
  const presentation = statusPresentation[status];
  const Icon = presentation.icon;
  return (
    <Icon
      aria-hidden="true"
      className={cn('size-3.5 shrink-0', presentation.className, className)}
    />
  );
}

export function ElapsedTime({ startedAt, completedAt }: { startedAt: number; completedAt: number | null }) {
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (completedAt) return;
    intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalRef.current);
  }, [completedAt]);

  const elapsed = Math.round(((completedAt ?? now) - startedAt) / 1000);
  if (elapsed < 60) return <span className="tabular-nums">{elapsed}s</span>;
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span className="tabular-nums">
      {m}m {s}s
    </span>
  );
}
