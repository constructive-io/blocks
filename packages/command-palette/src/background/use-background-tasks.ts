import { useState, useCallback, useRef, useEffect } from 'react';
import type { BackgroundTask, BackgroundTaskOptions } from './types';

interface TaskEntry {
  task: BackgroundTask;
  controller: AbortController;
}

export interface UseBackgroundTasks {
  /** Sorted tasks: running first, then by completedAt desc */
  tasks: BackgroundTask[];
  /** Dispatch a background command. Returns the task ID. */
  dispatch: (
    cmd: { id: string; label: string },
    fn: (signal: AbortSignal) => Promise<void>
  ) => string;
  /** Cancel a running task */
  cancel: (taskId: string) => void;
  /** Dismiss a completed/errored/cancelled task */
  dismiss: (taskId: string) => void;
  /** Dismiss all non-running tasks */
  dismissCompleted: () => void;
}

let idCounter = 0;
function generateId(): string {
  return `bg-${Date.now()}-${++idCounter}`;
}

function sortTasks(tasks: BackgroundTask[]): BackgroundTask[] {
  return [...tasks].sort((a, b) => {
    // Running tasks first
    if (a.status === 'running' && b.status !== 'running') return -1;
    if (a.status !== 'running' && b.status === 'running') return 1;
    // Then by completedAt desc (most recent first)
    if (a.completedAt && b.completedAt) return b.completedAt - a.completedAt;
    // Then by startedAt desc
    return b.startedAt - a.startedAt;
  });
}

export function useBackgroundTasks(
  options: BackgroundTaskOptions = {}
): UseBackgroundTasks {
  const {
    onTaskChange,
    successDismissMs = 5000,
    cancelledDismissMs = 3000,
  } = options;

  const [entries, setEntries] = useState<Map<string, TaskEntry>>(new Map());
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const onTaskChangeRef = useRef(onTaskChange);
  onTaskChangeRef.current = onTaskChange;

  // Auto-dismiss timers
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
    };
  }, []);

  const updateTask = useCallback(
    (taskId: string, patch: Partial<BackgroundTask>) => {
      setEntries((prev) => {
        const entry = prev.get(taskId);
        if (!entry) return prev;
        const updated = { ...entry.task, ...patch };
        const next = new Map(prev);
        next.set(taskId, { ...entry, task: updated });
        onTaskChangeRef.current?.(updated);
        return next;
      });
    },
    []
  );

  const scheduleAutoDismiss = useCallback(
    (taskId: string, delayMs: number) => {
      if (delayMs <= 0) return;
      const timer = setTimeout(() => {
        timersRef.current.delete(taskId);
        setEntries((prev) => {
          const entry = prev.get(taskId);
          if (!entry || entry.task.status === 'running') return prev;
          const next = new Map(prev);
          next.delete(taskId);
          return next;
        });
      }, delayMs);
      timersRef.current.set(taskId, timer);
    },
    []
  );

  const dispatch = useCallback(
    (
      cmd: { id: string; label: string },
      fn: (signal: AbortSignal) => Promise<void>
    ): string => {
      const taskId = generateId();
      const controller = new AbortController();

      const task: BackgroundTask = {
        id: taskId,
        commandId: cmd.id,
        label: cmd.label,
        status: 'running',
        error: null,
        startedAt: Date.now(),
        completedAt: null,
      };

      setEntries((prev) => {
        const next = new Map(prev);
        next.set(taskId, { task, controller });
        return next;
      });

      onTaskChangeRef.current?.(task);

      fn(controller.signal).then(
        () => {
          // Check if cancelled while running
          if (controller.signal.aborted) return;
          updateTask(taskId, {
            status: 'success',
            completedAt: Date.now(),
          });
          scheduleAutoDismiss(taskId, successDismissMs);
        },
        (err: unknown) => {
          if (controller.signal.aborted) return;
          const error =
            err instanceof Error ? err : new Error(String(err));
          updateTask(taskId, {
            status: 'error',
            error,
            completedAt: Date.now(),
          });
          // Errors persist — no auto-dismiss
        }
      );

      return taskId;
    },
    [updateTask, scheduleAutoDismiss, successDismissMs]
  );

  const cancel = useCallback(
    (taskId: string) => {
      const entry = entriesRef.current.get(taskId);
      if (!entry || entry.task.status !== 'running') return;
      entry.controller.abort();
      updateTask(taskId, {
        status: 'cancelled',
        completedAt: Date.now(),
      });
      scheduleAutoDismiss(taskId, cancelledDismissMs);
    },
    [updateTask, scheduleAutoDismiss, cancelledDismissMs]
  );

  const dismiss = useCallback((taskId: string) => {
    setEntries((prev) => {
      const entry = prev.get(taskId);
      if (!entry || entry.task.status === 'running') return prev;
      const timer = timersRef.current.get(taskId);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(taskId);
      }
      const next = new Map(prev);
      next.delete(taskId);
      return next;
    });
  }, []);

  const dismissCompleted = useCallback(() => {
    setEntries((prev) => {
      const next = new Map(prev);
      for (const [id, entry] of prev) {
        if (entry.task.status !== 'running') {
          const timer = timersRef.current.get(id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
          }
          next.delete(id);
        }
      }
      return next;
    });
  }, []);

  const tasks = sortTasks(Array.from(entries.values()).map((e) => e.task));

  return { tasks, dispatch, cancel, dismiss, dismissCompleted };
}
