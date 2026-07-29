'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { BackgroundTask } from '@constructive-io/command-palette';
import { ChevronDownIcon } from 'lucide-react';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { cn } from '@/lib/utils';
import { StatusIcon, ElapsedTime } from './task-icons';

export interface InlineTaskBarProps {
  tasks: BackgroundTask[];
  onCancel: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
}

const MAX_INLINE = 3;

function InlineTaskRow({
  task,
  onCancel,
  onDismiss,
}: {
  task: BackgroundTask;
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isRunning = task.status === 'running';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-1 px-1.5 py-1">
        <Button
          aria-expanded={expanded}
          className="min-w-0 flex-1 justify-start border-0 px-1.5"
          onClick={() => setExpanded((value) => !value)}
          size="xs"
          variant="ghost"
        >
          <StatusIcon status={task.status} />
          <span className="min-w-0 flex-1 truncate text-left">{task.label}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            <ElapsedTime startedAt={task.startedAt} completedAt={task.completedAt} />
          </span>
          <ChevronDownIcon
            className={cn('transition-transform', expanded && 'rotate-180')}
            data-icon="inline-end"
          />
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

      {/* Expanded error / details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 px-3 pb-1.5 pl-8 text-[10px] text-muted-foreground">
              <div>
                Command: <span className="font-mono">{task.commandId}</span>
              </div>
              <div>Started: {new Date(task.startedAt).toLocaleTimeString()}</div>
              {task.completedAt && (
                <div>Completed: {new Date(task.completedAt).toLocaleTimeString()}</div>
              )}
              {task.error && (
                <div className="text-destructive">{task.error.message}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function InlineTaskBar({ tasks, onCancel, onDismiss }: InlineTaskBarProps) {
  if (tasks.length === 0) return null;

  const visible = tasks.slice(0, MAX_INLINE);
  const overflow = tasks.length - MAX_INLINE;

  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const errorCount = tasks.filter((t) => t.status === 'error').length;

  return (
    <div className="relative -mx-px shrink-0 rounded-b-xl border border-t-0 bg-popover bg-clip-padding text-popover-foreground shadow-xs [clip-path:inset(0_1px)] dark:bg-clip-border" data-slot="inline-task-bar">
      {/* Summary header */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Tasks
        </span>
        {runningCount > 0 && (
          <Badge size="sm" variant="info">
            <StatusIcon status="running" />
            {runningCount}
          </Badge>
        )}
        {errorCount > 0 && (
          <Badge size="sm" variant="error">
            {errorCount} failed
          </Badge>
        )}
        {tasks.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            {tasks.length} total
          </span>
        )}
      </div>

      {/* Task rows */}
      <div className="max-h-32 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {visible.map((task) => (
            <InlineTaskRow
              key={task.id}
              task={task}
              onCancel={onCancel}
              onDismiss={onDismiss}
            />
          ))}
        </AnimatePresence>
      </div>

      {overflow > 0 && (
        <div className="px-3 py-1 text-[10px] text-muted-foreground">
          +{overflow} more task{overflow > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
