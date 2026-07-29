'use client';

import { AnimatePresence } from 'motion/react';
import { TaskCard } from './task-card';
import type { BackgroundTask } from '@constructive-io/command-palette';

const MAX_VISIBLE = 5;

export interface BackgroundTaskStackProps {
  tasks: BackgroundTask[];
  onCancel: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
  /** Override default positioning */
  className?: string;
}

export function BackgroundTaskStack({
  tasks,
  onCancel,
  onDismiss,
  className,
}: BackgroundTaskStackProps) {
  if (tasks.length === 0) return null;

  const visible = tasks.slice(0, MAX_VISIBLE);
  const overflow = tasks.length - MAX_VISIBLE;

  return (
    <div
      className={
        className ??
        'fixed end-4 bottom-4 z-[var(--z-layer-toast)] flex flex-col-reverse items-end gap-2'
      }
    >
      {overflow > 0 && (
        <div className="rounded-sm border bg-popover px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
          +{overflow} more task{overflow > 1 ? 's' : ''}
        </div>
      )}
      <AnimatePresence mode="popLayout">
        {visible.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onCancel={onCancel}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
