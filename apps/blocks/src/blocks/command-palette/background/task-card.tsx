'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { BackgroundTask } from '@constructive-io/command-palette';
import { cn } from '@/lib/utils';
import { Button } from '@constructive-io/ui/button';
import { Separator } from '@constructive-io/ui/separator';
import { StatusIcon, ElapsedTime } from './task-icons';

export interface TaskCardProps {
  task: BackgroundTask;
  onCancel: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
}

const borderByStatus: Record<BackgroundTask['status'], string> = {
  running: 'border-info/30',
  success: 'border-success/30',
  error: 'border-destructive/30',
  cancelled: 'border-border'
};

export function TaskCard({ task, onCancel, onDismiss }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isRunning = task.status === 'running';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'w-72 rounded-sm border bg-popover text-popover-foreground shadow-sm',
        borderByStatus[task.status]
      )}
    >
      <div className="flex items-center gap-1 p-1.5">
        <Button
          aria-expanded={expanded}
          className="min-w-0 flex-1 justify-start border-0 px-1.5"
          onClick={() => setExpanded((value) => !value)}
          size="sm"
          variant="ghost"
        >
          <StatusIcon status={task.status} />
          <span className="min-w-0 flex-1 truncate text-left">{task.label}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            <ElapsedTime startedAt={task.startedAt} completedAt={task.completedAt} />
          </span>
        </Button>
        <Button
          aria-label={`${isRunning ? 'Cancel' : 'Dismiss'} ${task.label}`}
          onClick={() => (isRunning ? onCancel(task.id) : onDismiss(task.id))}
          size="xs"
          variant="ghost"
        >
          {isRunning ? 'Cancel' : 'Dismiss'}
        </Button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <Separator />
          <div className="flex flex-col gap-1 px-3 py-2 text-xs text-muted-foreground">
            <div>Command: {task.commandId}</div>
            <div>Started: {new Date(task.startedAt).toLocaleTimeString()}</div>
            {task.completedAt && (
              <div>
                Completed: {new Date(task.completedAt).toLocaleTimeString()}
              </div>
            )}
            {task.error && (
              <div className="text-destructive">{task.error.message}</div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
