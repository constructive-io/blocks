export type BackgroundTaskStatus = 'running' | 'success' | 'error' | 'cancelled';

export interface BackgroundTask {
  /** Unique task instance ID (UUID) — supports same command running concurrently */
  id: string;
  /** Which command spawned this task */
  commandId: string;
  /** Display label from CommandDefinition */
  label: string;
  /** Current task status */
  status: BackgroundTaskStatus;
  /** Error if status is 'error' */
  error: Error | null;
  /** Timestamp when task started */
  startedAt: number;
  /** Timestamp when task completed/failed/cancelled */
  completedAt: number | null;
}

export interface BackgroundTaskOptions {
  /** Fires on every status change — consumer can trigger toasts here */
  onTaskChange?: (task: BackgroundTask) => void;
  /** Auto-dismiss delay for success tasks in ms (default: 5000, 0 = no auto-dismiss) */
  successDismissMs?: number;
  /** Auto-dismiss delay for cancelled tasks in ms (default: 3000, 0 = no auto-dismiss) */
  cancelledDismissMs?: number;
}
